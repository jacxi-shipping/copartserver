import { NextRequest, NextResponse } from 'next/server'
import { analyzeCSV } from '@/lib/csv-processor'
import { getImportPreviewPath, getImportStoragePaths, isCsvFilename } from '@/lib/import-storage'
import fs from 'fs'
import busboy from 'busboy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { dataDir } = getImportStoragePaths()
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

    const tmpPath = getImportPreviewPath(`preview_${Date.now()}.csv`)
    const actualFilename: { value: string } = { value: 'preview.csv' }

    // Stream file to disk
    await new Promise<void>((resolve, reject) => {
      const headers = Object.fromEntries(request.headers.entries())
      const bb = busboy({ headers, limits: { fileSize: 500 * 1024 * 1024 } })

      bb.on('file', (_fieldname, file, info) => {
        actualFilename.value = info.filename
        file.pipe(fs.createWriteStream(tmpPath))
          .on('error', reject)
          .on('finish', () => resolve())
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

    if (!isCsvFilename(actualFilename.value)) {
      try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV files are supported' } },
        { status: 400 },
      )
    }

    // Read first ~64KB for preview analysis
    const fileContent = fs.readFileSync(tmpPath, 'utf-8').slice(0, 65536)
    try { fs.unlinkSync(tmpPath) } catch { /* ignore */ }

    const analysis = analyzeCSV(fileContent)

    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error('Import preview API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Preview analysis failed' } },
      { status: 500 },
    )
  }
}
