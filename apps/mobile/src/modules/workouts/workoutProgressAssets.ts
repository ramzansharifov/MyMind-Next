import { Alert, Platform } from 'react-native'
import { Directory, File, Paths } from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import { randomUUID } from 'expo-crypto'
import type { WorkoutProgressPhotoRecord } from '@mymind/contracts/workouts'
import type { WorkoutProgressAsset, WorkoutsPersistenceHooks } from '@mymind/persistence/workouts'

type PhotoSource = 'library' | 'camera'

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/
const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
}

function assertSafeSegment(value: string, label: string): void {
  if (!SAFE_SEGMENT.test(value)) throw new Error(`Некорректный ${label}`)
}

function isSafeFileName(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !/[\\/\0]/.test(value) &&
    value !== '.' &&
    value !== '..'
  )
}

function assetDirectory(entryId: string, assetId: string): Directory {
  assertSafeSegment(entryId, 'идентификатор записи прогресса')
  assertSafeSegment(assetId, 'идентификатор фотографии')
  return new Directory(Paths.document, 'workout-progress', entryId, assetId)
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

function choosePhotoSource(): Promise<PhotoSource | null> {
  return new Promise((resolve) => {
    Alert.alert('Добавить фотографию', 'Выберите источник', [
      { text: 'Отмена', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Медиатека', onPress: () => resolve('library') },
      { text: 'Камера', onPress: () => resolve('camera') }
    ])
  })
}

async function pickPhoto(source: PhotoSource): Promise<ImagePicker.ImagePickerAsset | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted)
      throw new Error('Разрешите MyMind доступ к камере в настройках устройства')
  } else if (Platform.OS !== 'web') {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted)
      throw new Error('Разрешите MyMind доступ к фотографиям в настройках устройства')
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
  return result.canceled ? null : (result.assets[0] ?? null)
}

async function importPhoto(entryId: string): Promise<WorkoutProgressAsset | null> {
  const source = await choosePhotoSource()
  if (!source) return null
  const selected = await pickPhoto(source)
  if (!selected) return null

  const assetId = randomUUID()
  const directory = assetDirectory(entryId, assetId)
  const target = new File(directory, safeFileName(selected))
  try {
    directory.create({ intermediates: true, idempotent: false })
    await new File(selected.uri).copy(target)
    if (!target.exists || target.size <= 0) throw new Error('Не удалось сохранить фотографию')
    return {
      id: assetId,
      name: target.name,
      mimeType: selected.mimeType || target.type || 'image/jpeg',
      size: target.size,
      url: target.uri
    }
  } catch (reason) {
    if (directory.exists) directory.delete()
    throw reason
  }
}

async function deletePhoto(photo: WorkoutProgressPhotoRecord): Promise<void> {
  const directory = assetDirectory(photo.entryId, photo.assetId)
  if (directory.exists) directory.delete()
}

export function createWorkoutProgressAssetHooks(): WorkoutsPersistenceHooks {
  return {
    importProgressPhoto: (entryId) => importPhoto(entryId),
    deleteProgressPhotoAsset: deletePhoto
  }
}

export function reconcileWorkoutProgressAssets(
  photos: readonly WorkoutProgressPhotoRecord[]
): string[] {
  const root = new Directory(Paths.document, 'workout-progress')
  const referenced = new Map<string, WorkoutProgressPhotoRecord>()
  const missingRows: string[] = []

  for (const photo of photos) {
    if (
      !SAFE_SEGMENT.test(photo.entryId) ||
      !SAFE_SEGMENT.test(photo.assetId) ||
      !isSafeFileName(photo.fileName)
    ) {
      missingRows.push(photo.id)
      continue
    }
    referenced.set(`${photo.entryId}/${photo.assetId}`, photo)
  }

  if (!root.exists) return [...missingRows, ...[...referenced.values()].map((photo) => photo.id)]

  const seen = new Set<string>()
  for (const entryItem of root.list()) {
    if (!(entryItem instanceof Directory) || !SAFE_SEGMENT.test(entryItem.name)) {
      entryItem.delete()
      continue
    }
    for (const assetItem of entryItem.list()) {
      const key = `${entryItem.name}/${assetItem.name}`
      if (!(assetItem instanceof Directory) || !referenced.has(key)) {
        assetItem.delete()
        continue
      }
      const photo = referenced.get(key)!
      const file = new File(assetItem, photo.fileName)
      if (file.exists && file.size > 0) {
        seen.add(key)
        for (const child of assetItem.list()) if (child.name !== photo.fileName) child.delete()
      } else assetItem.delete()
    }
    if (entryItem.exists && entryItem.list().length === 0) entryItem.delete()
  }

  for (const [key, photo] of referenced) if (!seen.has(key)) missingRows.push(photo.id)
  return missingRows
}
