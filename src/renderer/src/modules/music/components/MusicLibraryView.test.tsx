import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { MusicOverview } from '../../../../../shared/contracts/music'
import {
  MusicLibraryContent,
  MusicLibraryNavigation,
  type MusicLibraryScope
} from './MusicLibraryView'

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
      trackIds: ['track-1'],
      createdAt: 1,
      updatedAt: 1
    }
  ]
}

function Harness(): React.JSX.Element {
  const [scope, setScope] = useState<MusicLibraryScope>({ kind: 'all' })
  const [query, setQuery] = useState('')

  return (
    <>
      <MusicLibraryNavigation
        scope={scope}
        query={query}
        onQueryChange={setQuery}
        onScopeChange={setScope}
      />
      <MusicLibraryContent
        overview={overview}
        scope={scope}
        query={query}
        isSaving={false}
        onScopeChange={setScope}
        onOpenTrack={vi.fn()}
        onToggleFavorite={vi.fn()}
        onDeleteTrack={vi.fn()}
        onEditPlaylist={vi.fn()}
        onDeletePlaylist={vi.fn()}
        onCreatePlaylist={vi.fn()}
        onAddTrack={vi.fn()}
      />
    </>
  )
}

describe('MusicLibraryView', () => {
  it('открывает плейлисты как отдельную страницу и затем страницу конкретного плейлиста', () => {
    render(<Harness />)

    expect(screen.getByRole('heading', { name: 'Все треки' })).toBeInTheDocument()
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Плейлисты/ }))

    expect(screen.getByRole('heading', { name: 'Плейлисты' })).toBeInTheDocument()
    expect(screen.getByText('Ночная дорога')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Редактировать плейлист «Ночная дорога»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить плейлист «Ночная дорога»' })).toBeInTheDocument()

    fireEvent.click(screen.getByText('Ночная дорога'))

    expect(screen.getByText('Плейлист')).toBeInTheDocument()
    expect(screen.getByText('Blinding Lights')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Редактировать трек «Blinding Lights»' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить трек «Blinding Lights»' })).toBeInTheDocument()
  })
})
