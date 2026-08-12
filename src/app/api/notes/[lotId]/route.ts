import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

    const notes = await db.lotNote.findMany({
      where: { lotId: numLotId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: notes })
  } catch (error) {
    console.error('Notes GET API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notes' } },
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
    const { content } = body as { content?: string }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CONTENT', message: 'Note content is required (1-2000 characters)' } },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { success: false, error: { code: 'CONTENT_TOO_LONG', message: 'Note content must be 2000 characters or less' } },
        { status: 400 }
      )
    }

    const note = await db.lotNote.create({
      data: { lotId: numLotId, content: content.trim() },
    })

    return NextResponse.json({ success: true, data: note }, { status: 201 })
  } catch (error) {
    console.error('Notes POST API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create note' } },
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
    const { id } = body as { id?: string }

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_NOTE_ID', message: 'Note ID is required' } },
        { status: 400 }
      )
    }

    // Validate the note belongs to this lotId
    const existing = await db.lotNote.findUnique({ where: { id } })
    if (!existing || existing.lotId !== numLotId) {
      return NextResponse.json(
        { success: false, error: { code: 'NOTE_NOT_FOUND', message: 'Note not found for this lot' } },
        { status: 404 }
      )
    }

    await db.lotNote.delete({ where: { id } })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Notes DELETE API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete note' } },
      { status: 500 }
    )
  }
}
