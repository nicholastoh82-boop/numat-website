'use client';

// app/crm/production/qc/page.tsx
//
// Tablet-friendly QC photo capture for the production line.
//
// Operator workflow:
//   1. Pick the station they are currently working at.
//   2. Tap "Take photo" (opens the device camera).
//   3. (Optional) type a short note about what they are inspecting.
//   4. Tap "Submit". The photo uploads to Supabase Storage and Gemini Vision
//      analyses it via the gemini-proxy on Cloud Run.
//   5. The result card shows PASS or DEFECTS DETECTED with the specific
//      defects, their severity, and an overall quality score 0 to 100.
//
// Designed for finger-friendly tap targets (min 48 px), high-contrast colors,
// and minimal text so it works at arm's length on a factory tablet.

import { useEffect, useMemo, useRef, useState } from 'react';

type Station =
  | 'slat_receipt'
  | 'planing'
  | 'gluing'
  | 'veneer_sanding'
  | 'board_run'
  | 'final_inspection';

const STATIONS: Array<{ code: Station; label: string; emoji: string }> = [
  { code: 'slat_receipt', label: 'Slat Receipt', emoji: '📦' },
  { code: 'planing', label: 'Planing', emoji: '🪚' },
  { code: 'gluing', label: 'Gluing', emoji: '🧴' },
  { code: 'veneer_sanding', label: 'Veneer Sanding', emoji: '🪵' },
  { code: 'board_run', label: 'Board Press', emoji: '🟫' },
  { code: 'final_inspection', label: 'Final Inspection', emoji: '✅' },
];

type DetectedDefect = {
  type: string;
  display_name: string;
  severity: 'minor' | 'moderate' | 'severe';
  location: string;
  confidence: number;
};

type QcPhoto = {
  id: string;
  station: Station;
  storage_path: string;
  public_url: string | null;
  captured_by: string;
  captured_at: string;
  operator_notes: string | null;
  analysis_status: 'pending' | 'running' | 'done' | 'error';
  analysis_error: string | null;
  analysis_latency_ms: number | null;
  defects_detected: DetectedDefect[] | null;
  defect_count: number;
  has_defects: boolean;
  severity_max: 'none' | 'minor' | 'moderate' | 'severe' | null;
  quality_score: number | null;
  notes_from_ai: string | null;
};

const SEVERITY_COLORS: Record<string, string> = {
  none: 'bg-green-100 text-green-900',
  minor: 'bg-yellow-100 text-yellow-900',
  moderate: 'bg-orange-100 text-orange-900',
  severe: 'bg-red-100 text-red-900',
};

function verdictColor(p: QcPhoto): string {
  if (p.analysis_status === 'error') return 'bg-slate-100 text-slate-700';
  if (!p.has_defects) return 'bg-green-100 text-green-900 border-green-300';
  if (p.severity_max === 'severe') return 'bg-red-100 text-red-900 border-red-300';
  if (p.severity_max === 'moderate') return 'bg-orange-100 text-orange-900 border-orange-300';
  return 'bg-yellow-100 text-yellow-900 border-yellow-300';
}

function verdictLabel(p: QcPhoto): string {
  if (p.analysis_status === 'error') return 'Analysis error';
  if (p.analysis_status !== 'done') return 'Analysing...';
  if (!p.has_defects) return 'PASS';
  if (p.severity_max === 'severe') return 'REJECT';
  return 'NEEDS REVIEW';
}

export default function ProductionQcPage() {
  const [station, setStation] = useState<Station | null>(null);
  const [notes, setNotes] = useState('');
  const [fileBlob, setFileBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<QcPhoto | null>(null);
  const [recent, setRecent] = useState<QcPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadRecent();
  }, [station]);

  async function loadRecent() {
    try {
      const qs = new URLSearchParams();
      if (station) qs.set('station', station);
      qs.set('limit', '20');
      const res = await fetch(`/api/crm/production/qc?${qs}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { photos: QcPhoto[] };
      setRecent(data.photos);
    } catch {
      // ignore
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileBlob(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setError(null);
  }

  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFileBlob(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function submit() {
    if (!station || !fileBlob) {
      setError('Pick a station and capture a photo first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setLatest(null);
    try {
      const form = new FormData();
      form.append('file', fileBlob, 'photo.jpg');
      form.append('station', station);
      if (notes.trim()) form.append('notes', notes.trim());
      const res = await fetch('/api/crm/production/qc', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Submit failed (${res.status})`);
      }
      setLatest(data.photo as QcPhoto);
      clearPhoto();
      setNotes('');
      void loadRecent();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const stationLabel = useMemo(
    () => STATIONS.find((s) => s.code === station)?.label ?? '',
    [station],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <header className="mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Production QC</h1>
          <p className="text-sm text-slate-600">
            Photograph the board at your station. Gemini Vision flags defects in seconds.
          </p>
        </header>

        {/* Step 1: pick station */}
        <section className="mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
            1. Pick your station
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {STATIONS.map((s) => (
              <button
                key={s.code}
                onClick={() => setStation(s.code)}
                className={`p-4 rounded-lg border-2 text-left transition ${
                  station === s.code
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-300 bg-white hover:bg-slate-100'
                }`}
              >
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-medium text-slate-900">{s.label}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Step 2: capture photo */}
        {station && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
              2. Photo for {stationLabel}
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileChange}
              className="hidden"
              id="qc-file-input"
            />
            {!previewUrl ? (
              <label
                htmlFor="qc-file-input"
                className="block bg-blue-600 text-white text-lg font-medium rounded-lg p-6 text-center cursor-pointer hover:bg-blue-700"
              >
                📷 Take photo
              </label>
            ) : (
              <div className="bg-white border border-slate-300 rounded-lg p-3">
                <img
                  src={previewUrl}
                  alt="capture preview"
                  className="rounded w-full max-h-96 object-contain bg-slate-100"
                />
                <div className="flex gap-2 mt-3">
                  <label
                    htmlFor="qc-file-input"
                    className="flex-1 bg-slate-200 text-slate-800 font-medium rounded p-3 text-center cursor-pointer hover:bg-slate-300"
                  >
                    Retake
                  </label>
                  <button
                    onClick={clearPhoto}
                    className="flex-1 bg-slate-100 text-slate-700 font-medium rounded p-3 hover:bg-slate-200"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3: optional notes + submit */}
        {station && previewUrl && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
              3. Optional notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What are you inspecting? Any specific concern?"
              rows={2}
              className="w-full p-3 border border-slate-300 rounded text-base"
            />
            <button
              onClick={submit}
              disabled={submitting}
              className="mt-3 w-full bg-emerald-600 text-white text-lg font-semibold rounded-lg p-4 hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? 'Analysing photo...' : 'Submit for QC'}
            </button>
          </section>
        )}

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
            {error}
          </div>
        )}

        {/* Latest result */}
        {latest && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Latest result
            </h2>
            <PhotoCard photo={latest} expanded />
          </section>
        )}

        {/* Recent history */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Recent {station ? `at ${stationLabel}` : 'across all stations'}
          </h2>
          {recent.length === 0 ? (
            <div className="text-slate-500 text-sm">No photos yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recent.map((p) => (
                <PhotoCard key={p.id} photo={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PhotoCard({ photo, expanded }: { photo: QcPhoto; expanded?: boolean }) {
  const verdictClasses = verdictColor(photo);
  return (
    <div className={`border-2 rounded-lg p-3 bg-white ${expanded ? 'shadow' : ''}`}>
      <div className="flex items-start gap-3">
        {photo.public_url && (
          <img
            src={photo.public_url}
            alt="QC photo"
            className="w-24 h-24 object-cover rounded flex-shrink-0 bg-slate-100"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded font-bold text-sm ${verdictClasses}`}
            >
              {verdictLabel(photo)}
            </span>
            {photo.quality_score != null && (
              <span className="text-xs text-slate-600">
                Quality {photo.quality_score}/100
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {STATIONS.find((s) => s.code === photo.station)?.label ?? photo.station} ·{' '}
            {new Date(photo.captured_at).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500">By {photo.captured_by}</div>
          {photo.operator_notes && (
            <div className="text-xs text-slate-700 mt-1 italic">
              Op: {photo.operator_notes}
            </div>
          )}
        </div>
      </div>
      {(expanded || photo.has_defects) && photo.defects_detected && photo.defects_detected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-700 mb-1">
            Defects ({photo.defect_count})
          </div>
          <ul className="space-y-1">
            {photo.defects_detected.map((d, i) => (
              <li key={i} className="text-xs flex items-start gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    SEVERITY_COLORS[d.severity] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {d.severity}
                </span>
                <span className="flex-1">
                  <span className="font-medium">{d.display_name}</span>
                  {d.location && (
                    <span className="text-slate-500"> · {d.location}</span>
                  )}
                  <span className="text-slate-400 ml-1">
                    ({Math.round(d.confidence * 100)}%)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {expanded && photo.notes_from_ai && (
        <div className="mt-2 text-xs text-slate-600 italic">{photo.notes_from_ai}</div>
      )}
    </div>
  );
}
