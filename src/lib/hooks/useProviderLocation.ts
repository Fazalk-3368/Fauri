'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { browserLocation, haversineMetres, type LatLng } from '@/lib/map';

/** Metres a provider must move before we spend a write on a position update. */
const MIN_MOVE_M = 40;

/**
 * Keeps the provider's position in `provider_profiles` roughly current.
 * Only pushes when they are online and have actually moved, so a phone sitting
 * on a workbench does not hammer the database.
 */
export function useProviderLocation(isOnline: boolean) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<'denied' | 'unsupported' | null>(null);
  const [locating, setLocating] = useState(false);
  const lastPushed = useRef<LatLng | null>(null);

  const push = useCallback(async (next: LatLng) => {
    const previous = lastPushed.current;
    if (previous && haversineMetres(previous, next) < MIN_MOVE_M) return;
    lastPushed.current = next;
    await createClient().rpc('update_provider_location', {
      p_lat: next.lat,
      p_lng: next.lng,
    });
  }, []);

  const requestLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    try {
      const pos = await browserLocation();
      setPosition(pos);
      await push(pos);
      return pos;
    } catch (err) {
      setError(err instanceof Error && err.message === 'unsupported' ? 'unsupported' : 'denied');
      return null;
    } finally {
      setLocating(false);
    }
  }, [push]);

  // Follow the provider while they are online so customers tracking them see
  // movement, and so the matcher measures from where they actually are.
  useEffect(() => {
    if (!isOnline || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(next);
        void push(next);
      },
      () => setError('denied'),
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 20000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, push]);

  return { position, error, locating, requestLocation };
}
