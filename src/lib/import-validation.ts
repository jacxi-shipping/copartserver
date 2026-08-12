export function isCsvFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.csv')
}