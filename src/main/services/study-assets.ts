import { app, dialog, net, protocol, type BrowserWindow, type OpenDialogOptions } from 'electron'
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import type {
  ImportStudyAssetInput,
  StudyAssetKind,
  StudyBlock,
  StudyDocument,
  StudyLocalAsset
} from '../../shared/contracts/study'

export const STUDY_ASSET_SCHEME = 'mymind-asset'

const SAFE_ASSET_SEGMENT = /^[a-zA-Z0-9_-]{1,120}$/

const FILE_KIND_EXTENSIONS = {
  image: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp']),
  video: new Set(['mp4', 'm4v', 'mov', 'webm', 'ogv', 'ogg']),
  audio: new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm'])
} satisfies Record<Exclude<StudyAssetKind, 'file'>, Set<string>>

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',

  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',

  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',

  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

let schemeRegistered = false

export function registerStudyAssetScheme(): void {
  if (schemeRegistered) {
    return
  }

  protocol.registerSchemesAsPrivileged([
    {
      scheme: STUDY_ASSET_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true
      }
    }
  ])

  schemeRegistered = true
}

export function registerStudyAssetProtocol(): void {
  protocol.handle(STUDY_ASSET_SCHEME, async (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: {
          allow: 'GET, HEAD'
        }
      })
    }

    const filePath = resolveStudyAssetRequest(request.url)

    if (!filePath) {
      return new Response('Invalid asset request', {
        status: 400
      })
    }

    const fileStats = await stat(filePath).catch(() => null)

    if (!fileStats || !fileStats.isFile()) {
      return new Response('Asset not found', {
        status: 404
      })
    }

    return net.fetch(pathToFileURL(filePath).toString(), {
      method: request.method,
      headers: request.headers
    })
  })
}

export async function importStudyAsset(
  input: ImportStudyAssetInput,
  parentWindow: BrowserWindow | null
): Promise<StudyLocalAsset | null> {
  assertSafeAssetSegment(input.nodeId, 'material id')

  const options: OpenDialogOptions = {
    title: getPickerTitle(input.kind),
    buttonLabel: 'Добавить',
    properties: ['openFile'],
    filters: getPickerFilters(input.kind)
  }

  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const sourcePath = result.filePaths[0]

  const fileStats = await stat(sourcePath)

  if (!fileStats.isFile()) {
    throw new Error('Выбранный объект не является файлом')
  }

  const extension = extname(sourcePath).slice(1).toLowerCase()

  validateExtension(input.kind, extension)

  const assetId = randomUUID()

  const fileName = sanitizeStudyAssetFileName(basename(sourcePath))

  const assetDirectory = join(getStudyAssetsRoot(), input.nodeId, assetId)

  const targetPath = join(assetDirectory, fileName)

  try {
    await mkdir(assetDirectory, {
      recursive: true
    })

    await copyFile(sourcePath, targetPath)
  } catch (reason: unknown) {
    await rm(assetDirectory, {
      recursive: true,
      force: true
    }).catch(() => undefined)

    throw reason
  }

  return {
    id: assetId,
    materialId: input.nodeId,
    name: fileName,
    mimeType: getStudyAssetMimeType(extension),
    size: fileStats.size,
    url: createStudyAssetUrl({
      materialId: input.nodeId,
      assetId,
      fileName
    })
  }
}

type StudyAssetBlock = Extract<
  StudyBlock,
  {
    type: StudyAssetKind
  }
>

function isStudyAssetBlock(block: StudyBlock): block is StudyAssetBlock {
  return (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  )
}
export async function duplicateStudyAssetsForDocument(
  targetMaterialId: string,
  document: StudyDocument
): Promise<StudyDocument> {
  assertSafeAssetSegment(targetMaterialId, 'target material id')

  const duplicatedAssets = new Map<string, StudyLocalAsset>()

  try {
    const blocks: StudyBlock[] = []

    for (const block of document.blocks) {
      if (!isStudyAssetBlock(block) || block.source.type !== 'local' || !block.source.asset) {
        blocks.push(block)
        continue
      }

      const sourceAsset = block.source.asset

      assertSafeAssetSegment(sourceAsset.materialId, 'source material id')

      assertSafeAssetSegment(sourceAsset.id, 'source asset id')

      if (!isSafeAssetFileName(sourceAsset.name)) {
        throw new Error('Некорректное имя вложения')
      }

      const sourceAssetKey = `${sourceAsset.materialId}:${sourceAsset.id}`

      let duplicatedAsset = duplicatedAssets.get(sourceAssetKey)

      if (!duplicatedAsset) {
        const sourcePath = join(
          getStudyAssetsRoot(),
          sourceAsset.materialId,
          sourceAsset.id,
          sourceAsset.name
        )

        const sourceStats = await stat(sourcePath).catch(() => null)

        if (!sourceStats || !sourceStats.isFile()) {
          throw new Error(`Вложение «${sourceAsset.name}» не найдено`)
        }

        const targetAssetId = randomUUID()

        const targetDirectory = join(getStudyAssetsRoot(), targetMaterialId, targetAssetId)

        const targetPath = join(targetDirectory, sourceAsset.name)

        await mkdir(targetDirectory, {
          recursive: true
        })

        await copyFile(sourcePath, targetPath)

        duplicatedAsset = {
          ...sourceAsset,
          id: targetAssetId,
          materialId: targetMaterialId,
          size: sourceStats.size,
          url: createStudyAssetUrl({
            materialId: targetMaterialId,
            assetId: targetAssetId,
            fileName: sourceAsset.name
          })
        }

        duplicatedAssets.set(sourceAssetKey, duplicatedAsset)
      }

      blocks.push({
        ...block,
        source: {
          type: 'local',
          asset: duplicatedAsset
        }
      } as StudyBlock)
    }

    return {
      ...document,
      blocks
    }
  } catch (reason: unknown) {
    await rm(join(getStudyAssetsRoot(), targetMaterialId), {
      recursive: true,
      force: true
    }).catch(() => undefined)

    throw reason
  }
}
export async function cleanupStudyAssetsForDocument(
  materialId: string,
  document: StudyDocument
): Promise<void> {
  assertSafeAssetSegment(materialId, 'material id')

  const referencedAssetIds = new Set(
    document.blocks.flatMap((block) => {
      if (
        !isStudyAssetBlock(block) ||
        block.source.type !== 'local' ||
        !block.source.asset ||
        block.source.asset.materialId !== materialId
      ) {
        return []
      }

      return [block.source.asset.id]
    })
  )

  const materialDirectory = join(getStudyAssetsRoot(), materialId)

  const entries = await readdir(materialDirectory, {
    withFileTypes: true
  }).catch(() => [])

  await Promise.all(
    entries
      .filter((entry) => !entry.isDirectory() || !referencedAssetIds.has(entry.name))
      .map((entry) =>
        rm(join(materialDirectory, entry.name), {
          recursive: true,
          force: true
        })
      )
  )
}

export async function removeStudyAssetsForMaterials(materialIds: string[]): Promise<void> {
  const uniqueMaterialIds = [...new Set(materialIds)].filter((materialId) =>
    SAFE_ASSET_SEGMENT.test(materialId)
  )

  await Promise.all(
    uniqueMaterialIds.map((materialId) =>
      rm(join(getStudyAssetsRoot(), materialId), {
        recursive: true,
        force: true
      })
    )
  )
}

function getStudyAssetsRoot(): string {
  return join(app.getPath('documents'), 'MyMind', 'Attachments')
}

function createStudyAssetUrl({
  materialId,
  assetId,
  fileName
}: {
  materialId: string
  assetId: string
  fileName: string
}): string {
  return `${STUDY_ASSET_SCHEME}://local/${encodeURIComponent(materialId)}/${encodeURIComponent(
    assetId
  )}/${encodeURIComponent(fileName)}`
}

function resolveStudyAssetRequest(requestUrl: string): string | null {
  try {
    const parsedUrl = new URL(requestUrl)

    if (parsedUrl.protocol !== `${STUDY_ASSET_SCHEME}:` || parsedUrl.hostname !== 'local') {
      return null
    }

    const segments = parsedUrl.pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment))

    if (segments.length !== 3) {
      return null
    }

    const [materialId, assetId, fileName] = segments

    if (
      !SAFE_ASSET_SEGMENT.test(materialId) ||
      !SAFE_ASSET_SEGMENT.test(assetId) ||
      !isSafeAssetFileName(fileName)
    ) {
      return null
    }

    const root = resolve(getStudyAssetsRoot())

    const filePath = resolve(root, materialId, assetId, fileName)

    const relativePath = relative(root, filePath)

    if (!relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)) {
      return null
    }

    return filePath
  } catch {
    return null
  }
}

function getPickerTitle(kind: StudyAssetKind): string {
  if (kind === 'image') {
    return 'Выбрать изображение'
  }

  if (kind === 'video') {
    return 'Выбрать видео'
  }

  if (kind === 'audio') {
    return 'Выбрать аудио'
  }

  return 'Выбрать файл'
}

function getPickerFilters(kind: StudyAssetKind): OpenDialogOptions['filters'] {
  if (kind === 'image') {
    return [
      {
        name: 'Изображения',
        extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp']
      }
    ]
  }

  if (kind === 'video') {
    return [
      {
        name: 'Видео',
        extensions: ['mp4', 'm4v', 'mov', 'webm', 'ogv', 'ogg']
      }
    ]
  }

  if (kind === 'audio') {
    return [
      {
        name: 'Аудио',
        extensions: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm']
      }
    ]
  }

  return [
    {
      name: 'Все файлы',
      extensions: ['*']
    }
  ]
}

function validateExtension(kind: StudyAssetKind, extension: string): void {
  if (kind === 'file') {
    return
  }

  if (!extension || !FILE_KIND_EXTENSIONS[kind].has(extension)) {
    throw new Error('Формат выбранного файла не поддерживается для этого типа блока')
  }
}

function getStudyAssetMimeType(extension: string): string {
  return MIME_TYPES[extension] ?? 'application/octet-stream'
}

function sanitizeStudyAssetFileName(value: string): string {
  const originalName = basename(value).normalize('NFC')

  const originalExtension = extname(originalName)

  const extension = originalExtension
    .replace(/[^.a-zA-Z0-9]/g, '')
    .slice(0, 16)
    .toLowerCase()

  const rawStem = originalName.slice(0, originalName.length - originalExtension.length)

  const stem = replaceControlCharacters(rawStem)
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim()
    .slice(0, 150)

  return `${stem || 'file'}${extension}`
}

function isSafeAssetFileName(value: string): boolean {
  return (
    Boolean(value) &&
    value.length <= 180 &&
    basename(value) === value &&
    !hasControlCharacters(value)
  )
}

function replaceControlCharacters(value: string): string {
  return Array.from(value)
    .map((character) => (character.charCodeAt(0) <= 31 ? '_' : character))
    .join('')
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => character.charCodeAt(0) <= 31)
}
function assertSafeAssetSegment(value: string, label: string): void {
  if (!SAFE_ASSET_SEGMENT.test(value)) {
    throw new Error(`Invalid study asset ${label}`)
  }
}
