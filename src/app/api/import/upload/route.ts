import { put } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData()
      const file = formData.get('file')

      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_FILE',
              message: 'A CSV file is required',
            },
          },
          { status: 400 },
        )
      }

      if (!file.name.toLowerCase().endsWith('.csv')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_FILE_TYPE',
              message: 'Only CSV uploads are supported',
            },
          },
          { status: 400 },
        )
      }

      const blob = await put(file.name, file, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || 'text/csv',
      })

      return NextResponse.json({
        success: true,
        data: {
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          contentDisposition: blob.contentDisposition,
        },
      })
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BLOB_SERVER_UPLOAD_ERROR',
            message: error instanceof Error ? error.message : 'Failed to upload file to blob storage',
          },
        },
        { status: 400 },
      )
    }
  }

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