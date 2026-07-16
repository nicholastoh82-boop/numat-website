import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { upsertInboundLead } from '@/lib/leads/inbound'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, interest, source } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
    }

    // Create or update the CRM lead in master_leads, with source attribution and
    // an owner, so this contact is tracked and appears on a rep board.
    const { leadId } = await upsertInboundLead({
      email,
      fullName: name,
      company,
      sourceType: 'inbound_capture',
      leadSource: source ? `Website capture (${source})` : 'Website capture',
      contactChannel: 'form',
      sourcePayload: { interest: interest ?? null, source: source ?? null },
    })

    // Notify the sales inbox. A failure here must not fail the submission.
    try {
      const interestLabel = interest === 'sample' ? 'Free sample' : 'Quote request'
      await resend.emails.send({
        from: 'noreply@numat.ph',
        // Same as the contact form: upsertInboundLead assigns this to Erica, so
      // Erica is who needs to hear about it.
      to: ['erica@numat.ph', 'sales@numat.ph'],
        subject: `New lead: ${name} (${interestLabel})`,
        html: `
        <h2 style="color:#0d1b2a">New lead captured</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px;font-weight:bold">Name</td><td style="padding:6px">${name}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Email</td><td style="padding:6px"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px;font-weight:bold">Company</td><td style="padding:6px">${company || 'Not provided'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Interest</td><td style="padding:6px">${interestLabel}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Source</td><td style="padding:6px">${source || 'Not provided'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Time</td><td style="padding:6px">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PH</td></tr>
        </table>
      `,
      })
    } catch (e) {
      console.error('Lead capture notify failed:', e)
    }

    return NextResponse.json({ success: true, leadId })
  } catch (err) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
