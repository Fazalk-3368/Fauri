'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Navigation, Radio, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';
import { useProviderLocation } from '@/lib/hooks/useProviderLocation';
import { useToast } from '@/components/ui/toast';
import { Badge, Button, Card, EmptyState, Spinner } from '@/components/ui';
import { MapCanvas, type MapMarker } from '@/components/map/MapCanvas';
import { cn, errorMessage, formatDistance, formatPkr } from '@/lib/utils';
import type { Job, NearbyJob, Profile, ProviderProfile } from '@/lib/types/database';

function NearbyJobCard({ job }: { job: NearbyJob }) {
  const { dict, locale, fill } = useI18n();

  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card
        className={cn(
          'p-4 transition-shadow hover:shadow-[var(--shadow-lift)]',
          job.is_urgent && 'border-urgent/40',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {job.is_urgent && <Badge tone="urgent">{dict.job.urgent}</Badge>}
              <span className="text-xs text-muted">
                {locale === 'ur' ? job.category_ur : job.category_en}
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                <Navigation className="size-3" />
                {formatDistance(job.distance_m, locale)}
              </span>
            </div>

            <h3 className="mt-2 truncate font-semibold">{job.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted">{job.description}</p>
            <p className="mt-2 flex items-center gap-1 truncate text-xs text-muted">
              <MapPin className="size-3.5 shrink-0" />
              {job.address_text}
            </p>
          </div>

          <div className="shrink-0 text-end">
            {job.budget_pkr != null && (
              <p className="font-semibold">{formatPkr(job.budget_pkr, locale)}</p>
            )}
            {job.my_offer_id ? (
              <Badge
                tone={job.my_offer_status === 'pending' ? 'brand' : 'neutral'}
                className="mt-1"
              >
                {dict.offer.yours}
              </Badge>
            ) : (
              Number(job.offer_count) > 0 && (
                <p className="mt-1 text-xs text-muted">
                  {fill(dict.job.offersCount, { n: Number(job.offer_count) })}
                </p>
              )
            )}
          </div>
        </div>

        <p className="mt-3 border-t border-border pt-2.5 text-xs text-muted">
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
  const [loadingFeed, setLoadingFeed] = useState(false);

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
    setLoadingFeed(false);
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
        () => void loadFeed(),
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
        setTogglingOnline(false);
        toast.error(dict.map.denied);
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
    <div className="space-y-6">
      {/* online switch */}
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'relative grid size-10 place-items-center rounded-full',
              isOnline ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-muted',
            )}
          >
            <Radio className="size-5" />
          </span>
          <div>
            <p className="font-semibold">
              {isOnline ? dict.common.online : dict.common.offline}
            </p>
            <p className="text-xs text-muted">{dict.provider.onlineHint}</p>
          </div>
        </div>

        <Button
          className="ms-auto"
          variant={isOnline ? 'secondary' : 'primary'}
          loading={togglingOnline || locating}
          onClick={toggleOnline}
        >
          {isOnline ? dict.provider.goOffline : dict.provider.goOnline}
        </Button>
      </Card>

      {locationError && (
        <Card className="flex items-start gap-3 border-danger/30 bg-danger-soft p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
          <p className="text-sm text-danger">
            {locationError === 'unsupported' ? dict.map.unsupported : dict.map.denied}
          </p>
        </Card>
      )}

      {/* the job they are already on */}
      {activeJob && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            {dict.provider.activeJob}
          </h2>
          <Link href={`/jobs/${activeJob.id}`} className="block">
            <Card className="border-brand/40 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]">
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
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{dict.provider.feedTitle}</h1>
          {jobs.length > 0 && (
            <span className="text-sm text-muted">
              {fill(dict.job.offersCount, { n: jobs.length })}
            </span>
          )}
        </div>

        {!isOnline ? (
          <EmptyState
            icon={Radio}
            title={dict.provider.offlineNotice}
            action={
              <Button onClick={toggleOnline} loading={togglingOnline || locating}>
                {dict.provider.goOnline}
              </Button>
            }
          />
        ) : loadingFeed ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState icon={Search} title={dict.provider.noJobs} body={dict.provider.noJobsHint} />
        ) : (
          <>
            <MapCanvas className="h-56" markers={markers} center={position} fitMarkers zoom={13} />
            <div className="space-y-3">
              {jobs.map((job) => (
                <NearbyJobCard key={job.id} job={job} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
