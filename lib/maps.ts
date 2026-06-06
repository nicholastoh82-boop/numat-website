// lib/maps.ts
//
// Google Maps Platform helper used by the geocode-leads cron and by any
// future server-side code that needs to resolve addresses to coordinates
// or compute distance from the NUMAT factory.
//
// All calls use MAPS_API_KEY (restricted to Geocoding API + Distance Matrix
// API + Places API + Maps JS API at the GCP layer). Calls bill to the
// numat-automation Cloud Billing account, drawing from the Google for
// Startups Maps Platform credits (USD 600/month).
//
// NUMAT factory address is hardcoded here; if the factory ever moves,
// update FACTORY_ADDRESS and clear the in-process cache.

const FACTORY_ADDRESS =
  'Global Agro Milling Corp Warehouse B22, Barangay Alae, Manolo Fortich, Bukidnon 8703, Philippines';

const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export type LatLng = { lat: number; lng: number };

export type GeocodeResult = {
  lat: number;
  lng: number;
  formatted_address: string;
  precision: 'rooftop' | 'range_interpolated' | 'geometric_center' | 'approximate' | 'unknown';
};

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var not set`);
  return v;
}

// Module-scoped cache of the factory coordinates. Vercel reuses warm function
// instances so this avoids re-geocoding the same address on every cron tick.
let factoryCoordsCache: LatLng | null = null;

function mapLocationType(t: string | undefined): GeocodeResult['precision'] {
  switch (t) {
    case 'ROOFTOP':
      return 'rooftop';
    case 'RANGE_INTERPOLATED':
      return 'range_interpolated';
    case 'GEOMETRIC_CENTER':
      return 'geometric_center';
    case 'APPROXIMATE':
      return 'approximate';
    default:
      return 'unknown';
  }
}

/**
 * Geocode a freeform address string using Google Geocoding API.
 * Returns null if the address could not be resolved.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || !address.trim()) return null;
  const apiKey = required('MAPS_API_KEY');
  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(address.trim())}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding API failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as any;
  if (data.status === 'ZERO_RESULTS') return null;
  if (data.status !== 'OK') {
    throw new Error(`Geocoding API status ${data.status}: ${data.error_message || ''}`);
  }
  const first = data.results?.[0];
  if (!first) return null;
  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formatted_address: first.formatted_address,
    precision: mapLocationType(first.geometry.location_type),
  };
}

/**
 * Returns the NUMAT factory coordinates. Geocodes once and caches in module scope.
 */
export async function getFactoryCoords(): Promise<LatLng> {
  if (factoryCoordsCache) return factoryCoordsCache;
  const r = await geocodeAddress(FACTORY_ADDRESS);
  if (!r) {
    // Fallback to a hardcoded approximate coordinate for Manolo Fortich, Bukidnon
    // in case the API call fails. Better to have rough distances than none.
    factoryCoordsCache = { lat: 8.369, lng: 124.867 };
    return factoryCoordsCache;
  }
  factoryCoordsCache = { lat: r.lat, lng: r.lng };
  return factoryCoordsCache;
}

/**
 * Haversine great-circle distance in kilometres between two points.
 * Free, runs locally, no API call. Accurate to within a few km for most
 * sales prioritization purposes. Use Distance Matrix API later for real
 * road distance if needed.
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Tiered freight estimate per board in PHP, based on distance from the
 * NUMAT factory in Manolo Fortich, Bukidnon. These are rough planning
 * numbers, NOT actual quotes. The real freight quote depends on volume,
 * mode (truck/RoRo/air/sea), insurance, packaging, and current fuel prices.
 *
 * The tiers reflect typical Philippines logistics bands:
 *   <50 km   PHP 100/board   Within Bukidnon, truck delivery
 *   50-200   PHP 250/board   Mindanao mainland, e.g. CDO, Davao, GenSan
 *   200-800  PHP 600/board   Inter-island Mindanao to Visayas
 *   800-2000 PHP 1300/board  Mindanao to Luzon (Manila), RoRo + truck
 *   >2000    PHP 2800/board  International, very rough estimate
 */
export function freightEstimatePhp(distanceKm: number): number {
  if (distanceKm < 50) return 100;
  if (distanceKm < 200) return 250;
  if (distanceKm < 800) return 600;
  if (distanceKm < 2000) return 1300;
  return 2800;
}
