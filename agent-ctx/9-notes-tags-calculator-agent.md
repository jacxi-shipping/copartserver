# Task 9: Notes, Tags API Routes & Vehicle Detail Sheet Enhancement

## Summary
Created 4 API routes for the new LotNote and LotTag models, and enhanced the Vehicle Detail Sheet with 3 new interactive sections.

## Files Created

### API Routes (4 files)
1. **`src/app/api/notes/[lotId]/route.ts`** — CRUD for lot notes
   - GET: List notes for a lot (ordered by createdAt desc)
   - POST: Create a note (1-2000 chars, validates lotId)
   - DELETE: Delete a note (validates note belongs to lot)

2. **`src/app/api/tags/[lotId]/route.ts`** — CRUD for lot tags
   - GET: List tags for a lot
   - POST: Upsert a tag (validates color against 8 allowed colors, 1-30 chars)
   - DELETE: Remove a tag by composite key (lotId, tag)

3. **`src/app/api/tags/popular/route.ts`** — Popular tags endpoint
   - GET: Top 20 most-used tags across all lots (groupBy with _count)

4. **`src/app/api/notes/route.ts`** — Lots with notes listing
   - GET: Returns 50 lots that have notes, with auction info and note counts

## Files Modified

1. **`src/components/shared/vehicle-detail-sheet.tsx`** — Enhanced with 3 new sections:
   - **Lot Notes Section**: Displays notes with relative timestamps, add/delete functionality, loading skeletons, Ctrl+Enter shortcut
   - **Tags Section**: Color-coded badges with 8-color picker, add/remove tags, loading skeletons
   - **Bid Calculator Section**: Full cost breakdown (bid, buyer fee %, doc fee, storage, transport, repair), total investment, estimated profit, ROI%, progress bar vs retail value
   - Added imports: `useMemo`, `StickyNote`, `Trash2`, `Calculator`, `Plus`, `X` icons, `Button`, `Input`, `Textarea`, `Skeleton` components
   - Uses `key={vehicle.id}` on BidCalculatorSection for proper state reset on vehicle change

## Technical Notes
- All API routes follow the existing `{ success: true, data: ... }` response pattern
- Tags use `upsert` to prevent duplicates per the unique constraint
- The bid calculator uses `useMemo` for real-time recalculation
- Tag color map supports light/dark mode with proper Tailwind classes
- Lint passes with zero errors
