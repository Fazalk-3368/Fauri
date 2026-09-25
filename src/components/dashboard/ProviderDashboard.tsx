'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Navigation, Radio, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useProviderLocation } from '@/lib/hooks/useProviderLocation';
import { useToast } from '@/components/ui/toast';
import { Alert, Badge, Button, Card, EmptyState } from '@/components/ui';
import { MapCanvas, type MapMarker } from '@/components/map/MapCanvas';
import { cn, errorMessage, formatDistance, formatPkr } from '@/lib/utils';
import type {
  AppNotification,
  Job,
  NearbyJob,
  Profile,
  ProviderProfile,
} from '@/lib/types/database';

function NearbyJobCard({ job, index }: { job: NearbyJob; index: number }) {
  const { dict, locale, fill } = useI18n();

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card
        interactive
        className={cn('animate-in-up p-4 sm:p-5', job.is_urgent && 'border-s-4 border-s-urgent')}
        style={{ animationDelay: `${index * 45}ms` }}
      >
        {/* Distance leads. It is the thing a tradesman actually decides on,
            and it used to be a small run-in between the trade and a dot. */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-soft-fg">
            <Navigation className="size-3.5" aria-hidden />
            {formatDistance(job.distance_m, locale)}
          </span>
          {job.is_urgent && (
            <Badge tone="urgent">
              <AlertTriangle className="size-3" aria-hidden />
              {dict.job.urgent}
            </Badge>
          )}
          <span className="text-xs text-muted">
            {locale === 'ur' ? job.category_ur : job.category_en}
          </span>
        </div>

        <h3 className="mt-2.5 truncate text-xl font-semibold">{job.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{job.description}</p>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-t border-border pt-3.5">
          {job.budget_pkr != null && (
            <p className="text-money font-bold tabular-nums">
              {formatPkr(job.budget_pkr, locale)}
            </p>
          )}

          {job.my_offer_id ? (
            <Badge tone={job.my_offer_status === 'pending' ? 'brand' : 'neutral'}>
              {dict.offer.yours}
            </Badge>
          ) : (
            Number(job.offer_count) > 0 && (
              <span className="text-xs text-muted">
                {fill(dict.job.offersCount, { n: Number(job.offer_count) })}
              </span>
            )
          )}

          <span className="ms-auto inline-flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {job.address_text}
          </span>
        </div>

        <p className="mt-2.5 text-xs text-muted">
          {fill(dict.job.postedAt, {
            time: formatDistanceToNow(new Date(job.created_at), { addSuffix: true }),
          })}
        </p>
      </Card>
    </Link>
  );
}

export function ProviderDashboard({
  profile,
  providerProfile,
  initialJobs,
  initialActiveJob,
}: {
  profile: Profile;
  providerProfile: ProviderProfile;
  initialJobs: NearbyJob[];
  initialActiveJob: Job | null;
}) {
  const { dict, locale, fill } = useI18n();
  const toast = useToast();

  const [isOnline, setIsOnline] = useState(providerProfile.is_online);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [jobs, setJobs] = useState<NearbyJob[]>(initialJobs);
  const [activeJob, setActiveJob] = useState<Job | null>(initialActiveJob);

  const { position, error: locationError, locating, requestLocation } =
    useProviderLocation(isOnline);

  const loadFeed = useCallback(async () => {
    const supabase = createClient();
    const [{ data: nearby }, { data: active }] = await Promise.all([
      supabase.rpc('nearby_open_jobs', { p_limit: 50 }),
      supabase
        .from('jobs')
        .select('*')
        .eq('assigned_provider_id', profile.id)
        .in('status', ['assigned', 'en_route', 'in_progress'])
        .order('assigned_at', { ascending: false })
        .limit(1),
    ]);

    setJobs(nearby ?? []);
    setActiveJob(active?.[0] ?? null);
  }, [profile.id]);

  // A nearby-job ping should refresh the feed without the provider doing anything.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`provider-feed:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          // Chat pings do not change the feed, and refetching on every message
          // during a conversation is pure noise.
          if ((payload.new as AppNotification).type !== 'new_message') void loadFeed();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, loadFeed]);

  const toggleOnline = async () => {
    setTogglingOnline(true);
    const next = !isOnline;

    // Going online is pointless without a position -- the matcher measures from it.
    if (next) {
      const pos = await requestLocation();
      if (!pos) {
        // No toast: the alert below already names the actual failure, and this
        // one hardcoded "permission denied" regardless of the real cause.
        setTogglingOnline(false);
        return;
      }
    }

    const { error } = await createClient()
      .from('provider_profiles')
      .update({ is_online: next })
      .eq('user_id', profile.id);

    if (error) {
      toast.error(errorMessage(error, dict.common.error));
    } else {
      setIsOnline(next);
      if (next) void loadFeed();
    }
    setTogglingOnline(false);
  };

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = jobs.map((job) => ({
      id: job.id,
      position: { lat: job.lat, lng: job.lng },
      kind: job.is_urgent ? 'urgent' : 'job',
    }));
    if (position) {
      list.push({ id: 'self', position, kind: 'self' });
    }
    return list;
  }, [jobs, position]);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* The online switch is the page hero: it is the one control that
          defines a tradesman's day, so it gets the weight to match. */}
      <Card
        className={cn(
          'flex flex-wrap items-center gap-4 p-5 transition-colors duration-200 sm:p-6',
          isOnline ? 'border-brand/30 bg-brand-soft' : 'bg-surface-2',
        )}
      >
        <span
          className={cn(
            'relative grid size-12 place-items-center rounded-full',
            isOnline ? 'bg-surface text-brand-ink' : 'bg-surface text-muted',
          )}
        >
          {isOnline && <span className="pulse-ring absolute inset-0 rounded-full text-brand" />}
          <Radio className="relative size-6" />
        </span>

        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">
            {isOnline ? dict.common.online : dict.common.offline}
          </p>
          <p className="mt-0.5 text-sm text-muted">{dict.provider.onlineHint}</p>
        </div>

        <Button
          className="ms-auto w-full sm:w-auto"
          size="lg"
          variant={isOnline ? 'secondary' : 'primary'}
          loading={togglingOnline || locating}
          onClick={toggleOnline}
        >
          {isOnline ? dict.provider.goOffline : dict.provider.goOnline}
        </Button>
      </Card>

      {locationError && (
        <Alert
          tone="danger"
          icon={AlertTriangle}
          title={dict.map[locationError]}
        />
      )}

      {/* the job they are already on */}
      {activeJob && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {dict.provider.activeJob}
          </h2>
          <Link href={`/jobs/${activeJob.id}`} className="block">
            <Card className="border-brand/40 p-4 transition-shadow hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone="brand">{dict.job.status[activeJob.status]}</Badge>
                  <h3 className="mt-2 truncate font-semibold">{activeJob.title}</h3>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted">
                    <MapPin className="size-3.5 shrink-0" />
                    {activeJob.address_text}
                  </p>
                </div>
                <p className="shrink-0 font-semibold">
                  {formatPkr(activeJob.final_amount_pkr, locale)}
                </p>
              </div>
            </Card>
          </Link>
        </section>
      )}

      {/* feed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {dict.provider.feedTitle}
          </h1>
          {isOnline && jobs.length > 0 && (
            <Badge tone="brand">{fill(dict.job.offersCount, { n: jobs.length })}</Badge>
          )}
        </div>

        {!isOnline ? (
          <EmptyState
            icon={Radio}
            title={dict.provider.offlineNotice}
            action={
              <Button size="lg" onClick={toggleOnline} loading={togglingOnline || locating}>
                {dict.provider.goOnline}
              </Button>
            }
          />
        ) : (
          <>
            {/* Shown whenever online, not only when jobs exist. "You are here,
                nothing nearby yet" is far more reassuring than an empty box. */}
            <MapCanvas
              className="h-52 sm:h-64"
              markers={markers}
              center={position}
              fitMarkers={markers.length > 1}
              zoom={13}
            />
            {jobs.length === 0 ? (
              <EmptyState
                icon={Search}
                title={dict.provider.noJobs}
                body={dict.provider.noJobsHint}
              />
            ) : (
              <div className="space-y-3">
                {jobs.map((job, i) => (
                  <NearbyJobCard key={job.id} job={job} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
