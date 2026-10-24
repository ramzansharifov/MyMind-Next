import { useCallback, useEffect, useRef, useState } from 'react'
import {
  emptyMusicCollection,
  migrateLinkedMusicCollection,
  parseMusicCollection,
  reduceMusicCollection,
  type MusicCollectionAction,
  type MusicStreamingCollection
} from '@mymind/core/music-collection'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { musicClient } from './api/music-client'
import { MusicListening } from './components/MusicListening'

interface MusicPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

/**
 * The former manually managed music-items UI has been retired. Music now
 * consists exclusively of source-linked tracks, saved songs and playlists.
 * Legacy records are never deleted: older backups remain recoverable.
 */
export function MusicPage({ resourceId, onResourceHandled }: MusicPageProps): React.JSX.Element {
  const [collection, setCollection] = useState<MusicStreamingCollection>(emptyMusicCollection)
  const current = useRef(collection)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const saving = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [raw, legacy] = await Promise.all([
          musicClient.streamingCollection(),
          musicClient.listSourceLinks()
        ])
        const parsed = parseMusicCollection(raw)
        // One-time import of source-linked songs only, never manual legacy items.
        const mapped = { ...parsed, tracks: { ...parsed.tracks } }
        for (const track of Object.values(legacy)) {
          const imported = migrateLinkedMusicCollection(mapped, JSON.stringify({ legacy: track }))
          Object.assign(mapped.tracks, imported.tracks)
        }
        if (active) {
          current.current = mapped
          setCollection(mapped)
          if (Object.keys(mapped.tracks).length !== Object.keys(parsed.tracks).length)
            await musicClient.saveStreamingCollection(JSON.stringify(mapped))
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Не удалось открыть музыку')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (resourceId) onResourceHandled?.()
  }, [resourceId, onResourceHandled])

  const onCollectionAction = useCallback((action: MusicCollectionAction): void => {
    const previous = current.current
    const next = reduceMusicCollection(previous, action)
    if (next === previous) return
    current.current = next
    setCollection(next)
    saving.current = saving.current
      .catch(() => undefined)
      .then(() => musicClient.saveStreamingCollection(JSON.stringify(next)))
      .catch((reason) => {
        setError(
          reason instanceof Error ? reason.message : 'Не удалось сохранить музыкальную коллекцию'
        )
      })
  }, [])

  return (
    <StandardModulePage className="mymusic-page-shell" contentClassName="mymusic-page-container">
      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/30 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      ) : null}
      {loading ? (
        <div className="py-10 text-center text-sm text-[var(--app-muted)]">
          Загружаем сохранённую музыку…
        </div>
      ) : (
        <MusicListening
          collection={collection}
          onCollectionAction={onCollectionAction}
          onEngineSearch={musicClient.engineSearch}
          onEngineResolve={musicClient.engineResolve}
          onRadio={musicClient.engineRadio}
          onEngineDownload={musicClient.engineDownload}
          onOfflineList={musicClient.offlineList}
          onOfflineResolve={musicClient.offlineResolve}
          onOfflineRemove={musicClient.offlineRemove}
        />
      )}
    </StandardModulePage>
  )
}
