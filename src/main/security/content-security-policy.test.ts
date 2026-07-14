import { describe, expect, it } from 'vitest'

import {
  createContentSecurityPolicy,
  shouldApplyAppContentSecurityPolicy
} from './content-security-policy'

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
    expect(policy).toContain("script-src 'self' 'unsafe-inline'")
  })

  it('contains mandatory restrictions', () => {
    const policy = createContentSecurityPolicy(false)

    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("script-src 'self'")
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'none'")
    expect(policy).toContain("form-action 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain('frame-src https://www.youtube-nocookie.com')
    expect(policy).not.toContain("'unsafe-eval'")
  })
})

describe('shouldApplyAppContentSecurityPolicy', () => {
  const production = {
    development: false,
    rendererUrl: 'file:///C:/MyMind/resources/app.asar/out/renderer/index.html'
  }
  const development = {
    development: true,
    rendererUrl: 'http://localhost:5173/'
  }

  it('applies CSP only to the configured production renderer main frame', () => {
    expect(
      shouldApplyAppContentSecurityPolicy(
        { url: production.rendererUrl, resourceType: 'mainFrame' },
        production
      )
    ).toBe(true)
  })

  it('applies CSP only to the configured development renderer main frame', () => {
    expect(
      shouldApplyAppContentSecurityPolicy(
        { url: 'http://localhost:5173/#study', resourceType: 'mainFrame' },
        development
      )
    ).toBe(true)
  })

  it.each([
    ['YouTube subframe', 'https://www.youtube-nocookie.com/embed/video', 'subFrame'],
    ['HTTPS image', 'https://images.example/photo.png', 'image'],
    ['HTTPS media', 'https://media.example/video.mp4', 'media'],
    ['local asset', 'mymind-asset://local/material/asset/file.png', 'media'],
    ['unknown main frame', 'https://example.com/', 'mainFrame']
  ])('does not apply CSP to %s', (_label, url, resourceType) => {
    expect(shouldApplyAppContentSecurityPolicy({ url, resourceType }, development)).toBe(false)
  })
})
