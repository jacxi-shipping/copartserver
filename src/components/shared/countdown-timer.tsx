'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  saleDate: string | null
  saleTime: string | null
}

function getTimeRemaining(saleDate: string | null, saleTime: string | null): number | null {
  if (!saleDate) return null

  // Parse date: YYYY-MM-DD
  const dateParts = saleDate.split('-').map(Number)
  if (dateParts.length !== 3 || dateParts.some((p) => isNaN(p))) return null

  const target = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])

  // Parse time: HHMM or HH:MM
  if (saleTime) {
    const cleaned = saleTime.replace(':', '').padStart(4, '0')
    const hours = parseInt(cleaned.slice(0, 2), 10)
    const mins = parseInt(cleaned.slice(2, 4), 10)
    if (!isNaN(hours) && !isNaN(mins)) {
      target.setHours(hours, mins, 0, 0)
    }
  } else {
    // Default to end of day if no time
    target.setHours(23, 59, 59, 0)
  }

  const now = Date.now()
  const diff = target.getTime() - now
  return diff
}

function formatTime(ms: number): string {
  if (ms <= 0) return ''

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`)

  return parts.join(' ')
}

export function CountdownTimer({ saleDate, saleTime }: CountdownTimerProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 60000) // Update every 60 seconds
    return () => clearInterval(interval)
  }, [])

  const remaining = useMemo(
    () => getTimeRemaining(saleDate, saleTime),
    [saleDate, saleTime, now]
  )

  // No sale date
  if (remaining === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" />
        <span>TBD</span>
      </span>
    )
  }

  // Ended
  if (remaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground/60">
        <Clock className="size-3" />
        <span>Ended</span>
      </span>
    )
  }

  // LIVE (less than 1 minute)
  if (remaining < 60000) {
    return (
      <span className="countdown-live inline-flex items-center gap-1 rounded-md border border-emerald-400 bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
        <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
        LIVE
      </span>
    )
  }

  // Less than 1 hour
  if (remaining < 3600000) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
        <Clock className="size-3" />
        <span className="tabular-nums">{formatTime(remaining)}</span>
      </span>
    )
  }

  // Less than 24 hours
  if (remaining < 86400000) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 dark:text-teal-400">
        <Clock className="size-3" />
        <span className="tabular-nums">{formatTime(remaining)}</span>
      </span>
    )
  }

  // More than 24 hours
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="size-3" />
      <span className="tabular-nums">{formatTime(remaining)}</span>
    </span>
  )
}
