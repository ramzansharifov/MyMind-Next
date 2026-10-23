import { useState } from 'react'
import { parseSavedMusicSources } from '@mymind/core/music-discovery'
import { MusicListening } from '../../../desktop/src/renderer/src/modules/music/components/MusicListening'
import { CatalogScreen } from '../../../mobile/src/modules/catalog/CatalogScreen'
import { useServices } from '../../../mobile/src/app/context'

/** PWA-only music player; the Android CatalogScreen remains unchanged. */
export function PwaMusicHub(): React.JSX.Element {
  const services = useServices()
  const [view, setView] = useState<'listen' | 'library'>('listen')
  const [savedCount, setSavedCount] = useState(0)
  const [sourceLinks, setSourceLinks] = useState(() =>
    parseSavedMusicSources(services.settings.get('music.sources.v1'))
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, width: '100%' }}>
      <div role="tablist" aria-label="Разделы музыки" style={{
        display: 'flex', flexShrink: 0, gap: 6, padding: '10px 12px',
        borderBottom: '1px solid var(--border)'
      }}>
        {([
          { key: 'listen' as const, label: 'Слушать' },
          { key: 'library' as const, label: 'Моя библиотека' }
        ]).map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={view === tab.key}
            onClick={() => setView(tab.key)}
            style={{
              border: '1px solid ' + (view === tab.key ? 'var(--accent)' : 'var(--border)'),
              borderRadius: 11, padding: '10px 15px', fontSize: 12, fontWeight: 650,
              background: view === tab.key ? 'var(--accent)' : 'var(--surface)',
              color: view === tab.key ? '#fff' : 'var(--muted)'
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{
        display: view === 'listen' ? 'block' : 'none', flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden', padding: '12px',
        overscrollBehavior: 'contain'
      }}>
        <MusicListening searchProxy savedTracks={Object.values(sourceLinks)} onSaveTrack={(track) => {
          const existing = services.music.listMusicOverview().items.find((item) =>
            item.title.toLocaleLowerCase('ru') === track.title.toLocaleLowerCase('ru') &&
            item.artist.toLocaleLowerCase('ru') === track.artist.toLocaleLowerCase('ru'))
          const saved = existing ?? services.music.createMusicItem({
            title: track.title, artist: track.artist, year: null,
            durationSeconds: track.durationSeconds, favorite: false
          })
          const next = { ...sourceLinks, [saved.id]: track }
          services.settings.set('music.sources.v1', JSON.stringify(next))
          setSourceLinks(next)
          setSavedCount((count) => count + 1)
        }} />
      </div>
      {view === 'library' ? (
        <div key={savedCount} style={{ display: 'flex', flex: 1, minHeight: 0, padding: '0 12px' }}>
          <CatalogScreen mode="music" />
        </div>
      ) : null}
    </div>
  )
}
