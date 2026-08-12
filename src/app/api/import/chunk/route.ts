import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import busboy from 'busboy'
import { getImportChunkMetaPath, getImportChunkPath, getImportStoragePaths, isValidUploadId } from '@/lib/import-storage'

export const dynamic = 'force-dynamic'

// Chunked upload endpoint — each request carries one ~5 MB chunk via FormData.
// Query params:  uploadId, chunkIndex, totalChunks, filename

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const uploadId = searchParams.get('uploadId')
    const chunkIndex = parseInt(searchParams.get('chunkIndex') || '0', 10)
    const totalChunks = parseInt(searchParams.get('totalChunks') || '0', 10)
    const filename = searchParams.get('filename') || 'upload.csv'

    if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks) || totalChunks < 1) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'Missing required upload parameters' } },
        { status: 400 },
      )
    }

    // Validate uploadId format to prevent path traversal
    if (!isValidUploadId(uploadId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_PARAMS', message: 'Invalid upload ID' } },
        { status: 400 },
      )
    }

    const { chunksDir: chunkDir } = getImportStoragePaths()
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true })
    }

    const chunkPath = getImportChunkPath(uploadId, chunkIndex)

    // Parse multipart FormData via busboy (same pattern as working preview endpoint)
    await new Promise<void>((resolve, reject) => {
      const headers = Object.fromEntries(request.headers.entries())
      const bb = busboy({ headers, limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB per chunk

      bb.on('file', (_fieldname, file, _info) => {
        const writeStream = fs.createWriteStream(chunkPath)
        file.pipe(writeStream)
        writeStream.on('error', reject)
        writeStream.on('finish', () => resolve())
      })

      bb.on('error', reject)

      if (!request.body) { reject(new Error('No request body')); return }

      const reader = request.body.getReader()
      function pump(): void {
        reader.read().then(({ done, value }) => {
          if (done) { bb.end(); return }
          bb.write(Buffer.from(value), (err: Error | null) => {
            if (err) { reject(err); return }
            pump()
          })
        }).catch(reject)
      }
      pump()
    })

    // Save metadata on first chunk
    if (chunkIndex === 0) {
      const metaPath = getImportChunkMetaPath(uploadId)
      fs.writeFileSync(metaPath, JSON.stringify({
        uploadId,
        filename,
        totalChunks,
        createdAt: new Date().toISOString(),
      }))
    }

    return NextResponse.json({
      success: true,
      data: { chunkIndex, totalChunks, uploadId },
    })
  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'CHUNK_ERROR', message: error instanceof Error ? error.message : 'Chunk upload failed' } },
      { status: 500 },
    )
  }
}

// GET: check if a previous upload session exists (for resume)
export async function GET(request: NextRequest) {
  try {
    const uploadId = request.nextUrl.searchParams.get('uploadId')
    if (!uploadId) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_ID', message: 'uploadId required' } }, { status: 400 })
    }

    const { chunksDir: chunkDir } = getImportStoragePaths()
    const metaPath = getImportChunkMetaPath(uploadId)

    if (!fs.existsSync(metaPath)) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Upload session not found' } }, { status: 404 })
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))

    // Count existing chunks
    const existingChunks: number[] = []
    const files = fs.readdirSync(chunkDir)
    for (const f of files) {
      if (f.startsWith(`${uploadId}_`) && f.endsWith('.part')) {
        const idx = parseInt(f.replace(`${uploadId}_`, '').replace('.part', ''), 10)
        if (!isNaN(idx)) existingChunks.push(idx)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...meta,
        uploadedChunks: existingChunks.sort((a, b) => a - b),
        completedChunks: existingChunks.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to check upload status' } },
      { status: 500 },
    )
  }
}
