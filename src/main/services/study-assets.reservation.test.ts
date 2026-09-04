import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { StudyDocument, StudyLocalAsset } from '../../shared/contracts/study'
import {
  cleanupStudyAssetsForDocument,
  persistStudyAudioRecording,
  persistPreparedStudyAssetImport,
  removeStudyAssetsForMaterials,
  resetStudyAssetReservationsForTesting,
  setStudyAssetsRootForTesting
} from './study-assets'

let root = ''
let now = 1_000

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-assets-'))
  setStudyAssetsRootForTesting(join(root, 'assets'))
  resetStudyAssetReservationsForTesting(() => now)
})

afterEach(async () => {
  setStudyAssetsRootForTesting(null)
  resetStudyAssetReservationsForTesting()
  await rm(root, { recursive: true, force: true })
})

async function importAsset(): Promise<StudyLocalAsset> {
  const sourcePath = join(root, 'photo.png')
  await mkdir(root, { recursive: true })
  await writeFile(sourcePath, 'image')
  return persistPreparedStudyAssetImport('material-a', {
    sourcePath,
    extension: 'png',
    fileName: 'photo.png',
    mimeType: 'image/png',
    size: 5
  })
}

const emptyDocument: StudyDocument = { version: 1, blocks: [] }

describe('study asset reservations', () => {
  it('preserves a new import through stale cleanup and releases it after a referencing save', async () => {
    const asset = await importAsset()
    const assetDirectory = join(root, 'assets', 'material-a', asset.id)

    await cleanupStudyAssetsForDocument('material-a', emptyDocument)
    expect(existsSync(assetDirectory)).toBe(true)

    await cleanupStudyAssetsForDocument('material-a', {
      version: 1,
      blocks: [{ id: 'image', type: 'image', source: { type: 'local', asset } }]
    })
    await cleanupStudyAssetsForDocument('material-a', emptyDocument)
    expect(existsSync(assetDirectory)).toBe(false)
  })

  it('expires an orphan reservation after TTL', async () => {
    const asset = await importAsset()
    const assetDirectory = join(root, 'assets', 'material-a', asset.id)
    now += 10 * 60 * 1000

    await cleanupStudyAssetsForDocument('material-a', emptyDocument)
    expect(existsSync(assetDirectory)).toBe(false)
  })

  it('clears reserved assets when their material is deleted', async () => {
    await importAsset()
    await removeStudyAssetsForMaterials(['material-a'])
    expect(existsSync(join(root, 'assets', 'material-a'))).toBe(false)
  })

  it('persists a recorded audio buffer as a reserved local asset', async () => {
    const data = new Uint8Array([1, 2, 3, 4])
    const asset = await persistStudyAudioRecording(
      'material-a',
      data,
      'audio/webm',
      () => undefined
    )

    expect(asset).toMatchObject({
      materialId: 'material-a',
      name: 'voice-recording.weba',
      mimeType: 'audio/webm',
      size: 4
    })
    expect(
      await readFile(join(root, 'assets', 'material-a', asset.id, 'voice-recording.weba'))
    ).toEqual(Buffer.from(data))

    await cleanupStudyAssetsForDocument('material-a', emptyDocument)
    expect(existsSync(join(root, 'assets', 'material-a', asset.id))).toBe(true)
  })
})
