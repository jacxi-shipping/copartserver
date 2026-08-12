import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'DEPRECATED_IMPORT_FLOW',
        message: 'Upload completion is now driven by object storage plus an external worker. Register uploads with POST /api/import instead.',
      },
    },
    { status: 410 },
  )
}
