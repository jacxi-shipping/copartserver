export const PRICE_BUCKETS = [
  { label: '$0–$5K', min: 0, max: 5000 },
  { label: '$5K–$10K', min: 5000, max: 10000 },
  { label: '$10K–$25K', min: 10000, max: 25000 },
  { label: '$25K–$50K', min: 25000, max: 50000 },
  { label: '$50K–$100K', min: 50000, max: 100000 },
  { label: '$100K+', min: 100000, max: Number.POSITIVE_INFINITY },
] as const

export interface MarketOverviewAuctionRow {
  estimatedRetailValue: number | null
  highBid: number | null
  repairCost: number | null
  damageDescription: string | null
}

export interface MarketOverviewDamageGroup {
  damageDescription: string | null
  _count: { damageDescription: number }
}

export function summarizeMarketOverview(
  allAuctions: MarketOverviewAuctionRow[],
  damageGroups: MarketOverviewDamageGroup[]
) {
  const priceDistribution = PRICE_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: allAuctions.filter((auction) => {
      const value = auction.estimatedRetailValue ?? 0
      return value >= bucket.min && value < bucket.max
    }).length,
  }))

  const validRetail = allAuctions.filter((auction) => auction.estimatedRetailValue != null)
  const validBid = allAuctions.filter((auction) => auction.highBid != null)
  const validRepair = allAuctions.filter((auction) => auction.repairCost != null)

  const avgRetailValue = validRetail.length > 0
    ? validRetail.reduce((sum, auction) => sum + (auction.estimatedRetailValue ?? 0), 0) / validRetail.length
    : 0

  const avgHighBid = validBid.length > 0
    ? validBid.reduce((sum, auction) => sum + (auction.highBid ?? 0), 0) / validBid.length
    : 0

  const avgRepairCost = validRepair.length > 0
    ? validRepair.reduce((sum, auction) => sum + (auction.repairCost ?? 0), 0) / validRepair.length
    : 0

  const totalEstimatedValue = validRetail.reduce((sum, auction) => sum + (auction.estimatedRetailValue ?? 0), 0)
  const profitMargin = avgRetailValue > 0 ? (1 - avgHighBid / avgRetailValue) * 100 : 0

  const damageTypeDistribution = damageGroups
    .filter((group) => group.damageDescription !== null && group.damageDescription !== '')
    .map((group) => ({
      name: group.damageDescription as string,
      count: group._count.damageDescription,
    }))

  return {
    priceDistribution,
    avgRetailValue,
    avgHighBid,
    avgRepairCost,
    totalEstimatedValue,
    profitMargin,
    damageTypeDistribution,
    totalLots: allAuctions.length,
  }
}