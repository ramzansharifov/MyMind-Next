import type {
  ApplyStudyCodeInput,
  PreviewStudyCodeInput,
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyCodeSnapshot
} from '../../shared/contracts/study'
import {
  applyStudyCode as applyStudyCodeEngine,
  getStudyCodeSnapshot as getStudyCodeSnapshotEngine,
  previewStudyCode as previewStudyCodeEngine
} from '../repositories/study-code.repository'
import { listStudyNodes, renameStudyNode } from '../repositories/study.repository'
import {
  persistStudyCodeNameAssignments,
  toReadableStudyCodeSource,
  translateReadableStudyCodeSource
} from './study-code-identity'

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
    // Ensure every existing entity already has a stable readable name before resolving the edited source.
    const currentSnapshot = getStudyCodeSnapshotEngine(input.nodeId)
    toReadableStudyCodeSource(currentSnapshot.source)

    const translated = translateReadableStudyCodeSource(input.nodeId, input.source)
    const enginePreview = previewStudyCodeEngine({
      ...input,
      source: translated.source
    })

    if (!enginePreview.valid) return enginePreview

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
  const result = await applyStudyCodeEngine({
    ...input,
    source: translated.source
  })

  // New entities already exist after the atomic engine transaction, so their requested DSL names can
  // now be persisted safely. Anonymous entities receive generated names when the snapshot is rebuilt.
  persistStudyCodeNameAssignments(translated.assignments)

  /*
   * The selected Code Mode scope can start below the root of the Study tree.
   * Re-running the existing rename/index path with the unchanged current title
   * rebuilds derived link targets from the complete live tree, including
   * ancestors that are intentionally outside the editable DSL scope.
   */
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
      message: reason instanceof Error ? reason.message : 'Некорректный код'
    }
  }

  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: reason instanceof Error ? reason.message : 'Некорректный код'
  }
}
