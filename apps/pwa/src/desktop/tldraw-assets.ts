import { getAssetUrls } from '@tldraw/assets/selfHosted'
export function getAssetUrlsByImport(): ReturnType<typeof getAssetUrls> {
  return getAssetUrls({ baseUrl: '/tldraw' })
}
