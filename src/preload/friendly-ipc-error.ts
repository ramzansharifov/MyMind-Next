export const DEFAULT_USER_ERROR_MESSAGE = 'Не удалось выполнить действие. Попробуйте ещё раз.'
export const VALIDATION_USER_ERROR_MESSAGE =
  'Не удалось обработать данные. Проверьте введённые значения и попробуйте ещё раз.'

function getRawMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === 'string') return reason
  if (
    typeof reason === 'object' &&
    reason !== null &&
    'message' in reason &&
    typeof (reason as { message?: unknown }).message === 'string'
  ) {
    return (reason as { message: string }).message
  }
  return ''
}

function stripTechnicalWrappers(value: string): string {
  let message = value.trim()

  for (let index = 0; index < 6; index += 1) {
    const previous = message
    message = message
      .replace(/^Error invoking remote method\s+(['"`]).+?\1:\s*/i, '')
      .replace(/^(?:Error|InvokeError|UnhandledPromiseRejection):\s*/i, '')
      .trim()
    if (message === previous) break
  }

  const stackStart = message.search(/\n\s+at\s+/)
  if (stackStart >= 0) message = message.slice(0, stackStart).trim()

  return message
}

function isValidationDump(message: string): boolean {
  const lower = message.toLowerCase()
  if (
    lower.includes('unrecognized_keys') ||
    lower.includes('invalid_type') ||
    lower.includes('invalid_union') ||
    lower.includes('too_small') ||
    lower.includes('too_big') ||
    lower.includes('zoderror')
  ) {
    return true
  }

  return (
    (message.startsWith('[') || message.startsWith('{')) &&
    /"(?:code|path|keys|expected|received|validation)"\s*:/.test(message)
  )
}

function isTechnicalFailure(message: string): boolean {
  return (
    /^(?:TypeError|ReferenceError|RangeError|SyntaxError):/i.test(message) ||
    /\b(?:SQLITE_[A-Z_]+|ENOENT|EACCES|EPERM|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ERR_[A-Z_]+)\b/.test(
      message
    ) ||
    /Cannot read properties of|is not a function|Failed to fetch|NetworkError|fetch failed/i.test(
      message
    )
  )
}

function translateKnownMessage(message: string): string {
  if (/^invalid master password$/i.test(message)) return 'Неверный мастер-пароль'
  if (/^vault is locked$/i.test(message)) {
    return 'Хранилище заблокировано. Введите мастер-пароль.'
  }
  if (/^vault is not (?:initialized|configured)$/i.test(message)) {
    return 'Хранилище ещё не настроено.'
  }
  return message
}

export function toFriendlyIpcErrorMessage(reason: unknown): string {
  const rawMessage = getRawMessage(reason)
  if (!rawMessage.trim()) return DEFAULT_USER_ERROR_MESSAGE

  const message = stripTechnicalWrappers(rawMessage)
  if (!message) return DEFAULT_USER_ERROR_MESSAGE
  if (isValidationDump(message)) return VALIDATION_USER_ERROR_MESSAGE
  if (isTechnicalFailure(message)) return DEFAULT_USER_ERROR_MESSAGE

  return translateKnownMessage(message)
}

export function toFriendlyIpcError(reason: unknown): Error {
  return new Error(toFriendlyIpcErrorMessage(reason))
}
