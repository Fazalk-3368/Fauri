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

export function browserLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  });
}
