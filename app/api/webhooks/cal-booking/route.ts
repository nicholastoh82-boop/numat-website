// app/api/webhooks/cal-booking/route.ts
//
// Cal.com booking webhook. Replaces n8n NUMAT — Cal.com Booking Handler.
// Receives BOOKING_CREATED events from Cal.com, updates the matching lead in
// master_leads to pipeline_stage='meeting_booked', logs a sales_activities row,
// and emails the assigned rep (Bryan or Mohan) a booking alert.
//
// Cal.com sends webhooks with the shape { triggerEvent, payload: {...} } where
// payload contains attendees, organizer, startTime, videoCallData, uid, etc.

import { sendGmail, supabaseGetRaw, supabasePatch, supabasePost, type RepKey } from "@/lib/cron/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Attendee = { email?: string; name?: string; timeZone?: string };
type Organizer = { email?: string; timeZone?: string };
type CalPayload = {
  payload?: {
    attendees?: Attendee[];
    organizer?: Organizer;
    startTime?: string;
    videoCallData?: { url?: string };
    meetingUrl?: string;
    location?: string;
    uid?: string;
  };
  attendees?: Attendee[];
  organizer?: Organizer;
  startTime?: string;
  videoCallData?: { url?: string };
  meetingUrl?: string;
  location?: string;
  uid?: string;
};

// Optional shared secret check. If CAL_WEBHOOK_SECRET env var is set, requests
// must include header `x-cal-secret: <value>`. Unset = open (matches n8n).
function authorized(req: Request): boolean {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) return true;
  const provided = req.headers.get("x-cal-secret") ?? "";
  if (provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i++) mismatch |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let body: CalPayload;
  try {
    body = (await req.json()) as CalPayload;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Cal.com payload may be wrapped in { payload: {...} } or flat
    const payload = body.payload ?? body;
    const attendees = payload.attendees ?? [];
    const attendee = attendees.find((a) => !a.email?.includes("@cal.com")) ?? attendees[0] ?? {};
    const organizer = payload.organizer ?? {};

    // All bookings go to Erica for triage; she reassigns to the reps.
    const repKey: RepKey = "Erica";
    const repEmail = "erica@numat.ph";

    const startTime = payload.startTime ?? new Date().toISOString();
    const startDate = new Date(startTime);
    const dateStr = startDate.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeStr = startDate.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const tz = attendee.timeZone ?? organizer.timeZone ?? "Asia/Manila";
    const meetingUrl = payload.videoCallData?.url ?? payload.meetingUrl ?? payload.location ?? null;
    const attendeeEmail = (attendee.email ?? "").toLowerCase().trim();
    const attendeeName = attendee.name ?? "Unknown";

    // Update the lead
    const nowIso = new Date().toISOString();
    const updatePayload = {
      pipeline_stage: "meeting_booked",
      booking_confirmed: true,
      appointment_date: startTime,
      meeting_link: meetingUrl,
      cal_booking_uid: payload.uid ?? null,
      cal_event_url: meetingUrl,
      last_activity_at: nowIso,
      last_activity_type: "booking_confirmed",
    };

    let leadId: string | null = null;
    if (attendeeEmail) {
      await supabasePatch(`master_leads?email=eq.${encodeURIComponent(attendeeEmail)}`, updatePayload);
      // Fetch the id for the activity log (patch doesn't return with Prefer=minimal)
      try {
        const rows = await supabaseGetRaw<Array<{ id: string }>>(
          `master_leads?select=id&email=eq.${encodeURIComponent(attendeeEmail)}&limit=1`
        );
        leadId = rows[0]?.id ?? null;
      } catch {
        leadId = null;
      }
    }

    // Log sales activity row
    try {
      await supabasePost("sales_activities", {
        lead_id: leadId,
        activity_type: "booking_confirmed",
        actor: repEmail,
        payload: {
          attendee_name: attendeeName,
          attendee_email: attendeeEmail,
          start_time: startTime,
          meeting_url: meetingUrl,
          cal_uid: payload.uid ?? null,
        },
        created_at: nowIso,
      });
    } catch (err) {
      console.error("sales_activities log failed:", err);
    }

    // Email the assigned rep
    try {
      const emailText =
        `Hi ${repKey},\n\n` +
        `A discovery call has been confirmed.\n\n` +
        `Name: ${attendeeName}\n` +
        `Email: ${attendeeEmail}\n` +
        `Date: ${dateStr}\n` +
        `Time: ${timeStr} (${tz})\n` +
        `Meeting link: ${meetingUrl || "Check your calendar"}\n\n` +
        `The lead has been updated to Meeting Booked in the CRM.\n\n` +
        `CRM: https://numatbamboo.com/crm\n\n` +
        `NUMAT Booking System\n`;
      await sendGmail({
        from: "Nick",
        to: repEmail,
        subject: `Booking confirmed: ${attendeeName} on ${dateStr}`,
        text: emailText,
      });
    } catch (err) {
      console.error("booking alert email failed:", err);
    }

    return Response.json({ ok: true, lead_id: leadId, rep: repEmail });
  } catch (err) {
    console.error("cal-booking error:", err);
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
      "Access-Control-Allow-Headers": "Content-Type, x-cal-secret",
    },
  });
}

export async function GET() {
  return new Response("This endpoint accepts POST only.", { status: 405, headers: { Allow: "POST" } });
}