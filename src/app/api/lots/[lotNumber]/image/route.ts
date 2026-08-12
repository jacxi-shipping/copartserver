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
  if (!/^\d+$/.test(lotNumber)) return NextResponse.json({ error: 'Invalid lot number' }, { status: 400 })

  const country = request.nextUrl.searchParams.get('country') === 'ca' ? 'ca' : 'us'
  try {
    const response = await fetch(`https://inventoryv2.copart.io/v1/lotImages/${lotNumber}?country=${country}&brand=cprt`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!response.ok) return new NextResponse(null, { status: 404 })

    const payload = await response.json() as CopartImageResponse
    const links = payload.lotImages?.[0]?.link ?? []
    const image = links.find((link) => link.url && !link.isThumbNail && !link.isBlurred && !link.isEngineSound)
    if (!image?.url) return new NextResponse(null, { status: 404 })

    return NextResponse.redirect(image.url.trim())
  } catch (error) {
    console.error('Lot image resolver error:', error)
    return new NextResponse(null, { status: 502 })
  }
}