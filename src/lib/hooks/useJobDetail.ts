'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { JobDetail } from '@/lib/types/database';

/**
 * Keeps a job page live: new offers, status changes and the assigned
 * provider's position all arrive over realtime rather than a refresh.
 */
export function useJobDetail(jobId: string, initial: JobDetail) {
  const [detail, setDetail] = useState<JobDetail>(initial);
  const [refreshing, setRefreshing] = useState(false);

  // The server can hand us fresher data (router.refresh() after a notification,
  // a navigation, a tab focus). Adopt it when its timestamp moves forward.
  // This is React's documented "adjust state during render" pattern -- doing it
  // in an effect would render the stale job first and cascade an extra pass.
  const [seenStamp, setSeenStamp] = useState(initial.job.updated_at);
  if (initial.job.updated_at !== seenStamp) {
    setSeenStamp(initial.job.updated_at);
    setDetail(initial);
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const { data } = await createClient().rpc('job_detail', { p_job_id: jobId });
    if (data) setDetail(data);
    setRefreshing(false);
  }, [jobId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`job:${jobId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_offers', filter: `job_id=eq.${jobId}` },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, refresh]);

  // Follow the assigned provider's pin while they are on their way.
  const providerId = detail.provider?.id;
  const trackable =
    detail.job.status === 'en_route' || detail.job.status === 'assigned';

  useEffect(() => {
    if (!providerId || !trackable) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`provider-location:${providerId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'provider_profiles',
          filter: `user_id=eq.${providerId}`,
        },
        (payload) => {
          const next = payload.new as { lat: number | null; lng: number | null };
          setDetail((prev) =>
            prev.provider
              ? { ...prev, provider: { ...prev.provider, lat: next.lat, lng: next.lng } }
              : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [providerId, trackable]);

  // postgres_changes delivery for jobs/job_offers proved unreliable in testing,
  // so re-sync when the user returns to the tab. Cheap, and it means a job page
  // is never silently stale even if the socket drops.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  return { detail, refresh, refreshing, setDetail };
}
