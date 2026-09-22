-- Fauri :: the customer's job list in one round trip

create or replace function public.customer_jobs(p_limit integer default 50)
returns table (
  id uuid, title text, description text, address_text text, status public.job_status,
  category_en text, category_ur text, icon text,
  budget_pkr numeric, final_amount_pkr numeric, is_urgent boolean,
  created_at timestamptz, lat double precision, lng double precision,
  offer_count bigint, provider_name text, has_review boolean
)
language sql stable security definer set search_path = '' as $$
  select
    j.id, j.title, j.description, j.address_text, j.status,
    c.name_en, c.name_ur, c.icon,
    j.budget_pkr, j.final_amount_pkr, j.is_urgent,
    j.created_at, j.lat, j.lng,
    (select count(*) from public.job_offers o where o.job_id = j.id and o.status = 'pending'),
    prov.full_name,
    exists (select 1 from public.reviews r where r.job_id = j.id and r.reviewer_id = auth.uid())
  from public.jobs j
  join public.service_categories c on c.id = j.category_id
  left join public.profiles prov on prov.id = j.assigned_provider_id
  where j.customer_id = auth.uid()
  order by
    (case when j.status in ('open', 'assigned', 'en_route', 'in_progress') then 0 else 1 end),
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.customer_jobs(integer) from public, anon;
grant execute on function public.customer_jobs(integer) to authenticated;
