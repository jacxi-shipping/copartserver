'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Building2, CalendarClock, ChevronRight, Download, LayoutGrid, List, MapPin, Printer, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { VehicleCard } from '@/components/shared/vehicle-card'
import { VehicleDetailSheet } from '@/components/shared/vehicle-detail-sheet'
import type { Auction, PaginationInfo } from '@/lib/types'
import { formatCurrency, formatSaleDate, formatSaleTime } from '@/lib/format'

interface AuctionEvent {
  id: number
  yardNumber: number | null
  yardName: string | null
  saleDate: string | null
  saleTime: string | null
  timeZone: string | null
  locationState: string | null
  estimatedRetailValue: number | null
  highBid: number | null
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
  const [saleDate, setSaleDate] = useState('')
  const [state, setState] = useState('')
  const [lotView, setLotView] = useState<'grid' | 'table'>('grid')

  const exportAuction = () => {
    if (!selectedAuction) return
    const link = document.createElement('a')
    link.href = `/api/export?auctionId=${selectedAuction.id}`
    link.download = 'auction-run-list.csv'
    link.click()
  }

  const printRunList = () => {
    setLotView('table')
    window.setTimeout(() => window.print(), 0)
  }

  const loadEvents = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '25' })
      if (query.trim()) params.set('q', query.trim())
      if (saleDate) params.set('saleDate', saleDate)
      if (state.trim()) params.set('state', state.trim())
      const response = await fetch(`/api/auction-dashboard?${params}`)
      const payload = await response.json()
      if (response.ok && payload.success) {
        setEvents(payload.data)
        setEventPagination(payload.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [query, saleDate, state])

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
      <div className="space-y-5" data-auction-run-list>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => { setSelectedAuction(null); setLots([]) }} aria-label="Back to auction dashboard"><ArrowLeft className="size-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{selectedAuction.yardName || `Yard ${selectedAuction.yardNumber ?? 'Unknown'}`}</h2>
            <p className="text-sm text-muted-foreground">Yard #{selectedAuction.yardNumber ?? '—'} · {formatSaleDate(selectedAuction.saleDate)} · {formatSaleTime(selectedAuction.saleTime)} {selectedAuction.timeZone ?? ''}</p>
          </div>
          <Badge className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{lotPagination?.total ?? lots.length} lots</Badge>
          <Button variant="outline" size="sm" onClick={exportAuction}><Download className="mr-1.5 size-3.5" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={printRunList}><Printer className="mr-1.5 size-3.5" />Print run list</Button>
        </div>
        <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Lots are ordered by lane/grid, then lot number.</p><div className="flex gap-1 rounded-md border p-0.5"><Button variant={lotView === 'grid' ? 'secondary' : 'ghost'} size="icon" className="size-7" onClick={() => setLotView('grid')} aria-label="Card view"><LayoutGrid className="size-3.5" /></Button><Button variant={lotView === 'table' ? 'secondary' : 'ghost'} size="icon" className="size-7" onClick={() => setLotView('table')} aria-label="Lane table view"><List className="size-3.5" /></Button></div></div>
        {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="aspect-[4/3]" />)}</div> : (
          lotView === 'grid' ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lots.map((lot) => <div key={lot.id} className="relative cursor-pointer" role="button" tabIndex={0} onClick={() => setSelectedLot(lot)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedLot(lot) } }}>{lot.gridRow && <Badge className="absolute left-3 top-3 z-10 border-0 bg-black/70 text-white">Lane {lot.gridRow}</Badge>}<VehicleCard auction={lot} /></div>)}
            </div> : <Card><CardContent className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Lane</th><th className="px-4 py-3">Lot</th><th className="px-4 py-3">Vehicle</th><th className="px-4 py-3">Damage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Est. value</th></tr></thead><tbody>{lots.map((lot) => <tr key={lot.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => setSelectedLot(lot)}><td className="px-4 py-3 font-mono text-xs">{lot.gridRow || '—'}</td><td className="px-4 py-3 font-mono text-xs">#{lot.lotNumber}</td><td className="px-4 py-3"><p className="font-medium">{lot.year ?? '—'} {lot.make ?? ''} {lot.modelGroup || lot.modelDetail || ''}</p><p className="text-xs text-muted-foreground">{lot.vin ?? 'No VIN'}</p></td><td className="px-4 py-3">{lot.damageDescription ?? '—'}</td><td className="px-4 py-3">{lot.saleStatus ?? '—'}</td><td className="px-4 py-3 text-right font-medium text-emerald-700 dark:text-emerald-300">{formatCurrency(lot.estimatedRetailValue)}</td></tr>)}</tbody></table></CardContent></Card>
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
        <form className="flex w-full flex-wrap gap-2 sm:w-auto" onSubmit={(event) => { event.preventDefault(); void loadEvents(1) }}><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Yard name or number" className="sm:w-64" /><Input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} aria-label="Sale date" className="sm:w-40" /><Input value={state} onChange={(event) => setState(event.target.value.toUpperCase().slice(0, 2))} placeholder="State" aria-label="Location state" className="w-20" /><Button type="submit" size="icon" aria-label="Search auctions"><Search className="size-4" /></Button></form>
      </div>
      <Card><CardContent className="p-0">
        {loading ? <div className="space-y-3 p-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</div> : events.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No auctions match this dashboard.</div> : (
          <div className="divide-y">{events.map((auction) => <button key={auction.id} className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50" onClick={() => void loadLots(auction)}>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><Building2 className="size-5" /></div>
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{auction.yardName || `Yard ${auction.yardNumber ?? 'Unknown'}`}</p><p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground"><span><MapPin className="mr-1 inline size-3" />Yard #{auction.yardNumber ?? '—'} {auction.locationState ?? ''}</span><span><CalendarClock className="mr-1 inline size-3" />{formatSaleDate(auction.saleDate)} · {formatSaleTime(auction.saleTime)} {auction.timeZone ?? ''}</span></p></div>
            <div className="hidden text-right text-xs sm:block"><p className="font-medium text-emerald-700 dark:text-emerald-300">{formatCurrency(auction.estimatedRetailValue)}</p><p className="text-muted-foreground">High bids {formatCurrency(auction.highBid)}</p></div><Badge variant="secondary" className="shrink-0">{auction._count.lots} lots</Badge><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>)}</div>
        )}
      </CardContent></Card>
      {eventPagination && <PaginationControls pagination={eventPagination} page={eventPagination.page} onPageChange={(page) => void loadEvents(page)} label="Auctions" />}
    </div>
  )
}