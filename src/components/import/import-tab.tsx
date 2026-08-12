'use client'

import { upload } from '@vercel/blob/client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  CheckCircle,
  Loader2,
  Clock,
  X,
  ChevronDown,
  ChevronRight,
  Database,
  BarChart3,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ImportJob } from '@/lib/types'
import { formatFileSize } from '@/lib/format'

function mapImportJob(job: Record<string, unknown>): ImportJob {
  return {
    id: String(job.id),
    filename: String(job.filename ?? ''),
    fileSize: typeof job.fileSize === 'number' ? job.fileSize : typeof job.file_size === 'number' ? job.file_size : null,
    status: String(job.status ?? 'pending'),
    startedAt: typeof job.startedAt === 'string' ? job.startedAt : typeof job.started_at === 'string' ? job.started_at : null,
    completedAt: typeof job.completedAt === 'string' ? job.completedAt : typeof job.completed_at === 'string' ? job.completed_at : null,
    totalRows: Number(job.totalRows ?? job.total_rows ?? 0),
    processedRows: Number(job.processedRows ?? job.processed_rows ?? 0),
    insertedRows: Number(job.insertedRows ?? job.inserted_rows ?? 0),
    updatedRows: Number(job.updatedRows ?? job.updated_rows ?? 0),
    skippedRows: Number(job.skippedRows ?? job.skipped_rows ?? 0),
    failedRows: Number(job.failedRows ?? job.failed_rows ?? 0),
    errorMessage: typeof job.errorMessage === 'string' ? job.errorMessage : typeof job.error_message === 'string' ? job.error_message : null,
    createdAt: String(job.createdAt ?? job.created_at ?? ''),
    updatedAt: String(job.updatedAt ?? job.updated_at ?? ''),
  }
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2 },
}

// ─── Upload Phase ──────────────────────────────────────────────────────────

type UploadPhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s remaining`
  return `${Math.ceil(seconds / 60)}m ${Math.ceil(seconds % 60)}s remaining`
}

// ─── Progress Bar Component ───────────────────────────────────────────────

function UploadProgressBar({
  phase,
  progress,
  loaded,
  total,
  speed,
  eta,
}: {
  phase: UploadPhase
  progress: number
  loaded: number
  total: number
  speed: number
  eta: number
}) {
  if (phase === 'idle' || phase === 'done') return null

  const isUploading = phase === 'uploading'
  const isProcessing = phase === 'processing'
  const isError = phase === 'error'

  const barColor = isError
    ? 'bg-red-500'
    : isProcessing
      ? 'bg-amber-500'
      : 'bg-gradient-to-r from-emerald-500 to-teal-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-xl border bg-card p-5 shadow-sm"
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {isError ? (
            <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/30">
              <AlertCircle className="size-4 text-red-600 dark:text-red-400" />
            </div>
          ) : isProcessing ? (
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/30">
              <Loader2 className="size-4 animate-spin text-amber-600 dark:text-amber-400" />
            </div>
          ) : (
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
              <Upload className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold">
              {isError
                ? 'Upload Failed'
                : isProcessing
                  ? 'Processing CSV...'
                  : 'Uploading...'}
              {!isError && !isProcessing && total > 0 && (
                <span className='ml-1.5 text-xs font-normal text-muted-foreground'>
                  ({Math.ceil(loaded / (5 * 1024 * 1024))}/{Math.ceil(total / (5 * 1024 * 1024))} chunks)
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {isError
                ? 'An error occurred during upload'
                : isProcessing
                  ? total > 0 && loaded > 0
                    ? `${loaded.toLocaleString()} of ${total.toLocaleString()} rows processed`
                    : 'Parsing data and inserting records'
                  : `${formatBytes(loaded)} of ${formatBytes(total)}`}
            </p>
          </div>
        </div>
        {isUploading && speed > 0 && (
          <div className="text-right">
            <p className="text-xs font-medium tabular-nums text-muted-foreground">
              {formatSpeed(speed)}
            </p>
            {eta > 0 && eta < 3600 && (
              <p className="text-[11px] tabular-nums text-muted-foreground/70">
                {formatETA(eta)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        {/* Striped animation overlay */}
        {!isError && (
          <div
            className="absolute inset-y-0 left-0 rounded-full opacity-30"
            style={{
              width: `${progress}%`,
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
              backgroundSize: '1rem 1rem',
              animation: 'progress-stripes 0.5s linear infinite',
            }}
          />
        )}
      </div>

      {/* Percentage label */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted-foreground">
          {isProcessing
            ? total > 0 && loaded > 0
              ? `${progress.toFixed(1)}% (${loaded.toLocaleString()} / ${total.toLocaleString()} rows)`
              : 'Processing on server...'
            : `${progress.toFixed(1)}%`}
        </span>
        {isUploading && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatBytes(loaded)} / {formatBytes(total)}
          </span>
        )}
      </div>

      {/* Processing animation dots */}
      {isProcessing && (
        <div className="mt-2 flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="size-1.5 rounded-full bg-amber-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          <span className="ml-1 text-xs text-muted-foreground">
            Large files may take a few minutes
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Import Tab Component ────────────────────────────────────────────────────

export function ImportTab() {
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [imports, setImports] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(true)
  const [previewData, setPreviewData] = useState<string[][] | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload progress state
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadLoaded, setUploadLoaded] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [uploadETA, setUploadETA] = useState(0)
  const uploadStartTimeRef = useRef(0)
  const cancelledRef = useRef(false)

  const fetchImports = useCallback(async () => {
    try {
      const res = await fetch('/api/import?page=1&pageSize=100')
      if (res.ok) {
        const data = await res.json()
        setImports((data.data ?? []).map(mapImportJob))
      }
    } catch {
      // API not available
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchImports()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchImports])

  // Auto-dismiss upload success overlay
  useEffect(() => {
    if (uploadSuccess) {
      const timer = setTimeout(() => setUploadSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [uploadSuccess])

  const toggleExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetUpload = useCallback(() => {
    // Signal cancellation to the upload loop
    cancelledRef.current = true
    setUploadPhase('idle')
    setUploadProgress(0)
    setUploadLoaded(0)
    setUploadTotal(0)
    setUploadSpeed(0)
    setUploadETA(0)
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (uploadPhase !== 'idle' && uploadPhase !== 'done' && uploadPhase !== 'error') return
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      setFile(droppedFile)
      handlePreview(droppedFile)
    } else {
      toast.error('Please upload a CSV file')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      handlePreview(selectedFile)
    }
  }

  const handlePreview = async (csvFile: File) => {
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        const preview = data.data
        const headers = preview?.detectedColumns ?? []
        const rows = preview?.sampleRows ?? []
        setPreviewData([headers, ...rows.map((row: Record<string, unknown>) => headers.map((header: string) => String(row[header] ?? '')))])
      }
    } catch {
      setPreviewData(null)
    }
  }

  const handleUpload = useCallback(async () => {
    if (!file) return

    // Reset progress
    resetUpload()
    cancelledRef.current = false
    setUploadPhase('uploading')
    uploadStartTimeRef.current = Date.now()
    setUploadTotal(file.size)
    setUploadLoaded(0)
    setUploadProgress(0)

    try {
      if (cancelledRef.current) {
        setUploadPhase('idle')
        return
      }

      const uploadedBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/import/upload',
        onUploadProgress: ({ loaded, total, percentage }) => {
          if (cancelledRef.current) return
          const elapsedSeconds = Math.max((Date.now() - uploadStartTimeRef.current) / 1000, 1)
          const bytesPerSecond = loaded / elapsedSeconds
          setUploadLoaded(loaded)
          setUploadTotal(total)
          setUploadProgress(percentage)
          setUploadSpeed(bytesPerSecond)
          setUploadETA(total > loaded && bytesPerSecond > 0 ? (total - loaded) / bytesPerSecond : 0)
        },
      })

      const completeRes = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          storageUrl: uploadedBlob.url,
          storageKey: uploadedBlob.pathname,
        }),
      })

      setUploadLoaded(file.size)
      setUploadProgress(100)
      setUploadPhase('processing')

      let completeData: { success?: boolean; data?: { jobId?: string; status?: string }; error?: { message?: string } }
      try {
        completeData = await completeRes.json()
      } catch {
        setUploadPhase('error')
        toast.error('Upload failed', { description: 'Could not reach server. Please try again.' })
        return
      }

      if (!completeRes.ok || !completeData.success) {
        setUploadPhase('error')
        toast.error('Import failed', {
          description: completeData?.error?.message || 'Server error during processing',
        })
        return
      }

      // Server returned a jobId — poll for completion
      const jobId = completeData.data?.jobId
      if (!jobId) {
        setUploadPhase('error')
        toast.error('Import failed', { description: 'No job ID returned from server' })
        return
      }

      // Poll GET /api/import/[jobId] every 2 seconds until done/failed
      const pollInterval = 2000
      const maxPollTime = 10 * 60 * 1000 // 10 minutes max
      const pollStart = Date.now()

      await new Promise<void>((resolvePoll) => {
        const poll = async () => {
          if (cancelledRef.current) {
            setUploadPhase('idle')
            resolvePoll()
            return
          }

          try {
            const jobRes = await fetch(`/api/import/${jobId}`)
            const jobData = await jobRes.json()
            const job = jobData?.data ? mapImportJob(jobData.data) : null

            if (!job) {
              setUploadPhase('error')
              toast.error('Import failed', { description: 'Could not read job status' })
              resolvePoll()
              return
            }

            // Update processing progress from job stats
            if (job.totalRows > 0) {
              const processedPct = Math.min(100, (job.processedRows / job.totalRows) * 100)
              setUploadProgress(processedPct)
              setUploadLoaded(job.processedRows)
              setUploadTotal(job.totalRows)
            }

            if (job.status === 'completed') {
              setUploadPhase('done')
              toast.success('Import complete!', {
                description: `${file.name}: ${job.insertedRows ?? 0} inserted, ${job.updatedRows ?? 0} updated, ${job.skippedRows ?? 0} skipped, ${job.failedRows ?? 0} failed`,
              })
              setFile(null)
              setPreviewData(null)
              setUploadSuccess(true)
              fetchImports()
              resolvePoll()
              return
            }

            if (job.status === 'failed') {
              setUploadPhase('error')
              toast.error('Import failed', { description: job.errorMessage || 'Processing error' })
              resolvePoll()
              return
            }

            if (job.status === 'queued') {
              setUploadPhase('processing')
            }

            // Still processing — check timeout
            if (Date.now() - pollStart > maxPollTime) {
              setUploadPhase('error')
              toast.error('Import timeout', { description: 'Processing is taking too long. Check Import History for results.' })
              fetchImports()
              resolvePoll()
              return
            }

            // Poll again
            setTimeout(poll, pollInterval)
          } catch {
            // Network error on poll — retry
            setTimeout(poll, pollInterval)
          }
        }

        setTimeout(poll, pollInterval)
      })
    } catch (err) {
      if (cancelledRef.current) {
        setUploadPhase('idle')
        return
      }
      setUploadPhase('error')
      toast.error('Upload failed', { description: err instanceof Error ? err.message : 'Network error. Please try again.' })
    }
  }, [file, resetUpload, fetchImports])

  const isUploading = uploadPhase === 'uploading' || uploadPhase === 'processing'

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="size-4 text-emerald-500" />
      case 'failed': return <AlertCircle className="size-4 text-red-500" />
      case 'processing': return <Loader2 className="size-4 animate-spin text-teal-500" />
      default: return <Clock className="size-4 text-amber-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
      processing: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
      completed: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
      failed: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    }
    return (
      <Badge variant="outline" className={map[status] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getDuration = (started: string | null, completed: string | null): string => {
    if (!started || !completed) return ''
    const ms = new Date(completed).getTime() - new Date(started).getTime()
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  // ─── Computed stats ────────────────────────────────────────────────────
  const totalImports = imports.length
  const totalRows = imports.reduce((sum, j) => sum + j.totalRows, 0)
  const totalProcessed = imports.reduce((sum, j) => sum + j.processedRows, 0)
  const completedJobs = imports.filter((j) => j.status === 'completed')
  const successRate = totalImports > 0 ? Math.round((completedJobs.length / totalImports) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Import Data</h2>
        <p className="text-sm text-muted-foreground">Upload CSV files containing lot data.</p>
      </div>

      {/* ─── Import Stats Cards ──────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <Database className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Imports</p>
                <p className="text-lg font-bold tabular-nums">{totalImports}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <BarChart3 className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Rows</p>
                <p className="text-lg font-bold tabular-nums">{totalRows.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <TrendingUp className="size-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Success Rate</p>
                <p className="text-lg font-bold tabular-nums">{successRate}%</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Upload Progress Bar ─────────────────────────────────────── */}
      <AnimatePresence>
        {(uploadPhase === 'uploading' || uploadPhase === 'processing' || uploadPhase === 'error') && (
          <UploadProgressBar
            phase={uploadPhase}
            progress={uploadProgress}
            loaded={uploadLoaded}
            total={uploadTotal}
            speed={uploadSpeed}
            eta={uploadETA}
          />
        )}
      </AnimatePresence>

      {/* ─── Upload Success Animation ─────────────────────────────────── */}
      <AnimatePresence>
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-emerald-500/95 px-8 py-6 shadow-2xl backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
              >
                <CheckCircle className="size-12 text-white" strokeWidth={2.5} />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-base font-semibold text-white"
              >
                Upload Complete!
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Zone */}
      <motion.div {...scaleIn}>
        <div
          className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-300 ${
            dragOver
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.02] shadow-lg shadow-emerald-500/10'
              : file
                ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10'
                : isUploading
                  ? 'border-muted-foreground/20 bg-muted/20 cursor-not-allowed opacity-60'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
          }`}
          onDragOver={(e) => {
            if (isUploading) return
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { if (!isUploading) handleDrop(e) }}
          onClick={() => { if (!isUploading) fileInputRef.current?.click() }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          {file ? (
            <>
              <FileSpreadsheet className="mb-3 size-10 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-medium">{file.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatFileSize(file.size)} — Click or drop to replace
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  className=""
                  size="sm"
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpload()
                  }}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 size-4" />
                  )}
                  {isUploading
                    ? uploadPhase === 'processing'
                      ? 'Processing...'
                      : 'Uploading...'
                    : 'Upload File'}
                </Button>
                {isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      resetUpload()
                    }}
                  >
                    <X className="mr-1.5 size-3.5" />
                    Cancel
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Upload className="mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Drop a CSV file here, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports .csv files up to 500 MB
              </p>
            </>
          )}
        </div>

        {/* File type info */}
        <div className="mt-3 rounded-lg bg-muted/30 px-4 py-3">
          <div className="flex items-start gap-2">
            <FileText className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Supported columns: Lot Number, Year, Make, Model, VIN, Sale Date, Sale Status, Location, Estimated Retail Value, Odometer, Damage Description, Fuel Type, Transmission, Drive, Body Style, Color, Engine, Cylinders, Has Keys, Runs & Drives, Repair Cost, Buy It Now Price, Sale Title State, Sale Title Type, Yard Name, Yard Number, AutoGrade
            </p>
          </div>
        </div>
      </motion.div>

      {/* Preview */}
      {previewData && previewData.length > 0 && (
        <motion.div {...fadeIn}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">File Preview</CardTitle>
                  <CardDescription>Showing first {previewData.length} rows</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => setPreviewData(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewData[0]?.map((header, i) => (
                        <TableHead key={i} className="text-xs">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(1, 6).map((row, ri) => (
                      <TableRow key={ri}>
                        {row.map((cell, ci) => (
                          <TableCell key={ci} className="text-xs">{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Import History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Import History</CardTitle>
          <CardDescription>All import jobs with detailed statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileSpreadsheet className="mb-2 size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No imports yet. Upload a CSV to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {imports.map((job) => {
                const isExpanded = expandedRows.has(job.id)
                return (
                  <div key={job.id} className="rounded-lg border transition-colors hover:bg-muted/30">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(job.id)}
                      className="flex w-full items-start gap-3 p-4 text-left"
                    >
                      <div className="mt-0.5 shrink-0">{getStatusIcon(job.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{job.filename}</p>
                          {getStatusBadge(job.status)}
                          {job.fileSize != null && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(job.fileSize)}</span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{new Date(job.createdAt).toLocaleString()}</span>
                          {job.startedAt && (
                            <span>Duration: {getDuration(job.startedAt, job.completedAt) || 'In progress...'}</span>
                          )}
                        </div>
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0 mt-1"
                      >
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t bg-muted/20 px-4 py-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Created</p>
                                <p className="text-xs">{new Date(job.createdAt).toLocaleString()}</p>
                              </div>
                              {job.startedAt && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Started</p>
                                  <p className="text-xs">{new Date(job.startedAt).toLocaleString()}</p>
                                </div>
                              )}
                              {job.completedAt && (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Completed</p>
                                  <p className="text-xs">{new Date(job.completedAt).toLocaleString()}</p>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                              <div className="rounded-md bg-background px-2.5 py-2 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                                <p className="text-sm font-bold tabular-nums">{job.totalRows.toLocaleString()}</p>
                              </div>
                              <div className="rounded-md bg-background px-2.5 py-2 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Inserted</p>
                                <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{job.insertedRows.toLocaleString()}</p>
                              </div>
                              <div className="rounded-md bg-background px-2.5 py-2 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Updated</p>
                                <p className="text-sm font-bold tabular-nums text-teal-600 dark:text-teal-400">{job.updatedRows.toLocaleString()}</p>
                              </div>
                              <div className="rounded-md bg-background px-2.5 py-2 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Skipped</p>
                                <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">{job.skippedRows.toLocaleString()}</p>
                              </div>
                              <div className="rounded-md bg-background px-2.5 py-2 text-center">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Failed</p>
                                <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">{job.failedRows.toLocaleString()}</p>
                              </div>
                            </div>

                            {job.errorMessage && (
                              <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-3 py-2">
                                <p className="text-xs text-red-700 dark:text-red-400 flex items-start gap-1.5">
                                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                                  {job.errorMessage}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
