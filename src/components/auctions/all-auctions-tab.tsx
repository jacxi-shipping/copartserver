'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Building2, CalendarClock, ChevronRight, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { VehicleCard } from '@/components/shared/vehicle-card'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import type { Auction, PaginationInfo } from '@/lib/types'
import { formatSaleDate, formatSaleTime } from '@/lib/format'

interface AuctionEvent {
  id: number
  yardNumber: number | null
  yardName: string | null
  saleDate: string | null
  saleTime: string | null
  timeZone: string | null
  _count: { lots: number }
}

export function AllAuctionsTab() {
  const [events, setEvents] = useState<AuctionEvent[]>([])
  const [selectedAuction, setSelectedAuction] = useState<AuctionEvent | null>(null)
  const [lots, setLots] = useState<Auction[]>([])
  const [selectedLot, setSelectedLot] = useState<Auction | null>(null)
  const [eventPagination, setEventPagination] = useState<PaginationInfo | null>(null)
  const [lotPagination, setLotPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const loadEvents = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' })
      if (query.trim()) params.set('q', query.trim())
      const response = await fetch(`/api/auction-dashboard?${params}`)
      const payload = await response.json()
      if (response.ok && payload.success) {
        setEvents(payload.data)
        setEventPagination(payload.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [query])

  const loadLots = useCallback(async (auction: AuctionEvent, page = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/auction-dashboard/${auction.id}?page=${page}&pageSize=24`)
      const payload = await response.json()
      if (response.ok && payload.success) {
        setSelectedAuction(payload.data.auction)
        setLots(payload.data.lots)
        setLotPagination(payload.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => void loadEvents(), 0)
    return () => clearTimeout(timeout)
  }, [loadEvents])

  if (selectedAuction) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => { setSelectedAuction(null); setLots([]) }} aria-label="Back to auction dashboard"><ArrowLeft className="size-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{selectedAuction.yardName || `Yard ${selectedAuction.yardNumber ?? 'Unknown'}`}</h2>
            <p className="text-sm text-muted-foreground">Yard #{selectedAuction.yardNumber ?? '—'} · {formatSaleDate(selectedAuction.saleDate)} · {formatSaleTime(selectedAuction.saleTime)} {selectedAuction.timeZone ?? ''}</p>
          </div>
          <Badge className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{lotPagination?.total ?? lots.length} lots</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Lots are ordered by lane/grid, then lot number.</p>
        {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="aspect-[4/3]" />)}</div> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lots.map((lot) => <div key={lot.id} className="relative cursor-pointer" role="button" tabIndex={0} onClick={() => setSelectedLot(lot)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedLot(lot) } }}>{lot.gridRow && <Badge className="absolute left-3 top-3 z-10 border-0 bg-black/70 text-white">Lane {lot.gridRow}</Badge>}<VehicleCard auction={lot} /></div>)}
          </div>
        )}
        {lotPagination && <PaginationControls pagination={lotPagination} page={lotPagination.page} onPageChange={(page) => void loadLots(selectedAuction, page)} label="Lots" />}
        <VehicleDetailSheet vehicle={selectedLot} open={selectedLot !== null} onOpenChange={(open) => { if (!open) setSelectedLot(null) }} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="text-2xl font-bold tracking-tight">Auction Dashboard</h2><p className="text-sm text-muted-foreground">Select an auction to open its yard and lane-ordered lots.</p></div>
        <form className="flex w-full gap-2 sm:w-auto" onSubmit={(event) => { event.preventDefault(); void loadEvents(1) }}><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yard name or number" className="sm:w-64" /><Button type="submit" size="icon" aria-label="Search auctions"><Search className="size-4" /></Button></form>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : events.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No auctions match this dashboard.</div> : (
          <div className="divide-y">{events.map((auction) => <button key={auction.id} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50" onClick={() => void loadLots(auction)}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Building2 className="size-5" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{auction.yardName || `Yard ${auction.yardNumber ?? 'Unknown'}`}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"><span><MapPin className="mr-1 inline size-3" />Yard #{auction.yardNumber ?? '—'}</span><span><CalendarClock className="mr-1 inline size-3" />{formatSaleDate(auction.saleDate)} · {formatSaleTime(auction.saleTime)} {auction.timeZone ?? ''}</span></p></div>
            <Badge variant="secondary" className="shrink-0">{auction._count.lots} lots</Badge><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>)}</div>
        )}
      </CardContent></Card>
      {eventPagination && <PaginationControls pagination={eventPagination} page={eventPagination.page} onPageChange={(page) => void loadEvents(page)} label="Auctions" />}
    </div>
  )
}