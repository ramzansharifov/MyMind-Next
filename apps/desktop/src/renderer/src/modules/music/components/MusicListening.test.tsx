import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyMusicCollection } from '@mymind/core/music-collection'
import type { DiscoveredTrack } from '@mymind/core/music-discovery'
import { MusicListening } from './MusicListening'

const track: DiscoveredTrack = {
  key: 'youtube:abcdefghijk',
  provider: 'youtube',
  id: 'abcdefghijk',
  title: 'Test track',
  artist: 'Test artist',
  durationSeconds: 205,
  artworkUrl: 'https://example.com/first.jpg',
  streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  permalink: null
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
})
afterEach(() => vi.unstubAllGlobals())

describe('music state after quality-gate cleanup', () => {
  it('opens the local collection offline and resumes discovery on reconnect', async () => {
    const connection = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ tracks: [track] }))
    vi.stubGlobal('fetch', fetcher)
    render(
      <MusicListening
        collection={{ ...emptyMusicCollection(), tracks: { [track.key]: track } }}
        onCollectionAction={vi.fn()}
        searchProxy
      />
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Нет подключения')
    expect(fetcher).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Сохранённое (1)' }))
    expect(screen.getByRole('button', { name: 'Воспроизвести Test track' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Поиск' }))
    connection.mockReturnValue(true)
    fireEvent.online(window)
    await waitFor(() => expect(fetcher).toHaveBeenCalled())
  })
  it('retries changed artwork after an image failure and reads saved provider configuration', async () => {
    localStorage.setItem('mymind.music.jamendo-client-id', 'saved-client')
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      const query = JSON.parse(String(init?.body)) as { query: string; jamendoClientId: string }
      expect(query.jamendoClientId).toBe('saved-client')
      return Response.json({
        tracks: [
          {
            ...track,
            artworkUrl: query.query ? 'https://example.com/second.jpg' : track.artworkUrl
          }
        ]
      })
    })
    vi.stubGlobal('fetch', fetcher)
    const view = render(
      <MusicListening
        collection={emptyMusicCollection()}
        onCollectionAction={vi.fn()}
        searchProxy
      />
    )
    await screen.findByRole('button', { name: 'Воспроизвести Test track' })
    const first = view.container.querySelector(
      '.mymusic-art img[src="https://example.com/first.jpg"]'
    )!
    expect(first).not.toBeNull()
    fireEvent.error(first)
    expect(first).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Поиск музыки' }), {
      target: { value: 'updated' }
    })
    await waitFor(() =>
      expect(
        view.container.querySelector('img[src="https://example.com/second.jpg"]')
      ).not.toBeNull()
    )
  })

  it('prepares a selected engine track and starts playback when its stream resolves', async () => {
    let resolveStream!: (response: Response) => void
    const stream = new Promise<Response>((resolve) => {
      resolveStream = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async (input) =>
        String(input).endsWith('/resolve') ? stream : Response.json({ tracks: [track] })
      )
    )
    const view = render(
      <MusicListening
        collection={emptyMusicCollection()}
        onCollectionAction={vi.fn()}
        searchProxy
      />
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Воспроизвести Test track' }))
    await act(async () => {
      resolveStream(Response.json({ streamUrl: 'https://example.com/audio.mp3' }))
    })
    await waitFor(() =>
      expect(view.container.querySelector('audio')?.src).toBe('https://example.com/audio.mp3')
    )
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
  })
})
