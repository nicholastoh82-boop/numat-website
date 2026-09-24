import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { upsertInboundLead } from '@/lib/leads/inbound'
import { WEBSITE_ALERT_RECIPIENTS, escapeHtml, logWebsiteSubmission } from '@/lib/leads/website-intake'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, interest, source, phone } = body
    const isPriceRequest = source === 'price-request'

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
    }

    // Create or update the CRM lead in master_leads, with source attribution and
    // an owner, so this contact is tracked and appears on a rep board.
    const { leadId } = await upsertInboundLead({
      email,
      phone: phone || null,
      fullName: name,
      company,
      sourceType: 'inbound_capture',
      leadSource: source ? `Website capture (${source})` : 'Website capture',
      contactChannel: 'form',
      sourcePayload: { interest: interest ?? null, source: source ?? null },
    })

    // Notify the sales inbox. A failure here must not fail the submission.
    try {
      const interestLabel = isPriceRequest ? String(interest || 'Price request') : 'Quote request'
      await resend.emails.send({
        from: 'noreply@numat.ph',
        to: [...WEBSITE_ALERT_RECIPIENTS, 'sales@numat.ph'],
        subject: isPriceRequest ? `Price request from the website: ${name}` : `New lead: ${name} (${interestLabel})`,
        html: `
        <h2 style="color:#0d1b2a">New lead captured</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px;font-weight:bold">Name</td><td style="padding:6px">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Email</td><td style="padding:6px"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:6px;font-weight:bold">Company</td><td style="padding:6px">${escapeHtml(company) || 'Not provided'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Interest</td><td style="padding:6px">${escapeHtml(interestLabel)}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Phone</td><td style="padding:6px">${escapeHtml(phone) || 'Not provided'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Source</td><td style="padding:6px">${escapeHtml(source) || 'Not provided'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Time</td><td style="padding:6px">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PH</td></tr>
        </table>
      `,
      })
    } catch (e) {
      console.error('Lead capture notify failed:', e)
    }

    await logWebsiteSubmission({
      type: isPriceRequest ? 'Price request' : 'Quick enquiry',
      source: isPriceRequest ? 'Product page price request' : source ? `Website capture (${source})` : 'Website capture',
      name,
      company,
      email,
      phone: phone || null,
      message: interest ? String(interest) : null,
    })

    return NextResponse.json({ success: true, leadId })
  } catch (err) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
