/* lib/leads/inbound.ts
   One place that turns any inbound website contact (a quote, an inquiry, a
   WhatsApp message, a captured lead) into a CRM lead in master_leads, so every
   real customer lands on a rep board with a source and an owner.

   Rules:
   - Dedupe by email first, then by phone, so repeat contacts update the same
     lead instead of creating duplicates.
   - Owner follows the standing routing: Philippines to Bryan, everything else to
     Erica (who runs the CRM and owns international). An existing lead keeps its
     current owner and source; we only add the new touch.
   - Every call also writes a sales_activities row so the work is measurable.
   - Nothing here ever throws to the caller. A tracking failure must never break
     a customer facing submission, so failures are logged and swallowed. */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function svcHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  }
}

async function restGet<T = unknown>(pathAndQuery: string): Promise<T | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: svcHeaders() })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function restPost(table: string, body: unknown, prefer: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: svcHeaders({ Prefer: prefer }),
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

async function restPatch(pathAndQuery: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
      method: 'PATCH',
      headers: svcHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}

export type InboundLeadInput = {
  email?: string | null
  phone?: string | null
  fullName?: string | null
  company?: string | null
  country?: string | null
  sourceType: string // e.g. 'inbound_quote', 'inbound_inquiry', 'inbound_whatsapp', 'inbound_capture'
  leadSource: string // human label, e.g. 'Website Quote Form'
  sourcePayload?: Record<string, unknown>
  contactChannel?: string // 'email' | 'whatsapp' | 'form'
  notes?: string | null
}

async function logActivity(leadId: string, activityType: string, payload?: Record<string, unknown>) {
  await restPost(
    'sales_activities',
    { lead_id: leadId, activity_type: activityType, actor: 'inbound', payload: payload ?? null },
    'return=minimal'
  )
}

export async function upsertInboundLead(
  input: InboundLeadInput
): Promise<{ leadId: string | null; isNew: boolean; repEmail: string }> {
  // All inbound contact goes to Erica; she evaluates and reassigns to the reps.
  const repEmail = 'erica@numat.ph'
  const repName = 'Erica'

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[inbound lead] Supabase service credentials missing')
    return { leadId: null, isNew: false, repEmail }
  }

  const email = input.email ? input.email.toLowerCase().trim() : null
  const phone = input.phone ? input.phone.trim() : null
  const now = new Date().toISOString()

  // Find an existing lead: email first, then phone.
  let existing: { id: string; source_type: string | null } | null = null
  if (email) {
    const rows = await restGet<Array<{ id: string; source_type: string | null }>>(
      `master_leads?email=eq.${encodeURIComponent(email)}&select=id,source_type&limit=1`
    )
    existing = rows && rows[0] ? rows[0] : null
  }
  if (!existing && phone) {
    const rows = await restGet<Array<{ id: string; source_type: string | null }>>(
      `master_leads?phone=eq.${encodeURIComponent(phone)}&select=id,source_type&limit=1`
    )
    existing = rows && rows[0] ? rows[0] : null
  }

  if (existing) {
    // Touch the existing lead. Do not overwrite its owner or original source.
    await restPatch(`master_leads?id=eq.${existing.id}`, {
      last_activity_at: now,
      last_activity_type: input.sourceType,
      ...(existing.source_type ? {} : { source_type: input.sourceType }),
    })
    await logActivity(existing.id, input.sourceType, input.sourcePayload)
    return { leadId: existing.id, isNew: false, repEmail }
  }

  // New lead.
  const nameParts = (input.fullName || '').trim().split(/\s+/).filter(Boolean)
  const row = {
    email,
    phone,
    first_name: nameParts[0] || null,
    last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : null,
    full_name: input.fullName || null,
    company: input.company || null,
    country: input.country || null,
    source: 'website',
    source_type: input.sourceType,
    lead_source: input.leadSource,
    source_payload: input.sourcePayload ?? null,
    contact_channel: input.contactChannel ?? null,
    marketing_sourced: true,
    pipeline_stage: 'new',
    status: 'active',
    rep_email: repEmail,
    rep_assigned: repName,
    last_activity_at: now,
    last_activity_type: input.sourceType,
    notes: input.notes ?? null,
  }
  await restPost('master_leads', row, 'return=minimal,resolution=ignore-duplicates')

  // Read back the id (whether just inserted or a race inserted it).
  const key = email
    ? `email=eq.${encodeURIComponent(email)}`
    : phone
      ? `phone=eq.${encodeURIComponent(phone)}`
      : null
  let leadId: string | null = null
  if (key) {
    const rows = await restGet<Array<{ id: string }>>(
      `master_leads?${key}&select=id&order=created_at.desc&limit=1`
    )
    leadId = rows && rows[0] ? rows[0].id : null
  }
  if (leadId) await logActivity(leadId, input.sourceType, input.sourcePayload)
  return { leadId, isNew: true, repEmail }
}
