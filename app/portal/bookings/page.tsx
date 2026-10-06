import { Suspense } from 'react'

import { PortalBookingsPage } from '@/app/portal/bookings/portal-bookings-page'

function BookingsPageFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-sage-600" />
    </div>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsPageFallback />}>
      <PortalBookingsPage />
    </Suspense>
  )
}
