import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Check, Disc3, ExternalLink, Heart, ListMusic, LoaderCircle,
  Music2, Pause, Play, Radio, Search, Shuffle, SkipBack, SkipForward, Repeat, Repeat1,
  Volume2, VolumeX, X
} from 'lucide-react'
import {
  discoverMusic, providerLabel, type DiscoveredTrack, type MusicSource
} from '@mymind/core/music-discovery'
import './music-listening.css'

interface MusicListeningProps {
  onSaveTrack?: (track: DiscoveredTrack) => Promise<void> | void
  /** PWA uses a same-origin metadata route to avoid provider browser CORS restrictions. */
  searchProxy?: boolean
  savedTracks?: DiscoveredTrack[]
  onEngineSearch?: (input: { provider: 'youtube' | 'soundcloud'; query: string }) => Promise<DiscoveredTrack[]>
  onEngineResolve?: (input: { provider: 'youtube' | 'soundcloud'; id: string }) => Promise<string>
  onRadio?: (input: { videoId: string }) => Promise<DiscoveredTrack[]>
}

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

export function MusicListening({ onSaveTrack, searchProxy = false, savedTracks = [], onEngineSearch, onEngineResolve, onRadio }: MusicListeningProps): React.JSX.Element {
  const audio = useRef<HTMLAudioElement>(null)
  const [provider, setProvider] = useState<MusicSource>('youtube')
  const [onlySaved, setOnlySaved] = useState(false)
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tracks, setTracks] = useState<DiscoveredTrack[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [searchAttempt, setSearchAttempt] = useState(0)
  const [playbackError, setPlaybackError] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(() => new Set())
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
  const current = queue[currentIndex] ?? null
  const visibleTracks = onlySaved ? savedTracks.filter((t) => (t.title + ' ' + t.artist).toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))) : tracks

  useEffect(() => {
    try { setClientId(localStorage.getItem('mymind.music.jamendo-client-id') ?? '') } catch { /* private mode */ }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    if (onlySaved) {
      setLoading(false)
      setLoadError('')
      return () => controller.abort()
    }
    if (provider === 'jamendo' && !clientId.trim()) {
      setTracks([])
      setLoadError('')
      setLoading(false)
      return () => controller.abort()
    }

    // Even an Electron IPC promise can stay pending if an upstream service
    // stops responding. Always finish loading and leave a usable Retry action.
    setTracks([])
    setLoading(true)
    setLoadError('')
    let deadline: number | undefined
    const debounce = window.setTimeout(() => {
      deadline = window.setTimeout(() => {
        controller.abort()
        setLoadError('Источник музыки не ответил за 15 секунд. Проверь интернет и повтори поиск.')
        setLoading(false)
      }, 15_000)

      const search = searchProxy
        ? fetch('/api/music/discover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, query, jamendoClientId: clientId }),
            signal: controller.signal
          }).then(async (response) => {
            const data = await response.json() as { tracks?: DiscoveredTrack[]; error?: string }
            if (!response.ok) throw new Error(data.error || 'Не удалось загрузить музыку.')
            return data.tracks ?? []
          })
        : provider === 'youtube' || provider === 'soundcloud'
          ? onEngineSearch
            ? onEngineSearch({ provider, query })
            : Promise.reject(new Error('Музыкальный движок недоступен'))
          : discoverMusic({ provider, query, jamendoClientId: clientId, signal: controller.signal })

      void search
        .then((results) => {
          if (!controller.signal.aborted) setTracks(results)
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted)
            setLoadError(reason instanceof Error ? reason.message : 'Не удалось загрузить музыку.')
        })
        .finally(() => {
          if (deadline !== undefined) window.clearTimeout(deadline)
          if (!controller.signal.aborted) setLoading(false)
        })
    }, query ? 320 : 0)

    return () => {
      controller.abort()
      window.clearTimeout(debounce)
      if (deadline !== undefined) window.clearTimeout(deadline)
    }
  }, [provider, query, clientId, searchProxy, onlySaved, onEngineSearch, searchAttempt])

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
    if (player && track.provider !== 'youtube' && track.provider !== 'soundcloud') {
      player.src = track.streamUrl
      player.load()
      void player.play().then(() => setPlaying(true)).catch(() => {
        setPlaying(false)
        setPlaybackError('Не удалось начать воспроизведение. Нажми Play ещё раз.')
      })
    }
  }, [])

  useEffect(() => {
    const player = audio.current
    if (!player || !current) return
    let cancelled = false
    if (current.provider === 'youtube' || current.provider === 'soundcloud') {
      // Never put the YouTube video page into the HTML audio src. Ask yt-dlp
      // running in Desktop/companion for a short-lived stream session.
      player.pause()
      player.removeAttribute('src')
      player.load()
      setPlaying(false)
      setBuffering(true)
      setPlaybackError('')
      const resolve = searchProxy
        ? fetch('/api/music/resolve', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: current.provider, id: current.id })
          }).then(async response => {
            const result = await response.json() as { streamUrl?: string; error?: string }
            if (!response.ok || !result.streamUrl) throw new Error(result.error || 'Аудиопоток недоступен.')
            return result.streamUrl
          })
        : onEngineResolve
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
  }, [current?.key, current?.streamUrl, searchProxy, onEngineResolve])

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

  const save = async (track: DiscoveredTrack): Promise<void> => {
    if (!onSaveTrack || saving) return
    setSaving(track.key)
    setPlaybackError('')
    try {
      await onSaveTrack(track)
      setSaved((previous) => new Set([...previous, track.key]))
    } catch (reason) {
      setPlaybackError(reason instanceof Error ? reason.message : 'Не удалось сохранить трек.')
    } finally {
      setSaving(null)
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
      <div className="mymusic-hero">
        <div className="mymusic-hero-symbol"><Music2 size={32} /></div>
        <div className="mymusic-hero-copy">
          <span className="mymusic-eyebrow">MYMIND · MUSIC</span>
          <h2>Твоя музыка. Твой ритм.</h2>
          <p>Ищи новые треки, слушай и собирай собственную коллекцию.</p>
        </div>
      </div>

      <div className="mymusic-discovery-toolbar">
        <div className="mymusic-providers" role="group" aria-label="Источник музыки">
          {(['youtube', 'soundcloud', 'audius', 'jamendo'] as const).map((value) => (
            <button key={value} type="button" aria-pressed={provider === value}
              className={provider === value && !onlySaved ? 'active' : ''}
              onClick={() => { setOnlySaved(false); setProvider(value); setQuery('') }}>
              {providerLabel(value)}
            </button>
          ))}
          <button type="button" aria-pressed={onlySaved} className={onlySaved ? 'active' : ''} onClick={() => { setOnlySaved(true); setQuery('') }}>Мои треки</button>
        </div>
        <label className="mymusic-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Трек, исполнитель, настроение…" maxLength={200} aria-label="Поиск музыки" />
          {query ? <button type="button" aria-label="Очистить поиск" onClick={() => setQuery('')}><X size={16}/></button> : null}
        </label>
        <button type="button" className="mymusic-settings-button" onClick={() => setSettingsOpen((v) => !v)} aria-expanded={settingsOpen}>
          Источники
        </button>
      </div>

      {settingsOpen ? (
        <div className="mymusic-provider-settings">
          <label htmlFor="mymusic-jamendo-key">Jamendo client_id</label>
          <input id="mymusic-jamendo-key" value={clientId} onChange={(event) => onChangeClientId(event.target.value)}
            placeholder="Бесплатный client_id из developer.jamendo.com" autoComplete="off" />
          <p>Jamendo требует бесплатный client_id. YouTube использует InnerTube; аудио и SoundCloud работают через локальный yt-dlp (Desktop) или твой музыкальный мост (PWA).</p>
        </div>
      ) : null}

      <div className="mymusic-section-head">
        <div>
          <span className="mymusic-eyebrow">{onlySaved ? 'Коллекция' : providerLabel(provider)}</span>
          <h3>{onlySaved ? 'Сохранённая музыка' : query.trim() ? 'Результаты поиска' : 'Сейчас в тренде'}</h3>
        </div>
        <span className="mymusic-result-count">{loading ? 'Поиск…' : String(visibleTracks.length) + ' треков'}</span>
      </div>
      {!onlySaved && provider === 'jamendo' && !clientId ? (
        <div className="mymusic-message">Для Jamendo нужен бесплатный client_id. Нажми «Источники», чтобы добавить его.</div>
      ) : !onlySaved && loadError ? (
        <div className="mymusic-message" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={() => setSearchAttempt((attempt) => attempt + 1)}>
            Повторить поиск
          </button>
        </div>
      ) : !onlySaved && loading && !visibleTracks.length ? (
        <div className="mymusic-message"><LoaderCircle className="mymusic-spin" size={20}/> Загружаем музыку…</div>
      ) : !visibleTracks.length ? (
        <div className="mymusic-message">{onlySaved ? 'Пока нет сохранённых потоков. Найди трек и нажми сердечко, чтобы добавить его в библиотеку.' : 'Ничего не найдено. Попробуй другой запрос.'}</div>
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
              {onSaveTrack ? <button className="mymusic-track-action" type="button" disabled={saving !== null || saved.has(track.key) || savedTracks.some((item) => item.key === track.key)} title="Сохранить в библиотеку" aria-label={'Сохранить ' + track.title + ' в библиотеку'} onClick={() => void save(track)}>
                {saved.has(track.key) || savedTracks.some((item) => item.key === track.key) ? <Check size={17}/> : saving === track.key ? <LoaderCircle className="mymusic-spin" size={17}/> : <Heart size={17}/>}
              </button> : null}
              {track.permalink ? <a className="mymusic-track-action" href={track.permalink} target="_blank" rel="noopener noreferrer" aria-label={'Открыть ' + track.title + ' у источника'}><ExternalLink size={16}/></a> : null}
            </article>
          ))}
        </div>
      )}

      <div className="mymusic-external">
        <a href={'https://www.youtube.com/results?search_query=' + encodeURIComponent(query || 'music')} target="_blank" rel="noopener noreferrer">Найти на YouTube <ExternalLink size={14}/></a>
        <a href={'https://soundcloud.com/search?q=' + encodeURIComponent(query || 'music')} target="_blank" rel="noopener noreferrer">Найти на SoundCloud <ExternalLink size={14}/></a>
      </div>

      {current ? (
        <div className="mymusic-player" role="region" aria-label="Музыкальный проигрыватель">
          <div className="mymusic-player-track">
            <Artwork track={current}/>
            <div><strong>{current.title}</strong><span>{current.artist}</span></div>
          </div>
          <div className="mymusic-player-center">
            <div className="mymusic-player-actions">
              <button type="button" aria-label="Случайный порядок" aria-pressed={random} onClick={() => setRandom((v) => !v)} className={random ? 'active' : ''}><Shuffle size={17}/></button>
              <button type="button" aria-label="Предыдущий трек" onClick={() => changeIndex(-1)}><SkipBack size={19}/></button>
              <button type="button" className="mymusic-primary-control" aria-label={playing ? 'Пауза' : 'Воспроизвести'} onClick={toggle} disabled={buffering}>{buffering ? <LoaderCircle className="mymusic-spin" size={19}/> : playing ? <Pause size={19}/> : <Play size={19}/>}</button>
              <button type="button" aria-label="Следующий трек" onClick={() => changeIndex(1)}><SkipForward size={19}/></button>
              <button type="button" aria-label="Повтор" aria-pressed={repeat !== 'none'} className={repeat !== 'none' ? 'active' : ''} onClick={() => setRepeat((r) => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')}>{repeat === 'one' ? <Repeat1 size={17}/> : <Repeat size={17}/>}</button>
            </div>
            <div className="mymusic-timeline">
              <span>{duration(position)}</span>
              <input type="range" min={0} max={Math.max(length, 1)} step={1} value={Math.min(position, Math.max(length, 1))}
                aria-label="Перемотка" disabled={!length}
                onChange={(event) => { if (audio.current) audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)) }} />
              <span>{duration(length || current.durationSeconds)}</span>
            </div>
          </div>
          <div className="mymusic-player-extra">
            <button type="button" className={queueOpen ? 'active' : ''} aria-label="Очередь" aria-expanded={queueOpen} onClick={() => setQueueOpen((v) => !v)}><ListMusic size={19}/></button>
            <button type="button" aria-label={volume ? 'Выключить звук' : 'Включить звук'} onClick={() => setVolume((v) => v ? 0 : 0.8)}>{volume ? <Volume2 size={19}/> : <VolumeX size={19}/>}</button>
            <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(Number(e.target.value))} aria-label="Громкость"/>
          </div>
          {queueOpen ? <div className="mymusic-queue"><h4>Очередь</h4>{queue.map((item, index) => <button key={item.key} type="button" className={index === currentIndex ? 'active' : ''} onClick={() => { setCurrentIndex(index); setQueueOpen(false) }}>{index + 1}. {item.title} / {item.artist}</button>)}</div> : null}
          {playbackError ? <div className="mymusic-player-error" role="alert">{playbackError}</div> : null}
        </div>
      ) : null}
      <div className="mymusic-attribution">YouTube · SoundCloud · Audius · Jamendo. Для YouTube и SoundCloud используется локальный yt-dlp или личный музыкальный мост. Соблюдай права правообладателей при воспроизведении и кэшировании.</div>
    </section>
  )
}
