import type {
  CreateStudyNodeInput,
  DuplicateStudyNodeResult,
  ImportStudyAssetInput,
  MoveStudyNodeInput,
  ResolveStudyInternalLinkTargetInput,
  SaveStudyMaterialInput,
  SearchStudyInternalLinkTargetsInput,
  StudyApi,
  StudyFolderIconName,
  StudyInternalLinkTarget,
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
  duplicateNode(id: string): Promise<DuplicateStudyNodeResult> {
    return getStudyApi().duplicateNode({
      id
    })
  },
  updateFolderIcon(id: string, icon: StudyFolderIconName): Promise<StudyNode> {
    return getStudyApi().updateFolderIcon({
      id,
      icon
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
  searchInternalLinkTargets(
    input: SearchStudyInternalLinkTargetsInput
  ): Promise<StudyInternalLinkTarget[]> {
    return getStudyApi().searchInternalLinkTargets(input)
  },

  resolveInternalLinkTarget(
    input: ResolveStudyInternalLinkTargetInput
  ): Promise<StudyInternalLinkTarget | null> {
    return getStudyApi().resolveInternalLinkTarget(input)
  },
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null> {
    return getStudyApi().importAsset(input)
  }
}
