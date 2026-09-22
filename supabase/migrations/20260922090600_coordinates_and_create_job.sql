-- Fauri :: plain lat/lng alongside the PostGIS geography
-- PostgREST's handling of geography input/output is fiddly. Writes go through
-- create_job(), and reads get these generated columns, so the client never has
-- to serialise GeoJSON.

alter table public.jobs
  add column if not exists lat double precision
    generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column if not exists lng double precision
    generated always as (extensions.st_x(location::extensions.geometry)) stored;

alter table public.provider_profiles
  add column if not exists lat double precision
    generated always as (extensions.st_y(current_location::extensions.geometry)) stored,
  add column if not exists lng double precision
    generated always as (extensions.st_x(current_location::extensions.geometry)) stored;

-- ---------------------------------------------------------------------------
-- create_job : the only way a job enters the system
-- ---------------------------------------------------------------------------
create or replace function public.create_job(
  p_category_id uuid,
  p_title text,
  p_description text,
  p_lat double precision,
  p_lng double precision,
  p_address_text text,
  p_budget_pkr numeric default null,
  p_is_urgent boolean default false,
  p_notify_radius_km numeric default 10,
  p_scheduled_for timestamptz default null
)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Pick a location on the map' using errcode = '22023';
  end if;
  if not exists (select 1 from public.service_categories c where c.id = p_category_id and c.is_active) then
    raise exception 'Unknown service category' using errcode = '22023';
  end if;

  insert into public.jobs (
    customer_id, category_id, title, description, location, address_text,
    budget_pkr, is_urgent, notify_radius_km, scheduled_for
  ) values (
    auth.uid(),
    p_category_id,
    trim(p_title),
    trim(p_description),
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    trim(p_address_text),
    p_budget_pkr,
    coalesce(p_is_urgent, false),
    -- an emergency is broadcast wider than a routine job
    greatest(1, least(coalesce(p_notify_radius_km, 10) * (case when p_is_urgent then 1.5 else 1 end), 50)),
    p_scheduled_for
  )
  returning * into v_job;

  return v_job;
end $$;

revoke all on function public.create_job(uuid, text, text, double precision, double precision, text, numeric, boolean, numeric, timestamptz) from public, anon;
grant execute on function public.create_job(uuid, text, text, double precision, double precision, text, numeric, boolean, numeric, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- job_detail : one round trip for the job page, RLS-checked
-- ---------------------------------------------------------------------------
create or replace function public.job_detail(p_job_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_result jsonb;
begin
  if not public.can_view_job(p_job_id) then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;

  select * into v_job from public.jobs where id = p_job_id;
  if v_job.id is null then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'job', to_jsonb(v_job) - 'location',
    'lat', extensions.st_y(v_job.location::extensions.geometry),
    'lng', extensions.st_x(v_job.location::extensions.geometry),
    'category', (select to_jsonb(c) from public.service_categories c where c.id = v_job.category_id),
    'customer', (
      select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone',
        case when auth.uid() in (v_job.customer_id, v_job.assigned_provider_id)
             then p.phone else null end)
      from public.profiles p where p.id = v_job.customer_id
    ),
    'provider', (
      select jsonb_build_object(
        'id', p.id, 'full_name', p.full_name,
        'phone', case when auth.uid() in (v_job.customer_id, v_job.assigned_provider_id)
                      then p.phone else null end,
        'rating_avg', pp.rating_avg, 'rating_count', pp.rating_count,
        'jobs_completed', pp.jobs_completed,
        'lat', extensions.st_y(pp.current_location::extensions.geometry),
        'lng', extensions.st_x(pp.current_location::extensions.geometry),
        'location_updated_at', pp.location_updated_at)
      from public.profiles p
      join public.provider_profiles pp on pp.user_id = p.id
      where p.id = v_job.assigned_provider_id
    ),
    'offers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'provider_id', o.provider_id, 'price_pkr', o.price_pkr,
        'eta_minutes', o.eta_minutes, 'message', o.message, 'status', o.status,
        'created_at', o.created_at,
        'provider_name', p.full_name,
        'rating_avg', pp.rating_avg, 'rating_count', pp.rating_count,
        'jobs_completed', pp.jobs_completed,
        'verification_status', pp.verification_status
      ) order by o.price_pkr)
      from public.job_offers o
      join public.profiles p on p.id = o.provider_id
      join public.provider_profiles pp on pp.user_id = o.provider_id
      where o.job_id = p_job_id
        and o.status <> 'withdrawn'
        -- a provider sees only their own bid; the customer sees them all
        and (v_job.customer_id = auth.uid() or o.provider_id = auth.uid())
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'event_type', e.event_type, 'from_status', e.from_status,
        'to_status', e.to_status, 'created_at', e.created_at, 'metadata', e.metadata,
        'actor_name', a.full_name) order by e.created_at)
      from public.job_events e
      left join public.profiles a on a.id = e.actor_id
      where e.job_id = p_job_id
    ), '[]'::jsonb),
    'my_review', (
      select to_jsonb(r) from public.reviews r
      where r.job_id = p_job_id and r.reviewer_id = auth.uid()
    )
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.job_detail(uuid) from public, anon;
grant execute on function public.job_detail(uuid) to authenticated;
