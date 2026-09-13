export function normalizeBundledDomAssetUrl(asset: unknown): string {
  if (typeof asset === 'string') return asset

  if (asset && typeof asset === 'object') {
    if ('uri' in asset && typeof asset.uri === 'string') return asset.uri
    if ('default' in asset) return normalizeBundledDomAssetUrl(asset.default)

    return `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(asset))}`
  }

  return String(asset ?? '')
}
