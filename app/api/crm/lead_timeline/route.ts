// app/api/crm/lead_timeline/route.ts
//
// GET  /api/crm/lead_timeline?lead_id=...  -> stage history + samples for one lead
// POST /api/crm/lead_timeline               -> create a sample row
// PATCH /api/crm/lead_timeline              -> update a sample row
//
// Powers the LeadTimelineDrawer (Gantt of pipeline stages + sample lifecycle)
// in the CRM dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

type StageRow = {
  id: string;
  stage: string;
  entered_at: string;
  source: string;
};

type SampleRow = {
  id: string;
  lead_id: string | null;
  request_no: string | null;
  requestor: string | null;
  customer_name: string | null;
  recipient_name: string | null;
  recipient_contact: string | null;
  delivery_address: string | null;
  product_type: string | null;
  requested_at: string | null;
  target_delivery_at: string | null;
  production_received_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  courier: string | null;
  waybill: string | null;
  status: string | null;
  special_instructions: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('lead_id');
  if (!leadId) {
    return NextResponse.json({ ok: false, error: 'lead_id is required' }, { status: 400 });
  }

  const [stagesRes, samplesRes] = await Promise.all([
    supabaseAdmin
      .from('lead_stage_history')
      .select('id, stage, entered_at, source')
      .eq('lead_id', leadId)
      .order('entered_at', { ascending: true }),
    supabaseAdmin
      .from('lead_samples')
      .select('*')
      .eq('lead_id', leadId)
      .order('requested_at', { ascending: false, nullsFirst: false }),
  ]);

  if (stagesRes.error) {
    return NextResponse.json({ ok: false, error: stagesRes.error.message }, { status: 500 });
  }
  if (samplesRes.error) {
    return NextResponse.json({ ok: false, error: samplesRes.error.message }, { status: 500 });
  }

  // De-duplicate stage rows: keep earliest entry per stage (handles any
  // reconstructed + live overlap), then sort chronologically.
  const seen = new Map<string, StageRow>();
  for (const row of (stagesRes.data || []) as StageRow[]) {
    const existing = seen.get(row.stage);
    if (!existing || row.entered_at < existing.entered_at) {
      seen.set(row.stage, row);
    }
  }
  const stages = Array.from(seen.values()).sort((a, b) =>
    a.entered_at < b.entered_at ? -1 : a.entered_at > b.entered_at ? 1 : 0
  );

  return NextResponse.json({
    ok: true,
    stages,
    samples: (samplesRes.data || []) as SampleRow[],
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  const allowed = [
    'lead_id', 'request_no', 'requestor', 'customer_name', 'recipient_name',
    'recipient_contact', 'delivery_address', 'product_type', 'requested_at',
    'target_delivery_at', 'production_received_at', 'sent_at', 'received_at',
    'courier', 'waybill', 'status', 'special_instructions', 'notes',
  ];
  const payload: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined && body[k] !== '') payload[k] = body[k];
  }

  const { data, error } = await supabaseAdmin
    .from('lead_samples')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sample: data });
}

export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  const id = body.id as string | undefined;
  if (!id) {
    return NextResponse.json({ ok: false, error: 'id is required' }, { status: 400 });
  }

  const allowed = [
    'request_no', 'requestor', 'customer_name', 'recipient_name',
    'recipient_contact', 'delivery_address', 'product_type', 'requested_at',
    'target_delivery_at', 'production_received_at', 'sent_at', 'received_at',
    'courier', 'waybill', 'status', 'special_instructions', 'notes',
  ];
  const payload: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) payload[k] = body[k] === '' ? null : body[k];
  }

  const { data, error } = await supabaseAdmin
    .from('lead_samples')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sample: data });
}
