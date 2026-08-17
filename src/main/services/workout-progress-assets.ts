import { app, type BrowserWindow } from 'electron'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

import type { WorkoutProgressPhotoRecord } from '../../shared/contracts/workouts'
import {
  addWorkoutProgressPhoto,
  deleteWorkoutProgressPhoto,
  getWorkoutProgressEntry,
  getWorkoutProgressPhoto
} from '../repositories/workouts.repository'
import { persistPreparedStudyAssetImport, selectStudyAssetForImport } from './study-assets'

function progressAssetOwner(entryId: string): string {
  return `workout-progress-${entryId}`
}

function attachmentsRoot(): string {
  return join(app.getPath('documents'), 'MyMind', 'Attachments')
}

async function removeAssetDirectory(entryId: string, assetId: string): Promise<void> {
  await rm(join(attachmentsRoot(), progressAssetOwner(entryId), assetId), {
    recursive: true,
    force: true
  })
}

export async function importWorkoutProgressPhoto(
  entryId: string,
  parentWindow: BrowserWindow | null
): Promise<WorkoutProgressPhotoRecord | null> {
  getWorkoutProgressEntry(entryId)
  const owner = progressAssetOwner(entryId)
  const prepared = await selectStudyAssetForImport({ nodeId: owner, kind: 'image' }, parentWindow)
  if (!prepared) return null

  const asset = await persistPreparedStudyAssetImport(owner, prepared)
  try {
    return addWorkoutProgressPhoto(entryId, asset)
  } catch (reason) {
    await removeAssetDirectory(entryId, asset.id).catch(() => undefined)
    throw reason
  }
}

export async function removeWorkoutProgressPhoto(id: string): Promise<boolean> {
  const photo = getWorkoutProgressPhoto(id)
  const deleted = deleteWorkoutProgressPhoto({ id })
  if (!deleted) return false

  await removeAssetDirectory(photo.entryId, photo.assetId).catch((reason: unknown) => {
    console.error('Failed to remove workout progress photo', reason)
  })
  return true
}

export async function removeWorkoutProgressEntryAssets(entryId: string): Promise<void> {
  await rm(join(attachmentsRoot(), progressAssetOwner(entryId)), {
    recursive: true,
    force: true
  }).catch((reason: unknown) => {
    console.error('Failed to remove workout progress assets', reason)
  })
}
