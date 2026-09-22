-- Labeeb :: realtime publication + reference data

-- Realtime filters on non-primary-key columns (user_id, job_id) need the full
-- old row, so these tables publish complete images.
alter table public.notifications     replica identity full;
alter table public.jobs              replica identity full;
alter table public.job_offers        replica identity full;
alter table public.messages          replica identity full;
alter table public.provider_profiles replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'jobs', 'job_offers', 'messages', 'provider_profiles']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- the trades that can be booked
-- ---------------------------------------------------------------------------
insert into public.service_categories (slug, name_en, name_ur, icon, sort_order) values
  ('electrician',    'Electrician',        'الیکٹریشن',        'zap',          10),
  ('plumber',        'Plumber',            'پلمبر',            'droplets',     20),
  ('ac-technician',  'AC Technician',      'اے سی ٹیکنیشن',    'wind',         30),
  ('carpenter',      'Carpenter',          'کارپینٹر',         'hammer',       40),
  ('gas-technician', 'Gas Technician',     'گیس ٹیکنیشن',      'flame',        50),
  ('locksmith',      'Locksmith',          'لاک اسمتھ',        'key-round',    60),
  ('appliance',      'Appliance Repair',   'آلات کی مرمت',     'washing-machine', 70),
  ('mason',          'Mason',              'معمار',            'brick-wall',   80),
  ('painter',        'Painter',            'پینٹر',            'paint-roller', 90),
  ('welder',         'Welder',             'ویلڈر',            'flame-kindling', 100)
on conflict (slug) do update
  set name_en = excluded.name_en,
      name_ur = excluded.name_ur,
      icon = excluded.icon,
      sort_order = excluded.sort_order;
