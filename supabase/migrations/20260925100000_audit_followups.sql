-- Fauri :: audit follow-ups
--
--   1. nearby_providers() was executable by every authenticated user, took an
--      arbitrary point, and returned each online tradesman's exact coordinates.
--      Walking a grid mapped every provider in the country in real time.
--   2. complete_job()'s authorization check went through NULL when a job had no
--      assigned provider, so the guard silently stopped guarding.
--   3. Withdrawing an offer was a one-way door: job_detail() hides withdrawn
--      offers, so the UI offered a fresh bid form, but the unique constraint on
--      (job_id, provider_id) rejected the insert and offers_update refused to
--      revive the old row.

-- ---------------------------------------------------------------------------
-- 1. take the provider-location scan off the public surface
-- ---------------------------------------------------------------------------
-- Kept rather than dropped: the customer-facing "who is around me" map is a
-- planned feature and this is the query it wants. But it must not be reachable
-- until it has a caller that bounds the search to the customer's own area --
-- right now nothing in the app calls it, so the only users are scrapers.
revoke execute on function public.nearby_providers(double precision, double precision, numeric, uuid)
  from authenticated;

-- ---------------------------------------------------------------------------
-- 2. close the NULL hole in complete_job()
-- ---------------------------------------------------------------------------
-- `auth.uid() not in (customer_id, NULL)` evaluates to NULL, not TRUE, so an
-- unrelated caller fell straight through the IF. A job reaches that state when
-- the assigned provider's account is deleted: assigned_provider_id is
-- `on delete set null` while status stays 'assigned'. The insert into
-- commission_ledger then failed on its NOT NULL, so the transaction rolled back
-- and nothing was corrupted -- but the check was doing no work. cancel_job()
-- already coalesces and update_job_status() uses IS DISTINCT FROM; this brings
-- the third one into line.
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
  if v_job.assigned_provider_id is null then
    raise exception 'This job has no assigned provider' using errcode = 'P0001';
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
-- 3. let a provider revive their own withdrawn offer
-- ---------------------------------------------------------------------------
-- USING gains 'withdrawn' so the row can be picked back up. 'accepted' and
-- 'rejected' stay excluded, so a provider still cannot self-accept, nor reopen
-- a bid the customer already turned down.
drop policy if exists offers_update on public.job_offers;
create policy offers_update on public.job_offers for update to authenticated
  using (provider_id = auth.uid() and status in ('pending', 'withdrawn'))
  with check (provider_id = auth.uid() and status in ('pending', 'withdrawn'));
