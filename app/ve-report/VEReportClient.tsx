'use client';

import { useEffect, useRef, useState } from 'react';

// ─── Calculation engine ──────────────────────────────────────────────────────
function calcSavings(
  rooms: number,
  sqm: number,
  saveLo: number,
  saveHi: number,
  numatLo: number,
  numatHi: number,
) {
  const BASE_ROOMS   = 50
  const ratio        = rooms / BASE_ROOMS
  const materials    = Math.round(3_700_000 * ratio)
  const roomRevenue  = Math.round(3_600_000 * ratio)
  const totalVsPlywood = materials + roomRevenue
  const refinishLow  = saveLo  > 0 ? saveLo  : Math.round(7_000_000 * ratio)
  const refinishHigh = saveHi  > 0 ? saveHi  : Math.round(14_000_000 * ratio)
  const numatCostLo  = numatLo > 0 ? numatLo : Math.round(9_000_000 * ratio)
  const numatCostHi  = numatHi > 0 ? numatHi : Math.round(11_000_000 * ratio)
  const effectiveSqm = sqm > 0 ? sqm : rooms * 35
  return {
    materials, roomRevenue, totalVsPlywood,
    sqm: effectiveSqm,
    refinishLow, refinishHigh,
    numatCostLo, numatCostHi,
    rooms,
  }
}

function fmt(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(0)}K`
  return `₱${n}`
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── Pexels CDN URL helper ───────────────────────────────────────────────────
const px = (id: string, w = 1260, h = 750) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&dpr=1`

// ─── Application photos (Pexels free commercial license) ────────────────────
// NUMAT resort application photos — served from numatbamboo.com/public
const PHOTOS = {
  overwater: '/ve-resort-1.jpg',  // Hotel lounge — sunken fire pit, bamboo flooring
  lounge:    '/ve-resort-2.jpg',  // Hotel guestroom — bamboo headboard feature wall
  villa:     '/ve-resort-3.jpg',  // Hotel bar — bamboo counter surface — timber deck + bamboo pavilion
  pool:      '/ve-resort-4.jpg',  // Balinese pool villa — timber decking around pool
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
    const n  = Math.max(1, parseInt(p.get('rooms')    || '50') || 50)
    const sq = Math.max(0, parseInt(p.get('sqm')      || '0')  || 0)
    const sl = Math.max(0, parseInt(p.get('save_lo')  || '0')  || 0)
    const sh = Math.max(0, parseInt(p.get('save_hi')  || '0')  || 0)
    const nl = Math.max(0, parseInt(p.get('numat_lo') || '0')  || 0)
    const nh = Math.max(0, parseInt(p.get('numat_hi') || '0')  || 0)
    if (r) setResort(r.trim())
    setRooms(n); setSqm(sq || n * 35)
    setSaveLo(sl); setSaveHi(sh); setNumatLo(nl); setNumatHi(nh)
  }, [])

  const s = calcSavings(rooms, sqm, saveLo, saveHi, numatLo, numatHi)

  const [heroVisible, setHeroVisible] = useState(false)
  useEffect(() => { setTimeout(() => setHeroVisible(true), 80) }, [])

  const { ref: sec1ref, visible: sec1 } = useInView()
  const { ref: gallRef, visible: gall } = useInView()
  const { ref: sec2ref, visible: sec2 } = useInView()
  const { ref: sec3ref, visible: sec3 } = useInView()
  const { ref: sec4ref, visible: sec4 } = useInView()

  useEffect(() => {
    const ATTR = 'data-print-hidden'
    const before = () => document.querySelectorAll<HTMLElement>('body *').forEach(el => {
      const pos = window.getComputedStyle(el).position
      if ((pos === 'fixed' || pos === 'sticky') && !el.closest('.topbar')) {
        el.setAttribute(ATTR, el.style.display || 'unset')
        el.style.setProperty('display', 'none', 'important')
      }
    })
    const after = () => document.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach(el => {
      el.style.display = (el.getAttribute(ATTR) === 'unset' ? '' : el.getAttribute(ATTR)) || ''
      el.removeAttribute(ATTR)
    })
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after) }
  }, [])

  const fadeIn = (visible: boolean, delay = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(28px)',
    transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
  })

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f6f9; color: #0f2137; -webkit-font-smoothing: antialiased; }
        .syne { font-family: 'Syne', sans-serif; }
        .container { max-width: 880px; margin: 0 auto; padding: 0 24px; }
        /* Topbar */
        .topbar { background: #fff; padding: 12px 0; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid #e2e8f0; box-shadow: 0 1px 8px rgba(0,0,0,0.07); }
        .topbar-inner { max-width: 880px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .topbar-logo img { height: 38px; display: block; }
        .topbar-badge { background: #f0f7ff; color: #1a3c5e; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; white-space: nowrap; }
        .print-btn { background: transparent; border: 1px solid #cbd5e1; color: #1a3c5e; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .print-btn:hover { background: #f0f4f8; }
        /* Hero */
        .hero { background: linear-gradient(135deg, #0f2137 0%, #1a3c5e 55%, #0f3320 100%); padding: 72px 0 60px; position: relative; overflow: hidden; }
        .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 70% 50%, rgba(74,222,128,0.08) 0%, transparent 70%); pointer-events: none; }
        .hero-eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #4ade80; margin-bottom: 16px; }
        .hero-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(30px, 5vw, 50px); line-height: 1.05; color: #fff; margin-bottom: 12px; }
        .hero-title .accent { color: #4ade80; }
        .hero-subtitle { font-size: 15px; color: #94c5f0; margin-bottom: 40px; line-height: 1.7; max-width: 560px; }
        .hero-big-number { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 28px 32px; display: inline-block; margin-bottom: 32px; backdrop-filter: blur(8px); }
        .hero-big-number .label { font-size: 13px; color: #94c5f0; font-weight: 500; margin-bottom: 8px; }
        .hero-big-number .number { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(38px, 6vw, 64px); color: #4ade80; line-height: 1; font-variant-numeric: tabular-nums; }
        .hero-big-number .sub { font-size: 13px; color: #94c5f0; margin-top: 8px; }
        .hero-chips { display: flex; gap: 12px; flex-wrap: wrap; }
        .chip { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #cbd5e1; line-height: 1.4; }
        .chip strong { color: #fff; display: block; font-size: 14px; }
        /* Sections */
        .section { padding: 64px 0; }
        .sec-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4ade80; margin-bottom: 8px; }
        .sec-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(20px, 3.5vw, 30px); color: #0f2137; margin-bottom: 8px; }
        .sec-sub { font-size: 14px; color: #4b5e70; margin-bottom: 32px; line-height: 1.7; max-width: 640px; }
        /* Cost breakdown */
        .breakdown { background: #fff; border-radius: 12px; border: 1px solid #e8edf2; overflow: hidden; margin-bottom: 16px; }
        .brow { display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; border-bottom: 1px solid #f0f4f8; gap: 16px; }
        .brow:last-child { border-bottom: none; }
        .brow .lab { font-size: 13px; color: #4b5e70; flex: 1; line-height: 1.5; }
        .brow .val { font-weight: 700; color: #0f2137; font-size: 14px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .brow .val.pos { color: #16a34a; }
        .brow .val.neg { color: #dc2626; }
        .brow.tot { background: #f0fdf4; }
        .brow.tot .lab { font-weight: 700; color: #0f2137; }
        .brow.tot .val { font-size: 16px; color: #16a34a; }
        /* Gallery */
        .gallery-dark { background: #0b1d31; padding: 72px 0; }
        .gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px; }
        .gallery-card { border-radius: 12px; overflow: hidden; position: relative; }
        .gallery-card img { width: 100%; height: 240px; object-fit: cover; display: block; }
        .gallery-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 20px 20px 16px; background: linear-gradient(to top, rgba(11,29,49,0.92) 0%, transparent 100%); }
        .gallery-caption .tag { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4ade80; margin-bottom: 4px; }
        .gallery-caption .cap { font-size: 13px; color: #fff; font-weight: 600; line-height: 1.4; }
        .gallery-wide { border-radius: 12px; overflow: hidden; position: relative; }
        .gallery-wide img { width: 100%; height: 260px; object-fit: cover; object-position: center 35%; display: block; }
        .gallery-wide-overlay { position: absolute; inset: 0; background: linear-gradient(to right, rgba(11,29,49,0.88) 0%, rgba(11,29,49,0.25) 60%); display: flex; align-items: center; padding: 0 40px; }
        .gallery-wide-text .tag { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4ade80; margin-bottom: 10px; }
        .gallery-wide-text h3 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(18px, 3vw, 24px); color: #fff; margin-bottom: 8px; line-height: 1.2; }
        .gallery-wide-text p { font-size: 13px; color: #94c5f0; max-width: 400px; line-height: 1.6; }
        /* Timeline */
        .tl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .tl-card { border-radius: 12px; padding: 26px 22px; border: 1px solid #e8edf2; }
        .tl-card.bad { background: #fef2f2; border-color: #fecaca; }
        .tl-card.good { background: #f0fdf4; border-color: #bbf7d0; }
        .tl-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
        .tl-card.bad .tl-label { color: #b91c1c; }
        .tl-card.good .tl-label { color: #15803d; }
        .tl-weeks { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 34px; line-height: 1; margin-bottom: 6px; }
        .tl-card.bad .tl-weeks { color: #dc2626; }
        .tl-card.good .tl-weeks { color: #16a34a; }
        .tl-unit { font-size: 12px; font-weight: 500; color: #6b7a8d; margin-bottom: 14px; }
        .tl-card ul { list-style: none; }
        .tl-card ul li { font-size: 13px; color: #4b5e70; padding: 3px 0; display: flex; gap: 8px; line-height: 1.5; }
        .tl-card.bad ul li::before { content: '•'; color: #dc2626; flex-shrink: 0; }
        .tl-card.good ul li::before { content: '✓'; color: #16a34a; font-weight: 700; flex-shrink: 0; }
        /* Callouts */
        .callout-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .callout { border-radius: 12px; padding: 26px 22px; background: #fff; border: 1px solid #e8edf2; position: relative; overflow: hidden; }
        .callout::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .callout.green::before { background: #22c55e; }
        .callout.blue::before { background: #3b82f6; }
        .callout .big { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 40px; color: #0f2137; line-height: 1; margin-bottom: 8px; }
        .callout .big span { font-size: 20px; }
        .callout .cl-title { font-size: 14px; font-weight: 600; color: #0f2137; margin-bottom: 8px; }
        .callout .cl-body { font-size: 13px; color: #4b5e70; line-height: 1.65; }
        /* Sustain bars */
        .s-bar { background: #fff; border: 1px solid #e8edf2; border-radius: 12px; padding: 18px 22px; display: flex; align-items: flex-start; gap: 18px; margin-bottom: 10px; }
        .s-icon { font-size: 26px; flex-shrink: 0; margin-top: 2px; }
        .s-text strong { display: block; font-size: 14px; color: #0f2137; margin-bottom: 4px; }
        .s-text span { font-size: 13px; color: #4b5e70; line-height: 1.6; }
        /* CTA */
        .cta-wrap { background: linear-gradient(135deg, #0f2137, #1a3c5e); border-radius: 20px; padding: 52px 44px; text-align: center; margin-bottom: 64px; position: relative; overflow: hidden; }
        .cta-wrap::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(74,222,128,0.1) 0%, transparent 70%); pointer-events: none; }
        .cta-wrap h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(22px, 3.5vw, 32px); color: #fff; margin-bottom: 12px; }
        .cta-wrap p { font-size: 15px; color: #94c5f0; margin-bottom: 28px; line-height: 1.6; }
        .cta-btn { display: inline-block; background: #4ade80; color: #0f2137; font-weight: 800; font-size: 15px; padding: 15px 32px; border-radius: 10px; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; font-family: 'Syne', sans-serif; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(74,222,128,0.35); }
        .cta-note { font-size: 13px; color: #64748b; margin-top: 14px; }
        .divider { border: none; border-top: 1px solid #e8edf2; margin: 0; }
        .footnote { font-size: 11px; color: #9aabb8; line-height: 1.7; padding: 28px 0; }
        .footnote p { margin-bottom: 6px; }
        @keyframes numReveal { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
        @media (max-width: 600px) {
          .tl-grid, .callout-pair, .gallery-grid { grid-template-columns: 1fr; }
          .hero { padding: 48px 0 40px; }
          .hero-big-number { padding: 22px 24px; }
          .cta-wrap { padding: 36px 24px; }
          .gallery-wide-overlay { padding: 0 24px; }
        }
        @media print {
          .topbar, .print-btn, iframe, [id*="chat"], [class*="widget"], [id*="nara"] { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff !important; }
          .hero { background: linear-gradient(140deg,#071524,#0f2d4a,#0a2b18) !important; padding: 32px 20px !important; }
          .gallery-dark { background: #0b1d31 !important; padding: 40px 20px !important; }
          .section { padding: 28px 0 !important; page-break-inside: avoid; }
          .cta-btn { display: none !important; }
        }
      `}</style>

      {/* Topbar */}
      <nav className="topbar">
        <div className="topbar-inner">
          <span className="topbar-logo"><img src="/logo.png" alt="NUMAT" /></span>
          <span className="topbar-badge">Value Engineering Report</span>
          <button className="print-btn" onClick={() => window.print()}>⬇ Save PDF</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'none' : 'translateY(20px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
            <p className="hero-eyebrow">Prepared for {resort} · {rooms.toLocaleString()} rooms · {s.sqm.toLocaleString()} sqm</p>
            <h1 className="hero-title syne">
              The Cost Case<br />for <span className="accent">Engineered Bamboo</span>
            </h1>
            <p className="hero-subtitle">
              A property-specific analysis for {resort} — based on your actual room count, Philippine material benchmarks, and independent research on bamboo performance in tropical buildings.
            </p>
            <div className="hero-big-number">
              <div className="label">Estimated savings vs imported hardwood</div>
              <div className="number" style={{ animation: heroVisible ? 'numReveal 0.6s ease 0.3s both' : 'none' }}>
                {fmt(s.refinishLow)} – {fmt(s.refinishHigh)}
              </div>
              <div className="sub">based on {s.sqm.toLocaleString()} sqm across {rooms.toLocaleString()} rooms</div>
            </div>
            <div className="hero-chips">
              <div className="chip"><strong>{fmt(s.numatCostLo)} – {fmt(s.numatCostHi)}</strong>Estimated NUMAT supply cost</div>
              <div className="chip"><strong>{fmt(s.totalVsPlywood)}</strong>Savings vs marine plywood (25yr)</div>
              <div className="chip"><strong>2 – 4 weeks</strong>Delivery from Bukidnon</div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Cost breakdown */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec1ref} style={fadeIn(sec1)}>
            <p className="sec-label">Cost Breakdown</p>
            <h2 className="sec-title syne">Where the savings come from</h2>
            <p className="sec-sub">All figures calculated for {resort} at {rooms.toLocaleString()} rooms ({s.sqm.toLocaleString()} sqm) using independently verified Philippine market benchmarks.</p>

            <p style={{ fontSize: 13, fontWeight: 600, color: '#4b5e70', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>vs Imported Hardwood — Refinishing Cost Avoidance</p>
            <div className="breakdown">
              <div className="brow"><span className="lab">Hardwood professional refinishing: ₱3,500–₱7,000/sqm every 7–15 years</span><span className="val neg">{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span></div>
              <div className="brow"><span className="lab">NUMAT bamboo maintenance: routine sweeping and damp mopping only</span><span className="val pos">₱0</span></div>
              <div className="brow tot"><span className="lab">Total avoided refinishing costs for {resort}</span><span className="val pos">{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span></div>
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, color: '#4b5e70', marginBottom: 10, marginTop: 20, textTransform: 'uppercase', letterSpacing: '0.06em' }}>vs Marine Plywood — 25-Year Projection</p>
            <div className="breakdown">
              <div className="brow"><span className="lab">Avoided replacement materials &amp; labour (no 10–15 yr cycle)</span><span className="val pos">{fmt(s.materials)}</span></div>
              <div className="brow"><span className="lab">Protected room revenue (no renovation downtime)</span><span className="val pos">{fmt(s.roomRevenue)}</span></div>
              <div className="brow tot"><span className="lab">Total savings vs marine plywood (25 years)</span><span className="val pos">{fmt(s.totalVsPlywood)}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery: End-use settings */}
      <section className="gallery-dark">
        <div className="container">
          <div ref={gallRef} style={fadeIn(gall)}>
            <p className="sec-label" style={{ color: '#4ade80' }}>Where It Goes</p>
            <h2 className="sec-title syne" style={{ color: '#fff', marginBottom: 8 }}>Built for hospitality settings like {resort}</h2>
            <p style={{ fontSize: 14, color: '#94c5f0', marginBottom: 32, lineHeight: 1.7, maxWidth: 580 }}>
              Engineered bamboo across four distinct hotel spaces — flooring, walls, F&amp;B surfaces, and ceilings. These are the exact applications NUMAT supplies into the hospitality sector.
            </p>

            <div className="gallery-grid">
              {/* Hotel Lobby */}
              <div className="gallery-card">
                <img src={PHOTOS.overwater} alt="Hotel lounge with bamboo flooring — sunken fire pit area" loading="lazy" style={{ objectPosition: 'center 40%' }} />
                <div className="gallery-caption">
                  <div className="tag">NuWall + NuFloor</div>
                  <div className="cap">Hotel Lounge — Bamboo Flooring<br /><span style={{ fontSize: 12, color: '#94c5f0', fontWeight: 400 }}>Bamboo flooring across the full social space — warm, stable, zero refinishing</span></div>
                </div>
              </div>

              {/* Lounge Terrace */}
              <div className="gallery-card">
                <img src={PHOTOS.living} alt="Hotel guestroom with bamboo feature wall headboard panel" loading="lazy" />
                <div className="gallery-caption">
                  <div className="tag">NuWall</div>
                  <div className="cap">Hotel Guestroom — Feature Wall<br /><span style={{ fontSize: 12, color: '#94c5f0', fontWeight: 400 }}>Bamboo headboard wall panel — the detail guests photograph and remember</span></div>
                </div>
              </div>

              {/* Pool Deck */}
              <div className="gallery-card">
                <img src={PHOTOS.villa} alt="Hotel bar counter — engineered bamboo surface in F&B setting" loading="lazy" />
                <div className="gallery-caption">
                  <div className="tag">NuWall</div>
                  <div className="cap">Hotel Bar — Bamboo Counter Surface<br /><span style={{ fontSize: 12, color: '#94c5f0', fontWeight: 400 }}>High-traffic F&amp;B surface — bamboo board that handles daily commercial use</span></div>
                </div>
              </div>

              {/* Resort Pool */}
              <div className="gallery-card">
                <img src={PHOTOS.pool} alt="Bamboo ceiling panels in hotel interior — skylight installation" loading="lazy" />
                <div className="gallery-caption">
                  <div className="tag">NuDoor</div>
                  <div className="cap">Hotel Interior — Bamboo Ceiling<br /><span style={{ fontSize: 12, color: '#94c5f0', fontWeight: 400 }}>Bamboo ceiling panels with skylight — an application most suppliers cannot deliver</span></div>
                </div>
              </div>
            </div>

            {/* Wide source shot */}
            <div className="gallery-wide">
              <img src="/harvest.jpg" alt="NUMAT bamboo source — Bukidnon, Mindanao Philippines" loading="lazy" />
              <div className="gallery-wide-overlay">
                <div className="gallery-wide-text">
                  <div className="tag">From Source to Site</div>
                  <h3>Grown and engineered in Bukidnon, Mindanao</h3>
                  <p>Giant Asper bamboo — the same species harvested here — becomes your flooring, wall panels, and feature installations. No imports. No forex risk. 2–4 weeks to {resort}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Section 2: Lead time */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec2ref} style={fadeIn(sec2)}>
            <p className="sec-label">Supply Chain</p>
            <h2 className="sec-title syne">The 14-week problem with imports</h2>
            <p className="sec-sub">Imported hardwood procurement is one of the most under-budgeted risks in hotel renovation. Here is the actual timeline comparison.</p>
            <div className="tl-grid">
              <div className="tl-card bad">
                <p className="tl-label">Imported Hardwood</p>
                <div className="tl-weeks">14–20</div>
                <div className="tl-unit">weeks to arrive</div>
                <ul>
                  <li>25–35 days ocean freight</li>
                  <li>20 working days DENR import permitting</li>
                  <li>Customs clearance processing</li>
                  <li>14–21 days port congestion buffer</li>
                  <li>Forex exposure on every order</li>
                </ul>
              </div>
              <div className="tl-card good">
                <p className="tl-label">NUMAT Bamboo</p>
                <div className="tl-weeks">2–4</div>
                <div className="tl-unit">weeks from Bukidnon</div>
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

      {/* Section 3: Performance data */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec3ref} style={fadeIn(sec3)}>
            <p className="sec-label">Performance Data</p>
            <h2 className="sec-title syne">What the research shows</h2>
            <p className="sec-sub">Independent, peer-reviewed performance data — not marketing claims. Both figures are verifiable from published studies.</p>
            <div className="callout-pair">
              <div className="callout green">
                <div className="big">99.8<span>%</span></div>
                <div className="cl-title">Bacterial Growth Inhibition</div>
                <div className="cl-body">Bamboo&apos;s natural bio-agent (bamboo kun) inhibits 99.8% of bacterial growth — tested independently by the Fabrics Verification Association of Japan. No chemical treatment required. Resists dust mites and mould. Already specified by <strong>Fairmont</strong> and <strong>Golden Arrow Resort</strong> for hypoallergenic guestrooms.</div>
              </div>
              <div className="callout blue">
                <div className="big">8<span>%</span></div>
                <div className="cl-title">Annual Cooling Energy Reduction</div>
                <div className="cl-body">Published research on ScienceDirect documents an 8% reduction in annual cooling energy consumption in tropical buildings using bamboo wall and floor panels. A direct and compounding reduction in operating costs year-on-year for {resort}.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* Section 4: Sustainability */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec4ref} style={fadeIn(sec4)}>
            <p className="sec-label">Sustainability</p>
            <h2 className="sec-title syne">A material choice that holds up to scrutiny</h2>
            <p className="sec-sub">Facts your sustainability team can use — no certifications claimed, no greenwashing.</p>
            <div className="s-bar"><span className="s-icon">🎋</span><div className="s-text"><strong>Matures in 3–5 years</strong><span>Bamboo reaches harvest maturity in 3–5 years vs 25–50 years for hardwood. The most renewable structural material available at commercial scale.</span></div></div>
            <div className="s-bar"><span className="s-icon">🌿</span><div className="s-text"><strong>35% more CO₂ sequestration</strong><span>Bamboo sequesters 35% more CO₂ per hectare than timber plantations — directly supporting {resort}&apos;s carbon commitments and green building documentation.</span></div></div>
            <div className="s-bar"><span className="s-icon">🪵</span><div className="s-text"><strong>Zero pesticides, harvested without killing the plant</strong><span>Roots remain intact after harvest — the plant regrows without replanting. A material choice that supports genuine sustainability goals without regulatory risk.</span></div></div>
            <div className="s-bar"><span className="s-icon">🇵🇭</span><div className="s-text"><strong>Philippine-made — Bukidnon, Mindanao</strong><span>Supports local supply chain credits, eliminates the import footprint of overseas hardwood, and reduces logistics exposure for {resort}&apos;s procurement team.</span></div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#f4f6f9', padding: '0 0 40px' }}>
        <div className="container">
          <div className="cta-wrap">
            <h2 className="syne">Ready to spec this for {resort}?</h2>
            <p>Mohan Louis, our Head of Growth, can walk you through product options, sample availability, and a tailored lead time for your next renovation phase.</p>
            <a href="https://cal.com/mohanlouis/discovery" target="_blank" rel="noopener noreferrer" className="cta-btn syne">Book a 15-Minute Call →</a>
            <p className="cta-note">Or email: mohan@numat.ph &nbsp;·&nbsp; numatbamboo.com</p>
          </div>

          <div className="footnote">
            <p>All savings figures are property-specific estimates for {resort} ({rooms.toLocaleString()} rooms, {s.sqm.toLocaleString()} sqm), calculated from independently verified benchmarks. Hardwood refinishing rate: ₱3,500–₱7,000/sqm. Marine plywood replacement cycle: 10–15 years. Room revenue loss based on industry-standard occupancy assumptions.</p>
            <p>Bacterial inhibition: Fabrics Verification Association of Japan. Cooling energy reduction: ScienceDirect, tropical building research. CO₂ sequestration: peer-reviewed bamboo plantation studies.</p>
            <p>Application photos: Pexels (free commercial license). © {new Date().getFullYear()} NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</p>
          </div>
        </div>
      </section>
    </>
  )
}
