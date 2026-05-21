// lib/cron/analyze_qc_photo.ts
//
// Uses Gemini Vision (via the existing gemini-proxy on Cloud Run) to analyse a
// production QC photo and return a structured defect list.
//
// Why Gemini Vision and not Cloud Vision API or AutoML:
//   - Cloud Vision generic labels are not specific enough for engineered bamboo
//     defects (crack vs glue gap vs knot hole vs color mismatch). It would
//     return things like "wood" and "texture" which is useless here.
//   - AutoML / custom Vertex AI Vision needs 1000+ labelled images per class
//     before it outperforms a foundation model on niche industrial inspection.
//     We do not have that data yet.
//   - Gemini 2.5 Flash with a tight, station-scoped prompt produces
//     surprisingly good defect identification out of the box and lets us start
//     building the labelled dataset in production (every photo + supervisor
//     verdict becomes training data for a future custom model).
//
// Cost: about 0.001 USD per photo at the volumes NUMAT produces today
// (well within the GCP credit budget).

import { callGeminiProxy, extractText, GeminiPart } from './vertex_proxy';

export type DefectSeverity = 'minor' | 'moderate' | 'severe';

export type DetectedDefect = {
  type: string;             // canonical code, e.g. 'crack', 'glue_gap'
  display_name: string;     // human-readable
  severity: DefectSeverity;
  location: string;         // free-text, e.g. 'top-right edge', 'centre of board'
  confidence: number;       // 0..1, model's own confidence claim
};

export type QcAnalysisResult = {
  has_defects: boolean;
  defect_count: number;
  severity_max: 'none' | DefectSeverity;
  quality_score: number;    // 0..100, overall pass-fail score
  defects: DetectedDefect[];
  notes: string;            // any contextual comments from the model
  model: string;
  latency_ms: number;
};

export type QcAnalysisInput = {
  station: 'slat_receipt' | 'planing' | 'gluing' | 'veneer_sanding' | 'board_run' | 'final_inspection';
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  operatorNotes?: string;
};

const STATION_CONTEXT: Record<QcAnalysisInput['station'], string> = {
  slat_receipt:
    'Incoming raw bamboo slats from suppliers. Check for cracks, mold, insect damage, color uniformity, knot holes, and visible moisture. The slats are roughly 2 to 5 mm thick strips of bamboo.',
  planing:
    'Planed slats post-planing station. Check for edge chips, dimensional consistency, surface smoothness, and any cracks introduced by planing. Slats should be uniform width.',
  gluing:
    'Slats assembled into a glued blank with adhesive (PRF or PF resin). Check for glue gaps between strips, glue spillover, voids, foreign objects, and warp. Adhesive lines should be uniform and continuous.',
  veneer_sanding:
    'Sanded veneer or board surface. Check for rough patches, missed areas, sanding burns, edge chips, and color uniformity.',
  board_run:
    'Finished engineered bamboo board post-pressing. Check for warp, edge chips, voids, glue gaps, color mismatch, dimensional spec, knot holes, and surface defects.',
  final_inspection:
    'Final pre-shipment inspection. Check for any visible defect that would be rejected by the customer. Boards are NuBam Boards (sheet goods), NuWall panels, NuDoor, NuFloor, or NuSlat.',
};

const DEFECT_VOCABULARY = `
Use ONLY these defect codes in the "type" field:
- crack: visible crack in slat, veneer, or board surface or edge
- void: empty cavity in glue line or core
- glue_gap: visible missing adhesive between strips
- glue_spillover: adhesive squeezed onto faces or edges
- color_mismatch: non-uniform color or banding across strips
- edge_chip: chipped or broken edge
- knot_hole: hole from a removed knot
- warp: visible warp, twist, or cupping
- rough_surface: surface not sanded smooth
- mold_stain: dark spots or biological growth
- moisture_visible: visible water marks or wet patches
- insect_damage: borer holes or insect tunnelling
- dimensional_off: width, length, or thickness visibly off-spec
- foreign_object: non-bamboo material visibly embedded
`.trim();

const RESPONSE_SCHEMA = `
Respond with ONLY a JSON object matching this exact shape, no markdown fences, no commentary:
{
  "has_defects": boolean,
  "defect_count": integer,
  "severity_max": "none" | "minor" | "moderate" | "severe",
  "quality_score": integer between 0 and 100 (100 = perfect),
  "defects": [
    {
      "type": one of the codes above,
      "display_name": human-readable name,
      "severity": "minor" | "moderate" | "severe",
      "location": short free-text describing where on the board,
      "confidence": number between 0 and 1
    }
  ],
  "notes": short paragraph describing what you see, including any concerns not captured by the defect codes
}
`.trim();

const DEFECT_TYPE_DISPLAY: Record<string, string> = {
  crack: 'Crack',
  void: 'Void / Air Pocket',
  glue_gap: 'Glue Gap',
  glue_spillover: 'Glue Spillover',
  color_mismatch: 'Color Mismatch',
  edge_chip: 'Edge Chip',
  knot_hole: 'Knot Hole',
  warp: 'Warp / Bow',
  rough_surface: 'Rough Surface',
  mold_stain: 'Mold / Stain',
  moisture_visible: 'Moisture Marks',
  insect_damage: 'Insect Damage',
  dimensional_off: 'Dimensional Out of Spec',
  foreign_object: 'Foreign Object Embedded',
};

export async function analyzeQcPhoto(input: QcAnalysisInput): Promise<QcAnalysisResult> {
  const start = Date.now();
  const stationContext = STATION_CONTEXT[input.station];
  const operatorContext = input.operatorNotes
    ? `\n\nOperator notes for this photo: "${input.operatorNotes}"`
    : '';

  const prompt = `You are a quality control inspector for an engineered bamboo factory.

Station: ${input.station}
Context: ${stationContext}${operatorContext}

${DEFECT_VOCABULARY}

${RESPONSE_SCHEMA}

If you do not see clear defects, return has_defects=false, defect_count=0, severity_max="none", quality_score around 85 to 100, defects=[].

Quality score guidance:
- 95 to 100: looks excellent, would ship to a high-end customer.
- 80 to 94: minor cosmetic only.
- 60 to 79: visible defects, would need rework or grading down.
- 40 to 59: significant defects, likely reject.
- 0 to 39: clear reject, multiple severe defects.

Be calibrated. False positives are costly (operators stop the line). Only flag defects you are clearly seeing in the image.`;

  const parts: GeminiPart[] = [
    { text: prompt },
    {
      inline_data: {
        mime_type: input.mimeType,
        data: input.imageBase64,
      },
    },
  ];

  const model = 'gemini-2.5-flash';
  const resp = await callGeminiProxy({
    model,
    contents: [{ role: 'user', parts }],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature: 0.1,
      max_output_tokens: 1500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = extractText(resp).trim();
  const latency_ms = Date.now() - start;

  let parsed: Partial<QcAnalysisResult>;
  try {
    // Strip code fences if the model added them despite our schema request.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return {
      has_defects: false,
      defect_count: 0,
      severity_max: 'none',
      quality_score: 0,
      defects: [],
      notes: `Failed to parse model response. Raw: ${text.slice(0, 400)}`,
      model,
      latency_ms,
    };
  }

  // Normalise and sanity-check.
  const defectsRaw: DetectedDefect[] = Array.isArray(parsed.defects) ? parsed.defects : [];
  const defects: DetectedDefect[] = defectsRaw
    .filter((d) => d && typeof d.type === 'string')
    .map((d) => ({
      type: d.type,
      display_name: d.display_name || DEFECT_TYPE_DISPLAY[d.type] || d.type,
      severity: (['minor', 'moderate', 'severe'] as const).includes(d.severity)
        ? d.severity
        : 'minor',
      location: typeof d.location === 'string' ? d.location : '',
      confidence:
        typeof d.confidence === 'number' && d.confidence >= 0 && d.confidence <= 1
          ? d.confidence
          : 0.5,
    }));

  const severityRank: Record<DefectSeverity | 'none', number> = {
    none: 0,
    minor: 1,
    moderate: 2,
    severe: 3,
  };
  const severityMaxComputed: 'none' | DefectSeverity = defects.reduce<'none' | DefectSeverity>(
    (acc, d) => (severityRank[d.severity] > severityRank[acc] ? d.severity : acc),
    'none',
  );
  const qualityScore =
    typeof parsed.quality_score === 'number'
      ? Math.max(0, Math.min(100, Math.round(parsed.quality_score)))
      : 50;

  return {
    has_defects: defects.length > 0,
    defect_count: defects.length,
    severity_max: severityMaxComputed,
    quality_score: qualityScore,
    defects,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    model,
    latency_ms,
  };
}
