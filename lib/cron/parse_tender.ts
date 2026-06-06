// lib/cron/parse_tender.ts
//
// Parses a PhilGEPS bid notice email into structured tender fields using Gemini,
// and scores how well it fits NUMAT's engineered bamboo product range.
//
// NUMAT products: NuBam Boards (engineered bamboo sheet goods for furniture,
// joinery, cabinetry), NuWall (wall panels and cladding), NuDoor (door panels
// and frames), NuFloor (flooring), NuSlat (decorative slat panels for ceilings,
// walls, partitions). NUMAT can credibly bid on: school furniture, office
// furniture, fit out, partitions, doors, flooring, cabinetry, wall panelling,
// and general building materials where engineered bamboo substitutes for
// plywood, MDF, or solid wood.

import { callGeminiProxy, extractText } from './vertex_proxy';

export type TenderParseResult = {
  is_tender: boolean;            // false if the email is not actually a bid notice
  reference_number: string | null;
  title: string | null;
  agency: string | null;
  category: string | null;
  description: string | null;
  approved_budget_php: number | null;
  closing_date: string | null;  // ISO date or null
  posted_date: string | null;
  area_of_delivery: string | null;
  philgeps_url: string | null;
  numat_fit_score: number;       // 0..100
  recommended_product: string | null;
  fit_reasoning: string;
  model: string;
};

const PROMPT_HEADER = `You are a procurement analyst for NUMAT Sustainable Manufacturing Inc., a Philippine engineered bamboo manufacturer.

NUMAT products and what they can credibly supply for a government tender:
- NuBam Boards: engineered bamboo sheet goods. Substitute for plywood, MDF, particleboard in furniture, joinery, cabinetry, tables, shelving.
- NuWall: bamboo wall panels and cladding for interior fit out.
- NuDoor: bamboo door panels and frames (flush doors, panel doors).
- NuFloor: bamboo flooring for offices, schools, residential, commercial.
- NuSlat: decorative bamboo slat panels for ceilings, walls, partitions.

NUMAT can credibly bid when the tender involves: school desks and chairs, office furniture, tables, cabinets, shelving, fit out works, partitions, interior doors, flooring supply, wall panelling, or general supply of plywood, lumber, MDF, or wood based panels.

NUMAT CANNOT supply: structural steel, concrete, electrical, plumbing, vehicles, food, IT equipment, uniforms, medical, or anything not made of wood or bamboo panels.`;

const RESPONSE_SCHEMA = `Return ONLY a JSON object, no markdown fences:
{
  "is_tender": boolean (false if this email is a login code, registration confirmation, newsletter, or anything that is not an actual bid opportunity),
  "reference_number": string or null,
  "title": string or null,
  "agency": string or null (the procuring government entity),
  "category": string or null,
  "description": string or null (2 sentences max, plain language),
  "approved_budget_php": number or null (the Approved Budget for the Contract in pesos, digits only),
  "closing_date": string or null (ISO 8601 date, the bid submission deadline),
  "posted_date": string or null (ISO 8601 date),
  "area_of_delivery": string or null,
  "philgeps_url": string or null (any philgeps.gov.ph link in the email),
  "numat_fit_score": integer 0 to 100 (how well NUMAT can supply this; 0 means cannot supply, 100 means perfect fit like school furniture or wood panel supply),
  "recommended_product": string or null (which NUMAT product fits best, or null if fit is 0),
  "fit_reasoning": string (one sentence on why the score)
}

Scoring guide:
- 80 to 100: directly supplies (school furniture, office furniture, plywood or panel supply, doors, flooring, partitions)
- 50 to 79: plausible fit with some stretch (general fit out, cabinetry within a larger works package)
- 20 to 49: tangential (a small wood component inside a larger non wood contract)
- 0 to 19: cannot supply (steel, concrete, IT, vehicles, services)`;

export async function parseTenderEmail(args: {
  subject: string;
  body: string;
  receivedDate: string;
}): Promise<TenderParseResult> {
  const prompt = `${PROMPT_HEADER}

Below is an email received on ${args.receivedDate}. Extract the tender details and score the fit.

EMAIL SUBJECT: ${args.subject}

EMAIL BODY:
${args.body.slice(0, 12000)}

${RESPONSE_SCHEMA}`;

  const model = 'gemini-2.5-flash';
  const resp = await callGeminiProxy({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      max_output_tokens: 1200,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = extractText(resp).trim();
  let parsed: Partial<TenderParseResult>;
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      is_tender: false,
      reference_number: null,
      title: null,
      agency: null,
      category: null,
      description: `Parse failure. Raw: ${text.slice(0, 300)}`,
      approved_budget_php: null,
      closing_date: null,
      posted_date: null,
      area_of_delivery: null,
      philgeps_url: null,
      numat_fit_score: 0,
      recommended_product: null,
      fit_reasoning: 'could not parse',
      model,
    };
  }

  const score =
    typeof parsed.numat_fit_score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.numat_fit_score)))
      : 0;

  return {
    is_tender: parsed.is_tender === true,
    reference_number: parsed.reference_number ?? null,
    title: parsed.title ?? null,
    agency: parsed.agency ?? null,
    category: parsed.category ?? null,
    description: parsed.description ?? null,
    approved_budget_php:
      typeof parsed.approved_budget_php === 'number' ? parsed.approved_budget_php : null,
    closing_date: parsed.closing_date ?? null,
    posted_date: parsed.posted_date ?? null,
    area_of_delivery: parsed.area_of_delivery ?? null,
    philgeps_url: parsed.philgeps_url ?? null,
    numat_fit_score: score,
    recommended_product: parsed.recommended_product ?? null,
    fit_reasoning: typeof parsed.fit_reasoning === 'string' ? parsed.fit_reasoning : '',
    model,
  };
}
