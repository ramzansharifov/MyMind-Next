export type StudyAssetByteRange =
  { kind: 'full' } | { kind: 'partial'; start: number; end: number } | { kind: 'unsatisfiable' }

export function resolveStudyAssetByteRange(
  rangeHeader: string | null,
  fileSize: number
): StudyAssetByteRange {
  if (!rangeHeader) {
    return { kind: 'full' }
  }

  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { kind: 'unsatisfiable' }
  }

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim())

  if (!match) {
    return { kind: 'unsatisfiable' }
  }

  const [, rawStart, rawEnd] = match

  if (!rawStart && !rawEnd) {
    return { kind: 'unsatisfiable' }
  }

  if (!rawStart) {
    const suffixLength = Number(rawEnd)

    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
      return { kind: 'unsatisfiable' }
    }

    return {
      kind: 'partial',
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1
    }
  }

  const start = Number(rawStart)

  if (!Number.isSafeInteger(start) || start < 0 || start >= fileSize) {
    return { kind: 'unsatisfiable' }
  }

  const requestedEnd = rawEnd ? Number(rawEnd) : fileSize - 1

  if (!Number.isSafeInteger(requestedEnd) || requestedEnd < start) {
    return { kind: 'unsatisfiable' }
  }

  return {
    kind: 'partial',
    start,
    end: Math.min(requestedEnd, fileSize - 1)
  }
}
