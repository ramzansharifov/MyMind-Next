import type {
  CreateStudyNodeInput,
  ImportStudyAssetInput,
  MoveStudyNodeInput,
  SaveStudyMaterialInput,
  StudyApi,
  StudyLocalAsset,
  StudyMaterial,
  StudyNode
} from '../../../../../shared/contracts/study'

function getStudyApi(): StudyApi {
  if (!window.api?.study) {
    throw new Error('Study API is unavailable')
  }

  return window.api.study
}

export const studyClient = {
  listNodes(): Promise<StudyNode[]> {
    return getStudyApi().listNodes()
  },

  createNode(input: CreateStudyNodeInput): Promise<StudyNode> {
    return getStudyApi().createNode(input)
  },

  renameNode(id: string, title: string): Promise<StudyNode> {
    return getStudyApi().renameNode({
      id,
      title
    })
  },

  deleteNode(nodeId: string): Promise<boolean> {
    return getStudyApi().deleteNode(nodeId)
  },

  updateExpansion(id: string, isExpanded: boolean): Promise<StudyNode> {
    return getStudyApi().updateExpansion({
      id,
      isExpanded
    })
  },
  moveNode(input: MoveStudyNodeInput): Promise<StudyNode[]> {
    return getStudyApi().moveNode(input)
  },

  getMaterial(nodeId: string): Promise<StudyMaterial> {
    return getStudyApi().getMaterial(nodeId)
  },

  saveMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial> {
    return getStudyApi().saveMaterial(input)
  },
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null> {
    return getStudyApi().importAsset(input)
  }
}
