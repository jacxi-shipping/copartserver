'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationInfo } from '@/lib/types'

export function PaginationControls({
  pagination,
  page,
  onPageChange,
  label,
}: {
  pagination: PaginationInfo
  page: number
  onPageChange: (p: number) => void
  label?: string
}) {
  if (pagination.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">
        Page {pagination.page} of {pagination.totalPages}{label ? ` • ${label}` : ''} •{' '}
        {pagination.total.toLocaleString()} vehicles
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={!pagination.hasPrevious}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-3 text-xs font-medium">
          {pagination.page} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
