import { describe, expect, it } from 'vitest'

import {
  createPasswordItemInputSchema,
  generatePasswordInputSchema,
  setupPasswordVaultInputSchema
} from './passwords'

describe('passwords validation', () => {
  it('requires a sufficiently long master password', () => {
    expect(() => setupPasswordVaultInputSchema.parse({ masterPassword: 'short' })).toThrow(
      'минимум 12 символов'
    )
    expect(
      setupPasswordVaultInputSchema.parse({ masterPassword: 'long-enough-master-password' })
    ).toEqual({ masterPassword: 'long-enough-master-password' })
  })

  it('normalizes text fields and validates unique tags and custom field labels', () => {
    const parsed = createPasswordItemInputSchema.parse({
      groupId: null,
      type: 'login',
      title: '  GitHub  ',
      username: '  user@example.com  ',
      password: 'Secret-123!',
      website: ' github.com ',
      notes: '',
      tags: [' Работа ', 'Git'],
      customFields: [{ label: ' Recovery code ', value: 'abc' }],
      favorite: true
    })

    expect(parsed.title).toBe('GitHub')
    expect(parsed.username).toBe('user@example.com')
    expect(parsed.tags).toEqual(['Работа', 'Git'])
    expect(parsed.customFields[0]?.label).toBe('Recovery code')

    expect(() =>
      createPasswordItemInputSchema.parse({
        ...parsed,
        tags: ['Git', 'git']
      })
    ).toThrow('Теги не должны повторяться')
  })

  it('requires at least one character set in the password generator', () => {
    expect(() =>
      generatePasswordInputSchema.parse({
        length: 20,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        excludeAmbiguous: true
      })
    ).toThrow('Выберите хотя бы один набор символов')
  })
})
