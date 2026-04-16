'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Calculation engine ──────────────────────────────────────────────────────
// Uses live Supabase values when passed via URL params
// Falls back to room-based calculation if not provided
function calcSavings(
  rooms: number,
  sqm: number,
  saveLo: number,
  saveHi: number,
  numatLo: number,
  numatHi: number,
) {
  // If Supabase values are provided, use them directly
  const hasLiveData = saveLo > 0 && saveHi > 0

  // vs Plywood calculation (VEReportClient's own model — rooms based)
  const BASE_ROOMS   = 50
  const ratio        = rooms / BASE_ROOMS
  const materials    = Math.round(3_700_000 * ratio)
  const roomRevenue  = Math.round(3_600_000 * ratio)
  const totalVsPlywood = materials + roomRevenue

  // vs Hardwood — use live Supabase values if available, else estimate
  const refinishLow  = hasLiveData ? saveLo  : Math.round(7_000_000 * ratio)
  const refinishHigh = hasLiveData ? saveHi  : Math.round(14_000_000 * ratio)

  // NUMAT total cost range
  const numatCostLo = hasLiveData ? numatLo : Math.round(9_000_000 * ratio)
  const numatCostHi = hasLiveData ? numatHi : Math.round(11_000_000 * ratio)

  const effectiveSqm = sqm > 0 ? sqm : rooms * 35

  return {
    materials, roomRevenue, totalVsPlywood,
    sqm: effectiveSqm,
    refinishLow, refinishHigh,
    numatCostLo, numatCostHi,
    coolingPct: 8,
    bacterialPct: 99.8,
    deliveryWeeksNUMAT: '2 – 4',
    deliveryWeeksImport: '14 – 20',
    rooms,
    hasLiveData,
  }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(0)}K`
  return `₱${n}`
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function StatCard({ label, value, sub, accent, delay = 0, animate }: {
  label: string; value: string; sub?: string; accent: string; delay?: number; animate: boolean;
}) {
  return (
    <div style={{
      background: '#fff', border: `1px solid #e8edf2`, borderRadius: 12,
      padding: '28px 24px',
      opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7a8d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#0f2137', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 13, color: '#6b7a8d', marginTop: 8, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

export default function VEReportClient() {
  const [resort,  setResort]  = useState('Your Property')
  const [rooms,   setRooms]   = useState(50)
  const [sqm,     setSqm]     = useState(1750)
  const [saveLo,  setSaveLo]  = useState(0)
  const [saveHi,  setSaveHi]  = useState(0)
  const [numatLo, setNumatLo] = useState(0)
  const [numatHi, setNumatHi] = useState(0)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const r  = p.get('for')
    const n  = Math.max(1, parseInt(p.get('rooms') || '50') || 50)
    const sq = Math.max(0, parseInt(p.get('sqm')     || '0')  || 0)
    const sl = Math.max(0, parseInt(p.get('save_lo') || '0')  || 0)
    const sh = Math.max(0, parseInt(p.get('save_hi') || '0')  || 0)
    const nl = Math.max(0, parseInt(p.get('numat_lo')|| '0')  || 0)
    const nh = Math.max(0, parseInt(p.get('numat_hi')|| '0')  || 0)
    if (r) setResort(r.trim())
    setRooms(n)
    setSqm(sq || n * 35)
    setSaveLo(sl); setSaveHi(sh); setNumatLo(nl); setNumatHi(nh)
  }, [])

  const s = calcSavings(rooms, sqm, saveLo, saveHi, numatLo, numatHi)

  const heroRef = useRef<HTMLDivElement>(null)
  const [heroVisible, setHeroVisible] = useState(false)
  useEffect(() => { setTimeout(() => setHeroVisible(true), 80) }, [])

  const { ref: sec2ref, visible: sec2 } = useInView()
  const { ref: sec3ref, visible: sec3 } = useInView()
  const { ref: sec4ref, visible: sec4 } = useInView()
  const { ref: sec5ref, visible: sec5 } = useInView()

  useEffect(() => {
    const ATTR = 'data-print-hidden'
    const beforePrint = () => {
      document.querySelectorAll<HTMLElement>('body *').forEach(el => {
        const pos = window.getComputedStyle(el).position
        if ((pos === 'fixed' || pos === 'sticky') && !el.closest('.topbar')) {
          el.setAttribute(ATTR, el.style.display || 'unset')
          el.style.setProperty('display', 'none', 'important')
        }
      })
    }
    const afterPrint = () => {
      document.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach(el => {
        const prev = el.getAttribute(ATTR)
        el.style.display = prev === 'unset' ? '' : (prev || '')
        el.removeAttribute(ATTR)
      })
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint) }
  }, [])

  const handlePrint = () => window.print()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f6f9; color: #0f2137; -webkit-font-smoothing: antialiased; }
        .syne { font-family: 'Syne', sans-serif; }
        .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
        .topbar { background: #ffffff; padding: 12px 0; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 8px rgba(0,0,0,0.07); }
        .topbar-inner { max-width: 860px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; }
        .topbar-logo img { height: 40px; width: auto; display: block; }
        .topbar-badge { background: #f0f7ff; color: #1a3c5e; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; }
        .hero { background: linear-gradient(135deg, #0f2137 0%, #1a3c5e 60%, #0f3320 100%); padding: 72px 0 60px; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 70% 50%, rgba(74,222,128,0.08) 0%, transparent 70%); pointer-events: none; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #4ade80; margin-bottom: 16px; }
        .hero-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(32px, 5vw, 52px); line-height: 1.05; color: #fff; margin-bottom: 12px; }
        .hero-title .accent { color: #4ade80; }
        .hero-subtitle { font-size: 16px; color: #94c5f0; margin-bottom: 40px; line-height: 1.6; }
        .hero-big-number { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 32px 36px; display: inline-block; margin-bottom: 32px; backdrop-filter: blur(8px); }
        .hero-big-number .label { font-size: 13px; color: #94c5f0; font-weight: 500; margin-bottom: 8px; }
        .hero-big-number .number { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(44px, 7vw, 72px); color: #4ade80; line-height: 1; font-variant-numeric: tabular-nums; }
        .hero-big-number .sub { font-size: 14px; color: #94c5f0; margin-top: 8px; }
        .hero-meta { display: flex; gap: 24px; flex-wrap: wrap; }
        .hero-chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; padding: 10px 16px; font-size: 13px; color: #cbd5e1; line-height: 1.4; }
        .hero-chip strong { color: #fff; display: block; font-size: 15px; }
        .section { padding: 64px 0; }
        .section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4ade80; margin-bottom: 8px; }
        .section-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(22px, 4vw, 32px); color: #0f2137; margin-bottom: 8px; }
        .section-sub { font-size: 15px; color: #4b5e70; margin-bottom: 36px; line-height: 1.6; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .breakdown { background: #fff; border-radius: 12px; border: 1px solid #e8edf2; overflow: hidden; margin-bottom: 16px; }
        .breakdown-row { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #f0f4f8; gap: 16px; }
        .breakdown-row:last-child { border-bottom: none; }
        .breakdown-row .label { font-size: 14px; color: #4b5e70; flex: 1; }
        .breakdown-row .val { font-weight: 700; color: #0f2137; font-size: 15px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .breakdown-row .val.positive { color: #16a34a; }
        .breakdown-row.total { background: #f0fdf4; }
        .breakdown-row.total .label { font-weight: 700; color: #0f2137; }
        .breakdown-row.total .val { font-size: 18px; color: #16a34a; }
        .timeline-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .timeline-card { border-radius: 12px; padding: 28px 24px; border: 1px solid #e8edf2; }
        .timeline-card.bad { background: #fef2f2; border-color: #fecaca; }
        .timeline-card.good { background: #f0fdf4; border-color: #bbf7d0; }
        .timeline-card .tc-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
        .timeline-card.bad .tc-label { color: #b91c1c; }
        .timeline-card.good .tc-label { color: #15803d; }
        .timeline-card .tc-weeks { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 36px; line-height: 1; margin-bottom: 8px; }
        .timeline-card.bad .tc-weeks { color: #dc2626; }
        .timeline-card.good .tc-weeks { color: #16a34a; }
        .timeline-card .tc-unit { font-size: 13px; font-weight: 500; color: #6b7a8d; margin-bottom: 16px; }
        .timeline-card ul { list-style: none; padding: 0; }
        .timeline-card ul li { font-size: 13px; color: #4b5e70; padding: 4px 0; display: flex; align-items: flex-start; gap: 8px; line-height: 1.5; }
        .timeline-card ul li::before { flex-shrink: 0; margin-top: 2px; }
        .timeline-card.bad ul li::before { content: '•'; color: #dc2626; }
        .timeline-card.good ul li::before { content: '✓'; color: #16a34a; font-weight: 700; }
        .callout-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .callout { border-radius: 12px; padding: 28px 24px; background: #fff; border: 1px solid #e8edf2; position: relative; overflow: hidden; }
        .callout::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .callout.green::before { background: #22c55e; }
        .callout.blue::before { background: #3b82f6; }
        .callout .big { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 42px; color: #0f2137; line-height: 1; margin-bottom: 8px; }
        .callout .big span { font-size: 22px; }
        .callout .cl-title { font-size: 14px; font-weight: 600; color: #0f2137; margin-bottom: 8px; }
        .callout .cl-body { font-size: 13px; color: #4b5e70; line-height: 1.6; }
        .sustain-bar { background: #fff; border: 1px solid #e8edf2; border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; gap: 20px; margin-bottom: 12px; }
        .sustain-icon { font-size: 28px; flex-shrink: 0; }
        .sustain-text { flex: 1; }
        .sustain-text strong { display: block; font-size: 14px; color: #0f2137; margin-bottom: 3px; }
        .sustain-text span { font-size: 13px; color: #4b5e70; line-height: 1.5; }
        .cta-section { background: linear-gradient(135deg, #0f2137, #1a3c5e); border-radius: 20px; padding: 56px 48px; text-align: center; margin-bottom: 64px; position: relative; overflow: hidden; }
        .cta-section::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(74,222,128,0.1) 0%, transparent 70%); pointer-events: none; }
        .cta-section h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(24px, 4vw, 36px); color: #fff; margin-bottom: 12px; }
        .cta-section p { font-size: 16px; color: #94c5f0; margin-bottom: 32px; line-height: 1.6; }
        .cta-btn { display: inline-block; background: #4ade80; color: #0f2137; font-weight: 800; font-size: 16px; padding: 16px 36px; border-radius: 10px; text-decoration: none; transition: transform 0.15s ease, box-shadow 0.15s ease; font-family: 'Syne', sans-serif; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(74,222,128,0.35); }
        .cta-note { font-size: 13px; color: #64748b; margin-top: 16px; }
        .print-btn { background: transparent; border: 1px solid #cbd5e1; color: #1a3c5e; font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
        .print-btn:hover { background: #f0f4f8; }
        .divider { border: none; border-top: 1px solid #e8edf2; margin: 0; }
        .footnote { font-size: 12px; color: #9aabb8; line-height: 1.6; padding: 32px 0; }
        .footnote p { margin-bottom: 6px; }
        @keyframes numReveal { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 600px) { .timeline-compare, .callout-pair { grid-template-columns: 1fr; } .cta-section { padding: 40px 24px; } .hero { padding: 48px 0 40px; } .hero-big-number { padding: 24px; } .hero-meta { gap: 12px; } }
        @media print {
          .topbar, .print-btn, iframe, [id*="chat"], [class*="chat"], [id*="widget"], [class*="widget"], [id*="nara"], [class*="nara"] { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff !important; font-size: 11pt; }
          .container { max-width: 100%; padding: 0 20px; }
          .hero { background: linear-gradient(140deg,#071524 0%,#0f2d4a 50%,#0a2b18 100%) !important; padding: 36px 20px 32px !important; }
          .hero-title { font-size: 28pt !important; color: #fff !important; }
          .hero-title .accent { color: #22c55e !important; }
          .hero-big-number .number { font-size: 42pt !important; color: #22c55e !important; }
          .section { padding: 28px 0 !important; page-break-inside: avoid; }
          .cta-btn { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <nav className="topbar">
        <div className="topbar-inner">
          <span className="topbar-logo">
            <img src="/logo.png" alt="NUMAT Sustainable Manufacturing" />
          </span>
          <span className="topbar-badge">Value Engineering Report</span>
          <button className="print-btn" onClick={handlePrint}>⬇ Save PDF</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div ref={heroRef} style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
            <p className="hero-eyebrow">Prepared for {resort} · {rooms.toLocaleString()} rooms · {s.sqm.toLocaleString()} sqm</p>
            <h1 className="hero-title syne">
              The Cost Case<br />for <span className="accent">Engineered Bamboo</span>
            </h1>
            <p className="hero-subtitle">
              A property-specific analysis based on {resort}&apos;s actual room count, local material costs,<br />
              and published research on bamboo performance in tropical buildings.
            </p>

            <div className="hero-big-number">
              <div className="label">Estimated savings vs imported hardwood</div>
              <div className="number" style={{ animation: heroVisible ? 'numReveal 0.6s ease forwards' : 'none' }}>
                {fmt(s.refinishLow)} – {fmt(s.refinishHigh)}
              </div>
              <div className="sub">based on {s.sqm.toLocaleString()} sqm across {rooms} rooms</div>
            </div>

            <div className="hero-meta">
              <div className="hero-chip">
                <strong>{fmt(s.numatCostLo)} – {fmt(s.numatCostHi)}</strong>
                Estimated NUMAT supply cost
              </div>
              <div className="hero-chip">
                <strong>{fmt(s.totalVsPlywood)}</strong>
                Savings vs marine plywood (25yr)
              </div>
              <div className="hero-chip">
                <strong>{s.deliveryWeeksNUMAT} weeks</strong>
                NUMAT delivery from Bukidnon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Cost breakdown */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec2ref}>
            <p className="section-label">Cost Breakdown</p>
            <h2 className="section-title syne">Where the savings come from</h2>
            <p className="section-sub">
              All figures calculated for {resort} at {rooms} rooms ({s.sqm.toLocaleString()} sqm) from independently verified benchmarks.
            </p>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5e70', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                vs Imported Hardwood — Refinishing Cost Avoidance
              </p>
              <div className="breakdown">
                <div className="breakdown-row">
                  <span className="label">Hardwood professional refinishing: ₱3,500–₱7,000/sqm every 7–15 years</span>
                  <span className="val" style={{ color: '#dc2626' }}>{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="label">NUMAT bamboo maintenance: routine sweeping and damp mopping only</span>
                  <span className="val positive">₱0</span>
                </div>
                <div className="breakdown-row total">
                  <span className="label">Total avoided refinishing costs for {resort}</span>
                  <span className="val positive">{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span>
                </div>
              </div>

              <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5e70', marginBottom: 12, marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                vs Marine Plywood — 25-Year Projection
              </p>
              <div className="breakdown">
                <div className="breakdown-row">
                  <span className="label">Avoided replacement materials &amp; labor (no 10–15 yr cycle)</span>
                  <span className="val positive">{fmt(s.materials)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="label">Protected room revenue (no renovation downtime)</span>
                  <span className="val positive">{fmt(s.roomRevenue)}</span>
                </div>
                <div className="breakdown-row total">
                  <span className="label">Total savings vs marine plywood</span>
                  <span className="val positive">{fmt(s.totalVsPlywood)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />


      {/* ── Gallery: See It In Place ── */}
      <section className="section" style={{ background: '#0f2137', padding: '64px 0' }}>
        <div className="container">
          <p className="section-label" style={{ color: '#4ade80' }}>In Application</p>
          <h2 className="section-title syne" style={{ color: '#fff', marginBottom: 8 }}>See it in a real setting</h2>
          <p style={{ fontSize: 15, color: '#94c5f0', marginBottom: 36, lineHeight: 1.6 }}>
            NUMAT engineered bamboo across three product lines — each suited to different areas of {resort}.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>

            {/* Flooring */}
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#1a3c5e', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'relative', paddingTop: '66%', overflow: 'hidden' }}>
                <img
                  src="/Bamboo-Flooring.png"
                  alt="NuFloor engineered bamboo flooring"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>NuFloor</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Commercial Bamboo Flooring</div>
                <div style={{ fontSize: 13, color: '#94c5f0', lineHeight: 1.6 }}>Rated for high-traffic commercial use. Dimensionally stable in tropical humidity. Ideal for lobbies, corridors, and suites.</div>
              </div>
            </div>

            {/* Wall */}
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#1a3c5e', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'relative', paddingTop: '66%', overflow: 'hidden' }}>
                <img
                  src="/Bamboo-Wall.png"
                  alt="NuWall engineered bamboo wall cladding"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>NuWall</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Wall Panels &amp; Cladding</div>
                <div style={{ fontSize: 13, color: '#94c5f0', lineHeight: 1.6 }}>Interior and exterior wall cladding. Clean installation without specialist labour. Carries the natural warmth guests respond to.</div>
              </div>
            </div>

            {/* Slats */}
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#1a3c5e', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ position: 'relative', paddingTop: '66%', overflow: 'hidden' }}>
                <img
                  src="/bamboo-slats.png"
                  alt="NuSlat decorative bamboo slat panels"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ padding: '16px 20px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>NuSlat</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>Decorative Slat Panels</div>
                <div style={{ fontSize: 13, color: '#94c5f0', lineHeight: 1.6 }}>Feature walls, reception backdrops, room dividers. The signature look that signals premium sustainability to your guests.</div>
              </div>
            </div>

          </div>

          {/* Source shot */}
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
            <img
              src="/harvest.jpg"
              alt="NUMAT bamboo harvest — Bukidnon, Mindanao"
              style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'center 40%', display: 'block' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(15,33,55,0.85) 0%, rgba(15,33,55,0.2) 60%)', display: 'flex', alignItems: 'center', padding: '0 40px' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 8 }}>From Source to Site</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Grown and engineered in Bukidnon, Mindanao</div>
                <div style={{ fontSize: 14, color: '#94c5f0', maxWidth: 420, lineHeight: 1.6 }}>Giant Asper bamboo — the same species harvested here — is what becomes your flooring. No imports, no forex risk, 2–4 weeks to your property.</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      <hr className="divider" />

      {/* Section 2: Lead time */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec3ref}>
            <p className="section-label">Supply Chain</p>
            <h2 className="section-title syne">The 14-week problem</h2>
            <p className="section-sub">Imported hardwood procurement is one of the most under-budgeted risks in hotel renovation.</p>
            <div className="timeline-compare" style={{ opacity: sec3 ? 1 : 0, transform: sec3 ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
              <div className="timeline-card bad">
                <p className="tc-label">Imported Hardwood</p>
                <div className="tc-weeks">14–20</div>
                <div className="tc-unit">weeks to arrive</div>
                <ul>
                  <li>25–35 days ocean freight</li>
                  <li>20 working days DENR import permitting</li>
                  <li>Customs clearance processing</li>
                  <li>14–21 days port congestion</li>
                  <li>Forex exposure on every order</li>
                </ul>
              </div>
              <div className="timeline-card good">
                <p className="tc-label">NUMAT Bamboo</p>
                <div className="tc-weeks">2–4</div>
                <div className="tc-unit">weeks from Bukidnon</div>
                <ul>
                  <li>Manufactured in the Philippines</li>
                  <li>No import duties or forex exposure</li>
                  <li>No DENR paperwork for the buyer</li>
                  <li>Direct delivery to {resort}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Section 3: Health + Energy */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec4ref}>
            <p className="section-label">Health &amp; Energy Performance</p>
            <h2 className="section-title syne">What the research shows</h2>
            <p className="section-sub">Independent, peer-reviewed performance data — not marketing claims.</p>
            <div className="callout-pair" style={{ opacity: sec4 ? 1 : 0, transform: sec4 ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
              <div className="callout green">
                <div className="big">99.8<span>%</span></div>
                <div className="cl-title">Bacterial Growth Inhibition</div>
                <div className="cl-body">
                  Bamboo&apos;s natural bio-agent (bamboo kun) inhibits 99.8% of bacterial growth — independently tested by the Fabrics Verification Association of Japan. Resists dust mites and mould. Already specified by <strong>Fairmont</strong> and <strong>Golden Arrow Resort</strong> for hypoallergenic guestrooms.
                </div>
              </div>
              <div className="callout blue">
                <div className="big">8<span>%</span></div>
                <div className="cl-title">Annual Cooling Energy Reduction</div>
                <div className="cl-body">
                  Published research on ScienceDirect documents an 8% reduction in annual cooling energy consumption in tropical buildings using bamboo wall and floor panels — a direct reduction in operating costs year-on-year for {resort}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Section 4: Sustainability */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec5ref}>
            <p className="section-label">Sustainability</p>
            <h2 className="section-title syne">Green building credentials</h2>
            <p className="section-sub">Material sustainability backed by data — no greenwashing.</p>
            <div style={{ opacity: sec5 ? 1 : 0, transform: sec5 ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.6s ease, transform 0.6s ease' }}>
              <div className="sustain-bar"><span className="sustain-icon">🎋</span><div className="sustain-text"><strong>Rapid renewal cycle</strong><span>Bamboo matures in 3–5 years vs 25–50 years for hardwood — making it one of the most renewable structural materials available.</span></div></div>
              <div className="sustain-bar"><span className="sustain-icon">🌿</span><div className="sustain-text"><strong>35% more CO₂ sequestration</strong><span>Bamboo sequesters 35% more CO₂ per hectare than timber plantations — directly supporting {resort}&apos;s carbon commitments.</span></div></div>
              <div className="sustain-bar"><span className="sustain-icon">🪵</span><div className="sustain-text"><strong>Zero pesticides, no replanting required</strong><span>Harvested without killing the plant. A straightforward material choice that holds up to scrutiny for green building goals.</span></div></div>
              <div className="sustain-bar"><span className="sustain-icon">🇵🇭</span><div className="sustain-text"><strong>Philippine-made</strong><span>Manufactured in Bukidnon, Mindanao. Supports local supply chain credits and eliminates the import footprint of overseas hardwood.</span></div></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#f4f6f9', padding: '0 0 40px' }}>
        <div className="container">
          <div className="cta-section">
            <h2 className="syne">Ready to run the numbers for {resort}?</h2>
            <p>
              Mohan Louis, our Head of Growth, can walk you through specification options,<br />
              sample availability, and a tailored timeline for your next renovation phase.
            </p>
            <a href="https://cal.com/mohanlouis/discovery" target="_blank" rel="noopener noreferrer" className="cta-btn syne">
              Book a 15-Minute Call →
            </a>
            <p className="cta-note">Or email directly: mohan@numat.ph · numatbamboo.com</p>
          </div>

          <p className="footnote">
            <p>All savings figures are property-specific estimates for {resort} ({rooms} rooms, {s.sqm.toLocaleString()} sqm), calculated from independently verified benchmarks. Hardwood refinishing rate: ₱3,500–₱7,000/sqm. Marine plywood replacement cycle: 10–15 years. Room revenue loss based on industry-standard occupancy assumptions.</p>
            <p>Bacterial inhibition: Fabrics Verification Association of Japan. Cooling energy reduction: ScienceDirect, tropical building research. CO₂ sequestration: peer-reviewed bamboo plantation studies.</p>
            <p>© {new Date().getFullYear()} NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</p>
          </p>
        </div>
      </section>
    </>
  )
}
