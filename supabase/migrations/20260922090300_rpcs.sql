-- Labeeb :: RPCs
-- Every state change that must be atomic or must outrank RLS lives here,
-- rather than being assembled from client-side writes.

-- ---------------------------------------------------------------------------
-- provider goes online / moves
-- ---------------------------------------------------------------------------
create or replace function public.update_provider_location(p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;

  update public.provider_profiles
  set current_location = extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      location_updated_at = now()
  where user_id = auth.uid();

  if not found then
    raise exception 'No provider profile for the current user' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- provider's job feed : open jobs in my categories, inside my radius
-- ---------------------------------------------------------------------------
create or replace function public.nearby_open_jobs(p_limit integer default 50)
returns table (
  id uuid, title text, description text, address_text text,
  category_id uuid, category_en text, category_ur text, icon text,
  budget_pkr numeric, is_urgent boolean, scheduled_for timestamptz,
  created_at timestamptz, lat double precision, lng double precision,
  distance_m double precision, customer_name text, offer_count bigint,
  my_offer_id uuid, my_offer_price numeric, my_offer_status public.offer_status
)
language sql stable security definer set search_path = '' as $$
  with me as (
    select pp.user_id, pp.current_location, pp.service_radius_km
    from public.provider_profiles pp where pp.user_id = auth.uid()
  )
  select
    j.id, j.title, j.description, j.address_text,
    j.category_id, c.name_en, c.name_ur, c.icon,
    j.budget_pkr, j.is_urgent, j.scheduled_for, j.created_at,
    extensions.st_y(j.location::extensions.geometry),
    extensions.st_x(j.location::extensions.geometry),
    extensions.st_distance(me.current_location, j.location),
    cust.full_name,
    (select count(*) from public.job_offers o where o.job_id = j.id and o.status = 'pending'),
    mine.id, mine.price_pkr, mine.status
  from public.jobs j
  join me on true
  join public.service_categories c on c.id = j.category_id
  join public.profiles cust on cust.id = j.customer_id
  join public.provider_services ps
    on ps.provider_id = me.user_id and ps.category_id = j.category_id
  left join public.job_offers mine
    on mine.job_id = j.id and mine.provider_id = me.user_id
  where j.status = 'open'
    and j.customer_id <> me.user_id
    and me.current_location is not null
    and extensions.st_dwithin(
          me.current_location, j.location,
          least(me.service_radius_km, j.notify_radius_km) * 1000
        )
  order by j.is_urgent desc, extensions.st_distance(me.current_location, j.location)
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

-- ---------------------------------------------------------------------------
-- customer's map : who is around right now (no contact details exposed)
-- ---------------------------------------------------------------------------
create or replace function public.nearby_providers(
  p_lat double precision,
  p_lng double precision,
  p_radius_km numeric default 10,
  p_category_id uuid default null
)
returns table (
  user_id uuid, full_name text, avatar_url text,
  rating_avg numeric, rating_count integer, jobs_completed integer,
  verification_status public.verification_status,
  lat double precision, lng double precision, distance_m double precision
)
language sql stable security definer set search_path = '' as $$
  select distinct on (pp.user_id)
    pp.user_id, p.full_name, p.avatar_url,
    pp.rating_avg, pp.rating_count, pp.jobs_completed, pp.verification_status,
    extensions.st_y(pp.current_location::extensions.geometry),
    extensions.st_x(pp.current_location::extensions.geometry),
    extensions.st_distance(
      pp.current_location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    )
  from public.provider_profiles pp
  join public.profiles p on p.id = pp.user_id
  left join public.provider_services ps on ps.provider_id = pp.user_id
  where pp.is_online
    and pp.current_location is not null
    and (p_category_id is null or ps.category_id = p_category_id)
    and extensions.st_dwithin(
          pp.current_location,
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
          greatest(1, least(coalesce(p_radius_km, 10), 50)) * 1000
        )
  order by pp.user_id, extensions.st_distance(
      pp.current_location,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    );
$$;

-- ---------------------------------------------------------------------------
-- accept an offer : assign the job and close every rival bid, atomically
-- ---------------------------------------------------------------------------
create or replace function public.accept_offer(p_offer_id uuid)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_offer public.job_offers;
  v_job public.jobs;
  v_customer_name text;
begin
  select * into v_offer from public.job_offers where id = p_offer_id;
  if v_offer.id is null then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;

  -- lock the job so two taps cannot assign two providers
  select * into v_job from public.jobs where id = v_offer.job_id for update;

  if v_job.customer_id <> auth.uid() then
    raise exception 'Only the customer who posted this job can accept an offer' using errcode = '42501';
  end if;
  if v_job.status <> 'open' then
    raise exception 'This job is no longer open' using errcode = 'P0001';
  end if;
  if v_offer.status <> 'pending' then
    raise exception 'This offer is no longer available' using errcode = 'P0001';
  end if;

  update public.job_offers set status = 'accepted' where id = p_offer_id;
  update public.job_offers set status = 'rejected'
    where job_id = v_job.id and id <> p_offer_id and status = 'pending';

  update public.jobs
  set status = 'assigned',
      assigned_provider_id = v_offer.provider_id,
      accepted_offer_id = v_offer.id,
      final_amount_pkr = v_offer.price_pkr,
      assigned_at = now()
  where id = v_job.id
  returning * into v_job;

  select full_name into v_customer_name from public.profiles where id = v_job.customer_id;

  insert into public.job_events (job_id, actor_id, event_type, from_status, to_status, metadata)
  values (v_job.id, auth.uid(), 'offer_accepted', 'open', 'assigned',
          jsonb_build_object('offer_id', v_offer.id, 'price_pkr', v_offer.price_pkr,
                             'provider_id', v_offer.provider_id));

  insert into public.notifications (user_id, type, title, body, job_id, data)
  values (v_offer.provider_id, 'offer_accepted', 'Your offer was accepted',
          v_customer_name || ' accepted PKR ' || trim(to_char(v_offer.price_pkr, 'FM999999990')) || ' for "' || v_job.title || '"',
          v_job.id, jsonb_build_object('offer_id', v_offer.id, 'price_pkr', v_offer.price_pkr));

  insert into public.notifications (user_id, type, title, body, job_id, data)
  select o.provider_id, 'offer_rejected', 'Job taken by someone else',
         'The customer picked another provider for "' || v_job.title || '"',
         v_job.id, jsonb_build_object('offer_id', o.id)
  from public.job_offers o
  where o.job_id = v_job.id and o.id <> p_offer_id and o.status = 'rejected';

  return v_job;
end $$;

-- ---------------------------------------------------------------------------
-- status transitions : assigned -> en_route -> in_progress
-- ---------------------------------------------------------------------------
create or replace function public.update_job_status(p_job_id uuid, p_status public.job_status)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_from public.job_status;
  v_actor_name text;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if v_job.assigned_provider_id is distinct from auth.uid() then
    raise exception 'Only the assigned provider can move this job forward' using errcode = '42501';
  end if;

  v_from := v_job.status;

  if not (
    (v_from = 'assigned'    and p_status = 'en_route')
    or (v_from = 'en_route'    and p_status = 'in_progress')
    or (v_from = 'assigned'    and p_status = 'in_progress')
  ) then
    raise exception 'Cannot move a job from % to %', v_from, p_status using errcode = 'P0001';
  end if;

  update public.jobs set status = p_status where id = p_job_id returning * into v_job;
  select full_name into v_actor_name from public.profiles where id = auth.uid();

  insert into public.job_events (job_id, actor_id, event_type, from_status, to_status)
  values (p_job_id, auth.uid(), 'status_changed', v_from, p_status);

  insert into public.notifications (user_id, type, title, body, job_id, data)
  values (v_job.customer_id, 'job_status_changed',
          case p_status
            when 'en_route' then v_actor_name || ' is on the way'
            when 'in_progress' then v_actor_name || ' has started work'
            else 'Job updated'
          end,
          v_job.title, p_job_id, jsonb_build_object('status', p_status));

  return v_job;
end $$;

-- ---------------------------------------------------------------------------
-- completion : cash is handed over offline, we record the debt we are owed
-- ---------------------------------------------------------------------------
create or replace function public.complete_job(p_job_id uuid, p_final_amount numeric default null)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_from public.job_status;
  v_rate numeric(4,3);
  v_amount numeric(10,2);
  v_actor_name text;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if auth.uid() not in (v_job.customer_id, v_job.assigned_provider_id) then
    raise exception 'Only the customer or the assigned provider can close this job' using errcode = '42501';
  end if;
  if v_job.status not in ('assigned', 'en_route', 'in_progress') then
    raise exception 'This job cannot be completed from status %', v_job.status using errcode = 'P0001';
  end if;

  v_from := v_job.status;
  v_amount := coalesce(p_final_amount, v_job.final_amount_pkr);
  if v_amount is null or v_amount <= 0 then
    raise exception 'A final amount is required to close the job' using errcode = '22023';
  end if;

  update public.jobs
  set status = 'completed', final_amount_pkr = v_amount, completed_at = now()
  where id = p_job_id
  returning * into v_job;

  select pp.commission_rate into v_rate
  from public.provider_profiles pp where pp.user_id = v_job.assigned_provider_id;
  v_rate := coalesce(v_rate, 0.100);

  insert into public.commission_ledger
    (job_id, provider_id, job_amount_pkr, commission_rate, commission_pkr)
  values
    (v_job.id, v_job.assigned_provider_id, v_amount, v_rate, round(v_amount * v_rate, 2))
  on conflict (job_id) do nothing;

  update public.provider_profiles
  set jobs_completed = jobs_completed + 1
  where user_id = v_job.assigned_provider_id;

  select full_name into v_actor_name from public.profiles where id = auth.uid();

  insert into public.job_events (job_id, actor_id, event_type, from_status, to_status, metadata)
  values (p_job_id, auth.uid(), 'job_completed', v_from, 'completed',
          jsonb_build_object('final_amount_pkr', v_amount, 'commission_pkr', round(v_amount * v_rate, 2)));

  insert into public.notifications (user_id, type, title, body, job_id, data)
  select target, 'job_status_changed', 'Job completed',
         v_job.title || ' - PKR ' || trim(to_char(v_amount, 'FM999999990')) || ' in cash',
         p_job_id, jsonb_build_object('status', 'completed', 'final_amount_pkr', v_amount)
  from (select unnest(array[v_job.customer_id, v_job.assigned_provider_id]) as target) t
  where t.target is not null and t.target <> auth.uid();

  return v_job;
end $$;

-- ---------------------------------------------------------------------------
-- cancellation
-- ---------------------------------------------------------------------------
create or replace function public.cancel_job(p_job_id uuid, p_reason text default null)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_from public.job_status;
  v_actor_name text;
begin
  select * into v_job from public.jobs where id = p_job_id for update;
  if v_job.id is null then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if auth.uid() not in (v_job.customer_id, coalesce(v_job.assigned_provider_id, v_job.customer_id)) then
    raise exception 'You cannot cancel this job' using errcode = '42501';
  end if;
  if v_job.status in ('completed', 'cancelled', 'expired') then
    raise exception 'This job is already closed' using errcode = 'P0001';
  end if;

  v_from := v_job.status;

  update public.jobs
  set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_job_id
  returning * into v_job;

  update public.job_offers set status = 'rejected'
  where job_id = p_job_id and status = 'pending';

  select full_name into v_actor_name from public.profiles where id = auth.uid();

  insert into public.job_events (job_id, actor_id, event_type, from_status, to_status, metadata)
  values (p_job_id, auth.uid(), 'job_cancelled', v_from, 'cancelled',
          jsonb_build_object('reason', p_reason));

  -- tell everyone still waiting on this job
  insert into public.notifications (user_id, type, title, body, job_id, data)
  select distinct target, 'job_cancelled', 'Job cancelled',
         v_actor_name || ' cancelled "' || v_job.title || '"',
         p_job_id, jsonb_build_object('reason', p_reason)
  from (
    select v_job.customer_id as target
    union
    select v_job.assigned_provider_id
    union
    select o.provider_id from public.job_offers o where o.job_id = p_job_id
  ) t
  where t.target is not null and t.target <> auth.uid();

  return v_job;
end $$;

-- ---------------------------------------------------------------------------
-- mark notifications read
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null
    and (p_ids is null or id = any(p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- grants : authenticated users reach the data through these entry points
-- ---------------------------------------------------------------------------
revoke all on function public.update_provider_location(double precision, double precision) from public, anon;
revoke all on function public.nearby_open_jobs(integer) from public, anon;
revoke all on function public.nearby_providers(double precision, double precision, numeric, uuid) from public, anon;
revoke all on function public.accept_offer(uuid) from public, anon;
revoke all on function public.update_job_status(uuid, public.job_status) from public, anon;
revoke all on function public.complete_job(uuid, numeric) from public, anon;
revoke all on function public.cancel_job(uuid, text) from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;

grant execute on function public.update_provider_location(double precision, double precision) to authenticated;
grant execute on function public.nearby_open_jobs(integer) to authenticated;
grant execute on function public.nearby_providers(double precision, double precision, numeric, uuid) to authenticated;
grant execute on function public.accept_offer(uuid) to authenticated;
grant execute on function public.update_job_status(uuid, public.job_status) to authenticated;
grant execute on function public.complete_job(uuid, numeric) to authenticated;
grant execute on function public.cancel_job(uuid, text) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.can_view_job(uuid) to authenticated;
grant execute on function public.can_message_job(uuid) to authenticated;
grant execute on function public.shares_job_with(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
