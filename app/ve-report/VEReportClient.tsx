'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { resort: string; rooms: number };

// ─── Calculation engine ──────────────────────────────────────────────────────
function calcSavings(rooms: number) {
  const BASE_ROOMS = 50;
  const ratio = rooms / BASE_ROOMS;
  const SQM_PER_ROOM = 40; // 2000 sqm / 50 rooms baseline

  const materials   = Math.round(3_700_000 * ratio);
  const roomRevenue = Math.round(3_600_000 * ratio);
  const totalVsPlywood = materials + roomRevenue;

  const sqm              = rooms * SQM_PER_ROOM;
  const refinishLow      = Math.round(7_000_000 * ratio);
  const refinishHigh     = Math.round(14_000_000 * ratio);
  const coolingPct       = 8;
  const bacterialPct     = 99.8;
  const deliveryWeeksNUMAT = '2 – 4';
  const deliveryWeeksImport = '14 – 20';

  return {
    materials, roomRevenue, totalVsPlywood,
    sqm, refinishLow, refinishHigh,
    coolingPct, bacterialPct,
    deliveryWeeksNUMAT, deliveryWeeksImport,
    rooms,
  };
}


function fmt(n: number) {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(0)}K`;
  return `₱${n}`;
}

// ─── Section fade-in hook ────────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Big stat card ───────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, delay = 0, animate }: {
  label: string; value: string; sub?: string; accent: string; delay?: number; animate: boolean;
}) {
  return (
    <div
      className="stat-card"
      style={{
        background: '#fff',
        border: `1px solid #e8edf2`,
        borderRadius: 12,
        padding: '28px 24px',
        opacity: animate ? 1 : 0,
        transform: animate ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
        borderTop: `3px solid ${accent}`,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7a8d', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: '#0f2137', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 13, color: '#6b7a8d', marginTop: 8, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function VEReportClient({ resort, rooms }: Props) {
  const s = calcSavings(rooms);

  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeroVisible(true), 80); }, []);

  const { ref: sec2ref, visible: sec2 } = useInView();
  const { ref: sec3ref, visible: sec3 } = useInView();
  const { ref: sec4ref, visible: sec4 } = useInView();
  const { ref: sec5ref, visible: sec5 } = useInView();

  // Print / PDF
  const handlePrint = () => window.print();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #f4f6f9; color: #0f2137; -webkit-font-smoothing: antialiased; }
        .syne { font-family: 'Syne', sans-serif; }

        .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }

        /* Top nav bar */
        .topbar {
          background: #ffffff;
          padding: 12px 0;
          position: sticky; top: 0; z-index: 100;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 8px rgba(0,0,0,0.07);
        }
        .topbar-inner {
          max-width: 860px; margin: 0 auto; padding: 0 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .topbar-logo img { height: 40px; width: auto; display: block; }
        .topbar-badge { background: #f0f7ff; color: #1a3c5e; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; border: 1px solid #bfdbfe; }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, #0f2137 0%, #1a3c5e 60%, #0f3320 100%);
          padding: 72px 0 60px;
          position: relative; overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 50% at 70% 50%, rgba(74,222,128,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-eyebrow {
          font-size: 12px; font-weight: 600; letter-spacing: 0.12em;
          text-transform: uppercase; color: #4ade80; margin-bottom: 16px;
        }
        .hero-title {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(32px, 5vw, 52px); line-height: 1.05;
          color: #fff; margin-bottom: 12px;
        }
        .hero-title .accent { color: #4ade80; }
        .hero-subtitle { font-size: 16px; color: #94c5f0; margin-bottom: 40px; line-height: 1.6; }

        .hero-big-number {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px; padding: 32px 36px;
          display: inline-block; margin-bottom: 32px;
          backdrop-filter: blur(8px);
        }
        .hero-big-number .label { font-size: 13px; color: #94c5f0; font-weight: 500; margin-bottom: 8px; }
        .hero-big-number .number { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(44px, 7vw, 72px); color: #4ade80; line-height: 1; font-variant-numeric: tabular-nums; }
        .hero-big-number .sub { font-size: 14px; color: #94c5f0; margin-top: 8px; }

        .hero-meta { display: flex; gap: 24px; flex-wrap: wrap; }
        .hero-chip {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14);
          border-radius: 8px; padding: 10px 16px;
          font-size: 13px; color: #cbd5e1; line-height: 1.4;
        }
        .hero-chip strong { color: #fff; display: block; font-size: 15px; }

        /* Sections */
        .section { padding: 64px 0; }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
          text-transform: uppercase; color: #4ade80; margin-bottom: 8px;
        }
        .section-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(22px, 4vw, 32px); color: #0f2137; margin-bottom: 8px; }
        .section-sub { font-size: 15px; color: #4b5e70; margin-bottom: 36px; line-height: 1.6; }

        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }

        /* Breakdown rows */
        .breakdown { background: #fff; border-radius: 12px; border: 1px solid #e8edf2; overflow: hidden; margin-bottom: 16px; }
        .breakdown-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 18px 24px; border-bottom: 1px solid #f0f4f8;
          gap: 16px;
        }
        .breakdown-row:last-child { border-bottom: none; }
        .breakdown-row .label { font-size: 14px; color: #4b5e70; flex: 1; }
        .breakdown-row .val { font-weight: 700; color: #0f2137; font-size: 15px; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .breakdown-row .val.positive { color: #16a34a; }
        .breakdown-row.total { background: #f0fdf4; }
        .breakdown-row.total .label { font-weight: 700; color: #0f2137; }
        .breakdown-row.total .val { font-size: 18px; color: #16a34a; }

        /* Timeline comparison */
        .timeline-compare {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .timeline-card {
          border-radius: 12px; padding: 28px 24px;
          border: 1px solid #e8edf2;
        }
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

        /* Bacteria / Cooling callout */
        .callout-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .callout {
          border-radius: 12px; padding: 28px 24px;
          background: #fff; border: 1px solid #e8edf2;
          position: relative; overflow: hidden;
        }
        .callout::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        }
        .callout.green::before { background: #22c55e; }
        .callout.blue::before { background: #3b82f6; }
        .callout .big { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 42px; color: #0f2137; line-height: 1; margin-bottom: 8px; }
        .callout .big span { font-size: 22px; }
        .callout .cl-title { font-size: 14px; font-weight: 600; color: #0f2137; margin-bottom: 8px; }
        .callout .cl-body { font-size: 13px; color: #4b5e70; line-height: 1.6; }

        /* Sustainability */
        .sustain-bar {
          background: #fff; border: 1px solid #e8edf2; border-radius: 12px;
          padding: 20px 24px; display: flex; align-items: center; gap: 20px;
          margin-bottom: 12px;
        }
        .sustain-icon { font-size: 28px; flex-shrink: 0; }
        .sustain-text { flex: 1; }
        .sustain-text strong { display: block; font-size: 14px; color: #0f2137; margin-bottom: 3px; }
        .sustain-text span { font-size: 13px; color: #4b5e70; line-height: 1.5; }

        /* CTA */
        .cta-section {
          background: linear-gradient(135deg, #0f2137, #1a3c5e);
          border-radius: 20px; padding: 56px 48px; text-align: center;
          margin-bottom: 64px; position: relative; overflow: hidden;
        }
        .cta-section::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 80% at 50% 100%, rgba(74,222,128,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .cta-section h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(24px, 4vw, 36px); color: #fff; margin-bottom: 12px; }
        .cta-section p { font-size: 16px; color: #94c5f0; margin-bottom: 32px; line-height: 1.6; }
        .cta-btn {
          display: inline-block; background: #4ade80; color: #0f2137;
          font-weight: 800; font-size: 16px; padding: 16px 36px;
          border-radius: 10px; text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          font-family: 'Syne', sans-serif;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(74,222,128,0.35); }
        .cta-note { font-size: 13px; color: #64748b; margin-top: 16px; }

        /* Print btn */
        @keyframes numReveal {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
          background: transparent; border: 1px solid #cbd5e1; color: #1a3c5e;
          font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: 8px;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: background 0.15s;
        }
        .print-btn:hover { background: #f0f4f8; }

        /* Divider */
        .divider { border: none; border-top: 1px solid #e8edf2; margin: 0; }

        /* Footnote */
        .footnote { font-size: 12px; color: #9aabb8; line-height: 1.6; padding: 32px 0; }
        .footnote p { margin-bottom: 6px; }

        @media (max-width: 600px) {
          .timeline-compare, .callout-pair { grid-template-columns: 1fr; }
          .cta-section { padding: 40px 24px; }
          .hero { padding: 48px 0 40px; }
          .hero-big-number { padding: 24px; }
          .hero-meta { gap: 12px; }
        }

        @media print {
          .topbar, .print-btn,
          iframe, [id*="chat"], [class*="chat"],
          [id*="widget"], [class*="widget"],
          [id*="nara"], [class*="nara"],
          [id*="crisp"], [class*="intercom"],
          [id*="drift"], [id*="zendesk"],
          [class*="fixed"], [class*="sticky"],
          div[style*="position: fixed"],
          div[style*="position:fixed"] { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { background: #fff !important; font-size: 11pt; }
          .container { max-width: 100%; padding: 0 20px; }
          body::before { content:''; display:block; height:4px; background:linear-gradient(90deg,#0a2b18,#16a34a,#1a3c5e); }
          .print-header { display: flex !important; align-items:center; justify-content:space-between; padding:16px 20px 14px; border-bottom:1px solid #d4dae3; }
          .print-header img { height: 36px; }
          .print-header-right { text-align:right; font-size:10pt; color:#3d5166; }
          .print-header-right strong { display:block; color:#0a1628; font-size:11pt; }
          .hero { background: linear-gradient(140deg,#071524 0%,#0f2d4a 50%,#0a2b18 100%) !important; padding: 36px 20px 32px !important; }
          .hero-title { font-size: 28pt !important; color: #fff !important; }
          .hero-title .accent { color: #22c55e !important; }
          .hero-big-number .number { font-size: 42pt !important; color: #22c55e !important; }
          .hero-eyebrow { color: #22c55e !important; }
          .hero-subtitle, .hero-big-number .label, .hero-big-number .sub { color: #7db4d8 !important; }
          .hero-chip { background: rgba(255,255,255,0.1) !important; color: #b8d4e8 !important; }
          .hero-chip strong { color: #fff !important; }
          .section { padding: 28px 0 !important; page-break-inside: avoid; }
          .section-label { color: #16a34a !important; }
          .section-title { font-size: 20pt !important; }
          .breakdown { box-shadow: none !important; }
          .breakdown-row .val.positive { color: #15803d !important; }
          .breakdown-row.total { background: #f0fdf4 !important; }
          .breakdown-row.total .val { color: #15803d !important; }
          .timeline-card.bad { background: #fff5f5 !important; }
          .timeline-card.good { background: #f0fdf4 !important; }
          .timeline-card.bad .tc-weeks { color: #dc2626 !important; }
          .timeline-card.good .tc-weeks { color: #16a34a !important; }
          .callout.green .big { color: #15803d !important; }
          .callout.blue .big { color: #1d4ed8 !important; }
          .callout.green::before { background: #16a34a !important; }
          .callout.blue::before { background: #1d4ed8 !important; }
          .cta-section { background: linear-gradient(135deg,#071524,#0f2d4a) !important; padding: 28px 32px !important; }
          .cta-section h2 { color: #fff !important; font-size: 18pt !important; }
          .cta-section p { color: #7db4d8 !important; }
          .cta-btn { display: none !important; }
          .cta-contact { display: block !important; color: #22c55e !important; font-size: 13pt !important; font-weight: 700 !important; }
          .divider { border-top-color: #d4dae3 !important; }
        }
      `}</style>

      {/* ── Top bar ── */}
      <nav className="topbar">
        <div className="topbar-inner">
          <span className="topbar-logo">
            {/* Logo file: place Numat_Logo.png inside /public/images/ in your repo */}
            <img src="/images/numat-logo.png" alt="NUMAT Sustainable Manufacturing" />
          </span>
          <span className="topbar-badge">Value Engineering Report</span>
          <button className="print-btn" onClick={handlePrint}>⬇ Save PDF</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <div
            ref={heroRef}
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            <p className="hero-eyebrow">Prepared for {resort} · {rooms} rooms</p>
            <h1 className="hero-title syne">
              The 25-Year Cost Case<br />
              for <span className="accent">Engineered Bamboo</span>
            </h1>
            <p className="hero-subtitle">
              A property-specific analysis based on your room count, local material costs,<br />
              and published research on bamboo performance in tropical buildings.
            </p>

            <div className="hero-big-number">
              <div className="label">Total projected savings vs marine plywood</div>
              <div className="number" style={{ animation: heroVisible ? 'numReveal 0.6s ease forwards' : 'none' }}>
                  {fmt(s.totalVsPlywood)}
              </div>
              <div className="sub">over 25 years · based on {rooms}-room property</div>
            </div>

            <div className="hero-meta">
              <div className="hero-chip">
                <strong>{fmt(s.materials)}</strong>
                Avoided replacement costs
              </div>
              <div className="hero-chip">
                <strong>{fmt(s.roomRevenue)}</strong>
                Protected room revenue
              </div>
              <div className="hero-chip">
                <strong>{s.deliveryWeeksNUMAT} weeks</strong>
                NUMAT delivery from Bukidnon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 1: Cost breakdown ── */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec2ref}>
            <p className="section-label">Cost Breakdown</p>
            <h2 className="section-title syne">Where the savings come from</h2>
            <p className="section-sub">
              All figures are calculated for {resort} at {rooms} rooms and scaled from independently verified benchmarks.
            </p>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5e70', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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

              <p style={{ fontSize: 14, fontWeight: 600, color: '#4b5e70', marginBottom: 12, marginTop: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                vs Hardwood — Refinishing Cost Avoidance ({s.sqm.toLocaleString()} sqm)
              </p>
              <div className="breakdown">
                <div className="breakdown-row">
                  <span className="label">Hardwood professional refinishing: ₱3,500–₱7,000/sqm every 7–15 years</span>
                  <span className="val" style={{ color: '#dc2626' }}>{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span>
                </div>
                <div className="breakdown-row">
                  <span className="label">NUMAT bamboo maintenance: routine sweeping and damp mopping</span>
                  <span className="val positive">₱0</span>
                </div>
                <div className="breakdown-row total">
                  <span className="label">Total avoided refinishing costs</span>
                  <span className="val positive">{fmt(s.refinishLow)} – {fmt(s.refinishHigh)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Section 2: Lead time ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec3ref}>
            <p className="section-label">Supply Chain</p>
            <h2 className="section-title syne">The 14-week problem</h2>
            <p className="section-sub">
              Imported hardwood procurement is one of the most under-budgeted risks in hotel renovation. Here is the actual timeline.
            </p>

            <div
              className="timeline-compare"
              style={{
                opacity: sec3 ? 1 : 0,
                transform: sec3 ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
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
                  <li>DENR paperwork on the buyer</li>
                </ul>
              </div>
              <div className="timeline-card good">
                <p className="tc-label">NUMAT Bamboo</p>
                <div className="tc-weeks">2–4</div>
                <div className="tc-unit">weeks from Bukidnon</div>
                <ul>
                  <li>Manufactured in the Philippines</li>
                  <li>No import duties</li>
                  <li>No forex exposure</li>
                  <li>No DENR paperwork for the buyer</li>
                  <li>Direct delivery to {resort}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Section 3: Health + Energy ── */}
      <section className="section" style={{ background: '#f4f6f9' }}>
        <div className="container">
          <div ref={sec4ref}>
            <p className="section-label">Health &amp; Energy Performance</p>
            <h2 className="section-title syne">What the research shows</h2>
            <p className="section-sub">Independent, peer-reviewed performance data — not marketing claims.</p>

            <div
              className="callout-pair"
              style={{
                opacity: sec4 ? 1 : 0,
                transform: sec4 ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <div className="callout green">
                <div className="big">99.8<span>%</span></div>
                <div className="cl-title">Bacterial Growth Inhibition</div>
                <div className="cl-body">
                  Bamboo&apos;s natural bio-agent (bamboo kun) inhibits 99.8% of bacterial growth — independently tested by the Fabrics Verification Association of Japan. No chemical treatment needed. Resists dust mites and mould. Already specified by <strong>Fairmont</strong> and <strong>Golden Arrow Resort</strong> for hypoallergenic guestrooms.
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

      {/* ── Section 4: Sustainability ── */}
      <section className="section" style={{ background: '#fff' }}>
        <div className="container">
          <div ref={sec5ref}>
            <p className="section-label">Sustainability</p>
            <h2 className="section-title syne">Green building credentials</h2>
            <p className="section-sub">Material sustainability backed by data — no certifications claimed, no greenwashing.</p>

            <div
              style={{
                opacity: sec5 ? 1 : 0,
                transform: sec5 ? 'translateY(0)' : 'translateY(24px)',
                transition: 'opacity 0.6s ease, transform 0.6s ease',
              }}
            >
              <div className="sustain-bar">
                <span className="sustain-icon">🎋</span>
                <div className="sustain-text">
                  <strong>Rapid renewal cycle</strong>
                  <span>Bamboo matures in 3–5 years vs 25–50 years for hardwood — making it one of the most renewable structural materials available.</span>
                </div>
              </div>
              <div className="sustain-bar">
                <span className="sustain-icon">🌿</span>
                <div className="sustain-text">
                  <strong>35% more CO₂ sequestration</strong>
                  <span>Bamboo sequesters 35% more CO₂ per hectare than timber plantations — directly supporting {resort}&apos;s carbon commitments.</span>
                </div>
              </div>
              <div className="sustain-bar">
                <span className="sustain-icon">🪵</span>
                <div className="sustain-text">
                  <strong>Sustainable materials by nature</strong>
                  <span>Bamboo is one of the most inherently sustainable structural materials on the planet — no pesticides, no replanting required, and harvested without killing the plant. For properties working toward green building goals, it is a straightforward material choice that holds up to scrutiny.</span>
                </div>
              </div>
              <div className="sustain-bar">
                <span className="sustain-icon">🇵🇭</span>
                <div className="sustain-text">
                  <strong>Philippine-made</strong>
                  <span>Manufactured in Bukidnon, Mindanao. Supports local supply chain credits and eliminates the import footprint of overseas hardwood.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#f4f6f9', padding: '0 0 40px' }}>
        <div className="container">
          <div className="cta-section">
            <h2 className="syne">Ready to run the numbers for {resort}?</h2>
            <p>
              Mohan Louis, our Head of Growth, can walk you through specification options,<br />
              sample availability, and a tailored timeline for your next renovation phase.
            </p>
            <a
              href="https://cal.com/mohanlouis/discovery"
              target="_blank"
              rel="noopener noreferrer"
              className="cta-btn syne"
            >
              Book a 15-Minute Call →
            </a>
            <p className="cta-note">Or email directly: mohan@numat.ph · numatbamboo.com</p>
          </div>

          <p className="footnote">
            <p>All savings figures are property-specific estimates calculated using independently verified benchmarks and scaled to {rooms} rooms. Marine plywood replacement cycle: 10–15 years. Hardwood refinishing rate: ₱3,500–₱7,000/sqm. Room revenue loss during renovation based on industry-standard occupancy assumptions.</p>
            <p>Bacterial inhibition: Fabrics Verification Association of Japan. Cooling energy reduction: ScienceDirect, tropical building research. CO₂ sequestration: peer-reviewed bamboo plantation studies.</p>
            <p>© 2024 NUMAT Sustainable Manufacturing Inc. · numatbamboo.com</p>
          </p>
        </div>
      </section>
    </>
  );
}