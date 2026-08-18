import { describe, expect, it } from 'vitest'

import {
  findStudyCodeMatches,
  getStudyCodeMatchSegments,
  replaceAllStudyCodeMatches,
  replaceStudyCodeMatch,
  type StudyCodeFindOptions
} from './study-code-find'

const defaultOptions: StudyCodeFindOptions = {
  matchCase: false,
  wholeWord: false,
  useRegex: false
}

describe('study Code Mode find and replace', () => {
  it('finds all literal matches without case sensitivity by default', () => {
    const result = findStudyCodeMatches('Roma roma ROMA', 'roma', defaultOptions)

    expect(result.error).toBeNull()
    expect(result.matches).toHaveLength(3)
    expect(result.matches.map((match) => match.start)).toEqual([0, 5, 10])
  })

  it('supports case-sensitive and unicode whole-word search', () => {
    const source = 'Рим Римский рим Рим'
    const result = findStudyCodeMatches(source, 'Рим', {
      ...defaultOptions,
      matchCase: true,
      wholeWord: true
    })

    expect(result.matches.map((match) => match.text)).toEqual(['Рим', 'Рим'])
    expect(result.matches.map((match) => match.start)).toEqual([0, 15])
  })

  it('reports invalid and zero-length regular expressions instead of throwing', () => {
    expect(
      findStudyCodeMatches('text', '(', { ...defaultOptions, useRegex: true }).error
    ).toContain('Некорректное регулярное выражение')
    expect(
      findStudyCodeMatches('text', '^', { ...defaultOptions, useRegex: true }).error
    ).toBe('Регулярное выражение не должно находить пустую строку')
  })

  it('replaces the active regex match with capture groups', () => {
    const source = 'year=1789; year=1799;'
    const options = { ...defaultOptions, useRegex: true }
    const result = findStudyCodeMatches(source, 'year=(\\d{4})', options)
    const target = result.matches[1]

    expect(target).toBeDefined()
    const replaced = replaceStudyCodeMatch(source, 'year=(\\d{4})', 'date=$1', target!, options)

    expect(replaced.error).toBeNull()
    expect(replaced.source).toBe('year=1789; date=1799;')
  })

  it('treats dollar signs literally in non-regex replace all', () => {
    const replaced = replaceAllStudyCodeMatches('price price', 'price', '$10', defaultOptions)

    expect(replaced.replacements).toBe(2)
    expect(replaced.source).toBe('$10 $10')
  })

  it('returns highlight segments for multiline matches', () => {
    const source = 'first line\nsecond line\nthird'
    const match = {
      start: 6,
      end: 22,
      text: 'line\nsecond line',
      groups: []
    }

    expect(getStudyCodeMatchSegments(source, match)).toEqual([
      { line: 0, column: 6, length: 4 },
      { line: 1, column: 0, length: 11 }
    ])
  })
})
