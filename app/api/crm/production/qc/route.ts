// app/api/crm/production/qc/route.ts
//
// Handles QC photo uploads from the operator tablet UI at /crm/production/qc.
//
// POST  /api/crm/production/qc           multipart/form-data with:
//                                          file        (image/jpeg|png|webp, < 8 MB)
//                                          station     (slat_receipt|planing|...)
//                                          run_type    (optional)
//                                          run_id      (optional)
//                                          notes       (optional, free text)
// GET   /api/crm/production/qc?station=  list recent photos for a station
//
// Flow on POST:
//   1. Auth: any active rep or admin in crm_users.
//   2. Upload the file to Supabase Storage bucket "qc-photos" under
//      <station>/<yyyy-mm-dd>/<uuid>.<ext>.
//   3. Insert a prod_qc_photos row with analysis_status='running'.
//   4. Call analyzeQcPhoto with the base64-encoded image. This routes through
//      the existing gemini-proxy on Cloud Run and uses GCP credits.
//   5. Persist the analysis result onto the row, flip status to 'done'.
//   6. Return the full row so the UI renders results immediately.

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { analyzeQcPhoto } from '@/lib/cron/analyze_qc_photo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Photos can be up to 8 MB; the default 4.5 MB Vercel body limit will reject
// large camera captures. Bump to 10 MB to be safe.
export const maxDuration = 60;

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const VALID_STATIONS = [
  'slat_receipt',
  'planing',
  'gluing',
  'veneer_sanding',
  'board_run',
  'final_inspection',
] as const;

type Station = (typeof VALID_STATIONS)[number];

async function authorizeUser(): Promise<{ email: string; role: string } | null> {
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user?.email) return null;
    const { data: crmUser } = await adminClient
      .from('crm_users')
      .select('email, role, is_active')
      .eq('email', user.email)
      .single();
    if (!crmUser?.is_active || !['rep', 'admin'].includes(crmUser.role ?? '')) return null;
    return { email: crmUser.email, role: crmUser.role ?? 'rep' };
  } catch {
    return null;
  }
}

function extensionFor(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

export async function POST(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: `bad form data: ${(e as Error).message}` }, { status: 400 });
  }

  const file = form.get('file');
  const station = String(form.get('station') ?? '') as Station;
  const runType = form.get('run_type') ? String(form.get('run_type')) : null;
  const runId = form.get('run_id') ? String(form.get('run_id')) : null;
  const notes = form.get('notes') ? String(form.get('notes')) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }
  if (!VALID_STATIONS.includes(station)) {
    return NextResponse.json(
      { error: `station must be one of ${VALID_STATIONS.join(', ')}` },
      { status: 400 },
    );
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'file too large (8 MB max)' }, { status: 413 });
  }
  const mime = file.type;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    return NextResponse.json({ error: 'unsupported mime type' }, { status: 415 });
  }

  // 1. Upload to Supabase Storage.
  const today = new Date().toISOString().slice(0, 10);
  const photoUuid = crypto.randomUUID();
  const ext = extensionFor(mime);
  const storagePath = `${station}/${today}/${photoUuid}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await adminClient.storage
    .from('qc-photos')
    .upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      { error: `storage upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = adminClient.storage.from('qc-photos').getPublicUrl(storagePath);

  // 2. Insert the photo row with status='running'.
  const { data: inserted, error: insertErr } = await adminClient
    .from('prod_qc_photos')
    .insert({
      station,
      run_type: runType,
      run_id: runId,
      storage_path: storagePath,
      public_url: publicUrl,
      content_type: mime,
      file_size_bytes: file.size,
      captured_by: user.email,
      operator_notes: notes,
      analysis_status: 'running',
      analysis_started_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: `db insert failed: ${insertErr?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  // 3. Call Gemini Vision for defect analysis.
  let analysis;
  try {
    analysis = await analyzeQcPhoto({
      station,
      imageBase64: bytes.toString('base64'),
      mimeType: mime as 'image/jpeg' | 'image/png' | 'image/webp',
      operatorNotes: notes ?? undefined,
    });
  } catch (e) {
    await adminClient
      .from('prod_qc_photos')
      .update({
        analysis_status: 'error',
        analysis_error: (e as Error).message,
        analysis_completed_at: new Date().toISOString(),
      })
      .eq('id', inserted.id);
    return NextResponse.json(
      {
        photo: inserted,
        analysis_error: (e as Error).message,
      },
      { status: 502 },
    );
  }

  // 4. Persist analysis results.
  const { data: updated, error: updateErr } = await adminClient
    .from('prod_qc_photos')
    .update({
      analysis_status: 'done',
      analysis_completed_at: new Date().toISOString(),
      analysis_model: analysis.model,
      analysis_latency_ms: analysis.latency_ms,
      gemini_raw_response: analysis as unknown as Record<string, unknown>,
      defects_detected: analysis.defects as unknown as Record<string, unknown>,
      defect_count: analysis.defect_count,
      has_defects: analysis.has_defects,
      severity_max: analysis.severity_max,
      quality_score: analysis.quality_score,
      notes_from_ai: analysis.notes,
    })
    .eq('id', inserted.id)
    .select('*')
    .single();
  if (updateErr) {
    return NextResponse.json(
      { error: `db update failed: ${updateErr.message}`, photo: inserted, analysis },
      { status: 500 },
    );
  }

  // 5. Audit log entry so the supervisor dashboard sees QC activity.
  try {
    await adminClient.from('prod_audit_log').insert({
      table_name: 'prod_qc_photos',
      row_id: updated.id,
      action: 'qc_photo_analyzed',
      new_values: {
        station,
        defect_count: analysis.defect_count,
        severity_max: analysis.severity_max,
        quality_score: analysis.quality_score,
        run_type: runType,
        run_id: runId,
      },
      changed_by: user.email,
    });
  } catch (e) {
    console.error('prod_audit_log insert failed:', e);
  }

  return NextResponse.json({ photo: updated });
}

export async function GET(req: NextRequest) {
  const user = await authorizeUser();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const url = new URL(req.url);
  const station = url.searchParams.get('station');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const defectsOnly = url.searchParams.get('defects_only') === 'true';

  let query = adminClient
    .from('prod_qc_photos')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (station && VALID_STATIONS.includes(station as Station)) {
    query = query.eq('station', station);
  }
  if (defectsOnly) {
    query = query.eq('has_defects', true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ photos: data ?? [] });
}
