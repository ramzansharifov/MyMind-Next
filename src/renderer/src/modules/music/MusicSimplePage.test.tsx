import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MusicItemRecord, MusicOverview } from '../../../../shared/contracts/music'
import { MusicPage } from './MusicSimplePage'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  createPlaylist: vi.fn(),
  updatePlaylist: vi.fn(),
  deletePlaylist: vi.fn(),
  setItemPlaylists: vi.fn()
}))

vi.mock('./api/music-client', () => ({
  musicClient: mocks
}))

const emptyOverview: MusicOverview = { items: [], playlists: [] }

const createdTrack: MusicItemRecord = {
  id: 'track-1',
  title: 'Blinding Lights',
  type: 'track',
  year: 2020,
  coverUrl: null,
  artists: ['The Weeknd'],
  album: '',
  durationSeconds: 200,
  trackCount: null,
  genres: [],
  description: '',
  status: 'listened',
  favorite: false,
  rating: null,
  comments: '',
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue(emptyOverview)
  mocks.getItem.mockResolvedValue(null)
  mocks.createItem.mockResolvedValue(createdTrack)
  mocks.updateItem.mockResolvedValue(createdTrack)
  mocks.deleteItem.mockResolvedValue(true)
  mocks.createPlaylist.mockResolvedValue({
    id: 'playlist-1',
    name: 'Дорога',
    coverUrl: 'https://example.com/road.jpg',
    trackIds: [],
    createdAt: 1,
    updatedAt: 1
  })
  mocks.updatePlaylist.mockResolvedValue({
    id: 'playlist-1',
    name: 'Дорога',
    coverUrl: 'https://example.com/road.jpg',
    trackIds: [],
    createdAt: 1,
    updatedAt: 1
  })
  mocks.deletePlaylist.mockResolvedValue(true)
  mocks.setItemPlaylists.mockResolvedValue([])
})

describe('MusicPage dialogs', () => {
  it('добавляет трек через модальное окно и всегда сохраняет его без обложки', async () => {
    const user = userEvent.setup()
    render(<MusicPage />)

    const addTrackButtons = await screen.findAllByRole('button', { name: 'Добавить трек' })
    await user.click(addTrackButtons[0]!)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Новый трек' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Обложка плейлиста')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Обложка$/)).not.toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Blinding Lights'), 'Blinding Lights')
    await user.type(screen.getByPlaceholderText('The Weeknd'), 'The Weeknd')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(mocks.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Blinding Lights',
          artists: ['The Weeknd'],
          coverUrl: null
        })
      )
    })
    expect(mocks.setItemPlaylists).toHaveBeenCalledWith({ itemId: 'track-1', playlistIds: [] })
  })

  it('создаёт плейлист через модальное окно с отдельным полем обложки', async () => {
    const user = userEvent.setup()
    render(<MusicPage />)

    await user.click(await screen.findByRole('button', { name: 'Новый плейлист' }))

    expect(screen.getByRole('heading', { name: 'Новый плейлист' })).toBeInTheDocument()
    expect(screen.getByLabelText('Обложка плейлиста')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('Например, Дорога'), 'Дорога')
    await user.type(screen.getByLabelText('Обложка плейлиста'), 'https://example.com/road.jpg')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() => {
      expect(mocks.createPlaylist).toHaveBeenCalledWith({
        name: 'Дорога',
        coverUrl: 'https://example.com/road.jpg'
      })
    })
  })
})
