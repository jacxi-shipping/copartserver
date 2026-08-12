import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function deprecatedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'DEPRECATED_IMPORT_FLOW',
        message: 'Chunk uploads were removed. Upload CSV files directly to object storage and register the blob with POST /api/import.',
      },
    },
    { status: 410 },
  )
}

export async function POST(_request: NextRequest) {
  return deprecatedResponse()
}

export async function GET(_request: NextRequest) {
  return deprecatedResponse()
}
