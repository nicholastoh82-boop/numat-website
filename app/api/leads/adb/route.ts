// app/api/leads/adb/route.ts
//
// Handles POST submissions from /samarkand.html (the ADB landing page).
// 1. Validates the four fields.
// 2. Inserts into master_leads with source = 'adb_2026_samarkand'.
// 3. Fires a follow up email via Resend with the one pager attached and Mark's vCard.
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY
//   MARK_EMAIL              (Mark's reply to address, e.g. mark@numat.ph)
//   MARK_PHONE              (Mark's phone, e.g. +639171234567)
//   MARK_WHATSAPP           (Mark's WhatsApp, no + or spaces, e.g. 639171234567)
//   MARK_CAL_LINK           (e.g. https://cal.com/marksebastian/discovery)
//
// Optional:
//   ADB_ONEPAGER_PATH       (defaults to public/NUMAT_OnePager.pdf relative to project root)

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUIRED = ['name', 'email', 'phone', 'company'] as const;

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function buildVCard(): string {
  const phone = process.env.MARK_PHONE || '';
  const email = process.env.MARK_EMAIL || 'mark@numat.ph';
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'FN:Mark Sebastian',
    'N:Sebastian;Mark;;;',
    'ORG:NUMAT Sustainable Manufacturing Inc.',
    'TITLE:Founder, NUMAT Sustainable Manufacturing Inc.',
    `EMAIL;TYPE=INTERNET,WORK:${email}`,
    phone ? `TEL;TYPE=CELL,VOICE:${phone}` : '',
    'URL:https://numatbamboo.com',
    'NOTE:Met at ADB Annual Meetings 2026, Samarkand.',
    'END:VCARD',
  ].filter(Boolean).join('\r\n');
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

function buildEmailHtml(name: string) {
  const calLink = process.env.MARK_CAL_LINK || 'https://cal.com/numatnicholas/discovery';
  const whatsapp = process.env.MARK_WHATSAPP || '';
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi Mark, this is ' + name + '. We connected at ADB Samarkand 2026.')}`
    : '';

  const wrap = (body: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#F5F5F5;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#000;">
  <tr><td align="center" style="padding:40px 20px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#0A0A0A;border:1px solid #1F1F1F;border-radius:4px;">
      <tr><td style="padding:32px;">${body}</td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const body = `
<div style="font-size:11px;color:#8BC34A;text-transform:uppercase;letter-spacing:0.2em;font-weight:600;margin-bottom:24px;">From Nature, For Nature</div>

<h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;color:#F5F5F5;margin:0 0 16px;font-weight:400;">
  Thanks for connecting with <em style="color:#8BC34A;">NUMAT</em>, ${escapeHtml(name)}.
</h1>

<p style="color:#A1A1AA;font-size:15px;line-height:1.6;margin:0 0 24px;">
  Mark Sebastian will follow up within 24 hours. In the meantime, the NUMAT one pager is attached, along with his contact card.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;">
  <tr>
    <td align="center" style="padding:16px;background:#0F0F0F;border:1px solid #2A2A2A;border-radius:3px;">
      <a href="${calLink}" style="display:inline-block;padding:14px 24px;background:#8BC34A;color:#000;text-decoration:none;font-weight:600;font-size:15px;border-radius:2px;">
        Book a 15 minute call with Mark &rsaquo;
      </a>
    </td>
  </tr>
</table>

${waLink ? `
<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:24px 0 8px;">
  Prefer WhatsApp? <a href="${waLink}" style="color:#8BC34A;text-decoration:underline;">Open the chat with Mark</a>
</p>` : ''}

<hr style="border:none;border-top:1px solid #2A2A2A;margin:32px 0;">

<h2 style="font-family:Georgia,serif;font-size:20px;color:#F5F5F5;margin:0 0 12px;font-weight:400;">
  Why this matters for nature investment.
</h2>

<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:0 0 12px;">
  Most platforms in this space fund supply: identity, traceability, MRV, finance.
</p>
<p style="color:#A1A1AA;font-size:14px;line-height:1.6;margin:0 0 24px;">
  <strong style="color:#F5F5F5;">We close the loop.</strong> An operating engineered bamboo factory in the Philippines, buying smallholder bamboo at commercial volumes and selling finished product to paying customers today. The full picture is in the attached one pager.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="padding:20px 0;border-top:1px solid #2A2A2A;font-size:12px;color:#555;line-height:1.7;">
      <strong style="color:#888;">NUMAT Sustainable Manufacturing Inc.</strong><br>
      Manolo Fortich, Bukidnon, Mindanao, Philippines<br>
      Backed by Wavemaker Impact (Singapore)<br>
      <a href="https://numatbamboo.com" style="color:#8BC34A;text-decoration:none;">numatbamboo.com</a> &nbsp;|&nbsp;
      <a href="mailto:${process.env.MARK_EMAIL || 'mark@numat.ph'}" style="color:#8BC34A;text-decoration:none;">${process.env.MARK_EMAIL || 'mark@numat.ph'}</a>
    </td>
  </tr>
</table>
`;

  return wrap(body);
}

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }

  for (const f of REQUIRED) {
    if (!payload[f] || typeof payload[f] !== 'string' || !payload[f].trim()) {
      return NextResponse.json({ ok: false, message: `Missing field: ${f}` }, { status: 400 });
    }
  }

  const name = String(payload.name).trim().slice(0, 200);
  const email = String(payload.email).trim().toLowerCase().slice(0, 200);
  const phone = String(payload.phone).trim().slice(0, 60);
  const company = String(payload.company).trim().slice(0, 200);

  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, message: 'Invalid email' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // NOTE: Field names below match a typical master_leads schema.
  // If the schema check in Section E shows different names, edit this leadRow accordingly.
  const leadRow = {
    full_name: name,
    email,
    phone,
    company,
    source: 'adb_2026_samarkand',
    country: null as string | null,
    segment: null as string | null,
    rep_assigned: 'mark@numat.ph',
    notes: `Captured via /samarkand landing page. UA: ${userAgent.slice(0, 200)}. IP: ${ip}`,
    created_at: new Date().toISOString(),
  };

  const { error: dbError } = await supabase
    .from('master_leads')
    .insert(leadRow);

  if (dbError) {
    console.error('master_leads insert failed:', dbError);
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.error('RESEND_API_KEY missing, skipping email');
    return NextResponse.json({ ok: true, dbError: !!dbError, emailed: false });
  }

  let pdfBase64: string | null = null;
  try {
    const pdfPath = process.env.ADB_ONEPAGER_PATH
      || path.join(process.cwd(), 'public', 'NUMAT_OnePager.pdf');
    const buf = await fs.readFile(pdfPath);
    pdfBase64 = buf.toString('base64');
  } catch (err) {
    console.error('One pager PDF not found, sending email without attachment:', err);
  }

  const vcardBase64 = Buffer.from(buildVCard(), 'utf-8').toString('base64');

  const attachments: Array<{ filename: string; content: string }> = [
    { filename: 'Mark-Sebastian-NUMAT.vcf', content: vcardBase64 },
  ];
  if (pdfBase64) {
    attachments.unshift({ filename: 'NUMAT-One-Pager.pdf', content: pdfBase64 });
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NUMAT <noreply@numat.ph>',
      to: email,
      reply_to: process.env.MARK_EMAIL || 'mark@numat.ph',
      subject: `Welcome from NUMAT, ${name.split(' ')[0]} — materials attached`,
      html: buildEmailHtml(name),
      attachments,
    }),
  });

  if (!emailRes.ok) {
    const errText = await emailRes.text().catch(() => '');
    console.error('Resend send failed:', emailRes.status, errText);
    return NextResponse.json({ ok: true, dbError: !!dbError, emailed: false });
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NUMAT Leads <noreply@numat.ph>',
      to: process.env.MARK_EMAIL || 'mark@numat.ph',
      subject: `[ADB lead] ${name} from ${company}`,
      html: `
<p style="font-family:system-ui,sans-serif;font-size:14px;color:#333;">
  New lead captured at ADB Samarkand:
</p>
<table style="font-family:system-ui,sans-serif;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Company</td><td>${escapeHtml(company)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Email</td><td><a href="mailto:${email}">${escapeHtml(email)}</a></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Phone</td><td>${escapeHtml(phone)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:#666;">Captured</td><td>${new Date().toISOString()}</td></tr>
</table>
<p style="font-family:system-ui,sans-serif;font-size:13px;color:#888;margin-top:16px;">
  Welcome email already sent to the lead with one pager and your vCard. They saw the success state with WhatsApp / Save Contact / Book a call buttons.
</p>
`,
    }),
  }).catch((err) => console.error('Mark notification failed:', err));

  return NextResponse.json({ ok: true, dbError: !!dbError, emailed: true });
}
