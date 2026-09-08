import { describe, expect, it, vi } from 'vitest'
import type { StudyDocument, StudyMaterial, StudyNode } from '@mymind/contracts/study'
import type { StudyRepository } from '@mymind/persistence/study'
import { applyMobileStudyCode, getMobileStudyCodeSnapshot } from './studyCode'

vi.mock('expo-crypto', () => ({
  randomUUID: () => 'generated_test_id'
}))

function createRepository(): {
  repository: StudyRepository
  mutations: {
    createNode: ReturnType<typeof vi.fn<StudyRepository['createNode']>>
    renameNode: ReturnType<typeof vi.fn<StudyRepository['renameNode']>>
    moveNode: ReturnType<typeof vi.fn<StudyRepository['moveNode']>>
    saveMaterial: ReturnType<typeof vi.fn<StudyRepository['saveMaterial']>>
    deleteNode: ReturnType<typeof vi.fn<StudyRepository['deleteNode']>>
  }
} {
  const node: StudyNode = {
    id: 'material_root',
    type: 'material',
    parentId: null,
    title: 'ROOT_SENTINEL',
    position: 0,
    isExpanded: true,
    createdAt: 1,
    updatedAt: 1
  }
  const document: StudyDocument = {
    version: 1,
    blocks: [{ id: 'block_existing', type: 'text', text: 'Existing text' }]
  }
  const material: StudyMaterial = {
    nodeId: node.id,
    document,
    plainText: 'Existing text',
    createdAt: 1,
    updatedAt: 1
  }

  const createNode = vi.fn<StudyRepository['createNode']>(() => {
    throw new Error('createNode must not run before asset preflight')
  })
  const renameNode = vi.fn<StudyRepository['renameNode']>(() => {
    throw new Error('renameNode must not run before asset preflight')
  })
  const moveNode = vi.fn<StudyRepository['moveNode']>(() => {
    throw new Error('moveNode must not run before asset preflight')
  })
  const saveMaterial = vi.fn<StudyRepository['saveMaterial']>(async () => {
    throw new Error('saveMaterial must not run before asset preflight')
  })
  const deleteNode = vi.fn<StudyRepository['deleteNode']>(async () => {
    throw new Error('deleteNode must not run before asset preflight')
  })

  const repository: StudyRepository = {
    listNodes: () => [node],
    createNode,
    renameNode,
    duplicateNode: async () => ({ rootId: node.id, nodes: [node] }),
    updateFolderIcon: () => {
      throw new Error('updateFolderIcon is not expected in this test')
    },
    updateExpansion: () => {
      throw new Error('updateExpansion is not expected in this test')
    },
    moveNode,
    getMaterial: () => material,
    saveMaterial,
    deleteNode,
    searchInternalLinkTargets: () => [],
    resolveInternalLinkTarget: () => null
  }

  return {
    repository,
    mutations: { createNode, renameNode, moveNode, saveMaterial, deleteNode }
  }
}

describe('mobile Study code apply', () => {
  it('validates existing local assets before mutating the Study tree', async () => {
    const { repository, mutations } = createRepository()
    const snapshot = getMobileStudyCodeSnapshot(repository, 'material_root')
    const source = snapshot.source.replace('ROOT_SENTINEL', 'ROOT_RENAMED')
    const validateDocumentAssets = vi.fn(async () => {
      throw new Error('Вложение не найдено')
    })

    await expect(
      applyMobileStudyCode(
        repository,
        'material_root',
        source,
        snapshot.revision,
        false,
        validateDocumentAssets
      )
    ).rejects.toThrow('Вложение не найдено')

    expect(validateDocumentAssets).toHaveBeenCalledTimes(1)
    expect(validateDocumentAssets).toHaveBeenCalledWith('material_root', expect.any(Object))
    expect(mutations.createNode).not.toHaveBeenCalled()
    expect(mutations.renameNode).not.toHaveBeenCalled()
    expect(mutations.moveNode).not.toHaveBeenCalled()
    expect(mutations.saveMaterial).not.toHaveBeenCalled()
    expect(mutations.deleteNode).not.toHaveBeenCalled()
  })
})
