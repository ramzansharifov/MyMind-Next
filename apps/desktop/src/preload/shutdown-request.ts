import type { ShutdownRequest } from '../shared/contracts/system'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function parseShutdownRequest(rawRequest: unknown): ShutdownRequest {
  if (typeof rawRequest !== 'object' || rawRequest === null || Array.isArray(rawRequest)) {
    throw new Error('Invalid shutdown request')
  }

  const requestId = (
    rawRequest as {
      requestId?: unknown
    }
  ).requestId

  if (typeof requestId !== 'string' || !UUID_PATTERN.test(requestId)) {
    throw new Error('Invalid shutdown request id')
  }

  return {
    requestId
  }
}
