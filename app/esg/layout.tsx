import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ESG and Sustainability: Carbon Negative Bamboo Products',
  description: 'NuMat bamboo is verified carbon negative by Wavemaker Impact. Dendrocalamus asper sequesters 17 to 20 tCO₂/ha/yr. Calculate your purchase carbon impact.',
  openGraph: {
    title: 'ESG and Sustainability | NuMat Bamboo',
    description: 'Carbon negative bamboo verified by Wavemaker Impact. Calculate your CO₂ impact and compare D. asper vs Moso sequestration data.',
    url: 'https://numatbamboo.com/esg',
  },
}

export default function ESGLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}