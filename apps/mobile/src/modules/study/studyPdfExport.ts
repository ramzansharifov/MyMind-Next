import { File } from 'expo-file-system'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import type {
  StudyDocument,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import type { StudyRichTextInternalLink } from '../../shared/ui/studyRichText'
import { buildStudyMaterialPdfHtml } from './studyPdf'

export interface ExportStudyMaterialPdfOptions {
  title: string
  document: StudyDocument
  resolveAssetUri: (asset: StudyLocalAsset) => string | null
  resolveInternalLinkTarget?: (
    link: StudyRichTextInternalLink
  ) => StudyInternalLinkTarget | null
}

async function localAssetDataUri(
  asset: StudyLocalAsset,
  resolveAssetUri: ExportStudyMaterialPdfOptions['resolveAssetUri']
): Promise<string | null> {
  const uri = resolveAssetUri(asset)
  if (!uri) return null
  const file = new File(uri)
  if (!file.exists) return null
  const base64 = await file.base64()
  const mimeType = asset.mimeType || file.type || 'application/octet-stream'
  return `data:${mimeType};base64,${base64}`
}

export async function exportStudyMaterialPdf(
  options: ExportStudyMaterialPdfOptions
): Promise<{ uri: string; numberOfPages: number }> {
  const assetCache = new Map<string, Promise<string | null>>()
  const html = await buildStudyMaterialPdfHtml({
    title: options.title,
    document: options.document,
    resolveInternalLinkTarget: options.resolveInternalLinkTarget,
    resolveAssetDataUri: (asset) => {
      const key = `${asset.materialId}:${asset.id}`
      const cached = assetCache.get(key)
      if (cached) return cached
      const pending = localAssetDataUri(asset, options.resolveAssetUri)
      assetCache.set(key, pending)
      return pending
    }
  })

  const result = await Print.printToFileAsync({
    html,
    width: 595,
    height: 842,
    margins: { top: 28, right: 28, bottom: 34, left: 28 },
    textZoom: 100
  })

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Системное меню сохранения PDF недоступно на этом устройстве')
  }

  await Sharing.shareAsync(result.uri, {
    dialogTitle: `${options.title}.pdf`,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf'
  })

  return result
}
