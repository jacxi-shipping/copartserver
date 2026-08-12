import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    let page = parseInt(searchParams.get('page') || '1', 10)
    if (isNaN(page) || page < 1) page = 1
    let pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    if (isNaN(pageSize) || pageSize < 1) pageSize = 20
    if (pageSize > 100) pageSize = 100
    const skip = (page - 1) * pageSize

    const [jobs, total] = await Promise.all([
      db.importJob.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      db.importJob.count(),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      success: true,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 },
      data: jobs,
    })
  } catch (error) {
    console.error('Import jobs list API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch import jobs' } },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filename, fileSize, storageUrl, storageKey } = body as {
      filename?: string
      fileSize?: number
      storageUrl?: string
      storageKey?: string
    }

    if (!filename || typeof filename !== 'string' || !filename.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV files are supported' } },
        { status: 400 },
      )
    }

    if (!storageUrl || typeof storageUrl !== 'string' || !storageKey || typeof storageKey !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_UPLOAD', message: 'Uploaded blob metadata is required' } },
        { status: 400 },
      )
    }

    const job = await db.importJob.create({
      data: {
        filename,
        fileSize: typeof fileSize === 'number' ? Math.round(fileSize) : null,
        storageUrl,
        storageKey,
        status: 'queued',
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Upload registered. Process this job with `npm run import:worker` from a worker environment.',
      },
    })
  } catch (error) {
    console.error('Import POST API error:', error)
    const msg = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: msg } },
      { status: 500 },
    )
  }
}
