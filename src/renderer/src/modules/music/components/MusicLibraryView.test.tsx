import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { MusicOverview } from '../../../../../shared/contracts/music'
import { MusicLibraryContent, MusicLibraryNavigation } from './MusicLibraryView'

const overview: MusicOverview = {
  items: [
    {
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
      favorite: true,
      rating: null,
      comments: '',
      createdAt: 1,
      updatedAt: 1
    }
  ],
  playlists: [
    {
      id: 'playlist-1',
      name: 'Ночная дорога',
      coverUrl: 'https://example.com/night-road.jpg',
      trackIds: ['track-1'],
      createdAt: 1,
      updatedAt: 1
    }
  ]
}

const handlers = {
  onScopeChange: vi.fn(),
  onOpenTrack: vi.fn(),
  onToggleFavorite: vi.fn(),
  onDeleteTrack: vi.fn(),
  onEditPlaylist: vi.fn(),
  onDeletePlaylist: vi.fn(),
  onCreatePlaylist: vi.fn(),
  onAddTrack: vi.fn()
}

describe('MusicLibraryView', () => {
  it('показывает поиск и вкладки в отдельном блоке как у заметок', () => {
    const { container } = render(
      <MusicLibraryNavigation
        scope={{ kind: 'all' }}
        query=""
        onQueryChange={vi.fn()}
        onScopeChange={vi.fn()}
      />
    )

    expect(container.querySelector('[data-music-library-navigation]')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Поиск по музыке' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Все треки' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Избранное' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Плейлисты' })).toBeInTheDocument()
  })

  it('показывает плейлисты с собственной обложкой и прямыми действиями', () => {
    render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'playlists' }}
        query=""
        isSaving={false}
        {...handlers}
      />
    )

    expect(screen.getByRole('heading', { name: 'Плейлисты' })).toBeInTheDocument()
    expect(screen.getByText('Ночная дорога')).toBeInTheDocument()
    expect(screen.getByAltText('Обложка плейлиста «Ночная дорога»')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Редактировать плейлист «Ночная дорога»' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Удалить плейлист «Ночная дорога»' })
    ).toBeInTheDocument()
  })

  it('показывает треки компактными карточками без обложек', () => {
    const { container } = render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'playlist', playlistId: 'playlist-1' }}
        query=""
        isSaving={false}
        {...handlers}
      />
    )

    expect(screen.getByText('Плейлист')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ночная дорога' })).toBeInTheDocument()
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    expect(container.querySelector('[data-music-track-card]')).toBeInTheDocument()
    expect(screen.queryByAltText('Обложка «Blinding Lights»')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Редактировать трек «Blinding Lights»' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Удалить трек «Blinding Lights»' })
    ).toBeInTheDocument()
  })
})
