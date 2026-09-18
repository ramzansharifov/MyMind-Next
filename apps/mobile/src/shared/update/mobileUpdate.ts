import * as Application from 'expo-application'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { Platform } from 'react-native'

import {
  MOBILE_RELEASE_API_URL,
  findLatestMobileRelease,
  type MobileReleaseAsset
} from './mobileUpdateCore'

export function getInstalledMobileVersion(): string {
  return Application.nativeApplicationVersion ?? '0.0.0'
}

export function mobileUpdatesSupported(): boolean {
  return Platform.OS === 'android'
}

export async function checkRemoteMobileRelease(
  currentVersion: string
): Promise<MobileReleaseAsset | null> {
  if (!mobileUpdatesSupported()) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(MOBILE_RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(`GitHub вернул ошибку ${response.status} при проверке обновлений`)
    }

    return findLatestMobileRelease(await response.json(), currentVersion)
  } finally {
    clearTimeout(timeout)
  }
}

export async function downloadAndOpenMobileUpdate(
  release: MobileReleaseAsset,
  onProgress: (progress: { transferred: number; total: number; percent: number }) => void
): Promise<void> {
  if (!mobileUpdatesSupported()) {
    throw new Error('Установка APK поддерживается только на Android')
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error('Кэш приложения недоступен для загрузки обновления')
  }

  const destination = `${FileSystem.cacheDirectory}${release.assetName}`
  await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined)

  const task = FileSystem.createDownloadResumable(
    release.downloadUrl,
    destination,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      const total = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : release.size
      const percent = total > 0 ? Math.min(100, (totalBytesWritten / total) * 100) : 0
      onProgress({
        transferred: totalBytesWritten,
        total,
        percent
      })
    }
  )

  const result = await task.downloadAsync()
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error('Не удалось скачать APK обновления')
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri)
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    flags: 1,
    type: 'application/vnd.android.package-archive'
  })
}
