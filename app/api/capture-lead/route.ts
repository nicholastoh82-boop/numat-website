import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, company, interest, source } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
    }

    const { error: dbError } = await supabase
      .from('leads')
      .insert({ name, email, company, interest, source })

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    await resend.emails.send({
      from: 'noreply@numat.ph',
      to: ['sales@numat.ph', 'mohan@numat.ph', 'nick@numat.ph'],
      subject: `🌿 New Lead: ${name} – ${interest === 'sample' ? 'Free Sample' : 'Quote Request'}`,
      html: `
        <h2 style="color:#0d1b2a">New Lead Captured</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px;font-weight:bold">Name</td><td style="padding:6px">${name}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Email</td><td style="padding:6px"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:6px;font-weight:bold">Company</td><td style="padding:6px">${company || '—'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Interest</td><td style="padding:6px">${interest === 'sample' ? '🌿 Free Sample' : '📋 Quote'}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Source</td><td style="padding:6px">${source}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Time</td><td style="padding:6px">${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PH</td></tr>
        </table>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Lead capture error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}