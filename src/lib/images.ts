export function getAuctionImageUrl(
  imageThumbnail: string | null | undefined,
  imageUrl: string | null | undefined,
): string | null {
  const thumbnail = imageThumbnail?.trim()
  if (thumbnail) {
    return /^https?:\/\//i.test(thumbnail) ? thumbnail : `https://${thumbnail}`
  }

  const source = imageUrl?.trim()
  if (!source || /inventoryv2\.copart\.io\/v1\/lotImages/i.test(source)) return null
  return /^https?:\/\//i.test(source) ? source : `https://${source}`
}