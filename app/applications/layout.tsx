import { applicationsMetadata } from '@/numat-seo-metadata'

export const metadata = applicationsMetadata

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
