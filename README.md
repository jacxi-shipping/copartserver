# Copart Lot Data Platform

Next.js application for importing Copart CSV inventory, grouping lots into auction events, browsing lane-ordered run lists, and integrating the data with other applications.

## Run Locally

```bash
npm install
npx prisma migrate deploy
npm run dev
npm run import:worker
```

The UI is available at `http://localhost:3000`. The import worker is required to process queued CSV imports.

## Integrate Another App

The application exposes JSON endpoints under `/api`. Open **API Docs** in the sidebar for request examples and response conventions.

Key endpoints:

- `GET /api/auction-dashboard` lists parent sale events by yard/date/time/timezone.
- `GET /api/auction-dashboard/{auctionId}` returns the auction and its lane-ordered lots.
- `GET` or `POST /api/search` searches lots with pagination and filters.
- `POST /api/import/upload` uploads a CSV; `POST /api/import` queues it; `GET /api/import/{jobId}` reports progress.
- `GET /api/export?auctionId={auctionId}` downloads a lane-ordered auction CSV.
- `GET /api/compare/report?ids=1,2&format=csv` exports a cross-auction comparison report.

The active API is implemented by the Next.js app. The legacy `copart-api/` FastAPI project is retired and should not be used against this database.