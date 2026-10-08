// Shared route for the "technician on the way" map: from the technician's workshop to the customer.
import React from 'react';
import { LEKKI } from './data';

export type LatLng = { latitude: number; longitude: number };

/** Lagos neighbourhoods we can place on the map from a typed address (demo geocoder, no network needed). */
const AREAS: [RegExp, number, number][] = [
  [/surulere|bode thomas|adeniran|ogunlana/i, 6.4969, 3.3553],
  [/yaba|akoka|sabo/i, 6.5095, 3.3711],
  [/ikeja|allen|opebi|alausa/i, 6.6018, 3.3515],
  [/victoria island|\bv\.?i\b|adeola odeku|ahmadu bello/i, 6.4281, 3.4219],
  [/ikoyi|bourdillon|awolowo/i, 6.4549, 3.4346],
  [/ajah|sangotedo|abraham adesanya/i, 6.4698, 3.5852],
  [/lekki|admiralty|chevron|osapa|ikate/i, 6.4452, 3.4704],
  [/gbagada|anthony|maryland/i, 6.5539, 3.3878],
  [/festac|amuwo/i, 6.4664, 3.2836],
  [/ikorodu/i, 6.6194, 3.5105],
];
export function customerSpot(address?: string): LatLng {
  const hit = AREAS.find(([re]) => re.test(address ?? ''));
  return hit ? { latitude: hit[1], longitude: hit[2] } : { latitude: LEKKI.lat, longitude: LEKKI.lng };
}

/** Road-like path (gentle zig-zag) from the technician's workshop ~3 km away to the customer. */
export function routeTo(dest: LatLng): LatLng[] {
  const from = { latitude: dest.latitude - 0.0135, longitude: dest.longitude + 0.0215 };
  const n = 6;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, bend = i > 0 && i < n ? (i % 2 ? 0.0018 : -0.0012) : 0;
    return { latitude: from.latitude + (dest.latitude - from.latitude) * t + bend, longitude: from.longitude + (dest.longitude - from.longitude) * t };
  });
}
/** Map window that fits the whole route. */
export function regionFor(route: LatLng[]) {
  const la = route.map(r => r.latitude), lo = route.map(r => r.longitude);
  const [a, b, c, d] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  return { latitude: (a + b) / 2, longitude: (c + d) / 2, latitudeDelta: (b - a) * 1.6 + 0.004, longitudeDelta: (d - c) * 1.6 + 0.004, bbox: [c - 0.004, a - 0.003, d + 0.004, b + 0.003] };
}
const TRIP_MS = 6 * 60 * 1000;

/** Where the technician is `elapsed` ms after setting off (moves along the route, arrives after 6 min). */
export function techPosition(elapsed: number, ROUTE: LatLng[]): { at: LatLng; minsLeft: number; walked: LatLng[] } {
  const f = Math.min(1, Math.max(0, elapsed / TRIP_MS));
  const seg = f * (ROUTE.length - 1), i = Math.min(ROUTE.length - 2, Math.floor(seg)), t = seg - i;
  const a = ROUTE[i], b = ROUTE[i + 1];
  const at = { latitude: a.latitude + (b.latitude - a.latitude) * t, longitude: a.longitude + (b.longitude - a.longitude) * t };
  return { at, minsLeft: Math.max(1, Math.ceil((1 - f) * 6)), walked: [...ROUTE.slice(0, i + 1), at] };
}

/** Re-renders every few seconds so the marker moves. */
export function useTick(ms = 3000) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}
