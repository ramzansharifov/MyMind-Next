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
  it('round-trips a nested folder tree with readable names and block metadata', () => {
    const tree: StudyCodeTreeFolder = {
      kind: 'folder',
      name: 'Frontend',
      title: 'Frontend',
      icon: 'code',
      children: [
        {
          kind: 'folder',
          name: 'React',
          title: 'React',
          icon: 'book',
          children: [
            {
              kind: 'material',
              name: 'Hooks',
              title: 'Hooks',
              blocks: [
                {
                  name: 'EffectsTitle',
                  type: 'heading',
                  headingLevel: 2,
                  title: 'useEffect',
                  attributes: {
                    color: '#ffffff'
                  }
                },
                {
                  name: 'EffectsIntro',
                  type: 'text',
                  body: 'Эффекты синхронизируют компонент с внешней системой.',
                  html: '<p>Эффекты синхронизируют компонент с внешней системой.</p>'
                },
                {
                  name: 'EffectsCode',
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
    expect(parsed.root).toMatchObject({ kind: 'folder', name: 'Frontend' })
    expect(source).toContain('material Hooks "Hooks"')
    expect(source).toContain('heading EffectsTitle 2 "useEffect"')
    expect(source).not.toContain('@id(')
    expect(serializeStudyCodeAst(parsed)).toBe(source)
  })

  it('allows new entities to omit readable names completely', () => {
    const parsed = parseStudyCode(`@version(1)\n\nfolder "История" {\n  material "Французская революция" {\n    heading 1 "Введение"\n    text """\n      Текст лекции\n    """\n  }\n}\n`)

    expect(parsed.root.name).toBeUndefined()
    expect(parsed.root.kind).toBe('folder')
    if (parsed.root.kind !== 'folder') return
    expect(parsed.root.children[0]).toMatchObject({ kind: 'material', name: undefined })
    const material = parsed.root.children[0]
    if (material?.kind !== 'material') return
    expect(material.blocks[0]).toMatchObject({ blockType: 'heading', name: undefined })
    expect(material.blocks[1]).toMatchObject({ blockType: 'text', name: undefined })
  })

  it('keeps legacy @id syntax readable for compatibility with already copied DSL', () => {
    const source = `@version(1)\n\nmaterial "Материал" @id("material-one") {\n  text @id("text-one") """\n    Текст\n  """\n}\n`
    const parsed = parseStudyCode(source)

    expect(parsed.root).toMatchObject({ id: 'material-one', name: undefined })
    if (parsed.root.kind !== 'material') return
    expect(parsed.root.blocks[0]).toMatchObject({ id: 'text-one', name: undefined })
    expect(serializeStudyCodeAst(parsed)).toBe(source)
  })

  it('chooses a safe multiline delimiter when content contains triple quotes', () => {
    const source = serializeStudyCodeTree({
      kind: 'material',
      name: 'Quotes',
      title: 'Quotes',
      blocks: [
        {
          name: 'QuotedText',
          type: 'text',
          body: 'До разделителя\n"""\nПосле разделителя'
        }
      ]
    })

    expect(source).toContain('text QuotedText """"')
    expect(parseStudyCode(source).root).toMatchObject({
      kind: 'material',
      name: 'Quotes',
      blocks: [
        {
          name: 'QuotedText',
          body: 'До разделителя\n"""\nПосле разделителя'
        }
      ]
    })
  })

  it('formats readable names into the canonical DSL representation', () => {
    const source = `@version(1)\nmaterial History "История" {\ntext Intro """\nТекст\n"""\n}`

    const formatted = formatStudyCodeSource(source)

    expect(formatted).toBe(
      '@version(1)\n\nmaterial History "История" {\n  text Intro """\n    Текст\n  """\n}\n'
    )
  })

  it('distinguishes a block name from the first attribute', () => {
    const source = `@version(1)\n\nmaterial Lesson "Урок" {\n  code Example language="typescript" """\n    const value = 1\n  """\n\n  code language="javascript" """\n    const value = 2\n  """\n}\n`
    const parsed = parseStudyCode(source)
    if (parsed.root.kind !== 'material') return

    expect(parsed.root.blocks[0]).toMatchObject({
      name: 'Example',
      attributes: { language: 'typescript' }
    })
    expect(parsed.root.blocks[1]).toMatchObject({
      name: undefined,
      attributes: { language: 'javascript' }
    })
  })

  it('returns an exact source location for syntax errors', () => {
    const result = parseStudyCodeSafe(
      '@version(1)\n\nmaterial Lesson "Материал" {\n  heading MainTitle 4 "Ошибка"\n}\n'
    )

    expect(result.success).toBe(false)
    if (result.success) return

    expect(result.diagnostic.line).toBe(4)
    expect(result.diagnostic.column).toBeGreaterThan(1)
    expect(result.diagnostic.message).toContain('1, 2 или 3')
  })
})
