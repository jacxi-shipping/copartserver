'use client'

import React from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

interface SortableHeaderProps {
  label: string
  field: string
  currentSort: string
  onSort: (field: string) => void
  className?: string
}

export function SortableHeader({ label, field, currentSort, onSort, className }: SortableHeaderProps) {
  const isAsc = currentSort === `${field}_asc`
  const isDesc = currentSort === `${field}_desc`
  const isActive = isAsc || isDesc

  return (
    <TableHead
      className={`sortable-header ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          isAsc ? (
            <ArrowUp className="size-3.5 text-foreground" />
          ) : (
            <ArrowDown className="size-3.5 text-foreground" />
          )
        ) : (
          <ArrowUpDown className="size-3 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  )
}

/**
 * Toggle client-side sort: field_desc -> field_asc -> (remove)
 * New field -> field_desc
 */
export function toggleClientSort(currentSort: string, field: string): string {
  if (currentSort === `${field}_desc`) return `${field}_asc`
  if (currentSort === `${field}_asc`) return ''
  return `${field}_desc`
}

/**
 * Sort an array of items client-side based on a sort string like "field_asc" or "field_desc".
 * Uses a getter function to extract the sort value from each item.
 */
export function applyClientSort<T>(
  items: T[],
  sortStr: string,
  getter: (item: T, field: string) => string | number | null | undefined
): T[] {
  if (!sortStr) return items
  const [field, direction] = sortStr.split('_')
  const dir = direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const va = getter(a, field)
    const vb = getter(b, field)
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir
    }
    return String(va).localeCompare(String(vb)) * dir
  })
}
