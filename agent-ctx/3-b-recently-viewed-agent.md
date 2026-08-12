# Task 3-b: Recently Viewed Agent

## Work Done

### 1. Created Batch API Endpoint
- **File**: `src/app/api/auctions/batch/route.ts`
- GET endpoint accepting `?ids=1,2,3` query parameter
- Returns `{ success: true, data: Auction[] }` preserving whatever order DB returns
- Validates: missing ids → 400, no valid IDs → 400, >50 IDs → 400
- Uses Prisma `findMany` with `{ where: { id: { in: ids } } }`

### 2. Updated Zustand Store (`src/lib/store.ts`)
- Added `'recent_view'` to `ActivityType` union
- Added `'clock'` to `ActivityIcon` union
- Added `recentlyViewed: number[]` to `AppState` interface
- Added `addRecentlyViewed: (id: number, label?: string) => void` — adds to front, removes duplicates, caps at 12
- Added `clearRecentlyViewed: () => void` — clears array, logs activity
- Added `'clock'` icon mapping for `'recent_view'` activity type in `getActivityIcon`
- Added `recentlyViewed` to `partialize` for localStorage persistence

### 3. Created RecentlyViewedSection Component
- **File**: `src/components/dashboard/recently-viewed-section.tsx`
- Horizontal scrollable row of mini-cards (w-40 each, `overflow-x-auto scrollbar-none`)
- Each mini-card shows: gradient initials background, truncated vehicle label, est. value, damage badge
- Click opens VehicleDetailSheet for that vehicle
- "Clear" button (X icon + "Clear" text) to clear history
- Returns `null` when `recentlyViewed` is empty (not loading)
- Framer-motion staggered fade-in animations (containerVariants + itemVariants)
- Fetches via batch API first, falls back to individual `/api/auctions/[id]` calls
- Preserves recentlyViewed order in displayed results
- Skeleton loading state with 5 placeholder cards

## Verification
- ESLint: zero errors, zero warnings
- Store: all new fields properly typed and persisted
- Component: follows existing codebase patterns (same gradient system, format utils, store usage)
