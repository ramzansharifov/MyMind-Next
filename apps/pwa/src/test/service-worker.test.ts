/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker(failInstall = false) {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>()
  const cache = {
    addAll: vi.fn(async () => {
      if (failInstall) throw new Error('offline')
    }),
    match: vi.fn(async (path: string) => new Response(`cached:${path}`))
  }
  const caches = {
    open: vi.fn(async () => cache),
    delete: vi.fn(async () => true),
    keys: vi.fn(async () => ['mymind-pwa-old', 'another-app-cache'])
  }
  const clients = {
    claim: vi.fn(async () => {}),
    matchAll: vi.fn(async () => []),
    openWindow: vi.fn(async () => {})
  }
  const fetch = vi.fn(async () => new Response('network'))
  runInNewContext(
    readFileSync('apps/pwa/scripts/service-worker.template.js', 'utf8')
      .replaceAll('__VERSION__', 'test')
      .replaceAll(
        '__PRECACHE__',
        JSON.stringify(['/', '/sqlite/sql-wasm.wasm', '/_next/static/lazy.js'])
      ),
    {
      self: {
        addEventListener: (name: string, handler: (event: Record<string, unknown>) => void) =>
          handlers.set(name, handler),
        location: { origin: 'https://mymind.local' },
        clients
      },
      caches,
      fetch,
      URL
    }
  )
  const fire = async (name: string, fields: Record<string, unknown> = {}) => {
    let pending: Promise<unknown> | undefined
    handlers.get(name)!({
      ...fields,
      waitUntil: (task: Promise<unknown>) => {
        pending = task
      },
      respondWith: (task: Promise<unknown>) => {
        pending = task
      }
    })
    return await pending
  }
  return { fire, cache, caches, clients, fetch }
}

describe('production offline worker', () => {
  it('rejects and removes a partially downloaded application instead of claiming offline readiness', async () => {
    const instance = worker(true)
    await expect(instance.fire('install')).rejects.toThrow('offline')
    expect(instance.caches.delete).toHaveBeenCalledWith('mymind-pwa-test')
  })
  it('opens the cached application and lazy SQLite assets offline, without intercepting LAN traffic', async () => {
    const instance = worker()
    for (const path of ['/', '/sqlite/sql-wasm.wasm', '/_next/static/lazy.js']) {
      const response = (await instance.fire('fetch', {
        request: {
          url: `https://mymind.local${path}`,
          method: 'GET',
          mode: path === '/' ? 'navigate' : 'cors'
        }
      })) as Response
      expect(await response.text()).toBe(`cached:${path}`)
    }
    expect(
      await instance.fire('fetch', {
        request: { url: 'https://mymind.local/api/lan-sync/network', method: 'GET', mode: 'cors' }
      })
    ).toBeUndefined()
    expect(instance.fetch).not.toHaveBeenCalled()
  })
  it('cleans only old application caches and opens the correct module from a notification', async () => {
    const instance = worker()
    await instance.fire('activate')
    expect(instance.caches.delete.mock.calls).toEqual([['mymind-pwa-old']])
    await instance.fire('notificationclick', {
      notification: { close: () => {}, data: { route: 'habits' } }
    })
    expect(instance.clients.openWindow).toHaveBeenCalledWith('/#habits')
  })
})
