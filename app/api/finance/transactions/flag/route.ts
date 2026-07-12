import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendNotificationEmail } from '@/lib/sendgrid'
import { notifyUsers } from '@/lib/portal/push'

// Flags a finance transaction and notifies the person who submitted it so they can
// correct it (fix the amount or upload a new receipt) and resubmit. Only people
// (email submitters) are notified; system imports like 'claude' or
// 'historical_import' are skipped.

function adminDb() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const flaggerEmail = user?.email?.toLowerCase()
  if (!flaggerEmail) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const id = String(body?.id ?? '')
  const reason = String(body?.reason ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Missing transaction id.' }, { status: 400 })
  if (!reason) return NextResponse.json({ error: 'A reason is required when flagging.' }, { status: 400 })

  const db = adminDb()
  const { data: tx, error: loadErr } = await db
    .from('fin_transactions')
    .select('id, submitted_by, amount, currency, description, notes')
    .eq('id', id)
    .maybeSingle()
  if (loadErr || !tx) {
    return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  }

  // Update the transaction: flagged, with the reason recorded in the notes.
  const today = new Date().toISOString().slice(0, 10)
  const flagNote = `[FLAGGED ${today} by ${flaggerEmail}]: ${reason}`
  const existingNotes = tx.notes ? `${tx.notes}\n\n` : ''
  const { error: updErr } = await db
    .from('fin_transactions')
    .update({ status: 'flagged', notes: `${existingNotes}${flagNote}` })
    .eq('id', id)
  if (updErr) {
    console.error('[flag-transaction] update failed:', updErr)
    return NextResponse.json({ error: 'Could not flag the transaction.' }, { status: 500 })
  }

  // Notify the submitter, if they are a real person.
  const submitter = String(tx.submitted_by ?? '').trim()
  let notified = false
  if (submitter.includes('@')) {
    const editUrl = `https://numatbamboo.com/finance/transactions/${id}/edit`
    const amountLine =
      tx.amount != null ? `${tx.currency ?? ''} ${Number(tx.amount).toLocaleString()}`.trim() : 'n/a'

    try {
      await sendNotificationEmail({
        to: submitter,
        subject: 'A transaction you submitted was flagged for correction',
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;">
            <h2 style="margin:0 0 8px;">Transaction flagged for correction</h2>
            <p style="margin:0 0 16px;color:#555;">${esc(flaggerEmail)} flagged a transaction you submitted. Please correct it and resubmit: fix the amount or upload a new receipt, then set it back to pending for review.</p>
            <table style="border-collapse:collapse;">
              <tr><td style="padding:4px 12px 4px 0;color:#555;">Amount</td><td style="padding:4px 0;">${esc(amountLine)}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555;">Description</td><td style="padding:4px 0;">${esc(tx.description || 'n/a')}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;color:#555;vertical-align:top;">Reason</td><td style="padding:4px 0;"><strong>${esc(reason)}</strong></td></tr>
            </table>
            <p style="margin:16px 0 0;">
              <a href="${editUrl}" style="display:inline-block;background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Open and fix this transaction</a>
            </p>
          </div>`,
      })
    } catch (e) {
      console.error('[flag-transaction] email failed:', e)
    }

    try {
      const { data: userList } = await db.auth.admin.listUsers()
      const u = userList?.users?.find((x) => x.email?.toLowerCase() === submitter.toLowerCase())
      if (u?.id) {
        await notifyUsers({
          userIds: [u.id],
          title: 'Transaction flagged for correction',
          body: reason,
          url: `/finance/transactions/${id}/edit`,
        })
      }
    } catch (e) {
      console.error('[flag-transaction] push failed:', e)
    }

    notified = true
  }

  return NextResponse.json({ ok: true, notified, submitter: submitter || null })
}
