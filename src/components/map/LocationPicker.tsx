'use client';

import { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { MapCanvas } from './MapCanvas';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n/provider';
import { browserLocation, DEFAULT_CENTER, type LatLng } from '@/lib/map';

export function LocationPicker({
  value,
  onChange,
  className = 'h-64 sm:h-72',
  autoLocate = true,
}: {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  className?: string;
  autoLocate?: boolean;
}) {
  const { dict } = useI18n();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState<LatLng | null>(value);

  const locate = async () => {
    setLocating(true);
    setError(null);
    try {
      const pos = await browserLocation();
      onChange(pos);
      setCenter(pos);
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'unsupported'
          ? dict.map.unsupported
          : dict.map.denied,
      );
    } finally {
      setLocating(false);
    }
  };

  // Ask for the browser's position once on mount; a refusal is not an error
  // the user needs shouted at them, they can still drag the pin.
  useEffect(() => {
    if (!autoLocate || value) return;
    let cancelled = false;
    // State only moves inside the promise callbacks, never in the effect body.
    browserLocation()
      .then((pos) => {
        if (cancelled) return;
        onChange(pos);
        setCenter(pos);
      })
      .catch(() => {
        if (!cancelled) onChange(DEFAULT_CENTER);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapCanvas
          className={className}
          center={center}
          draggablePin={value ?? DEFAULT_CENTER}
          onPinMove={(next) => {
            onChange(next);
            setError(null);
          }}
          zoom={16}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={locating}
          onClick={locate}
          className="absolute bottom-3 start-3 z-10 shadow-[var(--shadow-lift)]"
        >
          {!locating && <Crosshair className="size-4" aria-hidden />}
          {locating ? dict.map.locating : dict.map.useMyLocation}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <p className="text-xs text-muted">{dict.job.locationHint}</p>
    </div>
  );
}
