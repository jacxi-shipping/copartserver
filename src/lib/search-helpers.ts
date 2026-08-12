export const SEARCHABLE_FIELDS = [
  'make',
  'modelGroup',
  'modelDetail',
  'trim',
  'bodyStyle',
  'vehicleType',
  'color',
  'damageDescription',
  'secondaryDamage',
  'engine',
  'drive',
  'transmission',
  'fuelType',
  'runsDrives',
  'saleStatus',
  'locationCity',
  'locationState',
  'yardName',
  'sellerName',
  'vin',
] as const

export function buildTextSearchWhere(query: string) {
  return {
    OR: SEARCHABLE_FIELDS.map((field) => ({
      [field]: { contains: query, mode: 'insensitive' },
    })),
  }
}

export function buildUpcomingSaleDateWhere(todayStr: string, includeUnscheduled: boolean) {
  if (includeUnscheduled) {
    return {
      OR: [
        { saleDate: null },
        { saleDate: '' },
        { saleDate: '0' },
        {
          AND: [
            { saleDate: { not: null } },
            { saleDate: { not: '' } },
            { saleDate: { not: '0' } },
            { saleDate: { gte: todayStr } },
          ],
        },
      ],
    }
  }

  return {
    AND: [
      { saleDate: { not: null } },
      { saleDate: { not: '' } },
      { saleDate: { not: '0' } },
      { saleDate: { gte: todayStr } },
    ],
  }
}