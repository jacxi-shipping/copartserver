import path from 'path'

const DEFAULT_DATA_DIRNAME = 'data'
const CHUNKS_DIRNAME = 'chunks'

export interface ImportStoragePaths {
  dataDir: string
  chunksDir: string
}

export function getImportStoragePaths(baseDir = process.env.APP_DATA_DIR): ImportStoragePaths {
  const dataDir = baseDir && baseDir.trim() !== ''
    ? path.resolve(baseDir)
    : path.join(process.cwd(), DEFAULT_DATA_DIRNAME)

  return {
    dataDir,
    chunksDir: path.join(dataDir, CHUNKS_DIRNAME),
  }
}

export function getImportUploadPath(jobId: string, baseDir = process.env.APP_DATA_DIR): string {
  return path.join(getImportStoragePaths(baseDir).dataDir, `${jobId}_upload.csv`)
}

export function getImportPreviewPath(name: string, baseDir = process.env.APP_DATA_DIR): string {
  return path.join(getImportStoragePaths(baseDir).dataDir, name)
}

export function getImportChunkPath(uploadId: string, chunkIndex: number, baseDir = process.env.APP_DATA_DIR): string {
  return path.join(getImportStoragePaths(baseDir).chunksDir, `${uploadId}_${chunkIndex}.part`)
}

export function getImportChunkMetaPath(uploadId: string, baseDir = process.env.APP_DATA_DIR): string {
  return path.join(getImportStoragePaths(baseDir).chunksDir, `${uploadId}.meta.json`)
}

export function isValidUploadId(uploadId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(uploadId)
}

export function isCsvFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.csv')
}