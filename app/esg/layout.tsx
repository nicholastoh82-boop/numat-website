import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ESG and Sustainability: Lower Carbon Bamboo Boards',
  description: 'How NuMat bamboo boards support lower carbon building. Peer reviewed research on bamboo carbon uptake, and a calculator for the carbon stored in your order.',
  openGraph: {
    title: 'ESG and Sustainability | NuMat Bamboo',
    description: 'Fast growing Philippine bamboo made into engineered boards. See the research on bamboo carbon uptake and calculate the carbon stored in your order.',
    url: 'https://numatbamboo.com/esg',
  },
}

export default function ESGLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}