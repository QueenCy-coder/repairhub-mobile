// Locations for matching customers and technicians by distance.
// The API stores GeoJSON points ({ lng, lat }) on repair requests, customer profiles and technician profiles.
import { areaSpot } from './trackRoute';

export type Point = { lng: number; lat: number };

const LAGOS: Point = { lat: 6.5244, lng: 3.3792 };
/** RepairHub serves Lagos; a phone position further away than this (e.g. a test device abroad) isn't used. */
const SERVICE_RADIUS_KM = 150;

// Loaded lazily: an app build made before expo-location was added has no native part for it, and should fall back
// to the address instead of crashing.
let Location: typeof import('expo-location') | null | undefined;
function locationModule() {
  if (Location === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded on demand so a missing native module can be caught
    try { Location = require('expo-location'); } catch { Location = null; }
  }
  return Location;
}

/** Straight-line distance in km. */
export function distanceKm(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180, R = 6371;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "under 1 km", "2.4 km", "12 km". (Area-based locations aren't precise enough for metres.) */
export const kmLabel = (km: number) => (km < 1 ? 'under 1 km' : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);

/** A point from the API's GeoJSON ({ coordinates: [lng, lat] }); [0, 0] means "not set". */
export function fromGeo(g?: { coordinates?: number[] } | null): Point | null {
  const [lng, lat] = g?.coordinates ?? [];
  return typeof lng === 'number' && typeof lat === 'number' && (lng !== 0 || lat !== 0) ? { lng, lat } : null;
}

/** The phone's position, asking permission the first time; null if refused, unavailable or outside Lagos. */
export async function phonePoint(): Promise<Point | null> {
  const L = locationModule();
  if (!L) return null;
  try {
    const perm = await L.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    // A slow GPS fix shouldn't hold up the form: give up after 8 s and use the address instead.
    const pos = await Promise.race([
      L.getCurrentPositionAsync({ accuracy: L.Accuracy.Balanced }),
      new Promise<null>(r => setTimeout(() => r(null), 8000)),
    ]);
    if (!pos) return null;
    const p = { lng: pos.coords.longitude, lat: pos.coords.latitude };
    return distanceKm(p, LAGOS) <= SERVICE_RADIUS_KM ? p : null;
  } catch {
    return null;
  }
}

/** Approximate point for an address or area name (centre of the Lagos area it mentions). */
export function addressPoint(text?: string): Point | null {
  const s = areaSpot(text);
  return s ? { lng: s.longitude, lat: s.latitude } : null;
}

/** Best available location: the phone's position, else the address's area. */
export async function bestPoint(address?: string): Promise<Point | null> {
  return (await phonePoint()) ?? addressPoint(address);
}
