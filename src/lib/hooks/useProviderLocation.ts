'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  browserLocation,
  haversineMetres,
  LocationError,
  type LatLng,
  type LocationErrorKind,
} from '@/lib/map';

/** Metres a provider must move before we spend a write on a position update. */
const MIN_MOVE_M = 40;

/**
 * Keeps the provider's position in `provider_profiles` roughly current.
 * Only pushes when they are online and have actually moved, so a phone sitting
 * on a workbench does not hammer the database.
 */
export function useProviderLocation(isOnline: boolean) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<LocationErrorKind | null>(null);
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
      // Report what actually happened. Every failure used to be shown as a
      // refused permission, so a GPS timeout told people to change a setting
      // they had already granted.
      setError(err instanceof LocationError ? err.kind : 'unavailable');
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
      (err) => {
        // Only a revoked permission is worth interrupting someone over. A
        // watch times out constantly while travelling through tunnels and
        // basements, and the last known position is still usable.
        if (err.code === err.PERMISSION_DENIED) setError('denied');
      },
      { enableHighAccuracy: true, maximumAge: 20000, timeout: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, push]);

  return { position, error, locating, requestLocation };
}
