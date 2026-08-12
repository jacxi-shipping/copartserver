export interface AuctionIdentityInput {
  yardNumber: number | null | undefined
  saleDate: string | null | undefined
  saleTime: string | null | undefined
  timeZone: string | null | undefined
}

export function auctionSaleKey({ yardNumber, saleDate, saleTime, timeZone }: AuctionIdentityInput): string {
  const yard = yardNumber ?? 'unknown'
  if (!saleDate) return `unscheduled:${yard}:${timeZone ?? 'unknown'}`
  return `${yard}:${saleDate}:${saleTime ?? 'unknown'}:${timeZone ?? 'unknown'}`
}

export function compareLaneGrid(first: string | null | undefined, second: string | null | undefined): number {
  return (first ?? '').localeCompare(second ?? '', undefined, { numeric: true, sensitivity: 'base' })
}