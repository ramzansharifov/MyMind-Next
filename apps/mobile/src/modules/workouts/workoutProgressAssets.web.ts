import * as ImagePicker from 'expo-image-picker'
import { randomUUID } from 'expo-crypto'
import type { WorkoutProgressPhotoRecord } from '@mymind/contracts/workouts'
import type { WorkoutProgressAsset, WorkoutsPersistenceHooks } from '@mymind/persistence/workouts'

const sessionPhotoUris = new Map<string, string>()
const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

function safeFileName(asset: ImagePicker.ImagePickerAsset): string {
  const original = asset.fileName?.trim() ?? ''
  const dot = original.lastIndexOf('.')
  const extensionFromName = dot >= 0 ? original.slice(dot).toLocaleLowerCase('en-US') : ''
  const extension = /^\.[a-z0-9]{1,10}$/.test(extensionFromName)
    ? extensionFromName
    : (MIME_EXTENSIONS[asset.mimeType ?? ''] ?? '.jpg')
  return `progress-photo${extension}`
}

async function blobSize(uri: string): Promise<number> {
  try {
    const response = await fetch(uri)
    const blob = await response.blob()
    return blob.size
  } catch {
    return 0
  }
}

async function importPhoto(entryId: string): Promise<WorkoutProgressAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1
  })
  if (result.canceled) return null
  const selected = result.assets[0]
  if (!selected) return null

  const id = randomUUID()
  sessionPhotoUris.set(id, selected.uri)
  return {
    id,
    name: safeFileName(selected),
    mimeType: selected.mimeType || 'image/jpeg',
    size: selected.fileSize ?? (await blobSize(selected.uri)),
    url: selected.uri
  }
}

async function deletePhoto(photo: WorkoutProgressPhotoRecord): Promise<void> {
  sessionPhotoUris.delete(photo.assetId)
}

export function createWorkoutProgressAssetHooks(): WorkoutsPersistenceHooks {
  return {
    importProgressPhoto: (entryId) => importPhoto(entryId),
    deleteProgressPhotoAsset: deletePhoto
  }
}

export function reconcileWorkoutProgressAssets(): string[] {
  return []
}
