import { NextRequest, NextResponse } from 'next/server'
import { analyzeCSV } from '@/lib/csv-processor'
import { isCsvFilename } from '@/lib/import-validation'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const uploadedFile = formData.get('file')

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE', message: 'A CSV file is required' } },
        { status: 400 },
      )
    }

    if (!isCsvFilename(uploadedFile.name)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FILE_TYPE', message: 'Only CSV files are supported' } },
        { status: 400 },
      )
    }

    const fileContent = await uploadedFile.slice(0, 65536).text()

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
