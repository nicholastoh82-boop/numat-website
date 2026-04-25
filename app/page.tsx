import { homeMetadata } from '@/numat-seo-metadata'
import HomePageClient from './HomePageClient'

export const metadata = homeMetadata

export default function HomePage() {
  return <HomePageClient />
}
