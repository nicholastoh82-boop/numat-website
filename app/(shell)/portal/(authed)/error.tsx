'use client'

import PortalErrorBoundary from '@/components/portal/PortalErrorBoundary'

export default function PortalError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <PortalErrorBoundary {...props} area="this portal page" />
}
