'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign, TrendingUp, Wrench, Tag, Zap, Key, Gauge, Fuel, Activity, Car, MapPin, Loader2,
  StickyNote, Trash2, Calculator, Plus, X,
} from 'lucide-react'
import type { Auction } from '@/lib/types'
import {
  formatCurrency,
  formatOdometer,
  formatSaleDate,
  formatSaleTime,
  getPlaceholderGradient,
  getVehicleInitials,
  getVehicleLabel,
  getLocationLabel,
} from '@/lib/format'
import { getAuctionImageUrl } from '@/lib/images'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Props ────────────────────────────────────────────────────────────────────

interface VehicleDetailSheetProps {
  vehicle: Auction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSaleStatusBadge(status: string | null) {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  const s = status.toLowerCase()
  if (s.includes('pure sale')) {
    return (
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        {status}
      </Badge>
    )
  }
  if (s.includes('run') && s.includes('drive')) {
    return (
      <Badge className="border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
        {status}
      </Badge>
    )
  }
  if (s.includes('on approval')) {
    return (
      <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
        {status}
      </Badge>
    )
  }
  if (s.includes('sold')) {
    return (
      <Badge className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
        {status}
      </Badge>
    )
  }
  return <Badge variant="outline">{status}</Badge>
}

function YesNoBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>
  if (value) {
    return (
      <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
        Yes
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      No
    </Badge>
  )
}

function InfoRow({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: typeof DollarSign }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="size-3" />}
        {label}
      </span>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, accent }: { title: string; icon?: typeof DollarSign; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border bg-muted/20">
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${accent || 'border-border/50'}`}>
        {Icon && <Icon className={`size-3.5 ${accent ? 'text-foreground' : 'text-muted-foreground'}`} />}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  )
}

// ─── Color Map for Tags ──────────────────────────────────────────────────────

const tagColorMap: Record<string, { light: string; dark: string; dot: string }> = {
  emerald: { light: 'bg-emerald-100 text-emerald-700 border-emerald-200', dark: 'dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
  amber: { light: 'bg-amber-100 text-amber-700 border-amber-200', dark: 'dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
  rose: { light: 'bg-rose-100 text-rose-700 border-rose-200', dark: 'dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800', dot: 'bg-rose-500' },
  sky: { light: 'bg-sky-100 text-sky-700 border-sky-200', dark: 'dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800', dot: 'bg-sky-500' },
  violet: { light: 'bg-violet-100 text-violet-700 border-violet-200', dark: 'dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800', dot: 'bg-violet-500' },
  orange: { light: 'bg-orange-100 text-orange-700 border-orange-200', dark: 'dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800', dot: 'bg-orange-500' },
  teal: { light: 'bg-teal-100 text-teal-700 border-teal-200', dark: 'dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800', dot: 'bg-teal-500' },
  slate: { light: 'bg-slate-100 text-slate-700 border-slate-200', dark: 'dark:bg-slate-950/40 dark:text-slate-400 dark:border-slate-800', dot: 'bg-slate-500' },
}

const TAG_COLORS = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange', 'teal', 'slate'] as const

type TagColor = typeof TAG_COLORS[number]

interface LotNoteData {
  id: string
  lotId: number
  content: string
  createdAt: string
  updatedAt: string
}

interface LotTagData {
  id: string
  lotId: number
  tag: string
  color: string
  createdAt: string
}

function relativeTime(createdAt: string): string {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

// ─── Lot Notes Section ──────────────────────────────────────────────────────

function LotNotesSection({ vehicle }: { vehicle: Auction }) {
  const [notes, setNotes] = useState<LotNoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/notes/${vehicle.id}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setNotes(json.data)
      }
    } catch {}
    finally { setLoading(false) }
  }, [vehicle.id])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/notes/${vehicle.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote.trim() }),
      })
      if (res.ok) {
        setNewNote('')
        fetchNotes()
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${vehicle.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId }),
      })
      if (res.ok) fetchNotes()
    } catch {}
  }

  return (
    <SectionCard title="Lot Notes" icon={StickyNote}>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-muted/60" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="group relative rounded-md border bg-card p-2.5">
                  <button
                    type="button"
                    onClick={() => handleDeleteNote(note.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                  <p className="text-sm leading-relaxed pr-6 whitespace-pre-wrap break-words">{note.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{relativeTime(note.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">No notes yet. Add one below.</p>
          )}

          <div className="space-y-2 pt-1">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="min-h-[60px] text-sm"
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote()
              }}
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || submitting}
              className="w-full"
            >
              {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add Note
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Tags Section ───────────────────────────────────────────────────────────

function TagsSection({ vehicle }: { vehicle: Auction }) {
  const [tags, setTags] = useState<LotTagData[]>([])
  const [loading, setLoading] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [selectedColor, setSelectedColor] = useState<TagColor>('emerald')
  const [submitting, setSubmitting] = useState(false)

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tags/${vehicle.id}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success) setTags(json.data)
      }
    } catch {}
    finally { setLoading(false) }
  }, [vehicle.id])

  useEffect(() => { fetchTags() }, [fetchTags])

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/tags/${vehicle.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim(), color: selectedColor }),
      })
      if (res.ok) {
        setNewTag('')
        fetchTags()
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const handleRemoveTag = async (tagName: string) => {
    try {
      const res = await fetch(`/api/tags/${vehicle.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagName }),
      })
      if (res.ok) fetchTags()
    } catch {}
  }

  return (
    <SectionCard title="Tags" icon={Tag}>
      {loading ? (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const c = tagColorMap[t.color] || tagColorMap.emerald
                return (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.light} ${c.dark}`}
                  >
                    <span className={`size-1.5 rounded-full ${c.dot}`} />
                    {t.tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t.tag)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-1">No tags yet.</p>
          )}

          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="text-sm flex-1 h-8"
                maxLength={30}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag()
                }}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim() || submitting} className="h-8 px-3">
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground mr-0.5">Color:</span>
              {TAG_COLORS.map((color) => {
                const cm = tagColorMap[color]
                const isSelected = selectedColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`size-5 rounded-full border-2 transition-all ${cm.dot} ${isSelected ? 'ring-2 ring-offset-1 ring-offset-background ring-foreground scale-110' : 'opacity-60 hover:opacity-100'}`}
                    title={color}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Bid Calculator Section ─────────────────────────────────────────────────

function BidCalculatorSection({ vehicle }: { vehicle: Auction }) {
  const [bidAmount, setBidAmount] = useState(vehicle.highBid || 0)
  const [buyerFeePct, setBuyerFeePct] = useState(10)
  const [docFee, setDocFee] = useState(150)
  const [storageFee, setStorageFee] = useState(50)
  const [transportFee, setTransportFee] = useState(500)
  const [repairCost, setRepairCost] = useState(vehicle.repairCost || 0)

  const buyerFee = useMemo(() => (bidAmount * buyerFeePct) / 100, [bidAmount, buyerFeePct])
  const totalInvestment = useMemo(() => bidAmount + buyerFee + docFee + storageFee + transportFee + repairCost, [bidAmount, buyerFee, docFee, storageFee, transportFee, repairCost])
  const retailValue = vehicle.estimatedRetailValue || 0
  const estimatedProfit = retailValue - totalInvestment
  const roi = totalInvestment > 0 ? (estimatedProfit / totalInvestment) * 100 : 0
  const investmentRatio = retailValue > 0 ? Math.min(100, (totalInvestment / retailValue) * 100) : 0

  return (
    <SectionCard title="Bid Calculator" icon={Calculator}>
      <div className="space-y-3">
        <div className="space-y-2">
          <CalcInput label="Bid Amount" value={bidAmount} onChange={setBidAmount} prefix="$" />
          <CalcInput label={`Buyer Fee (${buyerFeePct}%)`} value={buyerFeePct} onChange={setBuyerFeePct} suffix="%" step={0.5} />
          <CalcInput label="Document Fee" value={docFee} onChange={setDocFee} prefix="$" />
          <CalcInput label="Storage Fee" value={storageFee} onChange={setStorageFee} prefix="$" />
          <CalcInput label="Transport Estimate" value={transportFee} onChange={setTransportFee} prefix="$" />
          <CalcInput label="Repair Cost" value={repairCost} onChange={setRepairCost} prefix="$" />
        </div>

        <Separator />

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Buyer Fee ({buyerFeePct}%)</span>
            <span className="tabular-nums">{formatCurrency(buyerFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Document Fee</span>
            <span className="tabular-nums">{formatCurrency(docFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Storage Fee</span>
            <span className="tabular-nums">{formatCurrency(storageFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Transport</span>
            <span className="tabular-nums">{formatCurrency(transportFee)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Repair Cost</span>
            <span className="tabular-nums">{formatCurrency(repairCost)}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
          <span className="text-xs font-semibold">Total Investment</span>
          <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
            {formatCurrency(totalInvestment)}
          </span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">Estimated Profit</span>
          <span className={`text-sm font-bold tabular-nums ${estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {estimatedProfit >= 0 ? '+' : ''}{formatCurrency(estimatedProfit)}
          </span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-muted-foreground">ROI %</span>
          <span className={`text-sm font-bold tabular-nums ${roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Investment vs Retail Value</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{investmentRatio.toFixed(0)}%</span>
          </div>
          <Progress value={investmentRatio} className="h-2.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{formatCurrency(totalInvestment)}</span>
            <span>of {formatCurrency(retailValue)}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

function CalcInput({ label, value, onChange, prefix, suffix, step }: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="relative flex-1">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step ?? 1}
          min={0}
          className={`w-full h-8 rounded-md border border-input bg-transparent text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-7' : 'pr-3'} dark:bg-input/30`}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ─── Similar Vehicles Section ──────────────────────────────────────────────────

interface SimilarVehicle {
  id: number
  lotNumber: number
  year: number | null
  make: string | null
  modelGroup: string | null
  modelDetail: string | null
  bodyStyle: string | null
  color: string | null
  locationCity: string | null
  locationState: string | null
  estimatedRetailValue: number | null
  saleDate: string | null
  imageUrl: string | null
  imageThumbnail: string | null
  damageDescription: string | null
}

function SimilarVehiclesSection({ vehicle }: { vehicle: Auction }) {
  const [similar, setSimilar] = useState<SimilarVehicle[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSimilar = useCallback(async () => {
    if (!vehicle.make && !vehicle.bodyStyle) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (vehicle.make) params.set('make', vehicle.make)
      if (vehicle.bodyStyle) params.set('bodyStyle', vehicle.bodyStyle)
      params.set('excludeId', String(vehicle.id))
      params.set('limit', '4')
      const res = await fetch(`/api/auctions/similar?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setSimilar(json.data)
        }
      }
    } catch {}
    finally { setLoading(false) }
  }, [vehicle.make, vehicle.bodyStyle, vehicle.id])

  useEffect(() => {
    fetchSimilar()
  }, [fetchSimilar])

  if (!loading && similar.length === 0) return null

  return (
    <SectionCard title="Similar Vehicles" icon={Car}>
      <div className="space-y-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 p-2 space-y-2">
                <div className="h-14 rounded-md bg-muted/60" />
                <div className="h-3 w-3/4 rounded bg-muted/60" />
                <div className="h-3 w-1/2 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {similar.map((v) => {
              const label = [v.year, v.make, v.modelGroup || v.modelDetail].filter(Boolean).join(' ') || 'Unknown'
              const loc = [v.locationCity, v.locationState].filter(Boolean).join(', ') || '—'
              const gradient = getPlaceholderGradient(v.make)

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => console.log('Similar vehicle clicked:', v.lotNumber, label)}
                  className="group rounded-lg border bg-card p-2 text-left transition-all duration-150 hover:shadow-sm hover:border-emerald-500/30"
                >
                  {/* Gradient placeholder */}
                  <div className={`relative aspect-[16/10] rounded-md overflow-hidden bg-gradient-to-br ${gradient} mb-2`}>
                    {getAuctionImageUrl(v.lotNumber, v.imageThumbnail, v.imageUrl) ? (
                      <img src={getAuctionImageUrl(v.lotNumber, v.imageThumbnail, v.imageUrl)!} alt={label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <span className="text-xl font-bold text-white/80">
                          {getVehicleInitials(v.make, v.modelGroup || v.modelDetail)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <p className="text-xs font-semibold leading-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {label}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="size-2.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">{loc}</span>
                  </div>
                  <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    {v.estimatedRetailValue != null ? formatCurrency(v.estimatedRetailValue) : '—'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </SectionCard>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function VehicleDetailSheet({ vehicle, open, onOpenChange }: VehicleDetailSheetProps) {
  const addRecentlyViewed = useAppStore((s) => s.addRecentlyViewed)

  // Track recently viewed when sheet opens
  useEffect(() => {
    if (open && vehicle) {
      const label = getVehicleLabel(vehicle)
      addRecentlyViewed(vehicle.id, label)
    }
  }, [open, vehicle, addRecentlyViewed])

  if (!vehicle) return null

  const label = getVehicleLabel(vehicle)
  const gradient = getPlaceholderGradient(vehicle.make)
  const imageSource = getAuctionImageUrl(vehicle.lotNumber, vehicle.imageThumbnail, vehicle.imageUrl)
  const initials = getVehicleInitials(vehicle.make, vehicle.modelGroup || vehicle.modelDetail)
  const location = getLocationLabel(vehicle)
  const zip = vehicle.locationZip ? ` ${vehicle.locationZip}` : ''
  const fullLocation = `${location}${location ? zip : ''}`.trim() || '—'

  const saleDate = formatSaleDate(vehicle.saleDate)
  const saleTime = formatSaleTime(vehicle.saleTime)
  const tz = vehicle.timeZone ?? ''
  const saleDateTime = [saleDate, saleTime, tz].filter(Boolean).join(' ') || '—'

  const lastUpdated = vehicle.lastUpdatedTime
    ? new Date(vehicle.lastUpdatedTime).toLocaleString()
    : null

  // Calculate value ratios
  const repairRatio = vehicle.repairCost && vehicle.estimatedRetailValue
    ? Math.round((vehicle.repairCost / vehicle.estimatedRetailValue) * 100)
    : null
  const bidRatio = vehicle.highBid && vehicle.estimatedRetailValue
    ? Math.round((vehicle.highBid / vehicle.estimatedRetailValue) * 100)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
        <SheetHeader className="p-4 pb-2">
          <div className="flex items-start gap-2">
            <SheetTitle className="text-lg leading-tight flex-1">
              {label}
            </SheetTitle>
            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 shrink-0">
              Lot #{vehicle.lotNumber}
            </Badge>
          </div>
          {vehicle.trim && (
            <SheetDescription className="text-xs">
              {vehicle.trim}
            </SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-120px)]">
          <div className="px-4 pb-4 space-y-4">
            {/* Image Section */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted shadow-inner">
              {imageSource ? (
                <img
                  src={imageSource}
                  alt={label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`relative flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  <span className="text-6xl font-bold text-white/90 tracking-wider drop-shadow-lg">
                    {initials}
                  </span>
                </div>
              )}
              {/* Year overlay */}
              {vehicle.year && (
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm text-xs font-bold">
                    {vehicle.year}
                  </Badge>
                </div>
              )}
            </div>

            {/* ─── Pricing Section ──────────────────────────────────────── */}
            <SectionCard title="Pricing" icon={DollarSign}>
              <div className="space-y-3">
                {/* Est. Retail Value - prominent */}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50">
                      <TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">Est. Retail Value</span>
                  </div>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                    {vehicle.estimatedRetailValue ? formatCurrency(vehicle.estimatedRetailValue) : '—'}
                  </span>
                </div>

                {/* High Bid */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-muted-foreground">High Bid</span>
                  <div className="flex items-center gap-2">
                    {vehicle.highBid != null && vehicle.highBid > 0 && (
                      <span className="text-sm font-semibold">
                        {formatCurrency(vehicle.highBid)}
                      </span>
                    )}
                    {bidRatio !== null && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        bidRatio > 70
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      }`}>
                        {bidRatio}% of value
                      </span>
                    )}
                    {(!vehicle.highBid || vehicle.highBid <= 0) && <span className="text-muted-foreground">—</span>}
                  </div>
                </div>

                {/* Repair Cost */}
                {vehicle.repairCost != null && vehicle.repairCost > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Est. Repair Cost</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency(vehicle.repairCost)}
                      </span>
                      {repairRatio !== null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-medium">
                          {repairRatio}% of value
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Buy It Now */}
                {vehicle.buyItNowPrice != null && vehicle.buyItNowPrice > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Zap className="size-3 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Buy It Now</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                      {formatCurrency(vehicle.buyItNowPrice)}
                    </span>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ─── Investment Analysis Section ──────────────────────────── */}
            <SectionCard title="Investment Analysis" icon={TrendingUp}>
              <div className="space-y-4">
                {/* Value Ratio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Bid / Value Ratio</span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      bidRatio != null && bidRatio < 50 ? 'text-emerald-600 dark:text-emerald-400'
                        : bidRatio != null && bidRatio <= 80 ? 'text-amber-600 dark:text-amber-400'
                        : bidRatio != null ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                    }`}>
                      {bidRatio != null ? `${bidRatio}%` : 'N/A'}
                    </span>
                  </div>
                  {bidRatio != null ? (
                    <Progress
                      value={bidRatio}
                      className="h-2"
                    />
                  ) : (
                    <Progress value={0} className="h-2 opacity-30" />
                  )}
                </div>

                {/* Repair Risk */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Repair / Value Ratio</span>
                    <span className={`text-xs font-semibold tabular-nums ${
                      repairRatio != null && repairRatio < 50 ? 'text-emerald-600 dark:text-emerald-400'
                        : repairRatio != null && repairRatio <= 80 ? 'text-amber-600 dark:text-amber-400'
                        : repairRatio != null ? 'text-rose-600 dark:text-rose-400'
                        : 'text-muted-foreground'
                    }`}>
                      {repairRatio != null ? `${repairRatio}%` : 'N/A'}
                    </span>
                  </div>
                  {repairRatio != null ? (
                    <Progress
                      value={repairRatio}
                      className="h-2"
                    />
                  ) : (
                    <Progress value={0} className="h-2 opacity-30" />
                  )}
                </div>

                {/* Potential Profit */}
                <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-muted/50">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Potential Profit</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${
                    (() => {
                      const profit = vehicle.estimatedRetailValue != null
                        ? vehicle.estimatedRetailValue - (vehicle.highBid || 0) - (vehicle.repairCost || 0)
                        : null
                      if (profit == null) return 'text-muted-foreground'
                      return profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    })()
                  }`}>
                    {(() => {
                      const profit = vehicle.estimatedRetailValue != null
                        ? vehicle.estimatedRetailValue - (vehicle.highBid || 0) - (vehicle.repairCost || 0)
                        : null
                      if (profit == null) return 'N/A'
                      return (profit >= 0 ? '+$' : '-$') + Math.abs(profit).toLocaleString()
                    })()}
                  </span>
                </div>

                {/* Investment Score */}
                {(() => {
                  const bidR = bidRatio ?? 0
                  const repR = repairRatio ?? 0
                  const hasBid = vehicle.highBid != null && vehicle.highBid > 0
                  const score = hasBid
                    ? Math.max(0, Math.min(100, Math.round(100 - bidR - repR)))
                    : 50
                  const scoreColor = score >= 70
                    ? '#059669'
                    : score >= 40
                      ? '#d97706'
                      : '#e11d48'
                  const scoreLabel = score >= 70 ? 'Great' : score >= 40 ? 'Moderate' : 'Risky'
                  const scoreLabelColor = score >= 70
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : score >= 40
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  const deg = (score / 100) * 360
                  const size = 72
                  const strokeWidth = 6
                  const radius = (size - strokeWidth) / 2
                  const circumference = 2 * Math.PI * radius
                  const offset = circumference - (deg / 360) * circumference

                  return (
                    <div className="flex items-center gap-4 rounded-lg px-3 py-3 bg-muted/30">
                      {/* Circular progress indicator */}
                      <div className="relative shrink-0" style={{ width: size, height: size }}>
                        <div
                          className="rounded-full"
                          style={{
                            width: size,
                            height: size,
                            background: `conic-gradient(${scoreColor} ${deg}deg, oklch(0.7 0 0 / 15%) ${deg}deg)`,
                          }}
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded-full"
                          style={{
                            width: size - strokeWidth,
                            height: size - strokeWidth,
                            top: strokeWidth / 2,
                            left: strokeWidth / 2,
                            background: 'var(--background)',
                          }}
                        >
                          <span className="text-lg font-bold tabular-nums" style={{ color: scoreColor }}>
                            {score}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-foreground">Investment Score</span>
                        <span className={`text-xs font-medium ${scoreLabelColor}`}>
                          {scoreLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-relaxed">
                          {hasBid
                            ? 'Based on bid and repair costs vs. estimated value'
                            : 'No bid yet — awaiting sale data'
                          }
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </SectionCard>

            {/* ─── Vehicle Details Section ──────────────────────────────── */}
            <SectionCard title="Vehicle Details" icon={Gauge}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InfoRow label="VIN" icon={Tag}>
                  {vehicle.vin ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono text-xs truncate block max-w-full hover:text-foreground transition-colors">
                          {vehicle.vin}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs break-all">
                        {vehicle.vin}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span>—</span>
                  )}
                </InfoRow>

                <InfoRow label="Body Style / Color">
                  <span>{[vehicle.bodyStyle, vehicle.color].filter(Boolean).join(', ') || '—'}</span>
                </InfoRow>

                <InfoRow label="Engine">
                  <span>{vehicle.engine || '—'}</span>
                </InfoRow>

                <InfoRow label="Drive">
                  <span>{vehicle.drive || '—'}</span>
                </InfoRow>

                <InfoRow label="Transmission">
                  <span>{vehicle.transmission || '—'}</span>
                </InfoRow>

                <InfoRow label="Fuel / Cylinders" icon={Fuel}>
                  <span>{[vehicle.fuelType, vehicle.cylinders != null ? `${vehicle.cylinders} Cyl` : null].filter(Boolean).join(', ') || '—'}</span>
                </InfoRow>

                <InfoRow label="Odometer" icon={Gauge}>
                  <span className="font-medium">{formatOdometer(vehicle.odometer)}</span>
                </InfoRow>

                <InfoRow label="Has Keys" icon={Key}>
                  <YesNoBadge value={vehicle.hasKeys} />
                </InfoRow>
              </div>
            </SectionCard>

            {/* ─── Sale & Location Section ───────────────────────────────── */}
            <SectionCard title="Sale & Location">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InfoRow label="Sale Date / Time">
                  <span>{saleDateTime}</span>
                </InfoRow>

                <InfoRow label="Location">
                  <span>{fullLocation}</span>
                </InfoRow>

                <InfoRow label="Sale Status">
                  {getSaleStatusBadge(vehicle.saleStatus)}
                </InfoRow>

                <InfoRow label="Title">
                  <span>{[vehicle.saleTitleState, vehicle.saleTitleType].filter(Boolean).join(' — ') || '—'}</span>
                </InfoRow>

                <InfoRow label="Yard">
                  <span>{[vehicle.yardName, vehicle.yardNumber != null ? `#${vehicle.yardNumber}` : null].filter(Boolean).join(' ') || '—'}</span>
                </InfoRow>

                {vehicle.autograde && (
                  <InfoRow label="AutoGrade">
                    <Badge variant="outline">{vehicle.autograde}</Badge>
                  </InfoRow>
                )}

                <InfoRow label="Runs / Drives">
                  <YesNoBadge value={vehicle.runsDrives === 'Yes'} />
                </InfoRow>

                <InfoRow label="Make Offer">
                  {vehicle.makeOfferEligible ? (
                    <Badge className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Eligible
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">Not eligible</span>
                  )}
                </InfoRow>
              </div>
            </SectionCard>

            {/* ─── Damage Section ───────────────────────────────────────── */}
            {(vehicle.damageDescription || vehicle.secondaryDamage) && (
              <SectionCard title="Damage Assessment" accent="border-amber-200 dark:border-amber-800/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Primary Damage</span>
                    {vehicle.damageDescription ? (
                      <Badge className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        {vehicle.damageDescription}
                      </Badge>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">None</span>
                    )}
                  </div>
                  {vehicle.secondaryDamage && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Secondary Damage</span>
                      <Badge className="border-amber-200 bg-amber-50/70 text-amber-600 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        {vehicle.secondaryDamage}
                      </Badge>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* ─── Special Note - callout box ────────────────────────────── */}
            {vehicle.specialNote && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                  ⚠ Special Note
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                  {vehicle.specialNote}
                </p>
              </div>
            )}

            {/* ─── Announcements ────────────────────────────────────────── */}
            {vehicle.announcements && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Announcements
                </p>
                <p className="text-sm leading-relaxed">{vehicle.announcements}</p>
              </div>
            )}

            {/* ─── Lot Notes ─────────────────────────────────────────────── */}
            <LotNotesSection vehicle={vehicle} />

            {/* ─── Tags ──────────────────────────────────────────────────── */}
            <TagsSection vehicle={vehicle} />

            {/* ─── Bid Calculator ─────────────────────────────────────────── */}
            <BidCalculatorSection key={vehicle.id} vehicle={vehicle} />

            {/* ─── Similar Vehicles ────────────────────────────────────── */}
            <SimilarVehiclesSection vehicle={vehicle} />
          </div>
        </ScrollArea>

        {/* Footer */}
        {lastUpdated && (
          <SheetFooter className="border-t px-4 py-2">
            <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
