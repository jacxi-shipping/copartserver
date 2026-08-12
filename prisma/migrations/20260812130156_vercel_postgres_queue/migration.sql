-- CreateTable
CREATE TABLE "Auction" (
    "id" SERIAL NOT NULL,
    "sourceId" TEXT,
    "yardNumber" INTEGER,
    "yardName" TEXT,
    "saleDate" TEXT,
    "dayOfWeek" TEXT,
    "saleTime" TEXT,
    "timeZone" TEXT,
    "itemNumber" TEXT,
    "lotNumber" INTEGER NOT NULL,
    "vehicleType" TEXT,
    "year" INTEGER,
    "make" TEXT,
    "modelGroup" TEXT,
    "modelDetail" TEXT,
    "bodyStyle" TEXT,
    "color" TEXT,
    "damageDescription" TEXT,
    "secondaryDamage" TEXT,
    "saleTitleState" TEXT,
    "saleTitleType" TEXT,
    "hasKeys" BOOLEAN,
    "lotConditionCode" TEXT,
    "vin" TEXT,
    "odometer" DOUBLE PRECISION,
    "odometerBrand" TEXT,
    "estimatedRetailValue" DOUBLE PRECISION,
    "repairCost" DOUBLE PRECISION,
    "engine" TEXT,
    "drive" TEXT,
    "transmission" TEXT,
    "fuelType" TEXT,
    "cylinders" INTEGER,
    "runsDrives" TEXT,
    "saleStatus" TEXT,
    "highBid" DOUBLE PRECISION,
    "specialNote" TEXT,
    "locationCity" TEXT,
    "locationState" TEXT,
    "locationZip" TEXT,
    "locationCountry" TEXT,
    "currencyCode" TEXT,
    "imageThumbnail" TEXT,
    "createDatetime" TIMESTAMP(3),
    "gridRow" TEXT,
    "makeOfferEligible" BOOLEAN,
    "buyItNowPrice" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "trim" TEXT,
    "lastUpdatedTime" TIMESTAMP(3),
    "rentals" BOOLEAN,
    "wholesale" BOOLEAN,
    "sellerName" TEXT,
    "offsiteAddress1" TEXT,
    "offsiteState" TEXT,
    "offsiteCity" TEXT,
    "offsiteZip" TEXT,
    "saleLight" TEXT,
    "autograde" TEXT,
    "announcements" TEXT,
    "searchText" TEXT,
    "sourceFile" TEXT,
    "sourceImportJobId" TEXT,
    "rawData" TEXT,
    "extraData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER,
    "storageKey" TEXT,
    "storageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "insertedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotNote" (
    "id" TEXT NOT NULL,
    "lotId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotTag" (
    "id" TEXT NOT NULL,
    "lotId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_lotNumber_key" ON "Auction"("lotNumber");

-- CreateIndex
CREATE INDEX "Auction_vin_idx" ON "Auction"("vin");

-- CreateIndex
CREATE INDEX "Auction_saleDate_idx" ON "Auction"("saleDate");

-- CreateIndex
CREATE INDEX "Auction_make_idx" ON "Auction"("make");

-- CreateIndex
CREATE INDEX "Auction_modelGroup_idx" ON "Auction"("modelGroup");

-- CreateIndex
CREATE INDEX "Auction_modelDetail_idx" ON "Auction"("modelDetail");

-- CreateIndex
CREATE INDEX "Auction_year_idx" ON "Auction"("year");

-- CreateIndex
CREATE INDEX "Auction_locationState_idx" ON "Auction"("locationState");

-- CreateIndex
CREATE INDEX "Auction_yardNumber_idx" ON "Auction"("yardNumber");

-- CreateIndex
CREATE INDEX "Auction_saleStatus_idx" ON "Auction"("saleStatus");

-- CreateIndex
CREATE INDEX "Auction_vehicleType_idx" ON "Auction"("vehicleType");

-- CreateIndex
CREATE INDEX "Auction_lotNumber_idx" ON "Auction"("lotNumber");

-- CreateIndex
CREATE INDEX "Auction_lastUpdatedTime_idx" ON "Auction"("lastUpdatedTime");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_storageKey_idx" ON "ImportJob"("storageKey");

-- CreateIndex
CREATE INDEX "LotNote_lotId_idx" ON "LotNote"("lotId");

-- CreateIndex
CREATE INDEX "LotTag_lotId_idx" ON "LotTag"("lotId");

-- CreateIndex
CREATE INDEX "LotTag_tag_idx" ON "LotTag"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "LotTag_lotId_tag_key" ON "LotTag"("lotId", "tag");
