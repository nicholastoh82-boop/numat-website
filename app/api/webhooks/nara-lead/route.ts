// app/api/webhooks/nara-lead/route.ts
//
// NARA Lead Router webhook. Replaces n8n NUMAT — NARA Lead Router.
// Receives lead captures from the NARA website chatbot (on numatbamboo.com),
// inserts into master_leads with rep assignment (Bryan for Philippines,
// Mohan otherwise), and emails the assigned rep.
//
// Expected JSON body (all optional, driven by the chatbot's captured state):
//   { contact_name, email, phone, company, country, location, industry, notes }

import { sendGmail, supabaseGetRaw, supabasePost } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type NaraLeadBody = {
  contact_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  country?: string;
  location?: string;
  industry?: string;
  notes?: string;
};

// Optional shared secret. Unset = open (matches n8n).
function authorized(req: Request): boolean {
  const secret = process.env.NARA_LEAD_WEBHOOK_SECRET;
  if (!secret) return true;
  const provided = req.headers.get("x-nara-secret") ?? "";
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let body: NaraLeadBody;
  try {
    body = (await req.json()) as NaraLeadBody;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const country = (body.country ?? "").toUpperCase().trim();
    const location = (body.location ?? "").toUpperCase();
    const isPH = country === "PHILIPPINES" || country === "PH" || location.includes("PHILIPPINES");
    const repEmail = isPH ? "bryan@numat.ph" : "erica@numat.ph";
    const repName = isPH ? "Bryan" : "Erica";

    const nameParts = (body.contact_name ?? "").trim().split(" ");
    const firstName = nameParts[0] || "there";
    const lastName = nameParts.slice(1).join(" ") || "";
    const notesRaw = body.notes ?? "";
    const notesPreview = notesRaw.length > 800 ? notesRaw.slice(0, 800) + "..." : notesRaw;
    const email = (body.email ?? "").toLowerCase().trim();

    const insertRow = {
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: body.contact_name ?? firstName,
      company: body.company ?? null,
      phone: body.phone ?? null,
      country: body.country ?? null,
      city: body.location ?? null,
      segment: body.industry ?? null,
      notes: notesPreview,
      lead_source: "NARA Website Chat",
      source: "nara_chat",
      pipeline_stage: "new",
      status: "active",
      rep_email: repEmail,
      rep_assigned: repName,
      last_activity_at: new Date().toISOString(),
    };

    // Insert the lead (duplicate emails ignored via unique constraint)
    try {
      await supabasePost("master_leads", insertRow, "return=minimal,resolution=ignore-duplicates");
    } catch (err) {
      console.error("master_leads insert failed:", err);
    }

    // Look up the lead id (whether just inserted or already existed)
    let leadId: string | null = null;
    if (email) {
      try {
        const rows = await supabaseGetRaw<Array<{ id: string }>>(
          `master_leads?select=id&email=eq.${encodeURIComponent(email)}&limit=1`
        );
        leadId = rows[0]?.id ?? null;
      } catch {
        leadId = null;
      }
    }

    // Email the rep
    try {
      const fullName = body.contact_name ?? firstName ?? "Unknown";
      const companyBit = body.company ? ` (${body.company})` : "";
      const emailBody =
        `Hi ${repName},\n\n` +
        `A new lead just came in through the NUMAT website chatbot.\n\n` +
        `Name: ${fullName}\n` +
        `Company: ${body.company ?? "Not provided"}\n` +
        `Email: ${email || "Not provided"}\n` +
        `Phone: ${body.phone ?? "Not provided"}\n` +
        `Country: ${body.country ?? "Not provided"}\n` +
        `Segment: ${body.industry ?? "Not specified"}\n\n` +
        `NARA notes:\n` +
        `${notesPreview || "No notes captured"}\n\n` +
        `CRM: https://numatbamboo.com/crm\n\n` +
        `NUMAT Automation\n`;
      await sendGmail({
        from: "Nick",
        to: repEmail,
        subject: `New website lead: ${fullName}${companyBit}`,
        text: emailBody,
      });
    } catch (err) {
      console.error("NARA lead alert email failed:", err);
    }

    return Response.json({ ok: true, lead_id: leadId, rep: repEmail });
  } catch (err) {
    console.error("nara-lead error:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-nara-secret",
    },
  });
}

export async function GET() {
  return new Response("This endpoint accepts POST only.", { status: 405, headers: { Allow: "POST" } });
}