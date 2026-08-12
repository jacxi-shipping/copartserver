# Retired Copart Auction API

This FastAPI service is retained only as a historical reference. It does not expose auction, search, statistics, or import endpoints because its former row-level `auctions` schema conflicts with the active Prisma `Auction`/`Lot` model.

Use the Next.js API and the Prisma worker from the repository root instead:

```bash
npm run import:worker
```

---

The active application lives at the repository root. It stores sale events in `Auction`, vehicles in `Lot`, and processes queued CSV uploads with:

```bash
npm run import:worker
```

Do not run the legacy Alembic migrations or import script against the active database.