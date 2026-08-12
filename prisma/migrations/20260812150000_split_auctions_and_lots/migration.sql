-- Existing Auction rows are CSV lots. Preserve them while introducing sale-event parents.
ALTER TABLE "Auction" RENAME TO "Lot";

CREATE TABLE "Auction" (
    "id" SERIAL NOT NULL,
    "saleKey" TEXT NOT NULL,
    "yardNumber" INTEGER,
    "yardName" TEXT,
    "saleDate" TEXT,
    "saleTime" TEXT,
    "timeZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_event_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lot" ADD COLUMN "auctionId" INTEGER;

WITH lot_sales AS (
    SELECT
        "yardNumber",
        "yardName",
        "saleDate",
        "saleTime",
        "timeZone",
        CASE
            WHEN "saleDate" IS NULL OR "saleDate" = '' THEN
                CONCAT('unscheduled:', COALESCE("yardNumber"::TEXT, 'unknown'), ':', "lotNumber"::TEXT)
            ELSE
                CONCAT(
                    COALESCE("yardNumber"::TEXT, 'unknown'), ':',
                    "saleDate", ':',
                    COALESCE("saleTime", 'unknown'), ':',
                    COALESCE("timeZone", 'unknown')
                )
        END AS sale_key
    FROM "Lot"
), distinct_sales AS (
    SELECT DISTINCT ON (sale_key) *
    FROM lot_sales
    ORDER BY sale_key
)
INSERT INTO "Auction" ("saleKey", "yardNumber", "yardName", "saleDate", "saleTime", "timeZone", "updatedAt")
SELECT sale_key, "yardNumber", "yardName", "saleDate", "saleTime", "timeZone", CURRENT_TIMESTAMP
FROM distinct_sales;

UPDATE "Lot" AS lot
SET "auctionId" = auction."id"
FROM "Auction" AS auction
WHERE auction."saleKey" = CASE
    WHEN lot."saleDate" IS NULL OR lot."saleDate" = '' THEN
        CONCAT('unscheduled:', COALESCE(lot."yardNumber"::TEXT, 'unknown'), ':', lot."lotNumber"::TEXT)
    ELSE
        CONCAT(
            COALESCE(lot."yardNumber"::TEXT, 'unknown'), ':',
            lot."saleDate", ':',
            COALESCE(lot."saleTime", 'unknown'), ':',
            COALESCE(lot."timeZone", 'unknown')
        )
END;

ALTER TABLE "Lot" ALTER COLUMN "auctionId" SET NOT NULL;
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Auction_event_saleKey_key" ON "Auction"("saleKey");
CREATE INDEX "Auction_event_saleDate_idx" ON "Auction"("saleDate");
CREATE INDEX "Auction_event_yardNumber_idx" ON "Auction"("yardNumber");
CREATE INDEX "Lot_auctionId_idx" ON "Lot"("auctionId");