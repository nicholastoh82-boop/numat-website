"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fraunces",
  display: "swap",
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
  display: "swap",
});
const jetMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetmono",
  display: "swap",
});

// ----- Board catalogue and tier thickness map -----

type Board = {
  sku: string;
  label: string;
  t: number;
  L: number;
  W: number;
  usd: number;
  php: number;
  ply: number;
  core: "Horizontal" | "Vertical";
};

const BOARDS: Board[] = [
  { sku: "NUBAM-012-2PLY-HC", label: "12mm 2 ply HC", t: 12, L: 2440, W: 1220, usd: 62, php: 3722.98, ply: 2, core: "Horizontal" },
  { sku: "NUBAM-016-3PLY-HC", label: "16mm 3 ply HC", t: 16, L: 2440, W: 1220, usd: 79, php: 4723.7, ply: 3, core: "Horizontal" },
  { sku: "NUBAM-020-3PLY-HC", label: "20mm 3 ply HC", t: 20, L: 2440, W: 1220, usd: 112, php: 6725.14, ply: 3, core: "Horizontal" },
  { sku: "NUBAM-025-5PLY-HC", label: "25mm 5 ply HC", t: 25, L: 2440, W: 1220, usd: 146, php: 8726.58, ply: 5, core: "Horizontal" },
  { sku: "NUBAM-030-5PLY-HC", label: "30mm 5 ply HC", t: 30, L: 2440, W: 1220, usd: 179, php: 10728.02, ply: 5, core: "Horizontal" },
  { sku: "NUBAM-030-3PLY-VC", label: "30mm 3 ply VC", t: 30, L: 2440, W: 1220, usd: 182, php: 10889.04, ply: 3, core: "Vertical" },
  { sku: "NUBAM-040-5PLY-VC", label: "40mm 5 ply VC", t: 40, L: 2440, W: 1220, usd: 215, php: 12890.48, ply: 5, core: "Vertical" },
  { sku: "NUBAM-050-5PLY-VC", label: "50mm 5 ply VC", t: 50, L: 2440, W: 1220, usd: 282, php: 16893.36, ply: 5, core: "Vertical" },
];

const BOARD_AREA_M2 = 2.44 * 1.22;

type TierKey = "premium" | "standard" | "value";

const TIER_THICKNESS: Record<TierKey, Record<string, number>> = {
  premium: {
    desk_top: 25, table_top: 30, work_surface: 25, counter_top: 25,
    side_panel: 25, top_panel: 25, bottom_panel: 25,
    shelf: 20, divider: 25, vertical_divider: 25, horizontal_divider: 25,
    door: 25, cabinet_door: 25, drawer_front: 20,
    drawer_box: 12, modesty_panel: 20, apron: 20,
    back_panel: 16, trim: 16, fillet: 16,
    plinth: 25, kick: 25, leg: 40, post: 40,
    default: 25,
  },
  standard: {
    desk_top: 20, table_top: 25, work_surface: 20, counter_top: 20,
    side_panel: 20, top_panel: 20, bottom_panel: 20,
    shelf: 20, divider: 20, vertical_divider: 20, horizontal_divider: 20,
    door: 20, cabinet_door: 20, drawer_front: 20,
    drawer_box: 12, modesty_panel: 16, apron: 16,
    back_panel: 12, trim: 12, fillet: 12,
    plinth: 20, kick: 20, leg: 40, post: 40,
    default: 20,
  },
  value: {
    desk_top: 16, table_top: 20, work_surface: 16, counter_top: 16,
    side_panel: 16, top_panel: 16, bottom_panel: 16,
    shelf: 16, divider: 16, vertical_divider: 16, horizontal_divider: 16,
    door: 16, cabinet_door: 16, drawer_front: 16,
    drawer_box: 12, modesty_panel: 12, apron: 12,
    back_panel: 12, trim: 12, fillet: 12,
    plinth: 16, kick: 16, leg: 40, post: 40,
    default: 16,
  },
};

function skuForThickness(t: number, preferHC = true): Board {
  const exact = BOARDS.filter((b) => b.t === t);
  if (exact.length > 0) {
    const picked = preferHC
      ? (exact.find((b) => b.core === "Horizontal") ?? exact[0])
      : (exact.find((b) => b.core === "Vertical") ?? exact[0]);
    return picked;
  }
  return BOARDS.slice().sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0];
}

function skuForPartClass(partClass: string, tier: TierKey): Board {
  const table = TIER_THICKNESS[tier];
  const thickness = table[partClass] ?? table.default;
  return skuForThickness(thickness, true);
}

// ----- Types -----

type Part = {
  id: string;
  name: string;
  part_class: string;
  qty: number;
  length_mm: number;
  width_mm: number;
  sku: string;
  reasoning?: string;
};

type HardwareRow = {
  id: string;
  name: string;
  qty: number;
  unit: number;
};

type Analysis = {
  piece_name?: string;
  piece_type?: string;
  overall_dimensions?: { width_mm?: number; depth_mm?: number; height_mm?: number; notes?: string };
  parts?: Array<{
    name: string;
    part_class: string;
    qty: number;
    length_mm: number;
    width_mm: number;
    reasoning?: string;
  }>;
  external_components?: Array<{ name: string; qty: number; notes?: string }>;
  assumptions?: string[];
  confidence?: "high" | "medium" | "low";
  notes_for_reviewer?: string;
};

// ----- Constants -----

const INK = "#1A1A17";
const MUTED = "#5C564E";
const BG = "#FBF8F3";
const RULE = "#E6DFD2";
const BAMBOO = "#3D5A36";
const WALNUT = "#5A3A22";
const AMBER = "#D4A017";
const TERRACOTTA = "#B85C2F";
const SUCCESS = "#2E7D32";
const DANGER = "#C62828";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

function newId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatMoney(n: number, currency: "PHP" | "USD"): string {
  if (!Number.isFinite(n)) return currency === "PHP" ? "PHP 0.00" : "USD 0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return (0).toFixed(digits);
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

async function readAsBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("Unexpected file encoding.");
  return { mediaType: match[1], base64: match[2] };
}

// ----- Page -----

export default function SchematicEstimatorPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [authState, setAuthState] = useState<"checking" | "ok" | "forbidden">("checking");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/crm/login");
        return;
      }
      const { data } = await supabase
        .from("crm_users")
        .select("id, name, is_active")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!data || data.is_active !== true) {
        setAuthState("forbidden");
        return;
      }
      setDisplayName(data.name ?? authUser.email ?? "");
      setAuthState("ok");
    })();
  }, [supabase, router]);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function validateAndSet(f: File | null | undefined) {
    setUploadError(null);
    if (!f) return;
    if (!ACCEPT_TYPES.includes(f.type)) {
      setUploadError("File type not supported. Use JPG, PNG, or WebP.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setUploadError("File is larger than 5 MB. Please compress or resize.");
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDropping(false);
    const f = e.dataTransfer.files?.[0];
    validateAndSet(f);
  }

  // Analysis state
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [statusText, setStatusText] = useState<string>("");

  // Tier + cut list
  const [tier, setTier] = useState<TierKey>("standard");
  const [parts, setParts] = useState<Part[]>([]);
  const [hardware, setHardware] = useState<HardwareRow[]>([
    { id: newId(), name: "Edge banding linear metres", qty: 0, unit: 45 },
    { id: newId(), name: "Adhesive and consumables", qty: 1, unit: 600 },
  ]);
  const [yieldPct, setYieldPct] = useState(80);
  const [fxRate, setFxRate] = useState(56);

  function partsFromAnalysis(a: Analysis, useTier: TierKey): Part[] {
    return (a.parts ?? []).map((p) => {
      const board = skuForPartClass(p.part_class || "default", useTier);
      return {
        id: newId(),
        name: p.name || "Part",
        part_class: p.part_class || "default",
        qty: Math.max(1, Number(p.qty) || 1),
        length_mm: Math.max(1, Number(p.length_mm) || 0),
        width_mm: Math.max(1, Number(p.width_mm) || 0),
        sku: board.sku,
        reasoning: p.reasoning,
      };
    });
  }

  function hardwareSeedFromAnalysis(a: Analysis): HardwareRow[] {
    const fromAI: HardwareRow[] = (a.external_components ?? []).map((x) => ({
      id: newId(),
      name: x.name + (x.notes ? ` (${x.notes})` : ""),
      qty: Math.max(0, Number(x.qty) || 0),
      unit: 0,
    }));
    const seeds: HardwareRow[] = [
      { id: newId(), name: "Edge banding linear metres", qty: 0, unit: 45 },
      { id: newId(), name: "Adhesive and consumables", qty: 1, unit: 600 },
    ];
    return [...fromAI, ...seeds];
  }

  async function analyse() {
    if (!file) {
      setStatusText("Pick a schematic image first.");
      return;
    }
    setAnalysing(true);
    setAnalysis(null);
    setStatusText("Reading the schematic, this typically takes 10 to 30 seconds.");
    try {
      const { base64, mediaType } = await readAsBase64(file);
      const res = await fetch("/api/analyze-schematic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (res.status === 401) {
        router.push("/crm/login");
        return;
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Vision call failed, status ${res.status}.`);
      }
      const json = await res.json();
      const parsed: Analysis = json.analysis;
      setAnalysis(parsed);
      setParts(partsFromAnalysis(parsed, tier));
      setHardware(hardwareSeedFromAnalysis(parsed));
      setStatusText("Analysis complete. Review the cut list and adjust as needed.");
    } catch (e: any) {
      setStatusText("");
      setUploadError(e?.message || "Analysis failed.");
    } finally {
      setAnalysing(false);
    }
  }

  function resetAll() {
    setFile(null);
    setUploadError(null);
    setAnalysis(null);
    setParts([]);
    setHardware([
      { id: newId(), name: "Edge banding linear metres", qty: 0, unit: 45 },
      { id: newId(), name: "Adhesive and consumables", qty: 1, unit: 600 },
    ]);
    setStatusText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Reprice parts when tier changes
  useEffect(() => {
    setParts((prev) =>
      prev.map((p) => ({
        ...p,
        sku: skuForPartClass(p.part_class || "default", tier).sku,
      })),
    );
  }, [tier]);

  // ----- Derived totals -----

  const boardMap = useMemo(() => {
    const m = new Map<string, Board>();
    for (const b of BOARDS) m.set(b.sku, b);
    return m;
  }, []);

  const partRows = useMemo(() => {
    return parts.map((p) => {
      const board = boardMap.get(p.sku) ?? BOARDS[0];
      const area = (p.qty * p.length_mm * p.width_mm) / 1e6;
      const perPieceArea = (p.length_mm * p.width_mm) / 1e6;
      return { part: p, board, area, perPieceArea };
    });
  }, [parts, boardMap]);

  const boardTotals = useMemo(() => {
    const areaBySku = new Map<string, number>();
    for (const r of partRows) {
      areaBySku.set(r.part.sku, (areaBySku.get(r.part.sku) ?? 0) + r.area);
    }
    const usable = (BOARD_AREA_M2 * yieldPct) / 100;
    const rows = Array.from(areaBySku.entries())
      .map(([sku, area]) => {
        const board = boardMap.get(sku);
        if (!board) return null;
        const count = Math.max(1, Math.ceil(area / Math.max(usable, 0.0001)));
        const cost = count * board.php;
        return { sku, board, area, count, cost };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => b.cost - a.cost);
    const totalBoards = rows.reduce((s, r) => s + r.count, 0);
    const totalCost = rows.reduce((s, r) => s + r.cost, 0);
    const totalArea = rows.reduce((s, r) => s + r.area, 0);
    return { rows, totalBoards, totalCost, totalArea };
  }, [partRows, yieldPct, boardMap]);

  const hardwareTotal = useMemo(
    () => hardware.reduce((s, h) => s + h.qty * h.unit, 0),
    [hardware],
  );

  const grandTotalPhp = boardTotals.totalCost + hardwareTotal;
  const grandTotalUsd = fxRate > 0 ? grandTotalPhp / fxRate : 0;

  // ----- Render helpers -----

  function updatePart(id: string, patch: Partial<Part>) {
    setParts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function deletePart(id: string) {
    setParts((prev) => prev.filter((p) => p.id !== id));
  }
  function addPart() {
    const board = skuForPartClass("default", tier);
    setParts((prev) => [
      ...prev,
      {
        id: newId(),
        name: "New part",
        part_class: "default",
        qty: 1,
        length_mm: 600,
        width_mm: 400,
        sku: board.sku,
      },
    ]);
  }
  function clearParts() {
    setParts([]);
  }

  function updateHardware(id: string, patch: Partial<HardwareRow>) {
    setHardware((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }
  function deleteHardware(id: string) {
    setHardware((prev) => prev.filter((h) => h.id !== id));
  }
  function addHardware() {
    setHardware((prev) => [...prev, { id: newId(), name: "New item", qty: 1, unit: 0 }]);
  }

  // ----- Early returns for auth -----

  if (authState === "checking") {
    return (
      <div
        className={`${fraunces.variable} ${interTight.variable} ${jetMono.variable} min-h-screen flex items-center justify-center`}
        style={{ background: BG, color: INK, fontFamily: "var(--font-inter-tight)" }}
      >
        <div className="text-sm" style={{ color: MUTED }}>Checking access.</div>
      </div>
    );
  }

  if (authState === "forbidden") {
    return (
      <div
        className={`${fraunces.variable} ${interTight.variable} ${jetMono.variable} min-h-screen flex items-center justify-center p-6`}
        style={{ background: BG, color: INK, fontFamily: "var(--font-inter-tight)" }}
      >
        <div
          className="max-w-md rounded-2xl border p-6 text-center"
          style={{ borderColor: RULE, background: "#fff" }}
        >
          <div className="text-sm font-medium mb-2" style={{ color: DANGER }}>
            Access forbidden.
          </div>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            Your account is either inactive or not registered in the CRM. Ask an admin to activate your profile.
          </p>
          <Link
            href="/crm/login"
            className="inline-block mt-4 text-sm underline"
            style={{ color: BAMBOO }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ----- Main render -----

  const confidence = analysis?.confidence;
  const confidenceColor =
    confidence === "high" ? SUCCESS : confidence === "medium" ? AMBER : confidence === "low" ? TERRACOTTA : MUTED;

  return (
    <div
      className={`${fraunces.variable} ${interTight.variable} ${jetMono.variable} min-h-screen`}
      style={{
        background: BG,
        color: INK,
        fontFamily: "var(--font-inter-tight)",
      }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ background: "rgba(251,248,243,0.9)", borderColor: RULE }}
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/crm/dashboard" className="flex items-center gap-2 text-sm" style={{ color: INK }}>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ background: BAMBOO }}
              >
                N
              </span>
              <span className="font-semibold tracking-tight">NUMAT CRM</span>
            </Link>
            <span className="text-xs" style={{ color: MUTED }}>
              Materials Estimator
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: MUTED }}>
            <span>{displayName}</span>
            <Link href="/crm/dashboard" className="px-3 py-1.5 rounded-lg border" style={{ borderColor: RULE, color: INK }}>
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title */}
        <section className="mb-8 max-w-3xl">
          <h1
            className="text-4xl md:text-5xl leading-tight mb-3"
            style={{ fontFamily: "var(--font-fraunces)", fontWeight: 500, color: INK }}
          >
            Schematic to Material Estimate
          </h1>
          <p className="text-base leading-relaxed" style={{ color: MUTED }}>
            Upload a furniture drawing with dimension labels. Claude reads the schematic, builds a flat panel parts list, and maps every part to a NuBam board SKU by thickness tier. The total you see covers ex factory board material and hardware only, never labor.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Left column */}
          <div className="space-y-8">
            {/* Upload panel */}
            <section
              className="rounded-2xl border p-5"
              style={{ borderColor: RULE, background: "#fff" }}
            >
              <div className="flex items-start gap-5 flex-col md:flex-row">
                {/* Dropzone */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropping(true);
                  }}
                  onDragLeave={() => setDropping(false)}
                  onDrop={onDrop}
                  className="flex-shrink-0 w-full md:w-[340px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-colors"
                  style={{
                    borderColor: dropping ? BAMBOO : RULE,
                    background: dropping ? "rgba(61,90,54,0.05)" : "#FFFDF8",
                    minHeight: 220,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => validateAndSet(e.target.files?.[0])}
                  />
                  <div
                    className="text-xs uppercase tracking-widest mb-2"
                    style={{ color: MUTED, letterSpacing: "0.18em" }}
                  >
                    Drop a schematic
                  </div>
                  <div
                    className="text-lg font-medium mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", color: INK }}
                  >
                    Drag and drop or click to browse
                  </div>
                  <div className="text-xs" style={{ color: MUTED }}>
                    JPG, PNG, or WebP, up to 5 MB
                  </div>
                </label>

                {/* Preview */}
                <div className="flex-1 min-w-0">
                  {previewUrl ? (
                    <div
                      className="rounded-xl border p-3"
                      style={{ borderColor: RULE, background: "#FFFDF8" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Schematic preview"
                        className="w-full h-auto max-h-[320px] object-contain rounded-md"
                      />
                      <div className="mt-2 text-xs flex items-center justify-between" style={{ color: MUTED }}>
                        <span className="truncate pr-3">{file?.name}</span>
                        <span style={{ fontFamily: "var(--font-jetmono)" }}>
                          {((file?.size ?? 0) / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-xl border flex items-center justify-center text-sm"
                      style={{
                        borderColor: RULE,
                        background: "#FFFDF8",
                        minHeight: 220,
                        color: MUTED,
                      }}
                    >
                      Preview appears here once you add an image.
                    </div>
                  )}
                </div>
              </div>

              {uploadError && (
                <div
                  className="mt-4 rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: DANGER, background: "#FDEDEC", color: DANGER }}
                >
                  {uploadError}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={analyse}
                  disabled={!file || analysing}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: BAMBOO }}
                >
                  {analysing ? "Analysing." : "Analyse schematic"}
                </button>
                <button
                  onClick={resetAll}
                  className="px-5 py-2.5 rounded-xl border text-sm"
                  style={{ borderColor: RULE, color: INK }}
                >
                  Reset
                </button>
                {statusText && (
                  <span className="text-xs" style={{ color: MUTED }}>
                    {statusText}
                  </span>
                )}
              </div>
            </section>

            {/* Analysis card */}
            {analysis && (
              <section
                className="rounded-2xl border p-5"
                style={{ borderColor: RULE, background: "#fff" }}
              >
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <h2
                    className="text-2xl"
                    style={{ fontFamily: "var(--font-fraunces)", color: INK, fontWeight: 500 }}
                  >
                    {analysis.piece_name || "Analysed piece"}
                  </h2>
                  {analysis.confidence && (
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium uppercase tracking-widest"
                      style={{
                        background: `${confidenceColor}22`,
                        color: confidenceColor,
                        letterSpacing: "0.14em",
                      }}
                    >
                      Confidence: {analysis.confidence}
                    </span>
                  )}
                  {analysis.piece_type && (
                    <span className="text-xs" style={{ color: MUTED }}>
                      {analysis.piece_type}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <div
                      className="text-xs uppercase tracking-widest mb-2"
                      style={{ color: MUTED, letterSpacing: "0.14em" }}
                    >
                      Overall dimensions
                    </div>
                    <div
                      className="text-sm"
                      style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                    >
                      {analysis.overall_dimensions
                        ? `${analysis.overall_dimensions.width_mm ?? "?"} W × ${
                            analysis.overall_dimensions.depth_mm ?? "?"
                          } D × ${analysis.overall_dimensions.height_mm ?? "?"} H mm`
                        : "Not specified."}
                    </div>
                    {analysis.overall_dimensions?.notes && (
                      <div className="text-xs mt-1" style={{ color: MUTED }}>
                        {analysis.overall_dimensions.notes}
                      </div>
                    )}
                  </div>
                  <div>
                    <div
                      className="text-xs uppercase tracking-widest mb-2"
                      style={{ color: MUTED, letterSpacing: "0.14em" }}
                    >
                      External components
                    </div>
                    {(analysis.external_components ?? []).length === 0 ? (
                      <div className="text-sm" style={{ color: MUTED }}>
                        None identified.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(analysis.external_components ?? []).map((x, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 rounded-full border"
                            style={{ borderColor: RULE, color: INK, background: "#FFFDF8" }}
                          >
                            {x.qty} × {x.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <div
                      className="text-xs uppercase tracking-widest mb-2"
                      style={{ color: MUTED, letterSpacing: "0.14em" }}
                    >
                      Assumptions
                    </div>
                    {(analysis.assumptions ?? []).length === 0 ? (
                      <div className="text-sm" style={{ color: MUTED }}>
                        None.
                      </div>
                    ) : (
                      <ul className="text-sm leading-relaxed space-y-1" style={{ color: INK }}>
                        {(analysis.assumptions ?? []).map((a, idx) => (
                          <li key={idx}>• {a}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {analysis.notes_for_reviewer && (
                    <div className="md:col-span-2">
                      <div
                        className="text-xs uppercase tracking-widest mb-2"
                        style={{ color: MUTED, letterSpacing: "0.14em" }}
                      >
                        Notes for reviewer
                      </div>
                      <div className="text-sm leading-relaxed" style={{ color: INK }}>
                        {analysis.notes_for_reviewer}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Tier selector */}
            <section
              className="rounded-2xl border p-5"
              style={{ borderColor: RULE, background: "#fff" }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", color: INK, fontWeight: 500 }}
                  >
                    Thickness tier
                  </h2>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Switch the whole cut list to a tier. Individual SKUs can still be overridden per row.
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["premium", "standard", "value"] as TierKey[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
                      style={{
                        background: tier === t ? INK : "#fff",
                        color: tier === t ? "#fff" : INK,
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: tier === t ? INK : RULE,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["premium", "standard", "value"] as TierKey[]).map((t) => {
                  const m = TIER_THICKNESS[t];
                  const rows: Array<{ label: string; mm: number }> = [
                    { label: "Desk top", mm: m.desk_top },
                    { label: "Table top", mm: m.table_top },
                    { label: "Side or top panel", mm: m.side_panel },
                    { label: "Shelf", mm: m.shelf },
                    { label: "Door", mm: m.door },
                    { label: "Back panel", mm: m.back_panel },
                  ];
                  return (
                    <div
                      key={t}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: tier === t ? INK : RULE,
                        background: tier === t ? "#FFFDF8" : "#fff",
                      }}
                    >
                      <div
                        className="text-xs uppercase tracking-widest mb-2"
                        style={{ color: MUTED, letterSpacing: "0.14em" }}
                      >
                        {t}
                      </div>
                      <div className="space-y-1">
                        {rows.map((r) => (
                          <div key={r.label} className="flex items-center justify-between text-xs">
                            <span style={{ color: INK }}>{r.label}</span>
                            <span
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            >
                              {r.mm} mm
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Cut list */}
            <section
              className="rounded-2xl border p-5"
              style={{ borderColor: RULE, background: "#fff" }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", color: INK, fontWeight: 500 }}
                  >
                    Cut list
                  </h2>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Edit any cell, swap SKUs, or add parts. Area and cost update live.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addPart}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: RULE, color: INK }}
                  >
                    + Add part
                  </button>
                  <button
                    onClick={clearParts}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    style={{ borderColor: RULE, color: MUTED }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ color: INK }}>
                  <thead>
                    <tr
                      className="text-xs uppercase"
                      style={{ color: MUTED, letterSpacing: "0.1em" }}
                    >
                      <th className="text-left py-2 pr-3">Part</th>
                      <th className="text-left py-2 pr-3">Class</th>
                      <th className="text-right py-2 pr-3">Qty</th>
                      <th className="text-right py-2 pr-3">L mm</th>
                      <th className="text-right py-2 pr-3">W mm</th>
                      <th className="text-left py-2 pr-3">Board SKU</th>
                      <th className="text-right py-2 pr-3">Area m²</th>
                      <th className="text-right py-2 pr-3">Cost PHP</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {partRows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-sm" style={{ color: MUTED }}>
                          No parts yet. Upload a schematic or add parts manually.
                        </td>
                      </tr>
                    )}
                    {partRows.map(({ part, board, area, perPieceArea }) => {
                      const rowCost = area * (board.php / BOARD_AREA_M2);
                      return (
                        <tr key={part.id} className="border-t" style={{ borderColor: RULE }}>
                          <td className="py-2 pr-3">
                            <input
                              value={part.name}
                              onChange={(e) => updatePart(part.id, { name: e.target.value })}
                              className="w-full bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              value={part.part_class}
                              onChange={(e) => {
                                const newClass = e.target.value;
                                const board2 = skuForPartClass(newClass || "default", tier);
                                updatePart(part.id, { part_class: newClass, sku: board2.sku });
                              }}
                              className="w-32 bg-transparent border-0 px-0 py-1 text-xs focus:outline-none"
                              style={{ color: MUTED, fontFamily: "var(--font-jetmono)" }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={part.qty}
                              onChange={(e) =>
                                updatePart(part.id, { qty: Math.max(1, Number(e.target.value) || 1) })
                              }
                              className="w-16 text-right bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={part.length_mm}
                              onChange={(e) =>
                                updatePart(part.id, { length_mm: Math.max(1, Number(e.target.value) || 0) })
                              }
                              className="w-20 text-right bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              min={1}
                              value={part.width_mm}
                              onChange={(e) =>
                                updatePart(part.id, { width_mm: Math.max(1, Number(e.target.value) || 0) })
                              }
                              className="w-20 text-right bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={part.sku}
                              onChange={(e) => updatePart(part.id, { sku: e.target.value })}
                              className="bg-transparent border rounded-md px-2 py-1 text-xs focus:outline-none"
                              style={{
                                borderColor: RULE,
                                color: INK,
                                fontFamily: "var(--font-jetmono)",
                              }}
                            >
                              {BOARDS.map((b) => (
                                <option key={b.sku} value={b.sku}>
                                  {b.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className="py-2 pr-3 text-right"
                            style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                          >
                            {formatNum(area, 3)}
                          </td>
                          <td
                            className="py-2 pr-3 text-right"
                            style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            title={`Per piece ${formatNum(perPieceArea, 3)} m²`}
                          >
                            {formatNum(rowCost, 2)}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => deletePart(part.id)}
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: DANGER }}
                              aria-label="Remove row"
                              title="Remove row"
                            >
                              x
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {partRows.length > 0 && (
                    <tfoot>
                      <tr className="border-t" style={{ borderColor: RULE }}>
                        <td colSpan={6} className="py-3 text-right text-xs uppercase" style={{ color: MUTED, letterSpacing: "0.1em" }}>
                          Totals
                        </td>
                        <td className="py-3 pr-3 text-right" style={{ fontFamily: "var(--font-jetmono)", color: INK }}>
                          {formatNum(boardTotals.totalArea, 3)}
                        </td>
                        <td className="py-3 pr-3 text-right font-medium" style={{ fontFamily: "var(--font-jetmono)", color: INK }}>
                          {formatNum(boardTotals.totalCost, 2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Hardware */}
            <section
              className="rounded-2xl border p-5"
              style={{ borderColor: RULE, background: "#fff" }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2
                    className="text-xl mb-1"
                    style={{ fontFamily: "var(--font-fraunces)", color: INK, fontWeight: 500 }}
                  >
                    Hardware and fittings
                  </h2>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Legs, hinges, handles, edge banding, adhesive. Fill in unit prices to include in the total.
                  </p>
                </div>
                <button
                  onClick={addHardware}
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  style={{ borderColor: RULE, color: INK }}
                >
                  + Add hardware item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ color: INK }}>
                  <thead>
                    <tr
                      className="text-xs uppercase"
                      style={{ color: MUTED, letterSpacing: "0.1em" }}
                    >
                      <th className="text-left py-2 pr-3">Item</th>
                      <th className="text-right py-2 pr-3">Qty</th>
                      <th className="text-right py-2 pr-3">Unit PHP</th>
                      <th className="text-right py-2 pr-3">Subtotal PHP</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hardware.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-sm" style={{ color: MUTED }}>
                          No hardware rows.
                        </td>
                      </tr>
                    )}
                    {hardware.map((h) => {
                      const sub = h.qty * h.unit;
                      return (
                        <tr key={h.id} className="border-t" style={{ borderColor: RULE }}>
                          <td className="py-2 pr-3">
                            <input
                              value={h.name}
                              onChange={(e) => updateHardware(h.id, { name: e.target.value })}
                              className="w-full bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={h.qty}
                              onChange={(e) =>
                                updateHardware(h.id, { qty: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-16 text-right bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={h.unit}
                              onChange={(e) =>
                                updateHardware(h.id, { unit: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-24 text-right bg-transparent border-0 px-0 py-1 text-sm focus:outline-none"
                              style={{ fontFamily: "var(--font-jetmono)", color: INK }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-right" style={{ fontFamily: "var(--font-jetmono)", color: INK }}>
                            {formatNum(sub, 2)}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => deleteHardware(h.id)}
                              className="text-xs px-2 py-1 rounded"
                              style={{ color: DANGER }}
                              title="Remove row"
                            >
                              x
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {hardware.length > 0 && (
                    <tfoot>
                      <tr className="border-t" style={{ borderColor: RULE }}>
                        <td colSpan={3} className="py-3 text-right text-xs uppercase" style={{ color: MUTED, letterSpacing: "0.1em" }}>
                          Hardware total
                        </td>
                        <td className="py-3 pr-3 text-right font-medium" style={{ fontFamily: "var(--font-jetmono)", color: INK }}>
                          {formatNum(hardwareTotal, 2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Footer notice */}
            <section
              className="rounded-2xl border p-4 text-sm leading-relaxed"
              style={{ borderColor: "#F0DDA8", background: "#FDF6E0", color: "#5C4A10" }}
            >
              This is a rough materials estimate. It does not include labor, finishing, workmanship, or 2D nesting optimisation. Yield assumes one board is consumed per SKU group even when partial. Always review the AI assumptions before quoting a customer.
            </section>
          </div>

          {/* Sticky right column */}
          <aside className="space-y-5 lg:sticky lg:top-20 self-start">
            {/* Boards required card (dark) */}
            <div
              className="rounded-2xl p-5 text-white"
              style={{ background: INK }}
            >
              <div
                className="text-xs uppercase tracking-widest mb-2 opacity-80"
                style={{ letterSpacing: "0.16em" }}
              >
                Boards required
              </div>
              <div
                className="text-5xl mb-1"
                style={{ fontFamily: "var(--font-jetmono)", fontWeight: 500 }}
              >
                {boardTotals.totalBoards}
              </div>
              <div className="text-xs opacity-70 mb-4">
                across {boardTotals.rows.length} SKU{boardTotals.rows.length === 1 ? "" : "s"}
              </div>
              <div className="space-y-2">
                {boardTotals.rows.length === 0 ? (
                  <div className="text-xs opacity-60">No SKUs yet.</div>
                ) : (
                  boardTotals.rows.map((r) => (
                    <div key={r.sku} className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2" style={{ fontFamily: "var(--font-jetmono)" }}>
                        {r.board.label}
                      </span>
                      <span style={{ fontFamily: "var(--font-jetmono)" }}>
                        {r.count} × PHP {formatNum(r.board.php, 0)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total material estimate (walnut gradient) */}
            <div
              className="rounded-2xl p-5 text-white"
              style={{
                background: `linear-gradient(135deg, ${WALNUT} 0%, #3F2916 100%)`,
              }}
            >
              <div
                className="text-xs uppercase tracking-widest mb-2 opacity-80"
                style={{ letterSpacing: "0.16em" }}
              >
                Total material estimate
              </div>
              <div
                className="text-3xl mb-0.5"
                style={{ fontFamily: "var(--font-jetmono)", fontWeight: 600 }}
              >
                {formatMoney(grandTotalPhp, "PHP")}
              </div>
              <div
                className="text-sm opacity-80 mb-4"
                style={{ fontFamily: "var(--font-jetmono)" }}
              >
                ≈ {formatMoney(grandTotalUsd, "USD")}
              </div>
              <div className="space-y-1 text-xs opacity-90">
                <div className="flex items-center justify-between">
                  <span>Boards subtotal</span>
                  <span style={{ fontFamily: "var(--font-jetmono)" }}>
                    {formatNum(boardTotals.totalCost, 2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hardware subtotal</span>
                  <span style={{ fontFamily: "var(--font-jetmono)" }}>
                    {formatNum(hardwareTotal, 2)}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs italic opacity-70">
                Labor and workmanship excluded.
              </div>
            </div>

            {/* Adjustments card */}
            <div
              className="rounded-2xl p-5 border"
              style={{ borderColor: RULE, background: "#fff" }}
            >
              <div
                className="text-xs uppercase tracking-widest mb-3"
                style={{ color: MUTED, letterSpacing: "0.14em" }}
              >
                Adjustments
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm" style={{ color: INK }}>
                    Yield
                  </label>
                  <span className="text-sm" style={{ fontFamily: "var(--font-jetmono)", color: INK }}>
                    {yieldPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={95}
                  value={yieldPct}
                  onChange={(e) => setYieldPct(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: BAMBOO }}
                />
                <div className="text-xs mt-1" style={{ color: MUTED }}>
                  Higher yield assumes tighter 2D nesting.
                </div>
              </div>
              <div>
                <label className="text-sm block mb-1" style={{ color: INK }}>
                  FX rate, PHP per USD
                </label>
                <input
                  type="number"
                  min={10}
                  step={0.01}
                  value={fxRate}
                  onChange={(e) => setFxRate(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={{
                    borderColor: RULE,
                    background: "#fff",
                    fontFamily: "var(--font-jetmono)",
                    color: INK,
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
