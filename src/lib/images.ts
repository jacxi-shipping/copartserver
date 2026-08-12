export function getAuctionImageUrl(
  lotNumber: number,
  imageThumbnail: string | null | undefined,
  imageUrl: string | null | undefined,
): string | null {
  const source = imageThumbnail?.trim() || imageUrl?.trim()
  if (!source) return null

  const absoluteUrl = /^https?:\/\//i.test(source) ? source : `https://${source}`
  if (/inventoryv2\.copart\.io\/v1\/lotImages/i.test(absoluteUrl)) {
    const country = new URL(absoluteUrl).searchParams.get('country') === 'ca' ? 'ca' : 'us'
    return `/api/lots/${lotNumber}/image?country=${country}`
  }
  return absoluteUrl
}