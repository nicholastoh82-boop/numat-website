// app/api/cron/geocode-leads/route.ts
//
// Vercel Cron: every 30 minutes.
// Picks leads from master_leads that have city or address info and have not
// yet been geocoded (or were geocoded > 90 days ago for refresh). Calls the
// Google Geocoding API to resolve coordinates, computes Haversine distance
// from the NUMAT factory in Manolo Fortich, Bukidnon, and assigns a tiered
// freight estimate. Writes everything back to master_leads.
//
// Throughput is controlled by two env vars:
//   GEOCODE_MAX_PER_RUN   Default 50. Cap 200.
//   GEOCODE_CONCURRENCY   Default 10. Cap 20.
//
// Each geocode call is ~150 ms, so 50 leads with 10 workers complete in well
// under 30 sec. Geocoding API is cheap ($0.005 per request, with $200 free
// per month included in Maps Platform credits).
//
// Cost note: with 2648 leads and current city coverage (505 leads), one full
// backfill of the geocodable subset costs about USD 2.50. Plenty of headroom
// in the $600/month Maps credit.

import { authorized, supabaseGetRaw, supabasePatch } from '@/lib/cron/helpers';
import {
  geocodeAddress,
  getFactoryCoords,
  haversineKm,
  freightEstimatePhp,
} from '@/lib/maps';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

type LeadRow = {
  id: string;
  email: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
};

function batchSize(): number {
  const raw = process.env.GEOCODE_MAX_PER_RUN;
  const n = raw ? parseInt(raw, 10) : 50;
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, 200);
}

function concurrency(): number {
  const raw = process.env.GEOCODE_CONCURRENCY;
  const n = raw ? parseInt(raw, 10) : 10;
  if (!Number.isFinite(n) || n <= 0) return 10;
  return Math.min(n, 20);
}

async function pickLeads(limit: number): Promise<LeadRow[]> {
  // Refresh leads that were geocoded > 90 days ago, or never geocoded.
  // Only pick leads with at least some location info (city or address).
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const select = 'id,email,company,address,city,country';
  const orFilter = `geocoded_at.is.null,geocoded_at.lt.${cutoff}`;
  // PostgREST requires URL-encoded parens for or() with multiple conditions
  const path =
    `master_leads?select=${select}` +
    `&or=(${encodeURIComponent(orFilter)})` +
    `&or=(${encodeURIComponent('city.not.is.null,address.not.is.null')})` +
    `&order=geocoded_at.asc.nullsfirst` +
    `&limit=${limit}`;
  return supabaseGetRaw<LeadRow[]>(path);
}

function composeAddress(lead: LeadRow): string {
  const parts: string[] = [];
  if (lead.address) parts.push(lead.address);
  if (lead.city) parts.push(lead.city);
  if (lead.country) parts.push(lead.country);
  return parts.filter(Boolean).join(', ').trim();
}

async function processOne(
  lead: LeadRow,
  factoryCoords: { lat: number; lng: number }
): Promise<{ id: string; status: 'ok' | 'skipped' | 'error'; km?: number; error?: string }> {
  const addrStr = composeAddress(lead);
  if (!addrStr) {
    return { id: lead.id, status: 'skipped', error: 'no address parts' };
  }

  try {
    const result = await geocodeAddress(addrStr);
    const now = new Date().toISOString();

    if (!result) {
      // Mark as attempted so we don't retry immediately. Store a far past
      // geocoded_at so it gets revisited eventually.
      const retryAt = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      await supabasePatch(`master_leads?id=eq.${lead.id}`, { geocoded_at: retryAt });
      return { id: lead.id, status: 'error', error: 'ZERO_RESULTS' };
    }

    const km = haversineKm(factoryCoords, { lat: result.lat, lng: result.lng });
    const freight = freightEstimatePhp(km);

    await supabasePatch(`master_leads?id=eq.${lead.id}`, {
      latitude: result.lat,
      longitude: result.lng,
      geocoded_address: result.formatted_address,
      geocoded_precision: result.precision,
      geocoded_at: now,
      distance_from_factory_km: Math.round(km * 100) / 100,
      freight_estimate_php: freight,
    });

    return { id: lead.id, status: 'ok', km: Math.round(km * 10) / 10 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`geocode failed for ${lead.email || lead.id}:`, msg);
    return { id: lead.id, status: 'error', error: msg.slice(0, 200) };
  }
}

async function handle(): Promise<Response> {
  const started = Date.now();
  const limit = batchSize();

  let leads: LeadRow[];
  try {
    leads = await pickLeads(limit);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: `pickLeads failed: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - started,
      },
      { status: 500 }
    );
  }

  if (leads.length === 0) {
    return Response.json({
      ok: true,
      batch_size: limit,
      picked: 0,
      ok_count: 0,
      err_count: 0,
      message: 'No leads need geocoding right now',
      ms: Date.now() - started,
    });
  }

  let factoryCoords: { lat: number; lng: number };
  try {
    factoryCoords = await getFactoryCoords();
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: `Failed to geocode factory address: ${err instanceof Error ? err.message : String(err)}`,
        ms: Date.now() - started,
      },
      { status: 500 }
    );
  }

  // Parallel pool. Geocoding calls are fast (~150ms) so 10 workers comfortably
  // handle 50 to 200 leads inside the 300s function budget.
  const queue = [...leads];
  const results: Awaited<ReturnType<typeof processOne>>[] = [];
  const workerCount = Math.min(concurrency(), leads.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length > 0) {
        const lead = queue.shift();
        if (!lead) break;
        const out = await processOne(lead, factoryCoords);
        results.push(out);
      }
    })
  );

  const ok_count = results.filter((r) => r.status === 'ok').length;
  const err_count = results.filter((r) => r.status === 'error').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  return Response.json({
    ok: true,
    factory: factoryCoords,
    batch_size: limit,
    picked: leads.length,
    ok_count,
    err_count,
    skipped,
    results,
    ms: Date.now() - started,
  });
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  return handle();
}
