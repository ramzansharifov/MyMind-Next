import { describe, expect, it, vi } from 'vitest'

import {
  commitPreparedStudyAssetImport,
  type PreparedStudyAssetImport,
  type StudyAssetImportFileDependencies
} from './study-assets'
import { studyMaterialCoordinator } from './study-material-coordinator'

const prepared: PreparedStudyAssetImport = {
  sourcePath: 'C:\\source\\photo.png',
  extension: 'png',
  fileName: 'photo.png',
  mimeType: 'image/png',
  size: 42
}

function createDependencies(): StudyAssetImportFileDependencies {
  return {
    assetsRoot: 'C:\\test-assets',
    createAssetId: () => '00000000-0000-4000-8000-000000000001',
    mkdir: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined)
  }
}

describe('study asset import coordination', () => {
  it('waits for an existing material operation before copying', async () => {
    const dependencies = createDependencies()
    let releaseSave: (() => void) | undefined
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    const save = studyMaterialCoordinator.run('material-1', () => saveGate)
    const imported = commitPreparedStudyAssetImport(
      'material-1',
      prepared,
      () => undefined,
      dependencies
    )

    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(dependencies.copyFile).not.toHaveBeenCalled()

    releaseSave?.()
    await Promise.all([save, imported])
    expect(dependencies.copyFile).toHaveBeenCalledTimes(1)
  })

  it('does not create a directory when the material disappeared while picker was open', async () => {
    const dependencies = createDependencies()

    await expect(
      commitPreparedStudyAssetImport(
        'material-missing',
        prepared,
        () => {
          throw new Error('Материал больше не существует')
        },
        dependencies
      )
    ).rejects.toThrow('Материал больше не существует')

    expect(dependencies.mkdir).not.toHaveBeenCalled()
    expect(dependencies.copyFile).not.toHaveBeenCalled()
  })

  it('removes a partial asset directory when copying fails', async () => {
    const dependencies = createDependencies()
    vi.mocked(dependencies.copyFile).mockRejectedValueOnce(new Error('copy failed'))

    await expect(
      commitPreparedStudyAssetImport('material-2', prepared, () => undefined, dependencies)
    ).rejects.toThrow('copy failed')

    expect(dependencies.remove).toHaveBeenCalledWith(
      expect.stringContaining('00000000-0000-4000-8000-000000000001'),
      { recursive: true, force: true }
    )
  })

  it('does not block imports for a different material', async () => {
    const firstDependencies = createDependencies()
    const secondDependencies = createDependencies()
    let releaseFirst: (() => void) | undefined
    vi.mocked(firstDependencies.copyFile).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve
        })
    )

    const first = commitPreparedStudyAssetImport(
      'material-a',
      prepared,
      () => undefined,
      firstDependencies
    )
    const second = commitPreparedStudyAssetImport(
      'material-b',
      prepared,
      () => undefined,
      secondDependencies
    )

    await second
    expect(secondDependencies.copyFile).toHaveBeenCalledTimes(1)
    releaseFirst?.()
    await first
  })
})
