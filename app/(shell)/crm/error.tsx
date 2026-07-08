'use client'

import PortalErrorBoundary from '@/components/portal/PortalErrorBoundary'

export default function CrmError(props: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <PortalErrorBoundary {...props} area="the CRM" />
}
