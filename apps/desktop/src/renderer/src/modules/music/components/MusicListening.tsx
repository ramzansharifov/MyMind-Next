import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookmarkPlus, Check, Disc3, Download, ExternalLink, Heart, ListMusic, ListPlus, LoaderCircle,
  Music2, Pause, Play, Plus, Radio, Search, Shuffle, SkipBack, SkipForward, Repeat, Repeat1,
  Volume2, VolumeX, X, Waves, Headphones, Clock3, SlidersHorizontal, ArrowRight
} from 'lucide-react'
import {
  discoverMusic, mergeMusicSearchResults, providerLabel, type DiscoveredTrack, type MusicSource
} from '@mymind/core/music-discovery'
import {
  type MusicStreamingCollection, type MusicCollectionAction
} from '@mymind/core/music-collection'
import './music-listening.css'

interface MusicListeningProps {
  collection: MusicStreamingCollection
  onCollectionAction: (action: MusicCollectionAction) => void
  /** PWA uses a same-origin metadata route to avoid provider browser CORS restrictions. */
  searchProxy?: boolean
  onEngineSearch?: (input: { provider: 'youtube' | 'soundcloud'; query: string }) => Promise<DiscoveredTrack[]>
  onEngineResolve?: (input: { provider: 'youtube' | 'soundcloud'; id: string }) => Promise<string>
  onRadio?: (input: { videoId: string }) => Promise<DiscoveredTrack[]>
  onEngineDownload?: (track: DiscoveredTrack) => Promise<string>
  onOfflineList?: () => Promise<string[]>
  onOfflineResolve?: (input: { provider: MusicSource; id: string }) => Promise<string>
  onOfflineRemove?: (input: { provider: MusicSource; id: string }) => Promise<boolean>
}

const MUSIC_MOODS = [
  { label: 'Рок', query: 'rock music' },
  { label: 'Relax', query: 'relax music' },
  { label: 'Workout', query: 'workout music' },
  { label: 'Electronic', query: 'electronic music' },
  { label: 'Synthwave', query: 'synthwave' },
  { label: 'Lo-Fi', query: 'lofi beats' },
  { label: 'Русский рэп', query: 'русский рэп' }
] as const

function duration(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00'
  const s = Math.floor(seconds)
  const minutes = Math.floor(s / 60)
  return String(minutes) + ':' + String(s % 60).padStart(2, '0')
}

function Artwork({ track, size = 'medium' }: { track: DiscoveredTrack; size?: 'medium' | 'large' }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [track.artworkUrl])
  return (
    <div className={'mymusic-art mymusic-art-' + size}>
      {track.artworkUrl && !failed
        ? <img loading="lazy" alt="" src={track.artworkUrl} onError={() => setFailed(true)} />
        : <Disc3 aria-hidden="true" />}
    </div>
  )
}

export function MusicListening({
  collection, onCollectionAction, searchProxy = false, onEngineSearch, onEngineResolve, onRadio,
  onEngineDownload, onOfflineList, onOfflineResolve, onOfflineRemove
}: MusicListeningProps): React.JSX.Element {
  const audio = useRef<HTMLAudioElement>(null)
  const [onlySaved, setOnlySaved] = useState(false)
  const [savedFilter, setSavedFilter] = useState('all')
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showNewPlaylist, setShowNewPlaylist] = useState(false)
  const [trackMenu, setTrackMenu] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tracks, setTracks] = useState<DiscoveredTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [searchHint, setSearchHint] = useState('')
  const [loadError, setLoadError] = useState('')
  const [searchWarning, setSearchWarning] = useState('')
  const [searchAttempt, setSearchAttempt] = useState(0)
  const [playbackError, setPlaybackError] = useState('')
  const [queue, setQueue] = useState<DiscoveredTrack[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [length, setLength] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [random, setRandom] = useState(false)
  const [repeat, setRepeat] = useState<'none' | 'all' | 'one'>('none')
  const [queueOpen, setQueueOpen] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [radioLoading, setRadioLoading] = useState(false)
  const [downloadKey, setDownloadKey] = useState<string | null>(null)
  const [downloadNotice, setDownloadNotice] = useState('')
  const [offlineKeys, setOfflineKeys] = useState<string[]>([])
  const offlineSet = new Set(offlineKeys)
  const offlineForCurrent = currentIndex >= 0 && offlineSet.has(queue[currentIndex]?.key ?? '')
  useEffect(() => {
    if (!onOfflineList) return
    let active = true
    void onOfflineList()
      .then((keys) => { if (active) setOfflineKeys(keys) })
      .catch((error: unknown) => {
        if (active) setDownloadNotice(error instanceof Error ? error.message : 'Не удалось прочитать загрузки MyMind.')
      })
    return () => { active = false }
  }, [onOfflineList])
  const current = queue[currentIndex] ?? null
  const savedTracks = Object.values(collection.tracks)
  const savedKeys = new Set(savedTracks.map((track) => track.key))
  const likedKeys = new Set(collection.likedKeys)
  const chosenPlaylist = collection.playlists.find((item) => item.id === savedFilter)
  const visibleTracks = onlySaved
    ? savedTracks.filter((track) =>
        (savedFilter === 'all' || (savedFilter === 'liked'
          ? likedKeys.has(track.key) : savedFilter === 'offline'
            ? offlineSet.has(track.key) : chosenPlaylist?.trackKeys.includes(track.key))) &&
        (track.title + ' ' + track.artist).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru')))
    : tracks

  const isHome = !onlySaved && !query.trim()
  const continueTracks = [current, ...savedTracks]
    .filter((track): track is DiscoveredTrack => Boolean(track))
    .filter((track, index, all) => all.findIndex(item => item.key === track.key) === index)
    .slice(0, 6)
  const radioSeed = [current, ...savedTracks, ...tracks]
    .find(track => track?.provider === 'youtube') ?? null

  useEffect(() => {
    try { setClientId(localStorage.getItem('mymind.music.jamendo-client-id') ?? '') } catch { /* private mode */ }
  }, [])


  useEffect(() => {
    const controller = new AbortController()
    if (onlySaved) {
      setLoading(false)
      setLoadError('')
      setSearchWarning('')
      return () => controller.abort()
    }
    setTracks([])
    setLoading(true)
    setLoadError('')
    setSearchWarning('')
    setSearchHint('')
    let timeoutId: number | undefined
    let hintId: number | undefined
    const debounce = window.setTimeout(() => {
      const searchable = query.trim()
      const timeLimit = searchProxy ? 23_000 : 100_000
      timeoutId = window.setTimeout(() => {
        controller.abort()
        setLoading(false)
        setSearchHint('')
        setLoadError('Поиск занял слишком много времени. Повтори попытку.')
      }, timeLimit)
      if (!searchProxy) {
        hintId = window.setTimeout(() => {
          if (!controller.signal.aborted)
            setSearchHint('Проверяем дополнительные музыкальные источники…')
        }, 10_000)
      }

      const run = async (): Promise<void> => {
        try {
          if (searchProxy) {
            // One same-origin request delegates to all configured sources on the server.
            const response = await fetch('/api/music/discover', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: 'all', query: searchable, jamendoClientId: clientId }),
              signal: controller.signal
            })
            const data = await response.json() as {
              tracks?: DiscoveredTrack[]; error?: string; partial?: boolean
            }
            if (!response.ok || data.error) throw new Error(data.error || 'Поиск недоступен.')
            if (!controller.signal.aborted) {
              setTracks(data.tracks ?? [])
              if (data.partial) setSearchWarning('Часть музыкальных источников временно недоступна. Показаны найденные треки.')
            }
            return
          }
          // Desktop: parallel, independent requests. Publish each successful batch
          // immediately, while slower services continue searching in the background.
          const sources: Array<[MusicSource, () => Promise<DiscoveredTrack[]>, number]> = [
            ['youtube', () => onEngineSearch
              ? onEngineSearch({ provider: 'youtube', query: searchable })
              : Promise.reject(new Error('Не подключён музыкальный движок YouTube')), 95_000],
            ['audius', () => discoverMusic({
              provider: 'audius', query: searchable, signal: controller.signal
            }), 15_000]
          ]
          if (searchable) sources.push([
            'soundcloud', () => onEngineSearch
              ? onEngineSearch({ provider: 'soundcloud', query: searchable })
              : Promise.reject(new Error('Не подключён музыкальный движок SoundCloud')), 95_000
          ])
          if (clientId.trim()) sources.push([
            'jamendo', () => discoverMusic({
              provider: 'jamendo', query: searchable, jamendoClientId: clientId,
              signal: controller.signal
            }), 15_000
          ])
          const buckets: Partial<Record<MusicSource, DiscoveredTrack[]>> = {}
          let successful = 0
          let failed = 0
          await Promise.all(sources.map(async ([source, load, limit]) => {
            try {
              // An upstream Electron promise may hang: enforce a deadline per source.
              const results = await new Promise<DiscoveredTrack[]>((resolve, reject) => {
                const timer = window.setTimeout(() => reject(new Error('Источник превысил время ожидания')), limit)
                Promise.resolve().then(load).then(
                  (value) => { window.clearTimeout(timer); resolve(value) },
                  (error: unknown) => { window.clearTimeout(timer); reject(error) }
                )
              })
              if (controller.signal.aborted) return
              buckets[source] = results
              successful++
              setTracks(mergeMusicSearchResults(buckets))
            } catch {
              failed++
            }
          }))
          if (controller.signal.aborted) return
          if (successful === 0) {
            setLoadError('Музыкальные источники сейчас недоступны. Проверь соединение и повтори поиск.')
          } else if (failed) {
            setSearchWarning('Часть музыкальных источников временно недоступна. Показаны найденные треки.')
          }
        } catch (error) {
          if (!controller.signal.aborted)
            setLoadError(error instanceof Error ? error.message : 'Не удалось выполнить поиск.')
        } finally {
          if (timeoutId !== undefined) window.clearTimeout(timeoutId)
          if (hintId !== undefined) window.clearTimeout(hintId)
          if (!controller.signal.aborted) {
            setLoading(false)
            setSearchHint('')
          }
        }
      }
      void run()
    }, query.trim() ? 320 : 0)

    return () => {
      controller.abort()
      window.clearTimeout(debounce)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
      if (hintId !== undefined) window.clearTimeout(hintId)
    }
  }, [query, clientId, searchProxy, onlySaved, onEngineSearch, searchAttempt])

  useEffect(() => {
    if (audio.current) audio.current.volume = volume
  }, [volume])

  const choose = useCallback((track: DiscoveredTrack, context?: DiscoveredTrack[]): void => {
    const entries = context?.length ? context : [track]
    const index = entries.findIndex((entry) => entry.key === track.key)
    setQueue(entries)
    setCurrentIndex(Math.max(index, 0))
    setPosition(0)
    setLength(track.durationSeconds ?? 0)
    setPlaybackError('')
    // Direct provider streams start synchronously (Safari user activation).
    // YouTube/SoundCloud require asynchronous yt-dlp resolution instead.
    const player = audio.current
    if (player && track.provider !== 'youtube' && track.provider !== 'soundcloud' &&
        !offlineSet.has(track.key)) {
      player.src = track.streamUrl
      player.load()
      void player.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false)
        setPlaybackError('Не удалось начать воспроизведение. Нажми Play ещё раз.')
      })
    }
  }, [offlineKeys])

  useEffect(() => {
    const player = audio.current
    if (!player || !current) return
    let cancelled = false
    if (offlineForCurrent || current.provider === 'youtube' || current.provider === 'soundcloud') {
      // Prefer an internal downloaded file whenever one exists. Otherwise ask yt-dlp
      // running in Desktop/companion for a short-lived stream session.
      player.pause()
      player.removeAttribute('src')
      player.load()
      setPlaying(false)
      setBuffering(true)
      setPlaybackError('')
      const resolve = offlineForCurrent && onOfflineResolve
        ? onOfflineResolve({ provider: current.provider, id: current.id })
        : searchProxy
        ? fetch('/api/music/resolve', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: current.provider, id: current.id })
          }).then(async response => {
            const result = await response.json() as { streamUrl?: string; error?: string }
            if (!response.ok || !result.streamUrl) throw new Error(result.error || 'Аудиопоток недоступен.')
            return result.streamUrl
          })
        : onEngineResolve && (current.provider === 'youtube' || current.provider === 'soundcloud')
          ? onEngineResolve({ provider: current.provider, id: current.id })
          : Promise.reject(new Error('Музыкальный движок не подключён.'))
      void resolve.then(stream => {
        if (cancelled) return
        player.src = stream
        player.load()
        setBuffering(false)
        void player.play().then(() => setPlaying(true)).catch(() => {
          if (!cancelled) setPlaybackError('Поток подготовлен. Нажми Play для воспроизведения.')
        })
      }).catch((error: unknown) => {
        if (!cancelled) {
          setBuffering(false)
          setPlaybackError(error instanceof Error ? error.message : 'Ошибка музыкального движка')
        }
      })
    } else if (player.src !== current.streamUrl) {
      player.src = current.streamUrl
      player.load()
      setPlaying(false)
      setPosition(0)
      setLength(current.durationSeconds ?? 0)
      setPlaybackError('')
      void player.play()
        .then(() => setPlaying(true))
        .catch(() => {
          if (!cancelled) setPlaybackError('Не удалось начать воспроизведение.')
        })
    }
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title, artist: current.artist, album: providerLabel(current.provider),
        artwork: current.artworkUrl ? [{ src: current.artworkUrl, sizes: '480x480' }] : []
      })
    }
    return () => { cancelled = true }
  }, [current?.key, current?.streamUrl, searchProxy, onEngineResolve, onOfflineResolve, offlineForCurrent])

  const changeIndex = useCallback((direction: 1 | -1): void => {
    if (!queue.length) return
    setCurrentIndex((old) => {
      if (random && queue.length > 1) {
        const next = (old + 1 + Math.floor(Math.random() * (queue.length - 1))) % queue.length
        return next
      }
      const next = old + direction
      if (next < 0 || next >= queue.length) return repeat === 'all' ? (next + queue.length) % queue.length : old
      return next
    })
    setPlaying(false)
  }, [queue.length, random, repeat])

  const toggle = useCallback((): void => {
    const player = audio.current
    if (!player || !current || buffering) return
    if (player.paused) {
      setPlaybackError('')
      void player.play()
        .then(() => setPlaying(true))
        .catch(() => { setPlaybackError('Браузер заблокировал или источник отклонил воспроизведение.') })
    } else {
      player.pause()
      setPlaying(false)
    }
  }, [current, buffering])

  const ended = useCallback((): void => {
    if (repeat === 'one' && audio.current) {
      audio.current.currentTime = 0
      void audio.current.play().catch(() => setPlaying(false))
      return
    }
    if (currentIndex >= queue.length - 1 && repeat === 'none' && !random) {
      setPlaying(false)
      return
    }
    changeIndex(1)
  }, [repeat, currentIndex, queue.length, random, changeIndex])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const actions = {
      play: () => { void audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)) },
      pause: () => { audio.current?.pause(); setPlaying(false) },
      nexttrack: () => changeIndex(1),
      previoustrack: () => changeIndex(-1)
    }
    for (const action of Object.keys(actions) as Array<keyof typeof actions>) {
      try { navigator.mediaSession.setActionHandler(action, actions[action]) } catch { /* unsupported */ }
    }
    return () => {
      for (const action of Object.keys(actions) as Array<keyof typeof actions>) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch { /* unsupported */ }
      }
    }
  }, [changeIndex])

  const startRadio = async (track: DiscoveredTrack): Promise<void> => {
    if (track.provider !== 'youtube' || radioLoading) return
    setRadioLoading(true)
    setPlaybackError('')
    try {
      const results = searchProxy
        ? await fetch('/api/music/radio', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: track.id })
          }).then(async response => {
            const data = await response.json() as { tracks?: DiscoveredTrack[]; error?: string }
            if (!response.ok) throw new Error(data.error || 'Радио недоступно')
            return data.tracks ?? []
          })
        : onRadio
          ? await onRadio({ videoId: track.id })
          : []
      if (!results.length) throw new Error('YouTube не вернул похожих треков.')
      const next = [track, ...results.filter(item => item.key !== track.key)]
      choose(track, next)
      setQueueOpen(true)
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : 'Моя волна недоступна')
    } finally {
      setRadioLoading(false)
    }
  }

  const save = (track: DiscoveredTrack): void =>
    onCollectionAction({ type: 'save', track })

  const toggleLike = (track: DiscoveredTrack): void =>
    onCollectionAction({ type: 'like', track })

  const createPlaylist = (): void => {
    const name = newPlaylistName.trim()
    if (!name) return
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID() : String(Date.now()) + '_' + String(Math.floor(Math.random() * 10000))
    onCollectionAction({ type: 'playlist-create', id, name, now: Date.now() })
    setSavedFilter(id)
    // Keep search results visible: the next action is usually adding songs.
    // When already browsing the saved collection, show the new playlist.
    setNewPlaylistName('')
    setShowNewPlaylist(false)
  }

  const downloadTrack = async (track: DiscoveredTrack): Promise<void> => {
    if (!onEngineDownload || downloadKey || (track.provider !== 'youtube' &&
        track.provider !== 'soundcloud' && !track.downloadUrl)) return
    if ((track.provider === 'youtube' || track.provider === 'soundcloud') &&
        !window.confirm('Скачивай только музыку, которую тебе разрешено сохранять. Продолжить?'))
      return
    setDownloadKey(track.key)
    setDownloadNotice('')
    try {
      const key = await onEngineDownload(track)
      setOfflineKeys((prev) => prev.includes(key) ? prev : [...prev, key])
      save(track)
      setDownloadNotice('Трек скачан в MyMind и доступен без интернета.')
    } catch (error) {
      setDownloadNotice(error instanceof Error ? error.message : 'Не удалось скачать трек.')
    } finally {
      setDownloadKey(null)
    }
  }

  const removeDownload = async (track: DiscoveredTrack): Promise<void> => {
    if (!onOfflineRemove || downloadKey ||
        !window.confirm('Удалить скачанный аудиофайл из MyMind? Трек останется в сохранённом.')) return
    setDownloadKey(track.key)
    setDownloadNotice('')
    try {
      const removed = await onOfflineRemove({ provider: track.provider, id: track.id })
      if (removed) setOfflineKeys((prev) => prev.filter((key) => key !== track.key))
      setDownloadNotice(removed ? 'Скачанный файл удалён из MyMind.' : 'Файл уже отсутствует.')
    } catch (error) {
      setDownloadNotice(error instanceof Error ? error.message : 'Не удалось удалить скачанный файл.')
    } finally {
      setDownloadKey(null)
    }
  }
  const onChangeClientId = (id: string): void => {
    const trimmed = id.trim()
    setClientId(trimmed)
    try {
      if (trimmed) localStorage.setItem('mymind.music.jamendo-client-id', trimmed)
      else localStorage.removeItem('mymind.music.jamendo-client-id')
    } catch { /* private storage */ }
  }

  return (
    <section className="mymusic" aria-label="Слушать музыку">
      <audio
        ref={audio}
        preload="none"
        onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)}
        onDurationChange={() => setLength(Number.isFinite(audio.current?.duration) ? audio.current?.duration ?? 0 : 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={ended}
        onError={() => { setPlaying(false); setPlaybackError('Аудиопоток недоступен. Попробуйте другой трек или откройте его у источника.') }}
      />
      <header className="mymusic-topbar">
        <div className="mymusic-brand">
          <div className="mymusic-brand-mark"><Music2 size={23} aria-hidden="true" /></div>
          <div><span className="mymusic-eyebrow">MYMIND MUSIC</span><h1>Музыка</h1></div>
        </div>
        <span className="mymusic-topbar-note"><Headphones size={15} aria-hidden="true" /> Твой звук, твои правила</span>
      </header>

      <div className="mymusic-discovery-toolbar">
        <label className="mymusic-search">
          <Search size={21} aria-hidden="true" />
          <input value={query} onChange={(event) => { setOnlySaved(false); setQuery(event.target.value) }}
            placeholder="Треки, исполнители, настроение…" maxLength={200} aria-label="Поиск музыки" />
          {query ? <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={17}/></button> : null}
        </label>
        <button type="button" className="mymusic-settings-button" onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}><SlidersHorizontal size={17} aria-hidden="true" /><span>Настройки поиска</span></button>
      </div>

      <nav className="mymusic-providers" aria-label="Музыкальная библиотека">
        <button type="button" aria-pressed={!onlySaved} className={!onlySaved ? 'active' : ''}
          onClick={() => { setOnlySaved(false); setQuery('') }}>Поиск</button>
        <button type="button" aria-pressed={onlySaved && savedFilter === 'all'} className={onlySaved && savedFilter === 'all' ? 'active' : ''} onClick={() => { setOnlySaved(true); setSavedFilter('all'); setQuery('') }}>Сохранённое ({savedTracks.length})</button>
        <button type="button" aria-pressed={onlySaved && savedFilter === 'liked'} className={onlySaved && savedFilter === 'liked' ? 'active' : ''} onClick={() => { setOnlySaved(true); setSavedFilter('liked'); setQuery('') }}>Избранное ({likedKeys.size})</button>
        {onOfflineList ? <button type="button" aria-pressed={onlySaved && savedFilter === 'offline'} className={onlySaved && savedFilter === 'offline' ? 'active' : ''} onClick={() => { setOnlySaved(true); setSavedFilter('offline'); setQuery('') }}>Загрузки ({offlineKeys.length})</button> : null}
      </nav>

      {!onlySaved ? <div className="mymusic-mood-pills" role="group" aria-label="Быстрый поиск по настроению">
        <button type="button" className={!query.trim() ? 'active' : ''} aria-pressed={!query.trim()}
          onClick={() => setQuery('')}>Всё</button>
        {MUSIC_MOODS.map(mood => <button key={mood.label} type="button"
          className={query.trim() === mood.query ? 'active' : ''}
          aria-pressed={query.trim() === mood.query}
          onClick={() => setQuery(mood.query)}>{mood.label}</button>)}
      </div> : null}

      {settingsOpen ? (
        <div className="mymusic-provider-settings">
          <label htmlFor="mymusic-jamendo-key">Jamendo client_id</label>
          <input id="mymusic-jamendo-key" value={clientId} onChange={(event) => onChangeClientId(event.target.value)}
            placeholder="Бесплатный client_id из developer.jamendo.com" autoComplete="off" />
          <p>Для включения результатов Jamendo нужен бесплатный client_id. Все доступные музыкальные источники ищутся автоматически — выбирать их не требуется.</p>
        </div>
      ) : null}

      {isHome ? (
        <div className="mymusic-home">
          <section className="mymusic-welcome" aria-label="Продолжить прослушивание">
            <div className="mymusic-welcome-title">
              <Clock3 size={18} aria-hidden="true" />
              <h2>Продолжить</h2>
            </div>
            {continueTracks.length ? (
              <div className="mymusic-continue-list">
                {continueTracks.map(track => <button type="button" key={track.key}
                  className="mymusic-continue-card" aria-label={'Продолжить: ' + track.title}
                  onClick={() => choose(track, continueTracks)}>
                  <Artwork track={track} /><span><strong>{track.title}</strong><small>{track.artist}</small></span>
                  <Play size={17} className="mymusic-continue-play" aria-hidden="true" />
                </button>)}
              </div>
            ) : <p className="mymusic-home-hint">Начни слушать музыку — здесь появятся твои сохранённые треки.</p>}
          </section>

          <section className="mymusic-wave-card" aria-label="Моя волна">
            <div className="mymusic-wave-orb"><Waves size={29} aria-hidden="true" /></div>
            <div className="mymusic-wave-copy">
              <span className="mymusic-eyebrow">ПЕРСОНАЛЬНОЕ РАДИО</span>
              <h2>Моя волна</h2>
              <p>{radioSeed ? 'Продолжай открывать музыку на основе понравившегося трека.' :
                'Найди трек на YouTube, чтобы запустить подборку похожей музыки.'}</p>
            </div>
            <button type="button" className="mymusic-wave-play" disabled={!radioSeed || radioLoading}
              onClick={() => { if (radioSeed) void startRadio(radioSeed) }}>
              {radioLoading ? <LoaderCircle size={17} className="mymusic-spin" /> : <Play size={17} fill="currentColor" />}
              Слушать волну
            </button>
          </section>

          {visibleTracks.length > 0 ? <section className="mymusic-home-shelf" aria-label="Подборка для тебя">
            <div className="mymusic-shelf-heading"><div><span className="mymusic-eyebrow">ДЛЯ ТЕБЯ</span><h2>Открывай новое</h2></div><span>Из всех доступных источников</span></div>
            <div className="mymusic-shelf-grid">
              {visibleTracks.slice(0, 8).map(track => (
                <button key={track.key} type="button" className="mymusic-shelf-track"
                  aria-label={'Слушать ' + track.title}
                  onClick={() => choose(track, visibleTracks)}>
                  <Artwork track={track} size="large" />
                  <strong>{track.title}</strong><span>{track.artist}</span>
                  <span className="mymusic-shelf-play" aria-hidden="true"><Play fill="currentColor" size={18}/></span>
                </button>
              ))}
            </div>
          </section> : null}
        </div>
      ) : null}

      {!onlySaved && query.trim() && visibleTracks.length > 0 ? (
        <section className="mymusic-search-feature" aria-label="Лучший результат">
          <span className="mymusic-eyebrow">ЛУЧШИЙ РЕЗУЛЬТАТ</span>
          <button type="button" className="mymusic-feature-track" aria-label={'Слушать лучший результат: ' + visibleTracks[0].title}
            onClick={() => choose(visibleTracks[0], visibleTracks)}>
            <Artwork track={visibleTracks[0]} size="large" />
            <span className="mymusic-feature-copy"><strong>{visibleTracks[0].title}</strong><small>{visibleTracks[0].artist}</small></span>
            <span className="mymusic-feature-play"><Play fill="currentColor" size={21}/></span>
          </button>
        </section>
      ) : null}

      <div className="mymusic-library-controls">
        <div className="mymusic-library-playlists">
          {collection.playlists.map((playlist) => (
            <button key={playlist.id} type="button"
              aria-pressed={onlySaved && savedFilter === playlist.id}
              className={onlySaved && savedFilter === playlist.id ? 'active' : ''}
              onClick={() => { setOnlySaved(true); setSavedFilter(playlist.id); setQuery('') }}>
              <ListMusic size={14} /> {playlist.name}
              <span>{playlist.trackKeys.length}</span>
            </button>
          ))}
          <button type="button" onClick={() => setShowNewPlaylist((v) => !v)} aria-label="Новый плейлист">
            <Plus size={15} /> Плейлист
          </button>
        </div>
        {showNewPlaylist ? (
          <form className="mymusic-playlist-create" onSubmit={(event) => { event.preventDefault(); createPlaylist() }}>
            <input aria-label="Название плейлиста" maxLength={100} autoFocus
              value={newPlaylistName} onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="Название плейлиста" />
            <button type="submit" disabled={!newPlaylistName.trim()}>Создать</button>
          </form>
        ) : null}
        {chosenPlaylist && onlySaved ? (
          <div className="mymusic-playlist-actions">
            <button type="button" onClick={() => {
              const name = window.prompt('Новое название плейлиста', chosenPlaylist.name)
              if (name?.trim()) onCollectionAction({ type: 'playlist-rename', id: chosenPlaylist.id, name })
            }}>Переименовать</button>
            <button type="button" onClick={() => {
              if (window.confirm('Удалить плейлист? Сохранённые треки останутся.')) {
                onCollectionAction({ type: 'playlist-delete', id: chosenPlaylist.id })
                setSavedFilter('all')
              }
            }}>Удалить плейлист</button>
            <button type="button" onClick={() => choose(collection.tracks[chosenPlaylist.trackKeys[0]], chosenPlaylist.trackKeys.map(key => collection.tracks[key]).filter((t): t is DiscoveredTrack => Boolean(t)))}
              disabled={!chosenPlaylist.trackKeys.length}>Слушать плейлист</button>
          </div>
        ) : null}
      </div>
      <div className="mymusic-section-head">
        <div>
          <span className="mymusic-eyebrow">{onlySaved ? 'МОЯ МУЗЫКА' : 'ОБЩИЙ ПОИСК'}</span>
          <h3>{onlySaved ? savedFilter === 'all' ? 'Сохранённые треки'
  : savedFilter === 'liked' ? 'Избранное' : savedFilter === 'offline' ? 'Загрузки MyMind' : chosenPlaylist?.name ?? 'Плейлист'
  : query.trim() ? 'Результаты поиска' : 'Сейчас в тренде'}</h3>
        </div>
        <span className="mymusic-result-count">{String(visibleTracks.length)} треков{loading ? ' · поиск продолжается…' : ''}</span>
      </div>
      {!onlySaved && searchWarning && visibleTracks.length > 0 ? (
        <p className="mymusic-search-warning" role="status">{searchWarning}</p>
      ) : null}
      {!onlySaved && loadError && !visibleTracks.length ? (
        <div className="mymusic-message" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>
            Повторить поиск
          </button>
        </div>
      ) : !onlySaved && loading && !visibleTracks.length ? (
        <div className="mymusic-message"><LoaderCircle className="mymusic-spin" size={20}/> {searchHint || 'Загружаем музыку…'}</div>
      ) : !visibleTracks.length ? (
        <div className="mymusic-message">{onlySaved ? 'Здесь пока нет треков. Найди музыку, сохрани её или добавь в плейлист.' : 'Ничего не найдено. Попробуй другой запрос.'}</div>
      ) : (
        <div className="mymusic-track-list">
          {visibleTracks.map((track, index) => (
            <article key={track.key} className={'mymusic-track' + (current?.key === track.key ? ' is-current' : '')}>
              <span className="mymusic-track-number">{index + 1}</span>
              <button className="mymusic-track-play" type="button" aria-label={'Воспроизвести ' + track.title} onClick={() => current?.key === track.key ? toggle() : choose(track, visibleTracks)}>
                <Artwork track={track}/>
                <span className="mymusic-track-hover">{playing && current?.key === track.key ? <Pause size={19}/> : <Play size={19}/>}</span>
              </button>
              <div className="mymusic-track-info">
                <button type="button" onClick={() => current?.key === track.key ? toggle() : choose(track, visibleTracks)}>{track.title}</button>
                <span>{track.artist}</span>
              </div>
              <span className="mymusic-track-duration">{duration(track.durationSeconds)}</span>
              {track.provider === 'youtube' ? <button className="mymusic-track-action" type="button" title="Моя волна — похожая музыка" aria-label={'Моя волна по треку ' + track.title} disabled={radioLoading} onClick={() => void startRadio(track)}><Radio size={17}/></button> : null}
              <button className="mymusic-track-action" type="button"
                title={savedKeys.has(track.key) ? 'Удалить из сохранённых' : 'Сохранить трек'}
                aria-label={(savedKeys.has(track.key) ? 'Удалить ' : 'Сохранить ') + track.title + (savedKeys.has(track.key) ? ' из сохранённых' : ' в библиотеку')}
                onClick={() => savedKeys.has(track.key)
                  ? onCollectionAction({ type: 'remove', key: track.key })
                  : save(track)}>
                {savedKeys.has(track.key) ? <Check size={17}/> : <BookmarkPlus size={17}/>}
              </button>
              <button className={'mymusic-track-action' + (likedKeys.has(track.key) ? ' active' : '')}
                type="button" aria-pressed={likedKeys.has(track.key)}
                title="Избранное" aria-label={'Избранное: ' + track.title}
                onClick={() => toggleLike(track)}><Heart size={17} fill={likedKeys.has(track.key) ? 'currentColor' : 'none'} /></button>
              <div className="mymusic-track-menu-anchor">
                <button type="button" className="mymusic-track-action" aria-label={'Добавить ' + track.title + ' в плейлист'}
                  aria-expanded={trackMenu === track.key} onClick={() => setTrackMenu(trackMenu === track.key ? null : track.key)}>
                  <ListPlus size={17}/>
                </button>
                {trackMenu === track.key ? <div className="mymusic-track-menu">
                  {collection.playlists.length === 0 ? <span>Создай плейлист выше</span> : collection.playlists.map(p =>
                    <button type="button" key={p.id} onClick={() => {
                      onCollectionAction({ type: 'playlist-toggle', id: p.id, track })
                      setTrackMenu(null)
                    }}>{p.trackKeys.includes(track.key) ? '✓ ' : '+ '}{p.name}</button>)}
                </div> : null}
              </div>
              {onEngineDownload && (track.downloadUrl || track.provider === 'youtube' || track.provider === 'soundcloud') ?
                <button type="button" className={'mymusic-track-action' + (offlineSet.has(track.key) ? ' active' : '')}
                  disabled={downloadKey !== null}
                  title={offlineSet.has(track.key) ? 'Удалить скачанный файл из MyMind' : 'Скачать внутрь MyMind для прослушивания офлайн'}
                  aria-label={(offlineSet.has(track.key) ? 'Удалить скачанный файл ' : 'Скачать в MyMind ') + track.title}
                  onClick={() => void (offlineSet.has(track.key) ? removeDownload(track) : downloadTrack(track))}>
                  {downloadKey === track.key ? <LoaderCircle className="mymusic-spin" size={17}/> :
                    offlineSet.has(track.key) ? <Check size={17}/> : <Download size={17}/>}
                </button>
                : track.downloadUrl ? <a className="mymusic-track-action" href={track.downloadUrl}
                    title="Скачать — разрешено источником" aria-label={'Скачать ' + track.title}
                    target="_blank" rel="noopener noreferrer"><Download size={17}/></a> : null}
              {track.permalink ? <a className="mymusic-track-action" href={track.permalink} target="_blank" rel="noopener noreferrer" aria-label={'Открыть ' + track.title + ' у источника'}><ExternalLink size={16}/></a> : null}
            </article>
          ))}
        </div>
      )}

      <div className="mymusic-player" role="region" aria-label="Музыкальный проигрыватель">
          <div className="mymusic-player-track">
            {current ? <Artwork track={current}/> : <div className="mymusic-idle-art"><Music2 size={22} aria-hidden="true" /></div>}
            <div><strong>{current?.title ?? 'Ничего не играет'}</strong><span>{current?.artist ?? 'Выбери трек'}</span></div>
          </div>
          <div className="mymusic-player-center">
            <div className="mymusic-player-actions">
              <button type="button" disabled={!current} aria-label="Случайный порядок" aria-pressed={random} onClick={() => setRandom((v) => !v)} className={random ? 'active' : ''}><Shuffle size={17}/></button>
              <button type="button" disabled={!current} aria-label="Предыдущий трек" onClick={() => changeIndex(-1)}><SkipBack size={19}/></button>
              <button type="button" className="mymusic-primary-control" aria-label={playing ? 'Пауза' : 'Воспроизвести'} onClick={toggle} disabled={!current || buffering}>{buffering ? <LoaderCircle className="mymusic-spin" size={19}/> : playing ? <Pause size={19}/> : <Play size={19}/>}</button>
              <button type="button" disabled={!current} aria-label="Следующий трек" onClick={() => changeIndex(1)}><SkipForward size={19}/></button>
              <button type="button" disabled={!current} aria-label="Повтор" aria-pressed={repeat !== 'none'} className={repeat !== 'none' ? 'active' : ''} onClick={() => setRepeat((r) => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')}>{repeat === 'one' ? <Repeat1 size={17}/> : <Repeat size={17}/>}</button>
            </div>
            <div className="mymusic-timeline">
              <span>{duration(position)}</span>
              <input type="range" min={0} max={Math.max(length, 1)} step={1} value={Math.min(position, Math.max(length, 1))}
                aria-label="Перемотка" disabled={!length}
                onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)) }} />
              <span>{duration(length || current?.durationSeconds)}</span>
            </div>
          </div>
          <div className="mymusic-player-extra">
            <button type="button" className={queueOpen ? 'active' : ''} aria-label="Очередь" disabled={!queue.length} aria-expanded={queueOpen} onClick={() => setQueueOpen((v) => !v)}><ListMusic size={19}/></button>
            <button type="button" aria-label={volume ? 'Выключить звук' : 'Включить звук'} onClick={() => setVolume((v) => v ? 0 : 0.8)}>{volume ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Громкость"/>
          </div>
          {queueOpen ? <div className="mymusic-queue"><h4>Очередь</h4>{queue.map((item, index) => <button key={item.key} type="button" className={index === currentIndex ? 'active' : ''} onClick={() => { setCurrentIndex(index); setQueueOpen(false) }}>{index + 1}. {item.title} / {item.artist}</button>)}</div> : null}
          {playbackError ? <div className="mymusic-player-error" role="alert">{playbackError}</div> : null}
        </div>
      {downloadNotice ? <div className="mymusic-message" role="status">{downloadNotice}</div> : null}
      <div className="mymusic-attribution">YouTube · SoundCloud · Audius · Jamendo. Desktop сохраняет скачанные аудиофайлы во внутреннем хранилище MyMind для прослушивания без интернета (при наличии разрешения на копирование). На PWA доступна загрузка только с официального разрешения источника. Плейлисты и избранное сохраняются локально.</div>
    </section>
  )
}
