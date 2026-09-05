export const STUDY_PDF_IPC_CHANNELS = {
  exportMaterial: 'study:export-material-pdf'
} as const

export interface ExportStudyMaterialPdfInput {
  nodeId: string
}

export type ExportStudyMaterialPdfResult = { status: 'saved' } | { status: 'cancelled' }

export interface StudyPdfApi {
  exportMaterial(input: ExportStudyMaterialPdfInput): Promise<ExportStudyMaterialPdfResult>
}
