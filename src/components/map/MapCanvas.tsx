'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { DEFAULT_CENTER, mapStyle, type LatLng } from '@/lib/map';
import { cn } from '@/lib/utils';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapMarker = {
  id: string;
  position: LatLng;
  kind: 'job' | 'provider' | 'self' | 'urgent';
  label?: string;
  onClick?: () => void;
};

type Props = {
  center?: LatLng | null;
  zoom?: number;
  markers?: MapMarker[];
  /** Makes the map a location picker: click or drag moves the pin. */
  draggablePin?: LatLng | null;
  onPinMove?: (next: LatLng) => void;
  fitMarkers?: boolean;
  interactive?: boolean;
  className?: string;
};

const MARKER_STYLES: Record<MapMarker['kind'], string> = {
  job: 'bg-brand',
  urgent: 'bg-urgent',
  provider: 'bg-[oklch(0.55_0.13_250)]',
  self: 'bg-fg',
};

function markerElement(marker: MapMarker) {
  const el = document.createElement('div');
  el.className = 'relative flex items-center justify-center';
  el.style.cursor = marker.onClick ? 'pointer' : 'default';

  const dot = document.createElement('div');
  dot.className = cn(
    'relative size-4 rounded-full border-2 border-white shadow-md',
    MARKER_STYLES[marker.kind],
  );
  if (marker.kind === 'provider' || marker.kind === 'urgent') {
    dot.classList.add('pulse-ring');
  }
  el.appendChild(dot);

  if (marker.label) {
    const label = document.createElement('span');
    label.textContent = marker.label;
    label.className =
      'absolute top-5 whitespace-nowrap rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-neutral-900 shadow-sm';
    el.appendChild(label);
  }

  if (marker.onClick) el.addEventListener('click', marker.onClick);
  return el;
}

export function MapCanvas({
  center,
  zoom = 14,
  markers = [],
  draggablePin,
  onPinMove,
  fitMarkers,
  interactive = true,
  className,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const pinMarker = useRef<Marker | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());
  const onPinMoveRef = useRef(onPinMove);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPinMoveRef.current = onPinMove;
  }, [onPinMove]);

  // Create the map once. maplibre-gl touches `window`, so it is imported lazily.
  useEffect(() => {
    let cancelled = false;
    let instance: MapLibreMap | null = null;

    (async () => {
      const maplibre = await import('maplibre-gl');
      if (cancelled || !container.current) return;

      const start = center ?? draggablePin ?? DEFAULT_CENTER;
      instance = new maplibre.Map({
        container: container.current,
        style: mapStyle(),
        center: [start.lng, start.lat],
        zoom,
        interactive,
        attributionControl: { compact: true },
      });
      instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
      instance.on('load', () => !cancelled && setReady(true));
      map.current = instance;
    })();

    const markers = markerRefs.current;
    return () => {
      cancelled = true;
      markers.forEach((m) => m.remove());
      markers.clear();
      pinMarker.current?.remove();
      pinMarker.current = null;
      instance?.remove();
      map.current = null;
    };
    // Intentionally mount-only: later prop changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentre when the caller moves the view.
  useEffect(() => {
    if (!ready || !map.current || !center) return;
    map.current.easeTo({ center: [center.lng, center.lat], duration: 600 });
  }, [ready, center]);

  // The draggable pin used by the "where are you?" picker.
  useEffect(() => {
    if (!ready || !map.current) return;
    const m = map.current;

    if (!draggablePin) {
      pinMarker.current?.remove();
      pinMarker.current = null;
      return;
    }

    let disposed = false;
    (async () => {
      const maplibre = await import('maplibre-gl');
      if (disposed || !map.current) return;

      if (!pinMarker.current) {
        const el = document.createElement('div');
        el.className =
          'size-7 -translate-y-3 rounded-full border-[3px] border-white bg-brand shadow-lg';
        pinMarker.current = new maplibre.Marker({ element: el, draggable: true })
          .setLngLat([draggablePin.lng, draggablePin.lat])
          .addTo(map.current);

        pinMarker.current.on('dragend', () => {
          const { lat, lng } = pinMarker.current!.getLngLat();
          onPinMoveRef.current?.({ lat, lng });
        });
      } else {
        pinMarker.current.setLngLat([draggablePin.lng, draggablePin.lat]);
      }
    })();

    const handleClick = (e: { lngLat: { lat: number; lng: number } }) => {
      onPinMoveRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    };
    m.on('click', handleClick);

    return () => {
      disposed = true;
      m.off('click', handleClick);
    };
  }, [ready, draggablePin]);

  // Reconcile the marker set against the map.
  useEffect(() => {
    if (!ready || !map.current) return;
    let disposed = false;

    (async () => {
      const maplibre = await import('maplibre-gl');
      if (disposed || !map.current) return;

      const seen = new Set(markers.map((m) => m.id));
      markerRefs.current.forEach((marker, id) => {
        if (!seen.has(id)) {
          marker.remove();
          markerRefs.current.delete(id);
        }
      });

      for (const marker of markers) {
        const existing = markerRefs.current.get(marker.id);
        if (existing) {
          existing.setLngLat([marker.position.lng, marker.position.lat]);
          continue;
        }
        const created = new maplibre.Marker({ element: markerElement(marker) })
          .setLngLat([marker.position.lng, marker.position.lat])
          .addTo(map.current);
        markerRefs.current.set(marker.id, created);
      }

      if (fitMarkers && markers.length > 1) {
        const bounds = new maplibre.LngLatBounds();
        markers.forEach((m) => bounds.extend([m.position.lng, m.position.lat]));
        map.current.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
      }
    })();

    return () => {
      disposed = true;
    };
  }, [ready, markers, fitMarkers]);

  return (
    <div
      ref={container}
      className={cn('relative w-full overflow-hidden rounded-2xl bg-surface-2', className)}
      // MapLibre's own controls are LTR; keep the canvas out of the RTL flip.
      dir="ltr"
    />
  );
}
