import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.toLowerCase().endsWith('.csv')) {
          throw new Error('Only CSV uploads are supported')
        }

        return {
          allowedContentTypes: ['text/csv', 'application/vnd.ms-excel', 'application/csv'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ pathname }),
        }
      },
      onUploadCompleted: async () => {
        return
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'BLOB_UPLOAD_ERROR',
          message: error instanceof Error ? error.message : 'Failed to prepare blob upload',
        },
      },
      { status: 400 },
    )
  }
}