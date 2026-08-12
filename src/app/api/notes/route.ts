import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const notesWithLots = await db.lotNote.findMany({
      distinct: ['lotId'],
      select: { lotId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get note counts per lotId
    const lotIds = notesWithLots.map((n) => n.lotId)

    const countMap: Record<number, number> = {}
    if (lotIds.length > 0) {
      const counts = await db.lotNote.groupBy({
        by: ['lotId'],
        _count: { id: true },
        where: { lotId: { in: lotIds } },
      })
      for (const c of counts) {
        countMap[c.lotId] = c._count.id
      }
    }

    // Fetch basic auction info for each lotId
    const auctions = lotIds.length > 0
      ? await db.lot.findMany({
          where: { id: { in: lotIds } },
          select: {
            id: true,
            lotNumber: true,
            year: true,
            make: true,
            modelGroup: true,
            estimatedRetailValue: true,
          },
        })
      : []

    const auctionMap = new Map(auctions.map((a) => [a.id, a]))

    // Build the lotId-to-lastNoteAt map
    const lastNoteMap: Record<number, Date> = {}
    for (const n of notesWithLots) {
      if (!lastNoteMap[n.lotId]) {
        lastNoteMap[n.lotId] = n.createdAt
      }
    }

    const data = notesWithLots.map((n) => {
      const auction = auctionMap.get(n.lotId)
      return {
        lotId: n.lotId,
        lotNumber: auction?.lotNumber ?? null,
        year: auction?.year ?? null,
        make: auction?.make ?? null,
        modelGroup: auction?.modelGroup ?? null,
        estimatedRetailValue: auction?.estimatedRetailValue ?? null,
        noteCount: countMap[n.lotId] ?? 0,
        lastNoteAt: lastNoteMap[n.lotId],
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Notes list API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch noted lots' } },
      { status: 500 }
    )
  }
}
