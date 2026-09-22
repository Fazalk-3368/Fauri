-- Labeeb :: functions, triggers and RPCs
-- Every function pins an empty search_path and fully qualifies its references,
-- so a hostile schema on the caller's path cannot hijack a SECURITY DEFINER body.

-- ---------------------------------------------------------------------------
-- generic updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists touch_profiles on public.profiles;
create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_provider_profiles on public.provider_profiles;
create trigger touch_provider_profiles before update on public.provider_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_jobs on public.jobs;
create trigger touch_jobs before update on public.jobs
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_job_offers on public.job_offers;
create trigger touch_job_offers before update on public.job_offers
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- auth.users -> profiles
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_name text;
begin
  v_role := coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'customer')::public.user_role;
  v_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));

  insert into public.profiles (id, role, full_name, phone, locale)
  values (
    new.id,
    v_role,
    v_name,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'locale', ''), 'en')
  )
  on conflict (id) do nothing;

  if v_role = 'provider' then
    insert into public.provider_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep provider_profiles in step if someone switches role later
create or replace function public.sync_provider_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'provider' then
    insert into public.provider_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_profile_role_change on public.profiles;
create trigger on_profile_role_change after insert or update of role on public.profiles
  for each row execute function public.sync_provider_profile();

-- ---------------------------------------------------------------------------
-- authorization helpers (used by RLS; SECURITY DEFINER to avoid recursion)
-- ---------------------------------------------------------------------------

-- A provider may see a job if they own it, are assigned to it, have bid on it,
-- or were pinged about it by the matcher. That notification row is the anchor:
-- nobody can browse other people's home addresses at will.
create or replace function public.can_view_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and (j.customer_id = auth.uid() or j.assigned_provider_id = auth.uid())
  )
  or exists (
    select 1 from public.job_offers o
    where o.job_id = p_job_id and o.provider_id = auth.uid()
  )
  or exists (
    select 1 from public.notifications n
    where n.job_id = p_job_id and n.user_id = auth.uid()
  );
$$;

-- Chat opens as soon as a provider bids, so price can be negotiated before
-- anyone commits -- and closes to everyone else once the job is assigned.
create or replace function public.can_message_job(p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
      and j.status not in ('completed', 'cancelled', 'expired')
      and (
        j.customer_id = auth.uid()
        or j.assigned_provider_id = auth.uid()
        or (
          j.assigned_provider_id is null
          and exists (
            select 1 from public.job_offers o
            where o.job_id = j.id and o.provider_id = auth.uid() and o.status = 'pending'
          )
        )
      )
  );
$$;

-- Do these two users share a job? Gates access to each other's contact details.
create or replace function public.shares_job_with(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where (j.customer_id = auth.uid() and j.assigned_provider_id = p_other)
       or (j.assigned_provider_id = auth.uid() and j.customer_id = p_other)
  )
  or exists (
    select 1
    from public.job_offers o
    join public.jobs j on j.id = o.job_id
    where (o.provider_id = p_other and j.customer_id = auth.uid())
       or (o.provider_id = auth.uid() and j.customer_id = p_other)
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- the matcher : a new job pings every eligible nearby provider
-- ---------------------------------------------------------------------------
create or replace function public.notify_nearby_providers()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_cat_en text;
  v_cat_ur text;
  v_count integer;
begin
  select c.name_en, c.name_ur into v_cat_en, v_cat_ur
  from public.service_categories c where c.id = new.category_id;

  -- Notify a provider when the job sits inside BOTH their travel radius and
  -- the radius the customer is willing to broadcast to.
  insert into public.notifications (user_id, type, title, body, job_id, data)
  select
    pp.user_id,
    'new_job_nearby',
    case when new.is_urgent then 'Urgent ' || v_cat_en || ' job nearby'
         else 'New ' || v_cat_en || ' job nearby' end,
    new.title || ' - ' || round(extensions.st_distance(pp.current_location, new.location) / 1000.0, 1) || ' km away',
    new.id,
    jsonb_build_object(
      'distance_m', round(extensions.st_distance(pp.current_location, new.location)),
      'category_en', v_cat_en,
      'category_ur', v_cat_ur,
      'budget_pkr', new.budget_pkr,
      'is_urgent', new.is_urgent
    )
  from public.provider_profiles pp
  join public.provider_services ps
    on ps.provider_id = pp.user_id and ps.category_id = new.category_id
  where pp.is_online
    and pp.user_id <> new.customer_id
    and pp.current_location is not null
    and extensions.st_dwithin(
          pp.current_location,
          new.location,
          least(pp.service_radius_km, new.notify_radius_km) * 1000
        );

  get diagnostics v_count = row_count;

  insert into public.job_events (job_id, actor_id, event_type, to_status, metadata)
  values (new.id, new.customer_id, 'job_posted', new.status,
          jsonb_build_object('providers_notified', v_count));

  return new;
end $$;

drop trigger if exists on_job_created on public.jobs;
create trigger on_job_created after insert on public.jobs
  for each row execute function public.notify_nearby_providers();

-- ---------------------------------------------------------------------------
-- offer -> customer ping
-- ---------------------------------------------------------------------------
create or replace function public.notify_customer_of_offer()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_provider_name text;
begin
  select * into v_job from public.jobs where id = new.job_id;
  select full_name into v_provider_name from public.profiles where id = new.provider_id;

  insert into public.notifications (user_id, type, title, body, job_id, data)
  values (
    v_job.customer_id,
    'offer_received',
    'New offer: PKR ' || trim(to_char(new.price_pkr, 'FM999999990')),
    v_provider_name || ' can reach you in about ' || new.eta_minutes || ' minutes',
    new.job_id,
    jsonb_build_object('offer_id', new.id, 'provider_id', new.provider_id,
                       'price_pkr', new.price_pkr, 'eta_minutes', new.eta_minutes)
  );

  insert into public.job_events (job_id, actor_id, event_type, metadata)
  values (new.job_id, new.provider_id, 'offer_made',
          jsonb_build_object('offer_id', new.id, 'price_pkr', new.price_pkr));

  return new;
end $$;

drop trigger if exists on_offer_created on public.job_offers;
create trigger on_offer_created after insert on public.job_offers
  for each row execute function public.notify_customer_of_offer();

-- ---------------------------------------------------------------------------
-- chat ping
-- ---------------------------------------------------------------------------
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_recipient uuid;
  v_sender_name text;
begin
  select * into v_job from public.jobs where id = new.job_id;

  if new.sender_id = v_job.customer_id then
    v_recipient := v_job.assigned_provider_id;
    if v_recipient is null then
      -- pre-assignment: reply reaches whoever has a live offer in
      select o.provider_id into v_recipient from public.job_offers o
      where o.job_id = new.job_id and o.status = 'pending'
      order by o.created_at limit 1;
    end if;
  else
    v_recipient := v_job.customer_id;
  end if;

  if v_recipient is null then return new; end if;

  select full_name into v_sender_name from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, job_id, data)
  values (v_recipient, 'new_message', v_sender_name,
          left(new.body, 120), new.job_id,
          jsonb_build_object('message_id', new.id, 'sender_id', new.sender_id));

  return new;
end $$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created after insert on public.messages
  for each row execute function public.notify_new_message();

-- ---------------------------------------------------------------------------
-- rating rollup
-- ---------------------------------------------------------------------------
create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_reviewee uuid := coalesce(new.reviewee_id, old.reviewee_id);
begin
  update public.provider_profiles pp
  set rating_avg = coalesce(agg.avg_rating, 0),
      rating_count = coalesce(agg.n, 0)
  from (
    select avg(r.rating)::numeric(3,2) as avg_rating, count(*)::integer as n
    from public.reviews r where r.reviewee_id = v_reviewee
  ) agg
  where pp.user_id = v_reviewee;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, body, job_id, data)
    values (new.reviewee_id, 'review_received', 'You received a ' || new.rating || '-star review',
            coalesce(left(new.comment, 120), 'No comment left'), new.job_id,
            jsonb_build_object('rating', new.rating));
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists on_review_written on public.reviews;
create trigger on_review_written after insert or update or delete on public.reviews
  for each row execute function public.refresh_provider_rating();
