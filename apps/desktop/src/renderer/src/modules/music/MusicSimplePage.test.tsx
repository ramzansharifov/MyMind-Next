import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  emptyMusicCollection,
  type MusicCollectionAction,
  type MusicStreamingCollection
} from '@mymind/core/music-collection'
import type { DiscoveredTrack } from '@mymind/core/music-discovery'
import { MusicPage } from './MusicSimplePage'

const mocks = vi.hoisted(() => ({
  streamingCollection: vi.fn(),
  listSourceLinks: vi.fn(),
  saveStreamingCollection: vi.fn(),
  engineSearch: vi.fn(),
  engineResolve: vi.fn(),
  engineRadio: vi.fn(),
  engineDownload: vi.fn(),
  offlineList: vi.fn(),
  offlineResolve: vi.fn(),
  offlineRemove: vi.fn()
}))
vi.mock('./api/music-client', () => ({ musicClient: mocks }))
const track: DiscoveredTrack = {
  key: 'audius:alpha',
  provider: 'audius',
  id: 'alpha',
  title: 'Source track',
  artist: 'Artist',
  durationSeconds: 100,
  artworkUrl: null,
  streamUrl: 'https://api.audius.co/v1/tracks/alpha/stream',
  permalink: null
}
// The actual player UI is covered by MusicListening.test.tsx and the browser suite.
// This boundary exercises loading, compatibility and serialized persistence of the page.
vi.mock('./components/MusicListening', () => ({
  MusicListening: ({
    collection,
    onCollectionAction
  }: {
    collection: MusicStreamingCollection
    onCollectionAction(action: MusicCollectionAction): void
  }): React.JSX.Element => (
    <div>
      <output data-testid="collection">{JSON.stringify(collection)}</output>
      <button onClick={() => onCollectionAction({ type: 'save', track })}>Save source</button>
      <button onClick={() => onCollectionAction({ type: 'like', track })}>Like source</button>
      <button
        onClick={() =>
          onCollectionAction({ type: 'playlist-create', id: 'playlist', name: 'Road', now: 1 })
        }
      >
        Create playlist
      </button>
    </div>
  )
}))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.streamingCollection.mockResolvedValue(null)
  mocks.listSourceLinks.mockResolvedValue({})
  mocks.saveStreamingCollection.mockResolvedValue(undefined)
})
const collection = (): MusicStreamingCollection =>
  JSON.parse(screen.getByTestId('collection').textContent!)

describe('MusicPage source-linked collection', () => {
  it('opens a saved streaming collection without invoking the retired manual catalog', async () => {
    mocks.streamingCollection.mockResolvedValue(
      JSON.stringify({ ...emptyMusicCollection(), tracks: { [track.key]: track } })
    )
    render(<MusicPage />)
    await screen.findByTestId('collection')
    expect(collection().tracks[track.key]).toEqual(track)
    expect(mocks.streamingCollection).toHaveBeenCalledOnce()
    expect(mocks.listSourceLinks).toHaveBeenCalledOnce()
    expect(mocks.saveStreamingCollection).not.toHaveBeenCalled()
  })

  it('migrates source links while ignoring incompatible legacy manual items', async () => {
    mocks.listSourceLinks.mockResolvedValue({ valid: track, manual: { title: 'Old manual item' } })
    render(<MusicPage />)
    await screen.findByTestId('collection')
    expect(Object.keys(collection().tracks)).toEqual([track.key])
    await waitFor(() => expect(mocks.saveStreamingCollection).toHaveBeenCalledOnce())
    expect(JSON.parse(mocks.saveStreamingCollection.mock.calls[0][0]).tracks[track.key]).toEqual(
      track
    )
  })

  it('serializes rapid save, favorite and playlist actions without losing changes', async () => {
    let release!: () => void
    mocks.saveStreamingCollection.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    render(<MusicPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Save source' }))
    await waitFor(() => expect(mocks.saveStreamingCollection).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Like source' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create playlist' }))
    expect(mocks.saveStreamingCollection).toHaveBeenCalledOnce()
    await act(async () => release())
    await waitFor(() => expect(mocks.saveStreamingCollection).toHaveBeenCalledTimes(3))
    const persisted = JSON.parse(
      mocks.saveStreamingCollection.mock.calls[2][0]
    ) as MusicStreamingCollection
    expect(persisted.tracks[track.key]).toEqual(track)
    expect(persisted.likedKeys).toEqual([track.key])
    expect(persisted.playlists[0].name).toBe('Road')
  })

  it('reports a write failure and allows the following action to save again', async () => {
    mocks.saveStreamingCollection.mockRejectedValueOnce(new Error('Storage is busy'))
    render(<MusicPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Save source' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is busy')
    fireEvent.click(screen.getByRole('button', { name: 'Like source' }))
    await waitFor(() => expect(mocks.saveStreamingCollection).toHaveBeenCalledTimes(2))
    expect(JSON.parse(mocks.saveStreamingCollection.mock.calls[1][0]).likedKeys).toEqual([
      track.key
    ])
  })

  it('reports a loading error and keeps the empty collection usable', async () => {
    mocks.streamingCollection.mockRejectedValue(new Error('Cannot read collection'))
    render(<MusicPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot read collection')
    expect(collection()).toEqual(emptyMusicCollection())
  })

  it('acknowledges a legacy resource link without deleting or rewriting its record', async () => {
    const handled = vi.fn()
    render(<MusicPage resourceId="legacy-item" onResourceHandled={handled} />)
    await screen.findByTestId('collection')
    expect(handled).toHaveBeenCalledOnce()
    expect(mocks.saveStreamingCollection).not.toHaveBeenCalled()
  })
})
