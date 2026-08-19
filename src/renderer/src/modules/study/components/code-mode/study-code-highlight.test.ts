import { describe, expect, it } from 'vitest'

import {
  highlightStudyCodeSource,
  STUDY_CODE_HIGHLIGHT_MAX_LENGTH
} from './study-code-highlight'

function renderHighlight(source: string): HTMLElement {
  const container = document.createElement('pre')
  container.innerHTML = highlightStudyCodeSource(source)
  return container
}

describe('highlightStudyCodeSource', () => {
  it('highlights the structural parts of the readable Study DSL', () => {
    const source = `@version(1)\n\nfolder Course "Курс" icon="book" {\n  material Lesson "Урок" {\n    heading Intro 2 "Введение" color="#AABBCC"\n    latex Formula view="preview" display="display" align="left" scale=120 """\n      x^2 + 1\n    """\n    divider Line variant="dashed" thickness=2\n  }\n}\n`
    const container = renderHighlight(source)

    expect(container.textContent).toBe(source)
    expect(container.querySelector('.dsl-annotation')?.textContent).toBe('@version')
    expect(container.querySelector('.dsl-entity')?.textContent).toBe('folder')
    expect(container.querySelector('.dsl-block')?.textContent).toBe('heading')
    expect(container.querySelector('.dsl-name')?.textContent).toBe('Course')
    expect(container.querySelector('.dsl-property')?.textContent).toBe('icon')
    expect(container.querySelector('.dsl-string')?.textContent).toBe('"Курс"')
    expect(container.querySelector('.dsl-number')?.textContent).toBe('1')
    expect(container.querySelectorAll('.dsl-delimiter')).toHaveLength(2)
    expect(container.querySelector('.dsl-body')?.textContent).toContain('x^2 + 1')
  })

  it('keeps DSL-looking text inside multiline bodies raw and highlights symbolic links', () => {
    const source = `text Body """\n// Это часть текста, а не комментарий DSL\nfolder Fake "Не структура" { true }\nПерейти: [[Lesson.Intro|Введение]]\n"""\n// Настоящий комментарий DSL\n`
    const container = renderHighlight(source)

    expect(container.textContent).toBe(source)
    expect(container.querySelectorAll('.dsl-comment')).toHaveLength(1)
    expect(container.querySelector('.dsl-comment')?.textContent).toBe('// Настоящий комментарий DSL')
    expect(container.querySelectorAll('.dsl-entity')).toHaveLength(0)
    expect(container.querySelectorAll('.dsl-boolean')).toHaveLength(0)
    expect(container.querySelector('.dsl-internal-link')?.textContent).toBe(
      '[[Lesson.Intro|Введение]]'
    )
  })

  it('handles unfinished multiline bodies without leaking DSL highlighting into their contents', () => {
    const source = `markdown Notes """\n# folder material true\n// still markdown\n`
    const container = renderHighlight(source)

    expect(container.textContent).toBe(source)
    expect(container.querySelectorAll('.dsl-delimiter')).toHaveLength(1)
    expect(container.querySelectorAll('.dsl-entity')).toHaveLength(0)
    expect(container.querySelectorAll('.dsl-comment')).toHaveLength(0)
    expect(container.querySelector('.dsl-body')?.textContent).toContain('// still markdown')
  })

  it('matches parser scalar syntax including booleans, negative numbers and decimals', () => {
    const source = `divider Rule enabled=true thickness=-12.5 offset=.5 disabled=false`
    const container = renderHighlight(source)
    const numbers = Array.from(container.querySelectorAll('.dsl-number')).map(
      (element) => element.textContent
    )
    const booleans = Array.from(container.querySelectorAll('.dsl-boolean')).map(
      (element) => element.textContent
    )

    expect(container.textContent).toBe(source)
    expect(numbers).toEqual(['-12.5', '.5'])
    expect(booleans).toEqual(['true', 'false'])
    expect(Array.from(container.querySelectorAll('.dsl-property')).map((element) => element.textContent)).toEqual([
      'enabled',
      'thickness',
      'offset',
      'disabled'
    ])
  })

  it('keeps exact editor text after escaping HTML-sensitive content', () => {
    const source = `text Html """\n<div data-value="a&b">'hello'</div>\n"""`
    const container = renderHighlight(source)

    expect(container.textContent).toBe(source)
    expect(highlightStudyCodeSource(source)).toContain('&lt;div')
    expect(highlightStudyCodeSource(source)).toContain('a&amp;b')
  })

  it('falls back to escaped plain text for very large sources', () => {
    const source = `<${'x'.repeat(STUDY_CODE_HIGHLIGHT_MAX_LENGTH)}`
    const highlighted = highlightStudyCodeSource(source)

    expect(highlighted).toStartWith('&lt;')
    expect(highlighted).not.toContain('<span')
  })
})
