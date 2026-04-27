import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { anthropicMessagesUrl, anthropicHeaders } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VISION_MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You are a material estimator for engineered bamboo furniture at NUMAT. You receive a schematic or technical drawing of a furniture piece with dimension labels.

Your task: produce a complete flat panel parts list suitable for a cut list takeoff.

RULES:
1. Read every dimension label carefully. Labels use W (width), D (depth), H (height), or raw numbers. Units are typically cm or mm. Convert cm to mm (multiply by 10).
2. Decompose the piece into flat rectangular panel parts only. Each part has a length_mm, width_mm, qty, and part_class.
3. Use these standard part_class values: desk_top, table_top, work_surface, side_panel, top_panel, bottom_panel, shelf, divider, door, drawer_front, drawer_box, modesty_panel, back_panel, plinth, trim.
4. If the schematic shows internal shelves, dividers, or backs, count them. If it shows a cabinet section, add door, top, bottom, sides, shelves, and back as appropriate.
5. Metal legs, metal frames, hinges, handles, screws, and glue are NOT board material. List them in external_components.
6. For dimensions not shown but required (like internal shelf count), use conventional furniture assumptions and note them in assumptions.
7. Part length should be the longer side, width the shorter side, when possible.
8. Return ONLY valid JSON. No markdown fences. No prose before or after.

Output schema:
{
  "piece_name": string,
  "overall_dimensions": { "width_mm": number, "depth_mm": number, "height_mm": number, "notes": string },
  "parts": [{ "name": string, "part_class": string, "qty": number, "length_mm": number, "width_mm": number }],
  "external_components": [{ "name": string, "qty": number }],
  "assumptions": [string],
  "confidence": "high" | "medium" | "low",
  "notes_for_reviewer": string
}`;

async function getActiveCrmUser() {
  const cookieStore = await cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return { user: null, crmUser: null };

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: crmUser } = await serviceClient
    .from("crm_users")
    .select("id, is_active, role")
    .eq("id", user.id)
    .maybeSingle();

  return { user, crmUser };
}

function stripMarkdownFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  return t.trim();
}

function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { user, crmUser } = await getActiveCrmUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!crmUser || crmUser.is_active !== true) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { imageBase64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const imageBase64 = body.imageBase64;
  const mediaType = body.mediaType;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "imageBase64 required." }, { status: 400 });
  }
  if (!mediaType || typeof mediaType !== "string") {
    return NextResponse.json({ error: "mediaType required." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240_000);

  let upstream: Response;
  try {
    upstream = await fetch(anthropicMessagesUrl(), {
      method: "POST",
      headers: anthropicHeaders(),
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 2000,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: "Analyse this furniture schematic and return the JSON structure as specified. No prose, no markdown, just the JSON object.",
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(timeout);
    if (e?.name === "AbortError") {
      return NextResponse.json(
        {
          error:
            "Vision call timed out after 240 seconds. The schematic may be too complex, or the image too large. Try a simpler or smaller image.",
        },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: "Vision call failed to reach the server.", detail: String(e?.message ?? e).slice(0, 500) },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    const errText = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "Vision call failed.", status: upstream.status, detail: errText.slice(0, 500) },
      { status: 502 },
    );
  }

  const payload: any = await upstream.json().catch(() => null);
  clearTimeout(timeout);
  const block = payload?.content?.find((c: any) => c?.type === "text");
  const rawText: string = block?.text ?? "";
  if (!rawText) {
    return NextResponse.json({ error: "Vision returned no text." }, { status: 502 });
  }

  const cleaned = stripMarkdownFences(rawText);
  const parsed = parseJsonLoose(cleaned);
  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json(
      { error: "Vision response not valid JSON.", rawPreview: rawText.slice(0, 500) },
      { status: 502 },
    );
  }

  return NextResponse.json({ analysis: parsed });
}
