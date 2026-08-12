# Task 8 - Filters & Compare Agent

## Objective
Add filter dropdowns and compare integration to Upcoming/Today/Search tabs.

## Work Performed

### API Changes
- **`/api/search/facets`**: Added `bodyStyle` groupBy query (10th concurrent groupBy). Returns `bodyStyles` array in response.

### Upcoming Tab (`src/components/auctions/upcoming-tab.tsx`)
- Added 3 filter dropdowns (Make, Body Style, Fuel Type) populated from `/api/search/facets`
- Retained existing State text input filter
- Added Clear Filters button showing active filter count
- Added Grid/List view toggle (grid = VehicleCards, list = compact table)
- Added compare checkbox: floating circle button on grid cards, checkbox column in list view
- Filters passed as query params (`make`, `bodyStyle`, `fuelType`, `locationState`) to upcoming API

### Today Tab (`src/components/auctions/today-tab.tsx`)
- Same 3 filter dropdowns as Upcoming
- Clear Filters with active count
- Grid/List view toggle
- Compare checkbox on cards and rows
- Filters passed to today API

### Search Tab (`src/components/search/search-tab.tsx`)
- Added `Checkbox` import
- Added `toggleCompare`, `isInCompare` from store (was already partially there)
- Added compare checkbox as first column in search results table
- Checkbox uses `stopPropagation` to prevent row click

### page.tsx
- Already had `<ComparePanel />` rendered - no changes needed

## Technical Notes
- Facets fetched once on mount from existing `/api/search/facets` endpoint
- Compare uses existing zustand store: `compareList`, `toggleCompare(id)`, `isInCompare(id)`, max 3 items
- View toggle changes pageSize: grid=12, list=20
- All changes responsive with hidden columns on smaller screens

## Results
- ESLint: zero errors
- 4 files modified, 1 API route updated
