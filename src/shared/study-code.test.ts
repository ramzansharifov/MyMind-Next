import { describe, expect, it } from 'vitest'

import {
  formatStudyCodeSource,
  parseStudyCode,
  parseStudyCodeSafe,
  serializeStudyCodeAst,
  serializeStudyCodeTree,
  type StudyCodeTreeFolder
} from './study-code'

describe('study Code Mode DSL', () => {
  it('round-trips a nested folder tree with stable ids and block metadata', () => {
    const tree: StudyCodeTreeFolder = {
      kind: 'folder',
      id: 'root-folder',
      title: 'Frontend',
      icon: 'code',
      children: [
        {
          kind: 'folder',
          id: 'nested-folder',
          title: 'React',
          icon: 'book',
          children: [
            {
              kind: 'material',
              id: 'material-hooks',
              title: 'Hooks',
              blocks: [
                {
                  id: 'heading-hooks',
                  type: 'heading',
                  headingLevel: 2,
                  title: 'useEffect',
                  attributes: {
                    color: '#ffffff'
                  }
                },
                {
                  id: 'text-hooks',
                  type: 'text',
                  body: 'Эффекты синхронизируют компонент с внешней системой.',
                  html: '<p>Эффекты синхронизируют компонент с внешней системой.</p>'
                },
                {
                  id: 'code-hooks',
                  type: 'code',
                  body: 'useEffect(() => {\n  return subscribe()\n}, [])',
                  attributes: {
                    language: 'typescript'
                  }
                }
              ]
            }
          ]
        }
      ]
    }

    const source = serializeStudyCodeTree(tree)
    const parsed = parseStudyCode(source)

    expect(parsed.version).toBe(1)
    expect(parsed.root.kind).toBe('folder')
    expect(parsed.root.id).toBe('root-folder')
    expect(serializeStudyCodeAst(parsed)).toBe(source)
  })

  it('chooses a safe multiline delimiter when content contains triple quotes', () => {
    const source = serializeStudyCodeTree({
      kind: 'material',
      id: 'material-quotes',
      title: 'Quotes',
      blocks: [
        {
          id: 'text-quotes',
          type: 'text',
          body: 'До разделителя\n"""\nПосле разделителя'
        }
      ]
    })

    expect(source).toContain('text @id("text-quotes") """"')
    expect(parseStudyCode(source).root).toMatchObject({
      kind: 'material',
      id: 'material-quotes',
      blocks: [
        {
          id: 'text-quotes',
          body: 'До разделителя\n"""\nПосле разделителя'
        }
      ]
    })
  })

  it('formats valid source into the canonical DSL representation', () => {
    const source = `@version(1)\nmaterial "Материал" @id("material-one") {\ntext @id("text-one") """\nТекст\n"""\n}`

    const formatted = formatStudyCodeSource(source)

    expect(formatted).toBe(
      '@version(1)\n\nmaterial "Материал" @id("material-one") {\n  text @id("text-one") """\n    Текст\n  """\n}\n'
    )
  })

  it('returns an exact source location for syntax errors', () => {
    const result = parseStudyCodeSafe(
      '@version(1)\n\nmaterial "Материал" @id("material-one") {\n  heading 4 "Ошибка"\n}\n'
    )

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.diagnostic.line).toBe(4)
    expect(result.diagnostic.column).toBeGreaterThan(1)
    expect(result.diagnostic.message).toContain('1, 2 или 3')
  })
})
