'use client'

import { UpcomingTab } from '@/components/auctions/upcoming-tab'

export function AllAuctionsTab() {
  return (
    <UpcomingTab
      endpoint="/api/auctions"
      title="All Auctions"
      description="Browse every imported lot, including scheduled and unscheduled inventory."
      emptyMessage="No auction lots have been imported yet"
      paginationLabel="All Auctions"
    />
  )
}