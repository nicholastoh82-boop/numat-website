// lib/cron/classify_reply.ts
//
// Gemini powered classifier for cold outreach replies.
// Reads the reply text, returns structured classification + priority + suggested next step.
// Used by app/api/cron/reply-handler/route.ts to populate master_leads classification columns
// and trigger Telegram alerts for hot leads.

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type ReplyClassification =
  | "hot_lead"
  | "interested_needs_info"
  | "soft_no"
  | "hard_no"
  | "wrong_contact"
  | "auto_reply"
  | "out_of_office"
  | "other";

export type ReplyPriority = "P0" | "P1" | "P2" | "P3";

export type SuggestedAction =
  | "send_quote"
  | "send_sample"
  | "schedule_call"
  | "send_specs"
  | "redirect_to_correct_contact"
  | "mark_unsubscribe"
  | "no_action";

export type ClassificationResult = {
  classification: ReplyClassification;
  priority: ReplyPriority;
  summary: string;
  next_step: string;
  suggested_action: SuggestedAction;
};

const PROMPT_TEMPLATE = `You are classifying replies to NUMAT's cold outreach emails. NUMAT sells engineered bamboo products (NuBam Boards, NuWall, NuDoor, NuFloor, NuSlat) to construction, manufacturing, materials, and specialist supplier buyers worldwide.

Classify the following reply into exactly ONE class:
1. hot_lead: explicit buying intent or concrete request (pricing, samples, call, PO, MOQ, lead time)
2. interested_needs_info: positive engagement, general questions, soft interest, "tell me more"
3. soft_no: not now but open to future (timing, budget, current vendor in place)
4. hard_no: explicit not interested, do not contact, unsubscribe, remove me
5. wrong_contact: person says they are not the right contact, redirects to someone else
6. auto_reply: clearly an automated responder (vacation, away, autoreply system)
7. out_of_office: human written but indicates the person is on leave or unreachable for now
8. other: anything unclear, off topic, or spam

Assign priority:
- P0: hot_lead WITH a concrete signal (specific pricing ask, sample request, call request, RFQ, PO)
- P1: hot_lead generic OR interested_needs_info
- P2: soft_no, wrong_contact (redirect is recoverable)
- P3: hard_no, auto_reply, out_of_office, other

Return ONLY a valid JSON object. No markdown, no commentary, no code fences.

{
  "classification": "",
  "priority": "",
  "summary": "",
  "next_step": "",
  "suggested_action": ""
}

Field rules:
- summary: ONE line, under 120 characters, describing what they said in plain English
- next_step: ONE line under 120 characters, what the rep should do (e.g. "Send NuFloor pricing for 1500 sqm to Manila"; "Ask for project timeline"; "Forward to procurement contact")
- suggested_action: EXACTLY one of: send_quote, send_sample, schedule_call, send_specs, redirect_to_correct_contact, mark_unsubscribe, no_action

Reply metadata:
From: {{FROM_NAME}} <{{FROM_EMAIL}}>
Subject: {{SUBJECT}}

Reply text:
{{REPLY_TEXT}}`;

function buildPrompt(args: {
  fromName: string;
  fromEmail: string;
  subject: string;
  replyText: string;
}): string {
  return PROMPT_TEMPLATE
    .replace("{{FROM_NAME}}", args.fromName || "Unknown")
    .replace("{{FROM_EMAIL}}", args.fromEmail || "unknown@unknown")
    .replace("{{SUBJECT}}", (args.subject || "").slice(0, 300))
    .replace("{{REPLY_TEXT}}", (args.replyText || "").slice(0, 4000));
}

const VALID_CLASSIFICATIONS = new Set<ReplyClassification>([
  "hot_lead",
  "interested_needs_info",
  "soft_no",
  "hard_no",
  "wrong_contact",
  "auto_reply",
  "out_of_office",
  "other",
]);

const VALID_PRIORITIES = new Set<ReplyPriority>(["P0", "P1", "P2", "P3"]);

const VALID_ACTIONS = new Set<SuggestedAction>([
  "send_quote",
  "send_sample",
  "schedule_call",
  "send_specs",
  "redirect_to_correct_contact",
  "mark_unsubscribe",
  "no_action",
]);

function sanitise(raw: any): ClassificationResult {
  const classification = VALID_CLASSIFICATIONS.has(raw?.classification)
    ? (raw.classification as ReplyClassification)
    : ("other" as ReplyClassification);
  const priority = VALID_PRIORITIES.has(raw?.priority)
    ? (raw.priority as ReplyPriority)
    : ("P3" as ReplyPriority);
  const suggested_action = VALID_ACTIONS.has(raw?.suggested_action)
    ? (raw.suggested_action as SuggestedAction)
    : ("no_action" as SuggestedAction);

  const summary =
    typeof raw?.summary === "string" ? raw.summary.slice(0, 200) : "";
  const next_step =
    typeof raw?.next_step === "string" ? raw.next_step.slice(0, 200) : "";

  return { classification, priority, summary, next_step, suggested_action };
}

export async function classifyReply(args: {
  fromName: string;
  fromEmail: string;
  subject: string;
  replyText: string;
}): Promise<ClassificationResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const prompt = buildPrompt(args);

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.1,
        max_output_tokens: 512,
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini classify failed: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no text content");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `Gemini returned non JSON: ${text.slice(0, 200)} | parse error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return sanitise(parsed);
}

export function isHotLead(priority: ReplyPriority): boolean {
  return priority === "P0" || priority === "P1";
}
