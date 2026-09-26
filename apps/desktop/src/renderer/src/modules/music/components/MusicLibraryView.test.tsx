import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { MusicOverview } from '../../../../../shared/contracts/music'
import { MusicLibraryContent, MusicLibraryNavigation } from './MusicLibraryView'

const overview: MusicOverview = {
  items: [
    {
      id: 'track-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      year: 2020,
      durationSeconds: 200,
      favorite: true,
      createdAt: 1,
      updatedAt: 1
    },
    {
      id: 'track-2',
      title: 'Get Lucky',
      artist: 'Daft Punk',
      year: 2013,
      durationSeconds: 369,
      favorite: false,
      createdAt: 2,
      updatedAt: 2
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
  onViewTrackJson: vi.fn(),
  onViewPlaylistJson: vi.fn(),
  onDeleteTrack: vi.fn(),
  onEditPlaylist: vi.fn(),
  onDeletePlaylist: vi.fn(),
  onCreatePlaylist: vi.fn(),
  onAddTrack: vi.fn()
}

describe('MusicLibraryView', () => {
  it('показывает поиск, вкладки и фильтры в отдельном блоке', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MusicLibraryNavigation
        items={overview.items}
        scope={{ kind: 'all' }}
        query=""
        filters={{ artist: 'all', year: 'all' }}
        onQueryChange={vi.fn()}
        onScopeChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    )

    expect(container.querySelector('[data-music-library-navigation]')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Поиск по музыке' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Все треки' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Избранное' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Плейлисты' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Фильтры библиотеки' }))
    expect(screen.getByRole('combobox', { name: 'Исполнитель' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Год' })).toBeInTheDocument()
  })

  it('не падает на старой runtime-записи с artists вместо artist', async () => {
    const user = userEvent.setup()
    const legacyItem = {
      ...overview.items[0],
      artist: undefined,
      artists: ['The Weeknd']
    } as unknown as MusicOverview['items'][number]

    render(
      <MusicLibraryNavigation
        items={[legacyItem]}
        scope={{ kind: 'all' }}
        query=""
        filters={{ artist: 'all', year: 'all' }}
        onQueryChange={vi.fn()}
        onScopeChange={vi.fn()}
        onFiltersChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Фильтры библиотеки' }))
    const artistSelect = screen.getByRole('combobox', { name: 'Исполнитель' })
    expect(artistSelect).toBeInTheDocument()
    await user.click(artistSelect)
    expect(await screen.findByRole('option', { name: 'The Weeknd' })).toBeInTheDocument()
  })

  it('фильтрует треки по исполнителю и году', () => {
    const { rerender } = render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'all' }}
        query=""
        filters={{ artist: 'Daft Punk', year: 'all' }}
        isSaving={false}
        {...handlers}
      />
    )

    expect(screen.getByText('Get Lucky')).toBeInTheDocument()
    expect(screen.queryByText('Blinding Lights')).not.toBeInTheDocument()

    rerender(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'all' }}
        query=""
        filters={{ artist: 'all', year: '2020' }}
        isSaving={false}
        {...handlers}
      />
    )

    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    expect(screen.queryByText('Get Lucky')).not.toBeInTheDocument()
  })

  it('оформляет раздел треков как лаконичную секцию заметок без поясняющего текста', () => {
    const { container } = render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'favorites' }}
        query=""
        filters={{ artist: 'all', year: 'all' }}
        isSaving={false}
        {...handlers}
      />
    )

    const section = container.querySelector('[data-music-library-section="favorites"]')
    expect(section).toBeInTheDocument()
    expect(section?.querySelector('[data-music-section-icon]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Избранное' })).toBeInTheDocument()
    expect(screen.queryByText('Треки, которые вы отметили сердцем.')).not.toBeInTheDocument()
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
  })

  it('показывает плейлисты с собственной обложкой без служебных подписей и дубля кнопки', () => {
    const { container } = render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'playlists' }}
        query=""
        filters={{ artist: 'all', year: 'all' }}
        isSaving={false}
        {...handlers}
      />
    )

    const section = container.querySelector('[data-music-library-section="playlists"]')
    expect(section).toBeInTheDocument()
    expect(section?.querySelector('[data-music-section-icon]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Плейлисты' })).toBeInTheDocument()
    expect(screen.getByText('Ночная дорога')).toBeInTheDocument()
    expect(screen.getByAltText('Обложка плейлиста «Ночная дорога»')).toBeInTheDocument()
    expect(screen.queryByText(/Подборки с собственной обложкой/)).not.toBeInTheDocument()
    expect(screen.queryByText('Обложка добавлена')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Новый плейлист' })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'JSON плейлиста «Ночная дорога»' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Редактировать плейлист «Ночная дорога»' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Удалить плейлист «Ночная дорога»' })
    ).toBeInTheDocument()
  })

  it('показывает открытый плейлист той же компактной секцией и треки без обложек', () => {
    const { container } = render(
      <MusicLibraryContent
        overview={overview}
        scope={{ kind: 'playlist', playlistId: 'playlist-1' }}
        query=""
        filters={{ artist: 'all', year: 'all' }}
        isSaving={false}
        {...handlers}
      />
    )

    const section = container.querySelector('[data-music-library-section="playlist"]')
    expect(section).toBeInTheDocument()
    expect(section?.querySelector('[data-music-section-icon]')).toBeInTheDocument()
    expect(screen.queryByText('Плейлист')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ночная дорога' })).toBeInTheDocument()
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    expect(container.querySelector('[data-music-track-card]')).toBeInTheDocument()
    expect(screen.queryByAltText('Обложка «Blinding Lights»')).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Редактировать трек «Blinding Lights»' })
    ).not.toHaveLength(0)
    expect(
      screen.getByRole('button', { name: 'Удалить трек «Blinding Lights»' })
    ).toBeInTheDocument()
  })
})
