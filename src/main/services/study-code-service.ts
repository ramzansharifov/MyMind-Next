import type {
  ApplyStudyCodeInput,
  PreviewStudyCodeInput,
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyCodeSnapshot
} from '../../shared/contracts/study'
import { validateStudyCodeConstraints } from '../../shared/study-code-constraints'
import {
  applyStudyCode as applyStudyCodeEngine,
  getStudyCodeSnapshot as getStudyCodeSnapshotEngine,
  previewStudyCode as previewStudyCodeEngine
} from '../repositories/study-code.repository'
import { listStudyNodes, renameStudyNode } from '../repositories/study.repository'
import {
  createStudyCodeDiagnosticMap,
  type StudyCodeSourceLocation
} from './study-code-diagnostic-map'
import { toReadableStudyCodeSource } from './study-code-name-store'
import {
  persistAppliedStudyCodeNames,
  translateReadableStudyCodeSource
} from './study-code-readable-translation'

class StudyCodeSafetyError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeSafetyError'
  }
}

export function getStudyCodeSnapshot(nodeId: string): StudyCodeSnapshot {
  const snapshot = getStudyCodeSnapshotEngine(nodeId)
  return {
    ...snapshot,
    source: toReadableStudyCodeSource(snapshot.source)
  }
}

export function previewStudyCode(input: PreviewStudyCodeInput): StudyCodePreviewResult {
  try {
    const currentSnapshot = getStudyCodeSnapshotEngine(input.nodeId)
    toReadableStudyCodeSource(currentSnapshot.source)

    const constraintDiagnostics = validateStudyCodeConstraints(input.source)
    if (constraintDiagnostics.length > 0) {
      return {
        valid: false,
        diagnostics: constraintDiagnostics.map((diagnostic) => ({
          severity: 'error' as const,
          ...diagnostic
        })),
        summary: createEmptySummary(),
        destructive: false
      }
    }

    const translated = translateReadableStudyCodeSource(input.nodeId, input.source)
    const enginePreview = previewStudyCodeEngine({
      ...input,
      source: translated.source
    })

    if (!enginePreview.valid) {
      const diagnosticMap = createStudyCodeDiagnosticMap(input.source, translated.source)
      return {
        ...enginePreview,
        diagnostics: enginePreview.diagnostics.map((diagnostic) =>
          remapDiagnostic(diagnostic, diagnosticMap)
        )
      }
    }

    return {
      ...enginePreview,
      destructive: hasDeletions(enginePreview.summary)
    }
  } catch (reason: unknown) {
    return {
      valid: false,
      diagnostics: [toDiagnostic(reason)],
      summary: createEmptySummary(),
      destructive: false
    }
  }
}

export async function applyStudyCode(input: ApplyStudyCodeInput): Promise<StudyCodeApplyResult> {
  const preview = previewStudyCode(input)

  if (!preview.valid) {
    const diagnostic = preview.diagnostics[0]
    throw new StudyCodeSafetyError(
      diagnostic?.message ?? 'DSL содержит некорректные изменения',
      diagnostic?.line ?? 1,
      diagnostic?.column ?? 1
    )
  }

  if (preview.destructive && !input.confirmDestructive) {
    throw new StudyCodeSafetyError(
      'Изменения содержат удаления. Сначала подтвердите деструктивное сохранение.',
      1,
      1
    )
  }

  const translated = translateReadableStudyCodeSource(input.nodeId, input.source)
  let result: StudyCodeApplyResult

  try {
    result = await applyStudyCodeEngine({
      ...input,
      source: translated.source
    })
  } catch (reason: unknown) {
    const diagnosticMap = createStudyCodeDiagnosticMap(input.source, translated.source)
    throw remapThrownDiagnostic(reason, diagnosticMap)
  }

  // UUIDs are generated only by the existing transactional engine. Human-readable aliases are bound
  // afterwards by exact tree/block position, so a user or AI never has to invent database identifiers.
  persistAppliedStudyCodeNames(input.nodeId, translated.pendingNames)

  const appliedRoot = listStudyNodes().find((node) => node.id === input.nodeId)

  if (!appliedRoot) {
    throw new Error('Корневой элемент режима «Код» не найден после сохранения')
  }

  renameStudyNode(appliedRoot.id, appliedRoot.title)

  const snapshot = getStudyCodeSnapshot(input.nodeId)

  return {
    ...result,
    nodes: listStudyNodes(),
    source: snapshot.source,
    revision: snapshot.revision
  }
}

function remapDiagnostic(
  diagnostic: StudyCodeDiagnostic,
  locations: ReadonlyMap<number, StudyCodeSourceLocation>
): StudyCodeDiagnostic {
  const location = locations.get(diagnostic.line)
  return {
    ...diagnostic,
    line: location?.line ?? diagnostic.line,
    column: location?.column ?? diagnostic.column,
    message: humanizeValidationMessage(diagnostic.message)
  }
}

function remapThrownDiagnostic(
  reason: unknown,
  locations: ReadonlyMap<number, StudyCodeSourceLocation>
): unknown {
  if (
    !reason ||
    typeof reason !== 'object' ||
    !('line' in reason) ||
    !('column' in reason) ||
    typeof reason.line !== 'number' ||
    typeof reason.column !== 'number'
  ) {
    if (reason instanceof Error) {
      return new Error(humanizeValidationMessage(reason.message))
    }
    return reason
  }

  const location = locations.get(reason.line)
  return new StudyCodeSafetyError(
    humanizeValidationMessage(reason instanceof Error ? reason.message : 'Некорректный код'),
    location?.line ?? reason.line,
    location?.column ?? reason.column
  )
}

function hasDeletions(summary: StudyCodeChangeSummary): boolean {
  return (
    summary.deletedFolders > 0 ||
    summary.deletedMaterials > 0 ||
    summary.deletedBlocks > 0
  )
}

function createEmptySummary(): StudyCodeChangeSummary {
  return {
    createdFolders: 0,
    createdMaterials: 0,
    deletedFolders: 0,
    deletedMaterials: 0,
    renamedNodes: 0,
    movedNodes: 0,
    createdBlocks: 0,
    deletedBlocks: 0,
    updatedBlocks: 0,
    reorderedBlocks: 0
  }
}

function toDiagnostic(reason: unknown): StudyCodeDiagnostic {
  if (
    reason &&
    typeof reason === 'object' &&
    'line' in reason &&
    'column' in reason &&
    typeof reason.line === 'number' &&
    typeof reason.column === 'number'
  ) {
    return {
      severity: 'error',
      line: reason.line,
      column: reason.column,
      message: humanizeValidationMessage(
        reason instanceof Error ? reason.message : 'Некорректный код'
      )
    }
  }

  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: humanizeValidationMessage(
      reason instanceof Error ? reason.message : 'Некорректный код'
    )
  }
}

function humanizeValidationMessage(message: string): string {
  const tooSmall = message.match(/^Too small: expected .*? to be >=\s*(\d+(?:\.\d+)?)/i)
  if (tooSmall) return `Значение должно быть не меньше ${tooSmall[1]}`

  const tooBig = message.match(/^Too big: expected .*? to be <=\s*(\d+(?:\.\d+)?)/i)
  if (tooBig) return `Значение должно быть не больше ${tooBig[1]}`

  if (/^Invalid input: expected string/i.test(message)) return 'Ожидалось текстовое значение'
  if (/^Invalid input: expected number/i.test(message)) return 'Ожидалось числовое значение'
  if (/^Invalid (?:string|input).*pattern/i.test(message)) return 'Некорректный формат значения'
  if (/^Invalid (?:option|enum)/i.test(message)) return 'Указано недопустимое значение'
  if (/uuid/i.test(message) && /^Invalid/i.test(message)) return 'Некорректный UUID'

  return message
}
