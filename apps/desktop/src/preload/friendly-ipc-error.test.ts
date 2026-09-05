import { describe, expect, it } from 'vitest'

import {
  DEFAULT_USER_ERROR_MESSAGE,
  VALIDATION_USER_ERROR_MESSAGE,
  toFriendlyIpcError,
  toFriendlyIpcErrorMessage
} from './friendly-ipc-error'

describe('toFriendlyIpcErrorMessage', () => {
  it('removes Electron IPC wrapper and keeps the useful domain message', () => {
    expect(
      toFriendlyIpcErrorMessage(
        new Error(
          "Error invoking remote method 'passwords:unlock-vault': Error: Неверный мастер-пароль"
        )
      )
    ).toBe('Неверный мастер-пароль')
  })

  it('removes repeated technical error prefixes', () => {
    expect(
      toFriendlyIpcErrorMessage(
        "Error invoking remote method 'tasks:update-task': Error: Error: Задача уже удалена"
      )
    ).toBe('Задача уже удалена')
  })

  it('keeps an already human-readable message unchanged', () => {
    expect(toFriendlyIpcErrorMessage(new Error('Название не может быть пустым'))).toBe(
      'Название не может быть пустым'
    )
  })

  it('turns validation dumps into a concise user message', () => {
    expect(
      toFriendlyIpcErrorMessage(
        new Error(
          'Error invoking remote method \'habits:update-habit\': Error: [{"code":"unrecognized_keys","keys":["remindersEnabled"],"path":[]}]'
        )
      )
    ).toBe(VALIDATION_USER_ERROR_MESSAGE)
  })

  it('does not expose low-level runtime and database errors', () => {
    expect(toFriendlyIpcErrorMessage(new Error('SQLITE_BUSY: database is locked'))).toBe(
      DEFAULT_USER_ERROR_MESSAGE
    )
    expect(
      toFriendlyIpcErrorMessage(new Error('TypeError: Cannot read properties of undefined'))
    ).toBe(DEFAULT_USER_ERROR_MESSAGE)
  })

  it('uses a fallback for unknown values', () => {
    expect(toFriendlyIpcErrorMessage({ nope: true })).toBe(DEFAULT_USER_ERROR_MESSAGE)
  })

  it('returns a regular Error with the friendly message', () => {
    const error = toFriendlyIpcError(
      new Error(
        "Error invoking remote method 'passwords:unlock-vault': Error: Неверный мастер-пароль"
      )
    )
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Неверный мастер-пароль')
  })
})
