import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkoutProgressEntry: vi.fn(),
  addWorkoutProgressPhoto: vi.fn(),
  deleteWorkoutProgressPhoto: vi.fn(),
  getWorkoutProgressPhoto: vi.fn(),
  selectStudyAssetForImport: vi.fn(),
  persistPreparedStudyAssetImport: vi.fn()
}))

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp') }
}))

vi.mock('../repositories/workouts.repository', () => ({
  addWorkoutProgressPhoto: mocks.addWorkoutProgressPhoto,
  deleteWorkoutProgressPhoto: mocks.deleteWorkoutProgressPhoto,
  getWorkoutProgressEntry: mocks.getWorkoutProgressEntry,
  getWorkoutProgressPhoto: mocks.getWorkoutProgressPhoto
}))

vi.mock('./study-assets', () => ({
  selectStudyAssetForImport: mocks.selectStudyAssetForImport,
  persistPreparedStudyAssetImport: mocks.persistPreparedStudyAssetImport
}))

vi.mock('./storage-location', () => ({
  getStudyAttachmentsRoot: vi.fn(() => '/tmp/mymind-workout-progress-assets-test')
}))

import { importWorkoutProgressPhoto } from './workout-progress-assets'

const previousFront = {
  id: 'photo-old-front',
  entryId: 'entry-1',
  assetId: 'asset-old-front',
  fileName: 'old-front.jpg',
  mimeType: 'image/jpeg',
  size: 100,
  url: 'mymind-asset://old-front',
  view: 'front' as const,
  createdAt: 1
}

const previousCustom = {
  ...previousFront,
  id: 'photo-old-custom',
  assetId: 'asset-old-custom',
  view: 'custom' as const
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getWorkoutProgressEntry.mockReturnValue({
    id: 'entry-1',
    photos: [previousFront, previousCustom]
  })
  mocks.selectStudyAssetForImport.mockResolvedValue({
    sourcePath: '/tmp/new.jpg',
    extension: 'jpg',
    fileName: 'new.jpg',
    mimeType: 'image/jpeg',
    size: 200
  })
  mocks.persistPreparedStudyAssetImport.mockResolvedValue({
    id: 'asset-new',
    materialId: 'workout-progress-entry-1',
    name: 'new.jpg',
    mimeType: 'image/jpeg',
    size: 200,
    url: 'mymind-asset://new'
  })
  mocks.addWorkoutProgressPhoto.mockImplementation((entryId, view, asset) => ({
    id: 'photo-new',
    entryId,
    assetId: asset.id,
    fileName: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    url: asset.url,
    view,
    createdAt: 2
  }))
  mocks.getWorkoutProgressPhoto.mockImplementation((id) =>
    id === previousFront.id ? previousFront : previousCustom
  )
  mocks.deleteWorkoutProgressPhoto.mockReturnValue(true)
})

describe('workout progress assets', () => {
  it('replaces the previous photo of the same standard view after a successful import', async () => {
    const imported = await importWorkoutProgressPhoto('entry-1', 'front', null)

    expect(mocks.addWorkoutProgressPhoto).toHaveBeenCalledWith(
      'entry-1',
      'front',
      expect.objectContaining({ id: 'asset-new' })
    )
    expect(mocks.deleteWorkoutProgressPhoto).toHaveBeenCalledWith({ id: previousFront.id })
    expect(mocks.deleteWorkoutProgressPhoto).not.toHaveBeenCalledWith({ id: previousCustom.id })
    expect(imported).toMatchObject({ id: 'photo-new', view: 'front' })
  })

  it('keeps existing custom photos when another custom angle is imported', async () => {
    await importWorkoutProgressPhoto('entry-1', 'custom', null)

    expect(mocks.addWorkoutProgressPhoto).toHaveBeenCalledWith(
      'entry-1',
      'custom',
      expect.objectContaining({ id: 'asset-new' })
    )
    expect(mocks.deleteWorkoutProgressPhoto).not.toHaveBeenCalled()
  })

  it('does not remove the previous standard photo when the picker is cancelled', async () => {
    mocks.selectStudyAssetForImport.mockResolvedValue(null)

    const result = await importWorkoutProgressPhoto('entry-1', 'front', null)

    expect(result).toBeNull()
    expect(mocks.addWorkoutProgressPhoto).not.toHaveBeenCalled()
    expect(mocks.deleteWorkoutProgressPhoto).not.toHaveBeenCalled()
  })
})
