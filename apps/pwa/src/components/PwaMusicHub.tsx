import { useCallback, useRef, useState } from 'react'
import {
  MUSIC_COLLECTION_KEY,
  migrateLinkedMusicCollection,
  parseMusicCollection,
  reduceMusicCollection,
  type MusicCollectionAction,
  type MusicStreamingCollection
} from '@mymind/core/music-collection'
import { MusicListening } from '../../../desktop/src/renderer/src/modules/music/components/MusicListening'
import { useServices } from '../client/app/context'

/** Browser music collection with the player shared by PWA and Desktop. */
export function PwaMusicHub(): React.JSX.Element {
  const services = useServices()
  const [collection, setCollection] = useState<MusicStreamingCollection>(() => {
    const saved = parseMusicCollection(services.settings.get(MUSIC_COLLECTION_KEY))
    return migrateLinkedMusicCollection(saved, services.settings.get('music.sources.v1'))
  })
  const current = useRef(collection)
  const [error, setError] = useState('')
  const apply = useCallback(
    (action: MusicCollectionAction) => {
      const next = reduceMusicCollection(current.current, action)
      current.current = next
      setCollection(next)
      try {
        services.settings.set(MUSIC_COLLECTION_KEY, JSON.stringify(next))
        setError('')
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Не удалось сохранить музыку')
      }
    },
    [services]
  )

  return (
    <div style={{ width: '100%', minWidth: 0, flex: 1, padding: 12, overflowX: 'hidden' }}>
      {error ? (
        <p role="alert" style={{ color: '#fb7185' }}>
          {error}
        </p>
      ) : null}
      <MusicListening searchProxy collection={collection} onCollectionAction={apply} />
    </div>
  )
}
