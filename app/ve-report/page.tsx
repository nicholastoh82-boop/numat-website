import { Suspense } from 'react';
import { Metadata } from 'next';
import VEReportClient from './VEReportClient';

// Dynamic metadata reads searchParams server-side
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ for?: string; rooms?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const resort = params.for || 'Your Property';
  const rooms  = params.rooms || '50';

  return {
    title: `Value Engineering Report — ${resort} | NUMAT`,
    description: `A personalized 25-year cost analysis for ${resort} (${rooms} rooms) comparing NUMAT engineered bamboo against marine plywood and hardwood.`,
    openGraph: {
      title: `${resort} — NUMAT Value Engineering Report`,
      description: `See how much ${resort} can save over 25 years by switching to NUMAT engineered bamboo.`,
      url: `https://numatbamboo.com/ve-report?for=${encodeURIComponent(resort)}&rooms=${rooms}`,
      siteName: 'NUMAT Sustainable Manufacturing',
      images: [{ url: 'https://numatbamboo.com/og-social.jpg', width: 1200, height: 630 }],
    },
  };
}

// useSearchParams() inside VEReportClient requires a Suspense boundary
export default function VEReportPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', background: '#0f2137',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', color: '#94c5f0', fontSize: 16,
      }}>
        Loading your report…
      </div>
    }>
      <VEReportClient />
    </Suspense>
  );
}