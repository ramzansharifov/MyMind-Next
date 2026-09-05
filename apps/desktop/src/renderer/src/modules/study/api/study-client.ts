import type {
  ApplyStudyCodeInput,
  CreateStudyNodeInput,
  DuplicateStudyNodeResult,
  GetStudyCodeSnapshotInput,
  ImportStudyAssetInput,
  MoveStudyNodeInput,
  OpenStudyAssetInput,
  PreviewStudyCodeInput,
  ResolveStudyInternalLinkTargetInput,
  SaveStudyMaterialInput,
  SearchStudyInternalLinkTargetsInput,
  StudyApi,
  StudyCodeApplyResult,
  StudyCodePreviewResult,
  StudyCodeSnapshot,
  StudyFolderIconName,
  StudyInternalLinkTarget,
  StudyLocalAsset,
  StudyMaterial,
  StudyNode
} from '../../../../../shared/contracts/study'
import type {
  ExportStudyMaterialPdfInput,
  ExportStudyMaterialPdfResult,
  StudyPdfApi
} from '../../../../../shared/contracts/study-pdf'

function getStudyApi(): StudyApi & StudyPdfApi {
  if (!window.api?.study) {
    throw new Error('Study API is unavailable')
  }

  return window.api.study as StudyApi & StudyPdfApi
}

export const studyClient = {
  listNodes(): Promise<StudyNode[]> {
    return getStudyApi().listNodes()
  },

  createNode(input: CreateStudyNodeInput): Promise<StudyNode> {
    return getStudyApi().createNode(input)
  },

  renameNode(id: string, title: string): Promise<StudyNode> {
    return getStudyApi().renameNode({ id, title })
  },

  duplicateNode(id: string): Promise<DuplicateStudyNodeResult> {
    const api = getStudyApi() as Partial<StudyApi>
    if (typeof api.duplicateNode !== 'function') {
      throw new Error('API дублирования не загружен. Полностью перезапусти приложение MyMind.')
    }
    return api.duplicateNode({ id })
  },

  updateFolderIcon(id: string, icon: StudyFolderIconName): Promise<StudyNode> {
    return getStudyApi().updateFolderIcon({ id, icon })
  },

  deleteNode(nodeId: string): Promise<boolean> {
    return getStudyApi().deleteNode(nodeId)
  },

  updateExpansion(id: string, isExpanded: boolean): Promise<StudyNode> {
    return getStudyApi().updateExpansion({ id, isExpanded })
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

  getCodeSnapshot(input: GetStudyCodeSnapshotInput): Promise<StudyCodeSnapshot> {
    return getStudyApi().getCodeSnapshot(input)
  },

  previewCode(input: PreviewStudyCodeInput): Promise<StudyCodePreviewResult> {
    return getStudyApi().previewCode(input)
  },

  applyCode(input: ApplyStudyCodeInput): Promise<StudyCodeApplyResult> {
    return getStudyApi().applyCode(input)
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
  },

  openAsset(input: OpenStudyAssetInput): Promise<void> {
    return getStudyApi().openAsset(input)
  },

  exportMaterialPdf(input: ExportStudyMaterialPdfInput): Promise<ExportStudyMaterialPdfResult> {
    const api = getStudyApi()
    if (typeof api.exportMaterial !== 'function') {
      throw new Error('API экспорта PDF не загружен. Полностью перезапусти приложение MyMind.')
    }
    return api.exportMaterial(input)
  }
}
