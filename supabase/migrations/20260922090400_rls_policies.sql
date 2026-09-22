-- Fauri :: row level security
-- Default posture: deny. Column-level grants stop a client from writing the
-- fields the platform owns (ratings, commission, verification, job status).

alter table public.profiles           enable row level security;
alter table public.provider_profiles  enable row level security;
alter table public.service_categories enable row level security;
alter table public.provider_services  enable row level security;
alter table public.jobs               enable row level security;
alter table public.job_offers         enable row level security;
alter table public.job_events         enable row level security;
alter table public.messages           enable row level security;
alter table public.reviews            enable row level security;
alter table public.commission_ledger  enable row level security;
alter table public.notifications      enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_job_with(id) or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and (role <> 'admin' or public.is_admin()));

revoke update on public.profiles from authenticated;
grant update (full_name, phone, avatar_url, locale, city, role) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- provider_profiles
-- ---------------------------------------------------------------------------
drop policy if exists provider_profiles_select on public.provider_profiles;
create policy provider_profiles_select on public.provider_profiles for select to authenticated
  using (user_id = auth.uid() or public.shares_job_with(user_id) or public.is_admin());

drop policy if exists provider_profiles_insert on public.provider_profiles;
create policy provider_profiles_insert on public.provider_profiles for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists provider_profiles_update on public.provider_profiles;
create policy provider_profiles_update on public.provider_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ratings, verification, commission and location are the platform's to set
revoke update on public.provider_profiles from authenticated;
grant update (bio, experience_years, is_online, service_radius_km)
  on public.provider_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- service_categories : public reference data
-- ---------------------------------------------------------------------------
drop policy if exists categories_select on public.service_categories;
create policy categories_select on public.service_categories for select
  to anon, authenticated using (is_active or public.is_admin());

revoke insert, update, delete on public.service_categories from anon, authenticated;

-- ---------------------------------------------------------------------------
-- provider_services
-- ---------------------------------------------------------------------------
drop policy if exists provider_services_select on public.provider_services;
create policy provider_services_select on public.provider_services for select to authenticated
  using (true);

drop policy if exists provider_services_write on public.provider_services;
create policy provider_services_write on public.provider_services for all to authenticated
  using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- ---------------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------------
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs for select to authenticated
  using (public.can_view_job(id) or public.is_admin());

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated
  with check (customer_id = auth.uid() and status = 'open' and assigned_provider_id is null);

-- a customer may edit the details of a job only while it is still open;
-- every status change goes through an RPC so the ledger cannot be skipped
drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs for update to authenticated
  using (customer_id = auth.uid() and status = 'open')
  with check (customer_id = auth.uid() and status = 'open');

revoke update on public.jobs from authenticated;
grant update (title, description, category_id, location, address_text,
              budget_pkr, is_urgent, scheduled_for, notify_radius_km)
  on public.jobs to authenticated;

revoke delete on public.jobs from authenticated;

-- ---------------------------------------------------------------------------
-- job_offers
-- ---------------------------------------------------------------------------
drop policy if exists offers_select on public.job_offers;
create policy offers_select on public.job_offers for select to authenticated
  using (
    provider_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_id and j.customer_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists offers_insert on public.job_offers;
create policy offers_insert on public.job_offers for insert to authenticated
  with check (
    provider_id = auth.uid()
    and status = 'pending'
    and public.can_view_job(job_id)
    and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open' and j.customer_id <> auth.uid())
    and exists (select 1 from public.provider_profiles pp where pp.user_id = auth.uid())
  );

-- a provider may change their own price or withdraw, never self-accept
drop policy if exists offers_update on public.job_offers;
create policy offers_update on public.job_offers for update to authenticated
  using (provider_id = auth.uid() and status = 'pending')
  with check (provider_id = auth.uid() and status in ('pending', 'withdrawn'));

revoke update on public.job_offers from authenticated;
grant update (price_pkr, eta_minutes, message, status) on public.job_offers to authenticated;
revoke delete on public.job_offers from authenticated;

-- ---------------------------------------------------------------------------
-- job_events : readable timeline, written only by triggers and RPCs
-- ---------------------------------------------------------------------------
drop policy if exists job_events_select on public.job_events;
create policy job_events_select on public.job_events for select to authenticated
  using (public.can_view_job(job_id) or public.is_admin());

revoke insert, update, delete on public.job_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.can_view_job(job_id) or public.is_admin());

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_message_job(job_id));

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (public.can_view_job(job_id) and sender_id <> auth.uid())
  with check (public.can_view_job(job_id));

revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;
revoke delete on public.messages from authenticated;

-- ---------------------------------------------------------------------------
-- reviews : visible to everyone signed in, because trust is the whole product
-- ---------------------------------------------------------------------------
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to authenticated using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id
        and j.status = 'completed'
        and auth.uid() in (j.customer_id, j.assigned_provider_id)
        and reviewee_id in (j.customer_id, j.assigned_provider_id)
        and reviewee_id <> auth.uid()
    )
  );

revoke update, delete on public.reviews from authenticated;

-- ---------------------------------------------------------------------------
-- commission_ledger : a provider sees what they owe, and nothing else
-- ---------------------------------------------------------------------------
drop policy if exists ledger_select on public.commission_ledger;
create policy ledger_select on public.commission_ledger for select to authenticated
  using (provider_id = auth.uid() or public.is_admin());

revoke insert, update, delete on public.commission_ledger from anon, authenticated;

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
