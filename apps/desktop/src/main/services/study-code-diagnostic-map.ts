import { parseStudyCode, type StudyCodeTreeAst } from '../../shared/study-code'

export interface StudyCodeSourceLocation {
  line: number
  column: number
}

export function createStudyCodeDiagnosticMap(
  readableSource: string,
  internalSource: string
): ReadonlyMap<number, StudyCodeSourceLocation> {
  const readable = parseStudyCode(readableSource)
  const internal = parseStudyCode(internalSource)
  const locations = new Map<number, StudyCodeSourceLocation>()

  const visit = (readableNode: StudyCodeTreeAst, internalNode: StudyCodeTreeAst): void => {
    locations.set(internalNode.line, {
      line: readableNode.line,
      column: readableNode.column
    })

    if (readableNode.kind === 'folder' && internalNode.kind === 'folder') {
      const count = Math.min(readableNode.children.length, internalNode.children.length)
      for (let index = 0; index < count; index += 1) {
        visit(readableNode.children[index], internalNode.children[index])
      }
      return
    }

    if (readableNode.kind === 'material' && internalNode.kind === 'material') {
      const count = Math.min(readableNode.blocks.length, internalNode.blocks.length)
      for (let index = 0; index < count; index += 1) {
        locations.set(internalNode.blocks[index].line, {
          line: readableNode.blocks[index].line,
          column: readableNode.blocks[index].column
        })
      }
    }
  }

  visit(readable.root, internal.root)
  return locations
}
