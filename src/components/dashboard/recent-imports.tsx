'use client'

import { FileSpreadsheet, Upload, ArrowUpRight, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ImportJob } from '@/lib/types'
import { getRelativeTime } from '@/lib/format'
import { motion } from 'framer-motion'

/* ------------------------------------------------------------------ */
/*  Status badge with animated dot for processing                        */
/* ------------------------------------------------------------------ */

function getStatusBadge(status: string) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; dotColor?: string }> = {
    pending: {
      variant: 'outline',
      className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
      dotColor: 'bg-amber-500',
    },
    processing: {
      variant: 'outline',
      className: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
      dotColor: 'bg-teal-500',
    },
    completed: {
      variant: 'outline',
      className: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      dotColor: 'bg-emerald-500',
    },
    failed: {
      variant: 'destructive',
      className: '',
      dotColor: 'bg-rose-500',
    },
  }
  const config = map[status] || map.pending
  return (
    <span className={`inline-flex items-center gap-1.5 ${config.className ? '' : ''}`}>
      {config.dotColor && (
        <span className={`inline-block size-1.5 rounded-full ${config.dotColor} ${status === 'processing' ? 'animate-pulse' : ''}`} />
      )}
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Mini progress bar for import rows                                    */
/* ------------------------------------------------------------------ */

function ImportProgressBar({ processed, total, status }: { processed: number; total: number; status: string }) {
  if (total === 0) return null
  const pct = Math.min((processed / total) * 100, 100)
  const isComplete = status === 'completed' && pct === 100
  const isFailed = status === 'failed'
  const barColor = isFailed
    ? 'bg-rose-500'
    : isComplete
      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
      : 'bg-gradient-to-r from-teal-400 to-cyan-400'

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted/60">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] tabular-nums text-muted-foreground">
        {processed}/{total}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Enhanced empty state                                               */
/* ------------------------------------------------------------------ */

function EmptyImportState() {
  const { setActiveTab } = useAppStore()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-14 text-center"
    >
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20">
        <Upload className="size-6 text-emerald-500/60 dark:text-emerald-400/50" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        No import jobs yet
      </p>
      <p className="mt-1 text-xs text-muted-foreground/60 max-w-[260px]">
        Upload a CSV file to populate your lot database with vehicle data.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-1.5 text-xs"
        onClick={() => setActiveTab('import')}
      >
        <ArrowUpRight className="size-3.5" />
        Go to Import
      </Button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function RecentImportsTable({
  imports,
  loading,
}: {
  imports: ImportJob[]
  loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/30">
                <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-base">Recent Imports</CardTitle>
                <div className="mt-0.5 h-[2px] w-10 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
            </div>
            {imports.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {imports.length} jobs
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="hidden sm:block h-4 w-16" />
                  <Skeleton className="hidden md:block h-4 w-24" />
                </div>
              ))}
            </div>
          ) : imports.length === 0 ? (
            <EmptyImportState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Progress</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((job) => (
                  <TableRow
                    key={job.id}
                    className="group/row transition-all duration-150 hover:bg-muted/30 hover:border-l-2 hover:border-l-emerald-500"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-3.5 text-muted-foreground/50 shrink-0" />
                        <span className="truncate max-w-[180px]" title={job.filename}>
                          {job.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <ImportProgressBar
                        processed={job.processedRows}
                        total={job.totalRows}
                        status={job.status}
                      />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <RotateCcw className="size-3 text-muted-foreground/40" />
                        {getRelativeTime(new Date(job.createdAt).getTime())}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
