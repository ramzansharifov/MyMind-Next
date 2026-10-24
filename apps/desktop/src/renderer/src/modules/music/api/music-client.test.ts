import { afterEach, describe, expect, it, vi } from 'vitest'
import { musicClient } from './music-client'

describe('Desktop music preload compatibility', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports missing offline methods without throwing during render or effects', async () => {
    vi.stubGlobal('window', { api: { music: {} } })
    await expect(musicClient.offlineList()).rejects.toThrow('Полностью закрой MyMind')
    await expect(
      musicClient.offlineResolve({ provider: 'youtube', id: 'abcdefghijk' })
    ).rejects.toThrow('перезапуск MyMind')
    await expect(
      musicClient.offlineRemove({ provider: 'youtube', id: 'abcdefghijk' })
    ).rejects.toThrow('перезапуск MyMind')
  })

  it('uses refreshed preload methods when Electron has been restarted', async () => {
    vi.stubGlobal('window', {
      api: {
        music: {
          offlineList: vi.fn(async () => ['audius:1']),
          offlineResolve: vi.fn(async () => 'http://127.0.0.1:1234/audio/session'),
          offlineRemove: vi.fn(async () => true)
        }
      }
    })
    expect(await musicClient.offlineList()).toEqual(['audius:1'])
    expect(await musicClient.offlineResolve({ provider: 'audius', id: '1' })).toContain('127.0.0.1')
    expect(await musicClient.offlineRemove({ provider: 'audius', id: '1' })).toBe(true)
  })
})
