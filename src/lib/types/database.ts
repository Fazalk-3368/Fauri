// Hand-maintained mirror of the SQL schema in supabase/migrations.
//
// NOTE: these are `type` aliases, not `interface`s, and must stay that way.
// Interfaces do not get TypeScript's implicit index signature, so a Database
// built from them fails supabase-js's `GenericSchema` constraint -- which does
// not error, it silently degrades every table and RPC to `never`.
// Regenerate with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/types/database.ts

export type UserRole = 'customer' | 'provider' | 'admin';

export type JobStatus =
  | 'open'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type LedgerStatus = 'due' | 'settled' | 'waived';

export type NotificationType =
  | 'new_job_nearby'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'job_status_changed'
  | 'job_cancelled'
  | 'new_message'
  | 'review_received';

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  locale: 'en' | 'ur';
  city: string | null;
  created_at: string;
  updated_at: string;
}

export type ProviderProfile = {
  user_id: string;
  bio: string | null;
  experience_years: number;
  verification_status: VerificationStatus;
  is_online: boolean;
  current_location: unknown | null;
  location_updated_at: string | null;
  service_radius_km: number;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  commission_rate: number;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}

export type ServiceCategory = {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export type Job = {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  location: unknown;
  /** Generated from `location` so the client never parses GeoJSON. */
  lat: number;
  lng: number;
  address_text: string;
  status: JobStatus;
  budget_pkr: number | null;
  is_urgent: boolean;
  scheduled_for: string | null;
  notify_radius_km: number;
  assigned_provider_id: string | null;
  accepted_offer_id: string | null;
  final_amount_pkr: number | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  assigned_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export type JobOffer = {
  id: string;
  job_id: string;
  provider_id: string;
  price_pkr: number;
  eta_minutes: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export type JobEvent = {
  id: string;
  job_id: string;
  actor_id: string | null;
  event_type: string;
  from_status: JobStatus | null;
  to_status: JobStatus | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Message = {
  id: string;
  job_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export type Review = {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type CommissionLedgerRow = {
  id: string;
  job_id: string;
  provider_id: string;
  job_amount_pkr: number;
  commission_rate: number;
  commission_pkr: number;
  status: LedgerStatus;
  created_at: string;
  settled_at: string | null;
}

export type AppNotification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  job_id: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

/** Row shape returned by the `nearby_open_jobs` RPC. */
export type NearbyJob = {
  id: string;
  title: string;
  description: string;
  address_text: string;
  category_id: string;
  category_en: string;
  category_ur: string;
  icon: string;
  budget_pkr: number | null;
  is_urgent: boolean;
  scheduled_for: string | null;
  created_at: string;
  lat: number;
  lng: number;
  distance_m: number;
  customer_name: string;
  offer_count: number;
  my_offer_id: string | null;
  my_offer_price: number | null;
  my_offer_status: OfferStatus | null;
}

/** Row shape returned by the `customer_jobs` RPC. */
export type CustomerJob = {
  id: string;
  title: string;
  description: string;
  address_text: string;
  status: JobStatus;
  category_en: string;
  category_ur: string;
  icon: string;
  budget_pkr: number | null;
  final_amount_pkr: number | null;
  is_urgent: boolean;
  created_at: string;
  lat: number;
  lng: number;
  offer_count: number;
  provider_name: string | null;
  has_review: boolean;
};

/** Row shape returned by the `nearby_providers` RPC. */
export type NearbyProvider = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  verification_status: VerificationStatus;
  lat: number;
  lng: number;
  distance_m: number;
}

/** Shape returned by the `job_detail` RPC. */
export type JobDetailOffer = {
  id: string;
  provider_id: string;
  price_pkr: number;
  eta_minutes: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  provider_name: string;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
  verification_status: VerificationStatus;
}

export type JobDetailEvent = {
  id: string;
  event_type: string;
  from_status: JobStatus | null;
  to_status: JobStatus | null;
  created_at: string;
  metadata: Record<string, unknown>;
  actor_name: string | null;
}

export type JobDetail = {
  job: Omit<Job, 'location'>;
  lat: number;
  lng: number;
  category: ServiceCategory;
  customer: { id: string; full_name: string; phone: string | null };
  provider: {
    id: string;
    full_name: string;
    phone: string | null;
    rating_avg: number;
    rating_count: number;
    jobs_completed: number;
    lat: number | null;
    lng: number | null;
    location_updated_at: string | null;
  } | null;
  offers: JobDetailOffer[];
  events: JobDetailEvent[];
  my_review: Review | null;
}

type Table<Row, Rel extends readonly unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  /** Foreign keys, so PostgREST embeds (`jobs(*, category:...)`) type-check. */
  Relationships: Rel;
};

type FK<Name extends string, Col extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      provider_profiles: Table<
        ProviderProfile,
        [FK<'provider_profiles_user_id_fkey', 'user_id', 'profiles'>]
      >;
      service_categories: Table<ServiceCategory>;
      provider_services: Table<
        { provider_id: string; category_id: string },
        [
          FK<'provider_services_provider_id_fkey', 'provider_id', 'provider_profiles'>,
          FK<'provider_services_category_id_fkey', 'category_id', 'service_categories'>,
        ]
      >;
      jobs: Table<
        Job,
        [
          FK<'jobs_customer_id_fkey', 'customer_id', 'profiles'>,
          FK<'jobs_category_id_fkey', 'category_id', 'service_categories'>,
          FK<'jobs_assigned_provider_id_fkey', 'assigned_provider_id', 'profiles'>,
          FK<'jobs_accepted_offer_id_fkey', 'accepted_offer_id', 'job_offers'>,
        ]
      >;
      job_offers: Table<
        JobOffer,
        [
          FK<'job_offers_job_id_fkey', 'job_id', 'jobs'>,
          FK<'job_offers_provider_id_fkey', 'provider_id', 'profiles'>,
        ]
      >;
      job_events: Table<
        JobEvent,
        [
          FK<'job_events_job_id_fkey', 'job_id', 'jobs'>,
          FK<'job_events_actor_id_fkey', 'actor_id', 'profiles'>,
        ]
      >;
      messages: Table<
        Message,
        [
          FK<'messages_job_id_fkey', 'job_id', 'jobs'>,
          FK<'messages_sender_id_fkey', 'sender_id', 'profiles'>,
        ]
      >;
      reviews: Table<
        Review,
        [
          FK<'reviews_job_id_fkey', 'job_id', 'jobs'>,
          FK<'reviews_reviewer_id_fkey', 'reviewer_id', 'profiles'>,
          FK<'reviews_reviewee_id_fkey', 'reviewee_id', 'profiles'>,
        ]
      >;
      commission_ledger: Table<
        CommissionLedgerRow,
        [
          FK<'commission_ledger_job_id_fkey', 'job_id', 'jobs'>,
          FK<'commission_ledger_provider_id_fkey', 'provider_id', 'profiles'>,
        ]
      >;
      notifications: Table<
        AppNotification,
        [
          FK<'notifications_user_id_fkey', 'user_id', 'profiles'>,
          FK<'notifications_job_id_fkey', 'job_id', 'jobs'>,
        ]
      >;
    };
    Views: Record<never, never>;
    Functions: {
      update_provider_location: {
        Args: { p_lat: number; p_lng: number };
        Returns: undefined;
      };
      nearby_open_jobs: { Args: { p_limit?: number }; Returns: NearbyJob[] };
      nearby_providers: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_km?: number;
          p_category_id?: string | null;
        };
        Returns: NearbyProvider[];
      };
      accept_offer: { Args: { p_offer_id: string }; Returns: Job };
      update_job_status: {
        Args: { p_job_id: string; p_status: JobStatus };
        Returns: Job;
      };
      complete_job: {
        Args: { p_job_id: string; p_final_amount?: number | null };
        Returns: Job;
      };
      cancel_job: { Args: { p_job_id: string; p_reason?: string | null }; Returns: Job };
      mark_notifications_read: { Args: { p_ids?: string[] | null }; Returns: number };
      create_job: {
        Args: {
          p_category_id: string;
          p_title: string;
          p_description: string;
          p_lat: number;
          p_lng: number;
          p_address_text: string;
          p_budget_pkr?: number | null;
          p_is_urgent?: boolean;
          p_notify_radius_km?: number;
          p_scheduled_for?: string | null;
        };
        Returns: Job;
      };
      job_detail: { Args: { p_job_id: string }; Returns: JobDetail };
      customer_jobs: { Args: { p_limit?: number }; Returns: CustomerJob[] };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      offer_status: OfferStatus;
      verification_status: VerificationStatus;
      ledger_status: LedgerStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<never, never>;
  };
}
