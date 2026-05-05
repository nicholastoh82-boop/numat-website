import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ============================================================================
// CSS Borneo 2026 lead capture
// ============================================================================
// Receives leads from /borneo.html and the quick-capture prompt.
// Routes the welcome email and notifications to the active host
// (Mohan = speaker, Nick = attendee) based on the `host` field in the body.
// Inserts into master_leads with source = `css_borneo_2026_{host}` (and `_quick`
// suffix if it came from the talk-audience prompt).
// ============================================================================

type Host = {
  firstName: string;
  fullName: string;
  email: string;
  phone: string;
  whatsapp: string;
  rep: string;
  vcardFilename: string;
  cal: string;
  role: "speaker" | "attendee";
};

const HOSTS: Record<string, Host> = {
  mohan: {
    firstName: "Mohan",
    fullName: "Mohan Louis",
    email: "mohan@numat.ph",
    phone: "+60162958983",
    whatsapp: "60162958983",
    rep: "Mohan Louis",
    vcardFilename: "Mohan-Louis-NUMAT.vcf",
    cal: "https://cal.com/mohanlouis/discovery",
    role: "speaker",
  },
  nick: {
    firstName: "Nicholas",
    fullName: "Nicholas Toh",
    email: "nick@numat.ph",
    phone: "+601139593956",
    whatsapp: "601139593956",
    rep: "Nicholas Toh",
    vcardFilename: "Nicholas-Toh-NUMAT.vcf",
    cal: "https://cal.com/numatnicholas/discovery",
    role: "attendee",
  },
};

const SOURCE_PREFIX = "css_borneo_2026";
const EVENT_LABEL = "CSS Borneo 2026";
const EVENT_LOCATION = "Sabah, Malaysia";

function buildVCard(h: Host) {
  const [first, ...rest] = h.fullName.split(" ");
  const last = rest.join(" ");
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${h.fullName}`,
    `N:${last};${first};;;`,
    "ORG:NUMAT Sustainable Manufacturing Inc.",
    "TITLE:NUMAT Sustainable Manufacturing Inc.",
    `EMAIL;TYPE=INTERNET,WORK:${h.email}`,
    `TEL;TYPE=CELL,VOICE:${h.phone}`,
    "URL:https://numatbamboo.com",
    `NOTE:Met at ${EVENT_LABEL}, ${EVENT_LOCATION}.`,
    "END:VCARD",
  ].join("\r\n");
}

function welcomeHtml(name: string, h: Host) {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  const speakerLine =
    h.role === "speaker"
      ? `Thanks for stopping by after my session at ${EVENT_LABEL}.`
      : `Thanks for connecting at ${EVENT_LABEL}.`;
  return `
<!doctype html>
<html><body style="font-family: -apple-system, Segoe UI, sans-serif; color:#1a1a1a; max-width:560px; margin:0 auto; padding:24px;">
  <h2 style="color:#2C4A2C; font-weight:600; margin-bottom:8px;">${greeting}</h2>
  <p style="line-height:1.6;">${speakerLine}</p>
  <p style="line-height:1.6;">Attached is the NUMAT one pager and my vCard. WhatsApp is the fastest channel for me, link below.</p>
  <p style="line-height:1.6; margin-top:18px;">
    <a href="https://wa.me/${h.whatsapp}" style="background:#25D366; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; display:inline-block; margin-right:8px;">WhatsApp ${h.firstName}</a>
    <a href="${h.cal}" style="background:#2C4A2C; color:#fff; padding:10px 16px; border-radius:8px; text-decoration:none; display:inline-block;">Book a 15 min call</a>
  </p>
  <p style="line-height:1.6; margin-top:24px;">${h.firstName}<br>NUMAT Sustainable Manufacturing<br>${h.email}</p>
</body></html>`;
}

function notifyHtml(lead: { name?: string; company?: string; email: string; phone?: string; source: string }) {
  return `
<!doctype html>
<html><body style="font-family: -apple-system, Segoe UI, sans-serif; color:#1a1a1a;">
  <h3 style="margin-bottom:8px;">New CSS Borneo lead</h3>
  <table cellpadding="6" style="border-collapse:collapse;">
    <tr><td><b>Name</b></td><td>${lead.name || "(not provided)"}</td></tr>
    <tr><td><b>Company</b></td><td>${lead.company || "(not provided)"}</td></tr>
    <tr><td><b>Email</b></td><td>${lead.email}</td></tr>
    <tr><td><b>Phone</b></td><td>${lead.phone || "(not provided)"}</td></tr>
    <tr><td><b>Source</b></td><td>${lead.source}</td></tr>
  </table>
</body></html>`;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Bad JSON" }, { status: 400 });
  }

  const name = (body.name || "").toString().trim();
  const company = (body.company || "").toString().trim();
  const email = (body.email || "").toString().trim().toLowerCase();
  const phone = (body.phone || "").toString().trim();
  const hostKey = (body.host || "mohan").toString().toLowerCase();
  const source =
    (body.source || `${SOURCE_PREFIX}_${hostKey}`).toString().slice(0, 80);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Email required" }, { status: 400 });
  }

  const host = HOSTS[hostKey] || HOSTS.mohan;

  // 1) Insert into master_leads
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("master_leads").insert({
      full_name: name || null,
      email,
      phone: phone || null,
      company: company || null,
      source,
      country: EVENT_LOCATION,
      segment: "event_capture",
      rep_assigned: host.rep,
      notes: `${EVENT_LABEL} :: host=${hostKey} :: role=${host.role}`,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Supabase insert failed:", err);
    // Continue, do not block the email path on DB failure
  }

  // 2) Send welcome email (with one pager + vCard) and notify host
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);

    const attachments: { filename: string; content: string }[] = [];
    const onePagerPath = path.join(process.cwd(), "public", "NUMAT_OnePager.pdf");
    if (fs.existsSync(onePagerPath)) {
      attachments.push({
        filename: "NUMAT_OnePager.pdf",
        content: fs.readFileSync(onePagerPath).toString("base64"),
      });
    }
    attachments.push({
      filename: host.vcardFilename,
      content: Buffer.from(buildVCard(host)).toString("base64"),
    });

    await resend.emails.send({
      from: `NUMAT <noreply@numat.ph>`,
      to: [email],
      reply_to: host.email,
      subject: `${host.firstName} from NUMAT, follow up from ${EVENT_LABEL}`,
      html: welcomeHtml(name, host),
      attachments,
    });

    await resend.emails.send({
      from: `NUMAT Leads <noreply@numat.ph>`,
      to: [host.email],
      cc: ["nick@numat.ph"],
      subject: `[CSS Borneo lead] ${name || email} ${company ? "(" + company + ")" : ""}`,
      html: notifyHtml({ name, company, email, phone, source }),
    });
  } catch (err) {
    console.error("Resend failed:", err);
    return NextResponse.json(
      { message: "Email send failed but lead saved" },
      { status: 202 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
