-- Fauri :: tighten the three authorization anchors
--
-- Each of these let a caller mint their own access rather than be granted it:
--
--   1. `role` was read straight out of signup metadata, which is whatever the
--      browser sent -- so anyone could sign up as 'admin' and satisfy the
--      is_admin() branch on profiles, jobs, offers, events, messages and the
--      commission ledger.
--   2. shares_job_with() counted a bid as a shared job, so a provider could bid
--      on every job they were pinged about and keep each customer's phone
--      number for good. Offers cannot be deleted, so nothing ever revoked it.
--   3. can_view_job() anchored on the matcher's notification row, which never
--      expires -- so every provider pinged about a job kept read access to the
--      chat between the customer and whoever actually won it.

-- ---------------------------------------------------------------------------
-- 1. role is the platform's to grant, not the client's to claim
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role public.user_role;
  v_name text;
begin
  -- Allowlist rather than a cast: raw_user_meta_data is attacker-controlled, so
  -- 'admin' must not round-trip and a junk value must not fail the signup.
  v_role := (case new.raw_user_meta_data ->> 'role'
               when 'provider' then 'provider'
               else 'customer'
             end)::public.user_role;

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

-- The trigger already owns this row, so the insert policy is belt-and-braces --
-- but it is the only other path to a self-granted admin profile.
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and role <> 'admin');

-- ---------------------------------------------------------------------------
-- 2. a bid is not a shared job
-- ---------------------------------------------------------------------------
-- This gates contact details on profiles and provider_profiles. Only an actual
-- assignment counts now. Bidders' names and ratings still reach the customer,
-- but through job_detail(), which is SECURITY DEFINER and decides field by
-- field what each side may see.
create or replace function public.shares_job_with(p_other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where (j.customer_id = auth.uid() and j.assigned_provider_id = p_other)
       or (j.assigned_provider_id = auth.uid() and j.customer_id = p_other)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. a ping is a licence to bid, not a permanent key
-- ---------------------------------------------------------------------------
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
  -- The notification anchor stops counting once the customer has picked
  -- someone, so a job's address does not stay readable by every tradesman the
  -- matcher happened to ping.
  or exists (
    select 1
    from public.notifications n
    join public.jobs j on j.id = n.job_id
    where n.job_id = p_job_id
      and n.user_id = auth.uid()
      and j.status = 'open'
  );
$$;

-- Chat needs its own predicate. can_view_job() is deliberately wider -- a losing
-- bidder still has to see the job to learn they lost -- but it must not carry
-- them into the conversation, where gate codes and "the back door is open" get
-- exchanged. This is can_message_job() without the closed-status clause, so
-- participants keep their history after the job ends.
create or replace function public.can_view_job_chat(p_job_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    where j.id = p_job_id
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

revoke all on function public.can_view_job_chat(uuid) from public, anon;
grant execute on function public.can_view_job_chat(uuid) to authenticated;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.can_view_job_chat(job_id) or public.is_admin());

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using (public.can_view_job_chat(job_id) and sender_id <> auth.uid())
  with check (public.can_view_job_chat(job_id));
