-- Fauri :: anchor the final amount to the price that was agreed
--
-- complete_job() took whatever figure the closing party passed, and the
-- commission is a percentage of it. A provider could settle a PKR 5,000 job at
-- 500 and cut the platform's share tenfold, unilaterally and invisibly.
--
-- The fix is asymmetric on purpose. Raising the figure only ever increases the
-- provider's own commission, so nobody does it to cheat -- and the job really
-- can grow once the wall is open. Lowering it is the direction that pays, so
-- that one now needs the customer: the person who actually handed over the
-- cash and has no reason to understate what they parted with.
--
-- Deliberately NOT a two-party confirmation flow. Cash changes hands at a
-- doorstep, often late at night, and a settlement that needs both phones out
-- before the job can close would be abandoned rather than used.

create or replace function public.complete_job(p_job_id uuid, p_final_amount numeric default null)
returns public.jobs language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs;
  v_from public.job_status;
  v_rate numeric(4,3);
  v_agreed numeric(10,2);
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
  -- accept_offer() writes the winning bid here, so this is the agreed price
  -- until someone deliberately closes at something else.
  v_agreed := v_job.final_amount_pkr;
  v_amount := coalesce(p_final_amount, v_agreed);

  if v_amount is null or v_amount <= 0 then
    raise exception 'A final amount is required to close the job' using errcode = '22023';
  end if;

  if auth.uid() = v_job.assigned_provider_id
     and v_agreed is not null
     and v_amount < v_agreed then
    raise exception 'Only the customer can close this job for less than the agreed PKR %', v_agreed
      using errcode = '42501';
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

  -- Both figures go on the timeline: a settlement that differs from the bid is
  -- exactly what a dispute will turn on later.
  insert into public.job_events (job_id, actor_id, event_type, from_status, to_status, metadata)
  values (p_job_id, auth.uid(), 'job_completed', v_from, 'completed',
          jsonb_build_object('final_amount_pkr', v_amount,
                             'agreed_amount_pkr', v_agreed,
                             'commission_pkr', round(v_amount * v_rate, 2)));

  insert into public.notifications (user_id, type, title, body, job_id, data)
  select target, 'job_status_changed', 'Job completed',
         v_job.title || ' - PKR ' || trim(to_char(v_amount, 'FM999999990')) || ' in cash',
         p_job_id, jsonb_build_object('status', 'completed', 'final_amount_pkr', v_amount)
  from (select unnest(array[v_job.customer_id, v_job.assigned_provider_id]) as target) t
  where t.target is not null and t.target <> auth.uid();

  return v_job;
end $$;
