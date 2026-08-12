import type { Auction } from '@/lib/types'

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  const rounded = Math.round(value * 100) / 100
  return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatOdometer(value: number | null | undefined): string {
  if (value == null) return '—'
  return `${Math.round(value).toLocaleString()} mi`
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatSaleDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A'
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString()
  }
  return dateStr
}

export function formatSaleTime(saleTime: string | null): string {
  if (!saleTime) return ''
  const s = saleTime.replace(':', '').padStart(4, '0')
  const hours = parseInt(s.slice(0, 2), 10)
  const mins = s.slice(2, 4)
  if (isNaN(hours)) return ''
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${h12}:${mins} ${ampm}`
}

export function formatSaleDateTime(auction: Auction): string {
  const date = formatSaleDate(auction.saleDate)
  const time = formatSaleTime(auction.saleTime)
  if (time) return `${date} ${time}`
  return date
}

export function getVehicleInitials(make: string | null, model: string | null): string {
  const m = (make || '').trim()
  const md = (model || '').trim()
  const first = m[0] || ''
  const second = md[0] || m[1] || ''
  return (first + second).toUpperCase() || '?'
}

const placeholderGradients = [
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-teal-600',
  'from-lime-500 to-green-600',
  'from-fuchsia-500 to-pink-600',
  'from-teal-500 to-cyan-600',
]

export function getPlaceholderGradient(make: string | null): string {
  if (!make) return 'from-gray-400 to-gray-500'
  let hash = 0
  for (let i = 0; i < make.length; i++) {
    hash = make.charCodeAt(i) + ((hash << 5) - hash)
  }
  return placeholderGradients[Math.abs(hash) % placeholderGradients.length]
}

export function getVehicleLabel(auction: Auction): string {
  const year = auction.year ?? ''
  const make = auction.make ?? ''
  const model = auction.modelGroup || auction.modelDetail || ''
  return [year, make, model].filter(Boolean).join(' ') || 'Unknown Vehicle'
}

export function getLocationLabel(auction: Auction): string {
  const city = auction.locationCity ?? ''
  const state = auction.locationState ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state || 'Unknown'
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`
  return new Date(timestamp).toLocaleDateString()
}
