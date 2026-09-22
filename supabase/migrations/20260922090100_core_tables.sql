-- Fauri :: core tables

-- ---------------------------------------------------------------------------
-- profiles : one row per auth user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null default 'customer',
  full_name       text not null check (length(trim(full_name)) between 2 and 80),
  -- phone is nullable today (email/password auth) but unique-ready so that
  -- phone + OTP sign-in can become the primary identity without a rewrite.
  phone           text unique check (phone is null or phone ~ '^\+92[0-9]{10}$'),
  phone_verified  boolean not null default false,
  avatar_url      text,
  locale          text not null default 'en' check (locale in ('en', 'ur')),
  city            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- service_categories : plumber, electrician, ...
-- ---------------------------------------------------------------------------
create table if not exists public.service_categories (
  id          uuid primary key default extensions.gen_random_uuid(),
  slug        text not null unique,
  name_en     text not null,
  name_ur     text not null,
  icon        text not null default 'wrench',
  sort_order  integer not null default 0,
  is_active   boolean not null default true
);

-- ---------------------------------------------------------------------------
-- provider_profiles : the tradesperson side
-- ---------------------------------------------------------------------------
create table if not exists public.provider_profiles (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  bio                 text check (bio is null or length(bio) <= 600),
  experience_years    integer not null default 0 check (experience_years between 0 and 70),
  verification_status public.verification_status not null default 'unverified',
  is_online           boolean not null default false,
  current_location    extensions.geography(Point, 4326),
  location_updated_at timestamptz,
  service_radius_km   numeric(4,1) not null default 10 check (service_radius_km between 1 and 50),
  rating_avg          numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count        integer not null default 0,
  jobs_completed      integer not null default 0,
  -- platform's cut, recorded per provider so it can be negotiated later
  commission_rate     numeric(4,3) not null default 0.100 check (commission_rate between 0 and 0.5),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.provider_services (
  provider_id uuid not null references public.provider_profiles (user_id) on delete cascade,
  category_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (provider_id, category_id)
);

-- ---------------------------------------------------------------------------
-- jobs : a customer's request
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id                   uuid primary key default extensions.gen_random_uuid(),
  customer_id          uuid not null references public.profiles (id) on delete cascade,
  category_id          uuid not null references public.service_categories (id),
  title                text not null check (length(trim(title)) between 3 and 120),
  description          text not null check (length(trim(description)) between 10 and 2000),
  location             extensions.geography(Point, 4326) not null,
  address_text         text not null check (length(trim(address_text)) between 3 and 300),
  status               public.job_status not null default 'open',
  -- the customer's opening price, inDrive style; providers counter-offer
  budget_pkr           numeric(10,2) check (budget_pkr is null or budget_pkr > 0),
  is_urgent            boolean not null default false,
  scheduled_for        timestamptz,
  notify_radius_km     numeric(4,1) not null default 10 check (notify_radius_km between 1 and 50),
  assigned_provider_id uuid references public.profiles (id) on delete set null,
  accepted_offer_id    uuid,
  final_amount_pkr     numeric(10,2) check (final_amount_pkr is null or final_amount_pkr > 0),
  cancel_reason        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  assigned_at          timestamptz,
  completed_at         timestamptz,
  cancelled_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- job_offers : a provider's bid on a job
-- ---------------------------------------------------------------------------
create table if not exists public.job_offers (
  id          uuid primary key default extensions.gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  price_pkr   numeric(10,2) not null check (price_pkr > 0),
  eta_minutes integer not null check (eta_minutes between 1 and 1440),
  message     text check (message is null or length(message) <= 500),
  status      public.offer_status not null default 'pending',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (job_id, provider_id)
);

alter table public.jobs
  drop constraint if exists jobs_accepted_offer_id_fkey;
alter table public.jobs
  add constraint jobs_accepted_offer_id_fkey
  foreign key (accepted_offer_id) references public.job_offers (id) on delete set null;

-- ---------------------------------------------------------------------------
-- job_events : immutable timeline, useful for disputes and for the UI
-- ---------------------------------------------------------------------------
create table if not exists public.job_events (
  id          uuid primary key default extensions.gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  actor_id    uuid references public.profiles (id) on delete set null,
  event_type  text not null,
  from_status public.job_status,
  to_status   public.job_status,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- messages : in-job chat so phone numbers aren't the only channel
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id         uuid primary key default extensions.gen_random_uuid(),
  job_id     uuid not null references public.jobs (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 1000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reviews : two-way rating after completion
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default extensions.gen_random_uuid(),
  job_id      uuid not null references public.jobs (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  comment     text check (comment is null or length(comment) <= 600),
  created_at  timestamptz not null default now(),
  unique (job_id, reviewer_id),
  check (reviewer_id <> reviewee_id)
);

-- ---------------------------------------------------------------------------
-- commission_ledger : cash changes hands offline, the platform's cut is a debt
-- ---------------------------------------------------------------------------
create table if not exists public.commission_ledger (
  id              uuid primary key default extensions.gen_random_uuid(),
  job_id          uuid not null unique references public.jobs (id) on delete cascade,
  provider_id     uuid not null references public.profiles (id) on delete cascade,
  job_amount_pkr  numeric(10,2) not null check (job_amount_pkr > 0),
  commission_rate numeric(4,3) not null,
  commission_pkr  numeric(10,2) not null check (commission_pkr >= 0),
  status          public.ledger_status not null default 'due',
  created_at      timestamptz not null default now(),
  settled_at      timestamptz
);

-- ---------------------------------------------------------------------------
-- notifications : the "a job just appeared near you" ping, delivered realtime
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text not null,
  job_id     uuid references public.jobs (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- indexes
-- ---------------------------------------------------------------------------
create index if not exists provider_profiles_location_idx
  on public.provider_profiles using gist (current_location)
  where is_online = true;
create index if not exists provider_profiles_online_idx
  on public.provider_profiles (is_online) where is_online = true;
create index if not exists provider_services_category_idx
  on public.provider_services (category_id);

create index if not exists jobs_location_idx on public.jobs using gist (location);
create index if not exists jobs_customer_idx on public.jobs (customer_id, created_at desc);
create index if not exists jobs_provider_idx on public.jobs (assigned_provider_id, created_at desc);
create index if not exists jobs_open_idx on public.jobs (status, created_at desc) where status = 'open';

create index if not exists job_offers_job_idx on public.job_offers (job_id, created_at desc);
create index if not exists job_offers_provider_idx on public.job_offers (provider_id, created_at desc);
create index if not exists job_events_job_idx on public.job_events (job_id, created_at);
create index if not exists messages_job_idx on public.messages (job_id, created_at);
create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);
create index if not exists ledger_provider_idx on public.commission_ledger (provider_id, status);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
