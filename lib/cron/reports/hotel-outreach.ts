// lib/cron/reports/hotel-outreach.ts
//
// Weekly Hotel Outreach Report: analyzes last 7 days of sequence_events plus
// all-time ve_reports (Philippines only), builds summary + format breakdown +
// step breakdown + replies + VE engagement + recommendations. Emails to
// mark@numat.ph (NOT Nick).

import { sendGmail, supabaseGet, supabaseGetRaw } from "@/lib/cron/helpers";

type SequenceEvent = {
  event_type: string;
  format_version: string | null;
  sequence_step: number | null;
  reply_sentiment: string | null;
  company: string | null;
  notes: string | null;
};

type VeReport = {
  email: string;
  resort_name: string | null;
  rooms: number | null;
  view_count: number | null;
  last_viewed_at: string | null;
  saving_vs_hard_lo: number | null;
  saving_vs_hard_hi: number | null;
};

type FormatStats = { sent: number; replied: number; positive: number };
type StepStats = { sent: number; replied: number };

export async function generateHotelOutreachReport() {
  const now = new Date();
  const weekAgoISO = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [events, veReports] = await Promise.all([
    supabaseGetRaw<SequenceEvent[]>(
      `sequence_events?select=*&created_at=gte.${encodeURIComponent(weekAgoISO)}&order=created_at.desc&limit=1000`
    ),
    supabaseGet<VeReport[]>("ve_reports", {
      select: "email,resort_name,rooms,view_count,last_viewed_at,saving_vs_hard_lo,saving_vs_hard_hi",
      country: "eq.Philippines",
      view_count: "gt.0",
      order: "view_count.desc",
      limit: "20",
    }),
  ]);

  let sent = 0,
    replied = 0,
    positive = 0,
    veOpened = 0,
    waContact = 0,
    sampleReq = 0,
    meetings = 0,
    won = 0;
  const byFormat: Record<string, FormatStats> = {};
  const byStep: Record<string, StepStats> = {};
  const repliedCompanies: Array<{ company: string; sentiment: string; notes: string }> = [];

  for (const ev of events) {
    const type = ev.event_type || "";
    const fmtKey = ev.format_version || "unknown";
    const step = ev.sequence_step;

    if (type === "sent") {
      sent++;
      if (!byFormat[fmtKey]) byFormat[fmtKey] = { sent: 0, replied: 0, positive: 0 };
      byFormat[fmtKey].sent++;
      if (step !== null && step !== undefined) {
        const k = String(step);
        if (!byStep[k]) byStep[k] = { sent: 0, replied: 0 };
        byStep[k].sent++;
      }
    }
    if (type === "replied") {
      replied++;
      if (!byFormat[fmtKey]) byFormat[fmtKey] = { sent: 0, replied: 0, positive: 0 };
      byFormat[fmtKey].replied++;
      if (step !== null && step !== undefined) {
        const k = String(step);
        if (!byStep[k]) byStep[k] = { sent: 0, replied: 0 };
        byStep[k].replied++;
      }
      if (ev.reply_sentiment === "positive") {
        positive++;
        byFormat[fmtKey].positive++;
      }
      if (ev.company) repliedCompanies.push({ company: ev.company, sentiment: ev.reply_sentiment || "unknown", notes: ev.notes || "" });
    }
    if (type === "ve_opened") veOpened++;
    if (type === "wa_contact") waContact++;
    if (type === "sample_requested") sampleReq++;
    if (type === "meeting_booked") meetings++;
    if (type === "won") won++;
  }

  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0";
  const replyRateNum = parseFloat(replyRate);

  // Format performance rows
  const formatRows =
    Object.keys(byFormat).length === 0
      ? '<tr><td colspan="5" style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#888;">No email events logged this week.</td></tr>'
      : Object.entries(byFormat)
          .map(([fmtKey, d]) => {
            const rr = d.sent > 0 ? ((d.replied / d.sent) * 100).toFixed(1) : "0.0";
            return (
              `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${fmtKey}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${d.sent}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${d.replied}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${rr}%</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${d.positive || 0}</td></tr>`
            );
          })
          .join("");

  // Step breakdown
  const stepLabels: Record<string, string> = {
    "0": "Email 1: Intro",
    "1": "Email 2: Full Report",
    "2": "Email 3: Humidity",
    "3": "Email 4: Call",
    "4": "Email 5: Close",
  };
  const stepKeys = Object.keys(byStep).sort();
  const stepRows =
    stepKeys.length === 0
      ? '<tr><td colspan="4" style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#888;">No step data yet.</td></tr>'
      : stepKeys
          .map((st) => {
            const sd = byStep[st];
            const srr = sd.sent > 0 ? ((sd.replied / sd.sent) * 100).toFixed(1) : "0.0";
            return (
              `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${stepLabels[st] || "Step " + st}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${sd.sent}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${sd.replied}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${srr}%</td></tr>`
            );
          })
          .join("");

  // Top VE report openers
  const veRows =
    veReports.length === 0
      ? '<tr><td colspan="5" style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#888;">No VE report views yet.</td></tr>'
      : veReports
          .slice(0, 8)
          .map((vr) => {
            const savLo = vr.saving_vs_hard_lo || 0;
            const savHi = vr.saving_vs_hard_hi || 0;
            const savStr = savLo && savHi ? `PHP ${(savLo / 1_000_000).toFixed(1)}M to PHP ${(savHi / 1_000_000).toFixed(1)}M` : "N/A";
            const lastView = vr.last_viewed_at ? new Date(vr.last_viewed_at).toDateString() : "N/A";
            return (
              `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${vr.resort_name || ""}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${vr.rooms || ""}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${vr.view_count || 0}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${savStr}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${lastView}</td></tr>`
            );
          })
          .join("");

  // Replies
  const repliesHtml =
    repliedCompanies.length === 0
      ? '<tr><td colspan="3" style="padding:10px 12px;border:1px solid #ddd;font-size:13px;color:#888;">No replies logged this week.</td></tr>'
      : repliedCompanies
          .map((rc) => {
            const sentimentColor = rc.sentiment === "positive" ? "#16a34a" : rc.sentiment === "negative" ? "#dc2626" : "#6b7280";
            return (
              `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">${rc.company}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;color:${sentimentColor};">${rc.sentiment}</td>` +
              `<td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;color:#6b7280;">${rc.notes}</td></tr>`
            );
          })
          .join("");

  // Rule-based recommendations
  const recommendations: string[] = [];
  if (sent === 0) {
    recommendations.push("No emails sent this week. Check that the sequence-sender cron is active and queue is populated.");
  } else if (replyRateNum === 0) {
    recommendations.push("Reply rate is 0%. Check that replies are being logged in the sequence_events table. If logging is working, consider testing a new subject line next week.");
  } else if (replyRateNum < 2) {
    recommendations.push('Reply rate is below 2%. Try A/B testing a more direct subject line next week: e.g. "Quick question for [Company]" vs the current format.');
    recommendations.push("Check the format with the highest sent volume. If one format has a significantly lower reply rate, pause it and double down on the better performing one.");
  } else if (replyRateNum >= 2 && replyRateNum < 5) {
    recommendations.push("Reply rate is in the 2 to 5% range which is reasonable for cold outreach. Focus on converting the positive replies into meetings before optimising further.");
  } else if (replyRateNum >= 5) {
    recommendations.push("Strong reply rate above 5%. Scale up: increase the contact list and consider adding a new segment beyond Hotels to the same sequence format.");
  }
  if (veOpened > 0) recommendations.push(`${veOpened} VE report views this week. Any property with 3 or more views in a single day should be called directly by Mohan or Bryan before Email 2 goes out.`);
  if (meetings > 0) recommendations.push(`${meetings} meeting(s) booked this week. Prioritise these above all else.`);
  if (waContact > 0) recommendations.push(`${waContact} WhatsApp contact(s) initiated. Respond within 2 hours where possible. WhatsApp contacts convert at a higher rate than email replies.`);

  // Best format
  const formatKeys = Object.keys(byFormat);
  if (formatKeys.length > 1) {
    let bestFmt: string | null = null;
    let bestRR = -1;
    for (const bf of formatKeys) {
      const bd = byFormat[bf];
      const bRR = bd.sent > 0 ? bd.replied / bd.sent : 0;
      if (bRR > bestRR) {
        bestRR = bRR;
        bestFmt = bf;
      }
    }
    if (bestFmt && bestRR > 0) {
      recommendations.push(`Format ${bestFmt} has the highest reply rate at ${(bestRR * 100).toFixed(1)}%. Consider making this the default for all sends next week.`);
    }
  }

  const recHtml =
    recommendations.length === 0
      ? '<li style="font-size:14px;">No specific recommendations this week. Keep the current approach running.</li>'
      : recommendations.map((r) => `<li style="margin-bottom:10px;font-size:14px;line-height:1.6;">${r}</li>`).join("");

  const thStyle = "padding:8px 12px;border:1px solid #ddd;font-size:12px;font-weight:bold;background:#f5f5f5;text-align:left;";
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const weekLabel =
    weekAgo.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " to " +
    now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const html =
    '<div style="max-width:640px;font-family:Arial,sans-serif;background:#ffffff;">' +
    '<p style="margin:0 0 6px 0;font-size:12px;color:#888;">NUMAT Hotel Outreach</p>' +
    '<h2 style="margin:0 0 4px 0;font-size:20px;color:#0f2137;">Weekly Performance Report</h2>' +
    `<p style="margin:0 0 24px 0;font-size:13px;color:#6b7280;">${weekLabel}</p>` +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;"><tr>' +
    `<td style="padding:16px;border:1px solid #ddd;text-align:center;"><div style="font-size:28px;font-weight:bold;color:#0f2137;">${sent}</div><div style="font-size:12px;color:#888;margin-top:4px;">Emails Sent</div></td>` +
    `<td style="padding:16px;border:1px solid #ddd;text-align:center;"><div style="font-size:28px;font-weight:bold;color:#0f2137;">${replied}</div><div style="font-size:12px;color:#888;margin-top:4px;">Replies</div></td>` +
    `<td style="padding:16px;border:1px solid #ddd;text-align:center;"><div style="font-size:28px;font-weight:bold;color:#0f2137;">${replyRate}%</div><div style="font-size:12px;color:#888;margin-top:4px;">Reply Rate</div></td>` +
    `<td style="padding:16px;border:1px solid #ddd;text-align:center;"><div style="font-size:28px;font-weight:bold;color:#16a34a;">${positive}</div><div style="font-size:12px;color:#888;margin-top:4px;">Positive Replies</div></td>` +
    `<td style="padding:16px;border:1px solid #ddd;text-align:center;"><div style="font-size:28px;font-weight:bold;color:#0f2137;">${meetings}</div><div style="font-size:12px;color:#888;margin-top:4px;">Meetings Booked</div></td>` +
    "</tr></table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Email Format Performance</h3>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">' +
    `<tr><th style="${thStyle}">Format</th><th style="${thStyle}text-align:center;">Sent</th><th style="${thStyle}text-align:center;">Replied</th><th style="${thStyle}text-align:center;">Reply Rate</th><th style="${thStyle}text-align:center;">Positive</th></tr>` +
    formatRows +
    "</table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Performance by Sequence Step</h3>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">' +
    `<tr><th style="${thStyle}">Step</th><th style="${thStyle}text-align:center;">Sent</th><th style="${thStyle}text-align:center;">Replied</th><th style="${thStyle}text-align:center;">Reply Rate</th></tr>` +
    stepRows +
    "</table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Replies This Week</h3>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">' +
    `<tr><th style="${thStyle}">Company</th><th style="${thStyle}">Sentiment</th><th style="${thStyle}">Notes</th></tr>` +
    repliesHtml +
    "</table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Top VE Report Engagement (All Time)</h3>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">' +
    `<tr><th style="${thStyle}">Property</th><th style="${thStyle}text-align:center;">Rooms</th><th style="${thStyle}text-align:center;">Views</th><th style="${thStyle}">Savings Shown</th><th style="${thStyle}">Last Viewed</th></tr>` +
    veRows +
    "</table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Other Activity</h3>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px;">' +
    `<tr><th style="${thStyle}">Touchpoint</th><th style="${thStyle}text-align:center;">Count</th></tr>` +
    `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">WhatsApp contacts initiated</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${waContact}</td></tr>` +
    `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">Sample packs requested</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${sampleReq}</td></tr>` +
    `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">Meetings booked</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${meetings}</td></tr>` +
    `<tr><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;">Deals won</td><td style="padding:7px 12px;border:1px solid #ddd;font-size:13px;text-align:center;">${won}</td></tr>` +
    "</table>" +
    '<h3 style="font-size:15px;margin:0 0 10px 0;color:#0f2137;">Recommendations for Next Week</h3>' +
    `<ul style="margin:0 0 24px 0;padding-left:20px;">${recHtml}</ul>` +
    '<p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #f0f0f0;padding-top:16px;">NUMAT Sustainable Manufacturing · numatbamboo.com · Auto-generated every Monday at 8am MYT</p>' +
    "</div>";

  await sendGmail({
    from: "Nick",
    to: "mark@numat.ph",
    subject: `Hotel Outreach Weekly Report: ${weekLabel}`,
    html,
  });

  return { report: "hotel_outreach", sent, replied, reply_rate_pct: replyRateNum, positive_replies: positive, meetings_booked: meetings };
}