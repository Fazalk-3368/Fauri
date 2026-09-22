-- Labeeb :: extensions + enum types
-- PostGIS powers the "which providers are near this job" matching.

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('customer', 'provider', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.job_status as enum (
    'open',        -- posted, waiting for offers
    'assigned',    -- an offer was accepted
    'en_route',    -- provider is travelling
    'in_progress', -- work started
    'completed',
    'cancelled',
    'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_status as enum ('due', 'settled', 'waived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'new_job_nearby',
    'offer_received',
    'offer_accepted',
    'offer_rejected',
    'job_status_changed',
    'job_cancelled',
    'new_message',
    'review_received'
  );
exception when duplicate_object then null; end $$;
