export interface Stats {
  totalAuctions: number
  upcomingAuctions: number
  todayAuctions: number
  uniqueMakes: number
  uniqueStates: number
  uniqueYards: number
  lastImport: string | null
  lastUpdate: string | null
}

export interface Auction {
  id: number
  lotNumber: number
  year: number | null
  make: string | null
  modelGroup: string | null
  modelDetail: string | null
  vin: string | null
  saleDate: string | null
  saleTime: string | null
  timeZone: string | null
  saleStatus: string | null
  locationCity: string | null
  locationState: string | null
  locationZip: string | null
  estimatedRetailValue: number | null
  highBid: number | null
  odometer: number | null
  damageDescription: string | null
  secondaryDamage: string | null
  fuelType: string | null
  transmission: string | null
  drive: string | null
  bodyStyle: string | null
  color: string | null
  imageUrl: string | null
  imageThumbnail: string | null
  vehicleType: string | null
  engine: string | null
  cylinders: number | null
  saleTitleState: string | null
  saleTitleType: string | null
  hasKeys: boolean | null
  runsDrives: string | null
  repairCost: number | null
  buyItNowPrice: number | null
  makeOfferEligible: boolean | null
  yardName: string | null
  yardNumber: number | null
  autograde: string | null
  specialNote: string | null
  announcements: string | null
  trim: string | null
  lastUpdatedTime: string | null
}

export interface ImportJob {
  id: string
  filename: string
  fileSize: number | null
  status: string
  startedAt: string | null
  completedAt: string | null
  totalRows: number
  processedRows: number
  insertedRows: number
  updatedRows: number
  skippedRows: number
  failedRows: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}
