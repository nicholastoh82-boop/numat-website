import { Suspense } from 'react';
import type { Metadata } from 'next';
import VEReportClient from './VEReportClient';

type Props = { searchParams: Promise<{ for?: string; rooms?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const p = await searchParams;
  const resort = p.for || 'Your Property';
  const rooms  = p.rooms || '50';
  return {
    title: `Value Engineering Report — ${resort} | NUMAT`,
    description: `A 25-year cost analysis for ${resort} (${rooms} rooms) — NUMAT bamboo vs marine plywood and hardwood.`,
    openGraph: {
      title: `${resort} — NUMAT Value Engineering Report`,
      description: `See how much ${resort} saves with NUMAT engineered bamboo.`,
      images: [{ url: 'https://numatbamboo.com/og-social.jpg', width: 1200, height: 630 }],
    },
  };
}

// Force dynamic rendering so URL params are always available
export const dynamic = 'force-dynamic';

export default async function VEReportPage({ searchParams }: Props) {
  const p      = await searchParams;
  const resort = (p.for  || 'Your Property').trim();
  const rooms  = Math.max(1, parseInt(p.rooms || '50') || 50);

  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#071524', display:'flex', alignItems:'center',
        justifyContent:'center', fontFamily:'sans-serif', color:'#7db4d8', fontSize:16 }}>
        Preparing your report…
      </div>
    }>
      <VEReportClient resort={resort} rooms={rooms} />
    </Suspense>
  );
}