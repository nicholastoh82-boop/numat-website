// lib/cron/draft_reply.ts
//
// Given an inbound prospect reply plus its Gemini classification, drafts a
// suggested response email the rep can review and send. The draft is created
// in the rep's Gmail Drafts folder, threaded to the original message, so the
// rep just opens it, glances, and hits send. This collapses response time
// from hours to minutes, which is the single biggest predictor of whether a
// B2B reply converts.
//
// We only draft for replies that warrant a substantive response. Hard no,
// unsubscribe, auto reply, and out of office are skipped (the classifier
// already flags those and no draft is helpful).

import { callGeminiProxy, extractText } from './vertex_proxy';
import type { ClassificationResult } from './classify_reply';

export type DraftReplyResult = {
  should_draft: boolean;
  subject: string;
  body: string;       // plain text, rep reviews before sending
  model: string;
};

// Which classifications and actions deserve an auto drafted reply.
const DRAFTABLE_CLASSES = new Set([
  'hot_lead',
  'interested_needs_info',
  'wrong_contact', // a polite redirect ask is useful
  'other',
]);

const REP_TITLES: Record<string, string> = {
  'mohan@numat.ph': 'Head of Growth',
  'bryan@numat.ph': 'Chief Operating Officer',
  'eugene@numat.ph': 'Business Development',
  'nick@numat.ph': 'Business Administrator',
};

export function shouldDraftReply(c: ClassificationResult): boolean {
  if (!DRAFTABLE_CLASSES.has(c.classification)) return false;
  if (c.suggested_action === 'mark_unsubscribe' || c.suggested_action === 'no_action') {
    // Allow no_action only for hot_lead / interested (a thank-you-plus-next-step
    // is still useful); skip otherwise.
    if (c.classification !== 'hot_lead' && c.classification !== 'interested_needs_info') {
      return false;
    }
  }
  return true;
}

export async function draftReply(args: {
  fromName: string;
  fromEmail: string;
  company: string;
  subject: string;
  replyText: string;
  classification: ClassificationResult;
  repEmail: string;
  repName: string;
}): Promise<DraftReplyResult> {
  const repTitle = REP_TITLES[args.repEmail.toLowerCase()] || 'NUMAT';

  const prompt = `You are ${args.repName}, ${repTitle} at NUMAT Sustainable Manufacturing Inc., a Philippine engineered bamboo manufacturer. You are writing a reply to a prospect who just responded to your cold outreach.

NUMAT products: NuBam Boards (engineered bamboo sheet goods for furniture, joinery, cabinetry), NuWall (wall panels and cladding), NuDoor (door panels and frames), NuFloor (flooring), NuSlat (decorative slat panels for ceilings, walls, partitions).

PROSPECT REPLY:
From: ${args.fromName} at ${args.company}
Subject: ${args.subject}
Their message:
"""
${args.replyText.slice(0, 4000)}
"""

CLASSIFICATION (from our system):
- Type: ${args.classification.classification}
- Summary: ${args.classification.summary}
- Suggested next step: ${args.classification.next_step}
- Suggested action: ${args.classification.suggested_action}

Write a reply that moves the conversation forward toward the suggested next step.

STRICT RULES:
1. Never claim certifications, LEED credits, fire ratings, acoustic ratings, ASTM ratings, or Class A ratings. NUMAT has none.
2. No shortforms or industry jargon. Plain professional English.
3. Never use hyphens or dashes anywhere. Use commas, parentheses, or new sentences.
4. Do not invent prices, lead times, project facts, or specifications. If the next step needs a number you do not have, say you will follow up with it rather than making one up.
5. Be warm, concise, and specific to what they said. 90 to 140 words in the body.
6. End with a single clear next step (a short call, sending a sample box, or sending specs).
7. Do not include a signature block. It is appended automatically.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "subject": "Re: their subject, or a clearer one if helpful",
  "body": "the reply body starting with Hi ${args.fromName.split(' ')[0] || 'there'},\\n\\n and ending before the signature. Use \\n\\n for paragraph breaks."
}`;

  const model = 'gemini-2.5-flash';
  const resp = await callGeminiProxy({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.4,
      max_output_tokens: 800,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = extractText(resp).trim();
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { subject?: string; body?: string };
    return {
      should_draft: true,
      subject: typeof parsed.subject === 'string' && parsed.subject ? parsed.subject : `Re: ${args.subject}`,
      body: typeof parsed.body === 'string' ? parsed.body : '',
      model,
    };
  } catch {
    return {
      should_draft: false,
      subject: `Re: ${args.subject}`,
      body: '',
      model,
    };
  }
}
