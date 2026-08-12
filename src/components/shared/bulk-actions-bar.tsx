'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  CheckSquare,
  X,
  Heart,
  Download,
  GitCompare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'

interface BulkActionsBarProps {
  currentIds: number[]
  totalAvailable?: number
}

export function BulkActionsBar({ currentIds, totalAvailable }: BulkActionsBarProps) {
  const {
    bulkSelected,
    setBulkSelected,
    toggleBulkSelect,
    selectAll,
    clearBulkSelection,
    isInBulkSelected,
    addManyToWatchlist,
    addActivity,
  } = useAppStore()

  const selectedCount = bulkSelected.length
  const isAllSelected = currentIds.length > 0 && currentIds.every((id) => isInBulkSelected(id))
  const isIndeterminate = selectedCount > 0 && !isAllSelected

  const handleSelectAll = () => {
    if (isAllSelected) {
      clearBulkSelection()
    } else {
      selectAll(currentIds)
      addActivity({
        type: 'bulk_select',
        icon: 'check-square',
        label: `Selected all ${currentIds.length} vehicles`,
        description: 'Select all on current page',
      })
    }
  }

  const handleBulkWatchlist = () => {
    if (selectedCount === 0) return
    const ids = [...bulkSelected]
    addManyToWatchlist(ids)
    clearBulkSelection()
  }

  const handleBulkCompare = () => {
    if (selectedCount === 0) return
    if (selectedCount > 3) {
      toast.error('Compare limit reached', {
        description: 'You can compare up to 3 vehicles at a time.',
      })
      return
    }
    // Add to compare
    const store = useAppStore.getState()
    for (const id of bulkSelected) {
      if (!store.isInCompare(id) && store.compareList.length < 3) {
        store.toggleCompare(id)
      }
    }
    toast.success(`Added ${bulkSelected.length} vehicles to comparison`)
    clearBulkSelection()
  }

  const handleBulkExport = async () => {
    if (selectedCount === 0) return
    try {
      const params = new URLSearchParams()
      params.set('ids', bulkSelected.join(','))
      params.set('format', 'csv')
      const res = await fetch(`/api/export?${params.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `copart_bulk_export_${Date.now()}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success(`Exported ${bulkSelected.length} vehicles`)
        addActivity({
          type: 'bulk_export',
          icon: 'download',
          label: `Bulk exported ${bulkSelected.length} vehicles`,
          description: 'CSV download',
        })
      }
    } catch {
      toast.error('Export failed')
    }
    clearBulkSelection()
  }

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            {/* Select all checkbox */}
            <button
              onClick={handleSelectAll}
              className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                isAllSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isIndeterminate
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
              }`}
              aria-label={isAllSelected ? 'Deselect all' : 'Select all'}
            >
              {isAllSelected ? (
                <CheckSquare className="size-3.5" />
              ) : isIndeterminate ? (
                <div className="size-2 rounded-sm bg-primary" />
              ) : (
                <Square className="size-3" />
              )}
            </button>

            {/* Count badge */}
            <Badge variant="secondary" className="tabular-nums text-xs">
              {selectedCount} selected
            </Badge>

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* Actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleBulkWatchlist}
            >
              <Heart className="size-3.5" />
              <span className="hidden sm:inline">Watchlist</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleBulkCompare}
            >
              <GitCompare className="size-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleBulkExport}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearBulkSelection}
            >
              <X className="mr-1 size-3" />
              Clear
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Checkbox for rows ─────────────────────────────────────────────────────────

export function BulkCheckbox({ id }: { id: number }) {
  const { bulkSelected, toggleBulkSelect, isInBulkSelected } = useAppStore()
  const checked = isInBulkSelected(id)

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleBulkSelect(id)
      }}
      className={`flex size-6 shrink-0 items-center justify-center rounded-md border transition-all duration-150 ${
        checked
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border hover:border-primary/50 hover:bg-accent'
      }`}
      aria-label={checked ? 'Deselect vehicle' : 'Select vehicle'}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <CheckSquare className="size-3" />}
    </button>
  )
}
