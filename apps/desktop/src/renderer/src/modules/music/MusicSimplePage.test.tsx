import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MusicItemRecord, MusicOverview } from '../../../../shared/contracts/music'
import { MusicPage } from './MusicSimplePage'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getItem: vi.fn(),
  createItem: vi.fn(),
  createItems: vi.fn(),
  upsertLibrary: vi.fn(),
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
  artist: 'The Weeknd',
  year: 2020,
  durationSeconds: 200,
  favorite: false,
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue(emptyOverview)
  mocks.getItem.mockResolvedValue(null)
  mocks.createItem.mockResolvedValue(createdTrack)
  mocks.upsertLibrary.mockResolvedValue([createdTrack])
  mocks.upsertLibrary.mockResolvedValue({
    overview: { items: [createdTrack], playlists: [] },
    itemsCreated: 1,
    itemsUpdated: 0,
    playlistsCreated: 0,
    playlistsUpdated: 0
  })
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
  it('размещает поиск и вкладки внутри ModuleHeader как в задачах', async () => {
    const { container } = render(<MusicPage />)

    await screen.findByRole('heading', { name: 'Музыка' })

    const header = container.querySelector('[data-module-header]')
    const navigation = container.querySelector('[data-music-library-navigation]')

    expect(header).not.toBeNull()
    expect(navigation).not.toBeNull()
    expect(header?.contains(navigation)).toBe(true)
  })

  it('не падает на старой записи с artists после hot reload', async () => {
    mocks.listOverview.mockResolvedValue({
      items: [
        {
          id: 'legacy-track',
          title: 'Legacy track',
          artists: ['Legacy Artist'],
          year: 2020,
          durationSeconds: 180,
          favorite: false,
          createdAt: 1,
          updatedAt: 2
        }
      ],
      playlists: []
    })

    render(<MusicPage />)

    expect(await screen.findByText('Legacy track')).toBeInTheDocument()
    expect(screen.getByText('Legacy Artist')).toBeInTheDocument()
  })

  it('показывает полный JSON библиотеки и отдельного трека', async () => {
    const user = userEvent.setup()
    const playlist = {
      id: 'playlist-1',
      name: 'Дорога',
      coverUrl: null,
      trackIds: [createdTrack.id],
      createdAt: 2,
      updatedAt: 3
    }
    const overview: MusicOverview = { items: [createdTrack], playlists: [playlist] }
    mocks.listOverview.mockResolvedValue(overview)

    render(<MusicPage />)

    await screen.findByText('Blinding Lights')
    await user.click(screen.getByRole('button', { name: 'JSON библиотеки' }))

    const libraryJson = screen.getByRole('textbox', { name: 'JSON данных музыки' })
    expect(JSON.parse((libraryJson as HTMLTextAreaElement).value)).toEqual(overview)
    expect((libraryJson as HTMLTextAreaElement).value).toContain('"trackIds"')

    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    await user.click(screen.getByRole('button', { name: 'JSON трека «Blinding Lights»' }))

    const trackJson = screen.getByRole('textbox', { name: 'JSON данных музыки' })
    expect(JSON.parse((trackJson as HTMLTextAreaElement).value)).toEqual(createdTrack)
    expect((trackJson as HTMLTextAreaElement).value).not.toContain('"coverUrl"')

    await user.click(screen.getByRole('button', { name: 'Закрыть' }))
    await user.click(screen.getByRole('tab', { name: 'Плейлисты' }))
    await user.click(screen.getByRole('button', { name: 'JSON плейлиста «Дорога»' }))

    const playlistJson = screen.getByRole('textbox', { name: 'JSON данных музыки' })
    expect(JSON.parse((playlistJson as HTMLTextAreaElement).value)).toEqual(playlist)
    expect((playlistJson as HTMLTextAreaElement).value).toContain('"coverUrl"')
  })

  it('импортирует музыкальные записи из JSON', async () => {
    const user = userEvent.setup()
    render(<MusicPage />)

    await screen.findByRole('heading', { name: 'Музыка' })
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'JSON музыки' }), {
      target: {
        value: '{"title":"Blinding Lights","artist":"The Weeknd","year":2019}'
      }
    })

    await user.click(screen.getByRole('button', { name: 'Применить JSON' }))

    await waitFor(() =>
      expect(mocks.upsertLibrary).toHaveBeenCalledWith({
        items: [
          expect.objectContaining({
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            year: 2019
          })
        ]
      })
    )
  })

  it('сохраняет только данные, которые есть в форме трека', async () => {
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
          artist: 'The Weeknd'
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
