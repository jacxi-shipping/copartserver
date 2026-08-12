import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const VALID_COLORS = ['emerald', 'amber', 'rose', 'sky', 'violet', 'orange', 'teal', 'slate'] as const

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params
    const numLotId = Number(lotId)
    if (isNaN(numLotId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LOT_ID', message: 'Invalid lot ID' } },
        { status: 400 }
      )
    }

    const tags = await db.lotTag.findMany({
      where: { lotId: numLotId },
    })

    return NextResponse.json({ success: true, data: tags })
  } catch (error) {
    console.error('Tags GET API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch tags' } },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params
    const numLotId = Number(lotId)
    if (isNaN(numLotId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LOT_ID', message: 'Invalid lot ID' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { tag, color } = body as { tag?: string; color?: string }

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TAG', message: 'Tag is required (1-30 characters)' } },
        { status: 400 }
      )
    }

    if (tag.trim().length > 30) {
      return NextResponse.json(
        { success: false, error: { code: 'TAG_TOO_LONG', message: 'Tag must be 30 characters or less' } },
        { status: 400 }
      )
    }

    const normalizedTag = tag.trim()
    const normalizedColor = VALID_COLORS.includes((color || 'emerald') as typeof VALID_COLORS[number])
      ? (color || 'emerald')
      : 'emerald'

    const lotTag = await db.lotTag.upsert({
      where: { lotId_tag: { lotId: numLotId, tag: normalizedTag } },
      create: { lotId: numLotId, tag: normalizedTag, color: normalizedColor },
      update: { color: normalizedColor },
    })

    return NextResponse.json({ success: true, data: lotTag }, { status: 201 })
  } catch (error) {
    console.error('Tags POST API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add tag' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params
    const numLotId = Number(lotId)
    if (isNaN(numLotId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_LOT_ID', message: 'Invalid lot ID' } },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { tag } = body as { tag?: string }

    if (!tag || typeof tag !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TAG', message: 'Tag name is required' } },
        { status: 400 }
      )
    }

    await db.lotTag.delete({
      where: { lotId_tag: { lotId: numLotId, tag: tag.trim() } },
    })

    return NextResponse.json({ success: true, data: { lotId: numLotId, tag: tag.trim() } })
  } catch (error) {
    console.error('Tags DELETE API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove tag' } },
      { status: 500 }
    )
  }
}
