export const COLUMN_MAP: Record<string, string> = {
  Id: 'sourceId',
  'Yard Number': 'yardNumber',
  'Yard Name': 'yardName',
  'Sale Date M/D/CY': 'saleDate',
  'Day of Week': 'dayOfWeek',
  'Sale time (HHMM)': 'saleTime',
  'Time Zone': 'timeZone',
  'Item Number': 'itemNumber',
  'Lot number': 'lotNumber',
  'Vehicle Type': 'vehicleType',
  Year: 'year',
  Make: 'make',
  'Model Group': 'modelGroup',
  'Model Detail': 'modelDetail',
  'Body Style': 'bodyStyle',
  Color: 'color',
  'Damage Description': 'damageDescription',
  'Secondary Damage': 'secondaryDamage',
  'Sale Title State': 'saleTitleState',
  'Sale Title Type': 'saleTitleType',
  'Has Keys': 'hasKeys',
  'Lot Condition Code': 'lotConditionCode',
  VIN: 'vin',
  Odometer: 'odometer',
  'Odometer Brand': 'odometerBrand',
  'Estimated Retail Value': 'estimatedRetailValue',
  'Repair cost': 'repairCost',
  Engine: 'engine',
  Drive: 'drive',
  Transmission: 'transmission',
  'Fuel Type': 'fuelType',
  Cylinders: 'cylinders',
  'Runs/Drives': 'runsDrives',
  'Sale Status': 'saleStatus',
  'High Bid =non-vix,Sealed=Vix': 'highBid',
  'Special Note': 'specialNote',
  'Location city': 'locationCity',
  'Location state': 'locationState',
  'Location ZIP': 'locationZip',
  'Location country': 'locationCountry',
  'Currency Code': 'currencyCode',
  'Image Thumbnail': 'imageThumbnail',
  'Create Date/Time': 'createDatetime',
  'Grid/Row': 'gridRow',
  'Make-an-Offer Eligible': 'makeOfferEligible',
  'Buy-It-Now Price': 'buyItNowPrice',
  'Image URL': 'imageUrl',
  Trim: 'trim',
  'Last Updated Time': 'lastUpdatedTime',
  Rentals: 'rentals',
  Wholesale: 'wholesale',
  'Seller Name': 'sellerName',
  OffsiteAddress1: 'offsiteAddress1',
  'Offsite Address1': 'offsiteAddress1',
  'Offsite State': 'offsiteState',
  'Offsite City': 'offsiteCity',
  'Offsite Zip': 'offsiteZip',
  'Sale Light': 'saleLight',
  AutoGrade: 'autograde',
  Announcements: 'announcements',
}

export const REQUIRED_DB_FIELDS = [
  'lotNumber',
] as const

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function buildHeaderMap(headers: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const header of headers) {
    const normalized = normalizeHeader(header)
    if (!map.has(normalized)) {
      map.set(normalized, header)
    }
  }
  return map
}

export function getDbField(header: string): string | null {
  if (COLUMN_MAP[header]) return COLUMN_MAP[header]
  const normalized = normalizeHeader(header)
  for (const [csvHeader, dbField] of Object.entries(COLUMN_MAP)) {
    if (normalizeHeader(csvHeader) === normalized) return dbField
  }
  return null
}

export function getMissingRequiredFields(headers: string[]): string[] {
  const mappedFields = new Set(
    headers
      .map((header) => getDbField(header))
      .filter((field): field is string => field !== null)
  )

  return REQUIRED_DB_FIELDS.filter((field) => !mappedFields.has(field))
}