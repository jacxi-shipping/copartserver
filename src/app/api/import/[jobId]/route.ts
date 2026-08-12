import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const job = await db.importJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json(
        { success: false, error: { code: 'JOB_NOT_FOUND', message: `Import job ${jobId} was not found` } },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: job })
  } catch (error) {
    console.error('Import job detail API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch import job' } },
      { status: 500 }
    )
  }
}
