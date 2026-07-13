import { describe, expect, it } from 'vitest'

import { createContentSecurityPolicy } from './content-security-policy'

describe('createContentSecurityPolicy', () => {
  it('keeps production free of development endpoints', () => {
    const policy = createContentSecurityPolicy(false)

    expect(policy).not.toContain('localhost')
    expect(policy).not.toContain('127.0.0.1')
    expect(policy).not.toContain('ws:')
    expect(policy).toContain("connect-src 'self'")
  })

  it('allows Vite endpoints only in development', () => {
    const policy = createContentSecurityPolicy(true)

    expect(policy).toContain('http://localhost:*')
    expect(policy).toContain('ws://localhost:*')
  })

  it('contains mandatory restrictions', () => {
    const policy = createContentSecurityPolicy(false)

    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'none'")
    expect(policy).toContain("form-action 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain('frame-src https://www.youtube-nocookie.com')
    expect(policy).not.toContain("'unsafe-eval'")
  })
})
