import { describe, expect, it } from 'vitest'

import { createStudyCodeDiagnosticMap } from './study-code-diagnostic-map'

describe('Study Code Mode diagnostic map', () => {
  it('maps canonical engine declaration lines back to the readable source', () => {
    const readable = `@version(1)\nmaterial Lesson "Лекция" {\nheading MainTitle 1 "Заголовок" color="#fff"\ntext Intro """\nТекст\n"""\n}`
    const internal = `@version(1)\n\nmaterial "Лекция" @id("material-id") {\n  heading 1 "Заголовок" @id("heading-id") color="#fff"\n\n  text @id("text-id") """\n    Текст\n  """\n}\n`

    const locations = createStudyCodeDiagnosticMap(readable, internal)

    expect(locations.get(3)).toEqual({ line: 2, column: 1 })
    expect(locations.get(4)).toEqual({ line: 3, column: 1 })
    expect(locations.get(6)).toEqual({ line: 4, column: 1 })
  })
})
