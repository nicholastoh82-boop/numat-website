import { esgMetadata } from '@/numat-seo-metadata'
import EsgPageClient from './EsgPageClient'

export const metadata = esgMetadata

export default function EsgPage() {
  return <EsgPageClient />
}
