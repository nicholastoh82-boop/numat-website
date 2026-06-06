// app/api/crm/timeline_overview/route.ts
//
// GET /api/crm/timeline_overview
// Returns one payload for the consolidated portal Gantt: every lead that has
// actually progressed (won, qualified, proposal_sent, meeting_booked,
// negotiation) OR has at least one sample, with that lead's full stage history
// and sample milestones. Cold "new" leads are excluded so the chart is
// readable. Capped to keep the response bounded.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

const PROGRESSED = ['won', 'qualified', 'proposal_sent', 'meeting_booked', 'negotiation'];
const MAX_LEADS = 250;

export async function GET() {
  // 1. Leads that have at least one sample
  const sampleLeadsRes = await supabaseAdmin
    .from('lead_samples')
    .select('lead_id')
    .not('lead_id', 'is', null);
  if (sampleLeadsRes.error) {
    return NextResponse.json({ ok: false, error: sampleLeadsRes.error.message }, { status: 500 });
  }
  const sampleLeadIds = Array.from(
    new Set((sampleLeadsRes.data || []).map((r: { lead_id: string }) => r.lead_id))
  );

  // 2. Progressed leads
  const progressedRes = await supabaseAdmin
    .from('master_leads')
    .select('id')
    .in('pipeline_stage', PROGRESSED)
    .limit(MAX_LEADS);
  if (progressedRes.error) {
    return NextResponse.json({ ok: false, error: progressedRes.error.message }, { status: 500 });
  }
  const progressedIds = (progressedRes.data || []).map((r: { id: string }) => r.id);

  // Union, capped
  const idSet = Array.from(new Set([...sampleLeadIds, ...progressedIds])).slice(0, MAX_LEADS);
  if (idSet.length === 0) {
    return NextResponse.json({ ok: true, leads: [] });
  }

  // 3. Lead basics, 4. stage history, 5. samples (parallel)
  const [leadsRes, stagesRes, samplesRes] = await Promise.all([
    supabaseAdmin
      .from('master_leads')
      .select('id, full_name, first_name, last_name, email, company, country, pipeline_stage, rep_assigned, deal_value_php, deal_value_usd')
      .in('id', idSet),
    supabaseAdmin
      .from('lead_stage_history')
      .select('lead_id, stage, entered_at, source')
      .in('lead_id', idSet)
      .order('entered_at', { ascending: true }),
    supabaseAdmin
      .from('lead_samples')
      .select('lead_id, request_no, requested_at, sent_at, received_at, status')
      .in('lead_id', idSet),
  ]);

  if (leadsRes.error) return NextResponse.json({ ok: false, error: leadsRes.error.message }, { status: 500 });
  if (stagesRes.error) return NextResponse.json({ ok: false, error: stagesRes.error.message }, { status: 500 });
  if (samplesRes.error) return NextResponse.json({ ok: false, error: samplesRes.error.message }, { status: 500 });

  type StageRow = { lead_id: string; stage: string; entered_at: string; source: string };
  type SampleRow = { lead_id: string; request_no: string | null; requested_at: string | null; sent_at: string | null; received_at: string | null; status: string | null };

  // Group stages per lead, keeping earliest entry per stage
  const stagesByLead = new Map<string, { stage: string; entered_at: string; source: string }[]>();
  for (const r of (stagesRes.data || []) as StageRow[]) {
    const arr = stagesByLead.get(r.lead_id) || [];
    const existing = arr.find((s) => s.stage === r.stage);
    if (!existing) arr.push({ stage: r.stage, entered_at: r.entered_at, source: r.source });
    else if (r.entered_at < existing.entered_at) existing.entered_at = r.entered_at;
    stagesByLead.set(r.lead_id, arr);
  }
  for (const arr of stagesByLead.values()) {
    arr.sort((a, b) => (a.entered_at < b.entered_at ? -1 : a.entered_at > b.entered_at ? 1 : 0));
  }

  const samplesByLead = new Map<string, SampleRow[]>();
  for (const r of (samplesRes.data || []) as SampleRow[]) {
    const arr = samplesByLead.get(r.lead_id) || [];
    arr.push(r);
    samplesByLead.set(r.lead_id, arr);
  }

  type LeadRow = {
    id: string; full_name: string | null; first_name: string | null; last_name: string | null;
    email: string | null; company: string | null; country: string | null;
    pipeline_stage: string | null; rep_assigned: string | null;
    deal_value_php: number | null; deal_value_usd: number | null;
  };

  const leads = ((leadsRes.data || []) as LeadRow[]).map((l) => {
    const name = l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Unknown';
    return {
      id: l.id,
      name,
      company: l.company,
      country: l.country,
      current_stage: l.pipeline_stage,
      rep: l.rep_assigned,
      deal_value_php: l.deal_value_php,
      deal_value_usd: l.deal_value_usd,
      has_sample: samplesByLead.has(l.id),
      stages: stagesByLead.get(l.id) || [],
      samples: samplesByLead.get(l.id) || [],
    };
  });

  // Sort by first stage entry (oldest leads first)
  leads.sort((a, b) => {
    const sa = a.stages[0]?.entered_at || '9999';
    const sb = b.stages[0]?.entered_at || '9999';
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });

  return NextResponse.json({ ok: true, leads });
}
