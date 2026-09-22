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

  return { detail, refresh, refreshing, setDetail };
}
