import type { StudyDraftHandle } from './study-draft-lifecycle'

export type StudyMaterialTransitionResult =
  { status: 'completed' } | { status: 'busy' } | { status: 'failed'; reason: unknown }

export interface StudyMaterialTransitionInput {
  targetMaterialId: string | null
  transition(): void | Promise<void>
  onSavingChange(saving: boolean): void
}

export class StudyMaterialTransitionCoordinator {
  private active = false

  constructor(private readonly getDraft: () => StudyDraftHandle | null) {}

  async run(input: StudyMaterialTransitionInput): Promise<StudyMaterialTransitionResult> {
    if (this.active) return { status: 'busy' }

    const draft = this.getDraft()
    const needsFlush =
      draft !== null && draft.materialId !== input.targetMaterialId && draft.hasUnsavedChanges()

    this.active = true

    try {
      if (needsFlush) {
        input.onSavingChange(true)
        await draft.flush()
      }

      await input.transition()
      return { status: 'completed' }
    } catch (reason: unknown) {
      return { status: 'failed', reason }
    } finally {
      input.onSavingChange(false)
      this.active = false
    }
  }
}
