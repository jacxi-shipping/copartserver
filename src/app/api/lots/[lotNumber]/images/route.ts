import { NextRequest, NextResponse } from 'next/server'

interface CopartImageLink {
  url?: string
  isThumbNail?: boolean
  isBlurred?: boolean
  isEngineSound?: boolean
}

interface CopartImageResponse {
  lotImages?: Array<{ link?: CopartImageLink[] }>
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ lotNumber: string }> }) {
  const { lotNumber } = await params
  if (!/^\d+$/.test(lotNumber)) return NextResponse.json({ success: false, error: { code: 'INVALID_LOT_NUMBER', message: 'A numeric lot number is required' } }, { status: 400 })

  const country = request.nextUrl.searchParams.get('country') === 'ca' ? 'ca' : 'us'
  try {
    const response = await fetch(`https://inventoryv2.copart.io/v1/lotImages/${lotNumber}?country=${country}&brand=cprt`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return NextResponse.json({ success: true, data: [] })

    const payload = await response.json() as CopartImageResponse
    const images = (payload.lotImages ?? []).flatMap((image) => image.link ?? [])
      .filter((link) => link.url && !link.isThumbNail && !link.isBlurred && !link.isEngineSound)
      .map((link) => link.url!.trim())
    return NextResponse.json({ success: true, data: [...new Set(images)] })
  } catch (error) {
    console.error('Lot gallery API error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}