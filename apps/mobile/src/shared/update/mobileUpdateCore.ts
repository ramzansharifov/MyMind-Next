export const MOBILE_RELEASE_API_URL =
  'https://api.github.com/repos/ramzansharifov/MyMind-Next/releases?per_page=30'

export type MobileUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

export interface MobileReleaseAsset {
  version: string
  tagName: string
  assetName: string
  downloadUrl: string
  size: number
}

export interface MobileUpdateStatus {
  currentVersion: string
  phase: MobileUpdatePhase
  available: MobileReleaseAsset | null
  percent: number | null
  transferred: number | null
  total: number | null
  lastCheckedAt: string | null
  error: string | null
}

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/
const MOBILE_APK_PATTERN = /^mymind-mobile-(\d+\.\d+\.\d+)\.apk$/

function parseVersion(value: string): [number, number, number] | null {
  const match = VERSION_PATTERN.exec(value.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function compareVersions(left: string, right: string): number {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return 0

  for (let index = 0; index < 3; index += 1) {
    const delta = a[index] - b[index]
    if (delta !== 0) return delta
  }

  return 0
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function findLatestMobileRelease(
  payload: unknown,
  currentVersion: string
): MobileReleaseAsset | null {
  if (!Array.isArray(payload)) return null

  const candidates: MobileReleaseAsset[] = []

  for (const rawRelease of payload) {
    const release = record(rawRelease)
    if (!release || release.draft === true || release.prerelease === true) continue
    if (typeof release.tag_name !== 'string' || !Array.isArray(release.assets)) continue

    for (const rawAsset of release.assets) {
      const asset = record(rawAsset)
      if (!asset || typeof asset.name !== 'string' || typeof asset.browser_download_url !== 'string') {
        continue
      }

      const match = MOBILE_APK_PATTERN.exec(asset.name)
      if (!match) continue

      const version = match[1]
      if (release.tag_name !== `v${version}`) continue
      if (compareVersions(version, currentVersion) <= 0) continue

      candidates.push({
        version,
        tagName: release.tag_name,
        assetName: asset.name,
        downloadUrl: asset.browser_download_url,
        size: typeof asset.size === 'number' && Number.isFinite(asset.size) ? asset.size : 0
      })
    }
  }

  return (
    candidates.sort((left, right) => compareVersions(right.version, left.version))[0] ?? null
  )
}

export function initialMobileUpdateStatus(currentVersion: string): MobileUpdateStatus {
  return {
    currentVersion,
    phase: 'idle',
    available: null,
    percent: null,
    transferred: null,
    total: null,
    lastCheckedAt: null,
    error: null
  }
}
