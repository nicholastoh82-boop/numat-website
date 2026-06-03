// app/api/crm/lead_status/route.ts
//
// GET /api/crm/lead_status
// One clean row per active lead for the portal status table. "Active" means the
// lead has progressed (won, qualified, proposal_sent, meeting_booked,
// negotiation) OR has at least one sample. For each lead it returns the deal
// value plus the key milestone dates: last email sent, last email received,
// sample requested/sent/received, quotation sent, proposal signed, due date,
// and order completed. Sorted by most recent activity first.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/gmail';

const PROGRESSED = ['won', 'qualified', 'proposal_sent', 'meeting_booked', 'negotiation'];
const MAX_LEADS = 300;

export async function GET() {
  // Leads with a sample
  const sampleLeadsRes = await supabaseAdmin
    .from('lead_samples').select('lead_id').not('lead_id', 'is', null);
  if (sampleLeadsRes.error) {
    return NextResponse.json({ ok: false, error: sampleLeadsRes.error.message }, { status: 500 });
  }
  const sampleLeadIds = Array.from(
    new Set((sampleLeadsRes.data || []).map((r: { lead_id: string }) => r.lead_id))
  );

  // Progressed leads
  const progressedRes = await supabaseAdmin
    .from('master_leads').select('id').in('pipeline_stage', PROGRESSED).limit(MAX_LEADS);
  if (progressedRes.error) {
    return NextResponse.json({ ok: false, error: progressedRes.error.message }, { status: 500 });
  }
  const progressedIds = (progressedRes.data || []).map((r: { id: string }) => r.id);

  const idSet = Array.from(new Set([...sampleLeadIds, ...progressedIds])).slice(0, MAX_LEADS);
  if (idSet.length === 0) return NextResponse.json({ ok: true, leads: [] });

  // Lead basics + milestone fields, samples, and email activity (parallel)
  const [leadsRes, samplesRes, emailsRes] = await Promise.all([
    supabaseAdmin
      .from('master_leads')
      .select('id, full_name, first_name, last_name, email, company, country, pipeline_stage, rep_assigned, deal_value_php, deal_value_usd, last_email_sent, reply_date, quoted_at, proposal_signed_at, payment_due_at, order_completed_at')
      .in('id', idSet),
    supabaseAdmin
      .from('lead_samples')
      .select('lead_id, requested_at, sent_at, received_at, created_at')
      .in('lead_id', idSet),
    supabaseAdmin
      .from('crm_emails')
      .select('lead_id, direction, sent_at, received_at')
      .in('lead_id', idSet),
  ]);

  if (leadsRes.error) return NextResponse.json({ ok: false, error: leadsRes.error.message }, { status: 500 });
  if (samplesRes.error) return NextResponse.json({ ok: false, error: samplesRes.error.message }, { status: 500 });
  if (emailsRes.error) return NextResponse.json({ ok: false, error: emailsRes.error.message }, { status: 500 });

  type SampleRow = { lead_id: string; requested_at: string | null; sent_at: string | null; received_at: string | null; created_at: string | null };
  type EmailRow = { lead_id: string; direction: string | null; sent_at: string | null; received_at: string | null };

  // Primary (most recent) sample per lead
  const sampleByLead = new Map<string, SampleRow>();
  for (const r of (samplesRes.data || []) as SampleRow[]) {
    const cur = sampleByLead.get(r.lead_id);
    if (!cur || (r.created_at || '') > (cur.created_at || '')) sampleByLead.set(r.lead_id, r);
  }

  // Last email sent (outbound) and last received (inbound) per lead, from crm_emails
  const lastSentByLead = new Map<string, string>();
  const lastRecvByLead = new Map<string, string>();
  for (const e of (emailsRes.data || []) as EmailRow[]) {
    if (!e.lead_id) continue;
    const out = e.direction === 'outbound' || e.direction === 'sent' || e.direction === 'out';
    const ts = out ? (e.sent_at || e.received_at) : (e.received_at || e.sent_at);
    if (!ts) continue;
    const map = out ? lastSentByLead : lastRecvByLead;
    const cur = map.get(e.lead_id);
    if (!cur || ts > cur) map.set(e.lead_id, ts);
  }

  type LeadRow = {
    id: string; full_name: string | null; first_name: string | null; last_name: string | null;
    email: string | null; company: string | null; country: string | null;
    pipeline_stage: string | null; rep_assigned: string | null;
    deal_value_php: number | null; deal_value_usd: number | null;
    last_email_sent: string | null; reply_date: string | null; quoted_at: string | null;
    proposal_signed_at: string | null; payment_due_at: string | null; order_completed_at: string | null;
  };

  const leads = ((leadsRes.data || []) as LeadRow[]).map((l) => {
    const name = l.full_name || [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Unknown';
    const s = sampleByLead.get(l.id);
    // Last email sent: prefer crm_emails, fall back to the lead's last_email_sent column
    const lastSent = lastSentByLead.get(l.id) || l.last_email_sent || null;
    const lastRecv = lastRecvByLead.get(l.id) || l.reply_date || null;
    return {
      id: l.id,
      name,
      company: l.company,
      country: l.country,
      stage: l.pipeline_stage,
      rep: l.rep_assigned,
      deal_value_php: l.deal_value_php,
      deal_value_usd: l.deal_value_usd,
      last_email_sent: lastSent,
      last_email_received: lastRecv,
      sample_requested: s?.requested_at || null,
      sample_sent: s?.sent_at || null,
      sample_received: s?.received_at || null,
      quotation_sent: l.quoted_at || null,
      proposal_signed: l.proposal_signed_at || null,
      due_date: l.payment_due_at || null,
      order_completed: l.order_completed_at || null,
    };
  });

  // Most recently active first: by the latest of any milestone or email date
  const lastTouch = (l: typeof leads[number]) => {
    const ds = [l.last_email_sent, l.last_email_received, l.sample_requested, l.sample_sent,
      l.sample_received, l.quotation_sent, l.proposal_signed, l.order_completed]
      .filter(Boolean) as string[];
    return ds.length ? ds.sort().slice(-1)[0] : '';
  };
  leads.sort((a, b) => (lastTouch(a) < lastTouch(b) ? 1 : lastTouch(a) > lastTouch(b) ? -1 : 0));

  return NextResponse.json({ ok: true, leads });
}
