import type { StudyDocument } from '@mymind/contracts/study'
import { desktopRuntime } from './runtime'
export function cleanupBoardsForStudyDocument(id: string, document: StudyDocument): void {
  desktopRuntime().repositories.boards.cleanupStudyDocument(id, document)
}
