import { describe, expect, it } from 'vitest'

import { parseShutdownRequest } from './shutdown-request'

const invalidRequests: unknown[] = [
  null,
  undefined,
  [],
  {},
  {
    requestId: ''
  },
  {
    requestId: 42
  },
  {
    requestId: 'not-a-uuid'
  },
  {
    requestId: '6e0b583b-55f7-0da2-a93e-7852ab1345b7'
  },
  {
    requestId: '6e0b583b-55f7-4da2-093e-7852ab1345b7'
  }
]

describe('parseShutdownRequest', () => {
  it('accepts a canonical UUID request id', () => {
    expect(
      parseShutdownRequest({
        requestId: '6e0b583b-55f7-4da2-a93e-7852ab1345b7'
      })
    ).toEqual({
      requestId: '6e0b583b-55f7-4da2-a93e-7852ab1345b7'
    })
  })

  it('returns only the validated request id', () => {
    expect(
      parseShutdownRequest({
        requestId: '6e0b583b-55f7-4da2-a93e-7852ab1345b7',
        unexpected: 'ignored'
      })
    ).toEqual({
      requestId: '6e0b583b-55f7-4da2-a93e-7852ab1345b7'
    })
  })

  it.each(invalidRequests)('rejects invalid shutdown request %#', (rawRequest) => {
    expect(() => {
      parseShutdownRequest(rawRequest)
    }).toThrow()
  })
})
