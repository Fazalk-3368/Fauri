import type { StyleSpecification } from 'maplibre-gl';

/** Lahore — a sane default before we know where the user is. */
export const DEFAULT_CENTER = { lat: 31.5204, lng: 74.3587 };

/**
 * Raster OSM works with no API key, which keeps local setup to zero.
 * For production set NEXT_PUBLIC_MAP_STYLE_URL to a MapTiler / Protomaps /
 * CARTO style URL — OSM's tile servers are not meant to serve an app's traffic.
 */
export const MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;

export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

export function mapStyle(): string | StyleSpecification {
  return MAP_STYLE_URL ?? OSM_RASTER_STYLE;
}

export type LatLng = { lat: number; lng: number };

/** Straight-line distance in metres. Good enough for "how far away is this?". */
export function haversineMetres(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type LocationErrorKind = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

/** Carries which of the three browser failures happened, not just that one did. */
export class LocationError extends Error {
  readonly kind: LocationErrorKind;
  constructor(kind: LocationErrorKind) {
    super(kind);
    this.name = 'LocationError';
    this.kind = kind;
  }
}

export function browserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new LocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new LocationError(
            err.code === err.PERMISSION_DENIED
              ? 'denied'
              : err.code === err.TIMEOUT
                ? 'timeout'
                : 'unavailable',
          ),
        ),
      // Deliberately coarse. A high-accuracy fix needs GPS, which indoors or
      // under cloud can take far longer than anyone will wait, and the failure
      // looked identical to a refused permission. Network positioning answers
      // in a second or two and is easily good enough to match a job; the watch
      // below then refines it with GPS once the provider is moving.
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
    );
  });
}
