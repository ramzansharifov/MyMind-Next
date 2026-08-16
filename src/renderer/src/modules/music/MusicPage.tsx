import * as Popover from '@radix-ui/react-popover'
import {
  ArrowLeft,
  Bookmark,
  Braces,
  Check,
  Disc3,
  Heart,
  Image,
  LoaderCircle,
  Music2,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  X
} from 'lucide-react'
import { Children, isValidElement, useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CreateMusicItemInput,
  MusicItemRecord,
  MusicType,
  UpdateMusicItemInput
} from '../../../../shared/contracts/music'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { musicClient } from './api/music-client'
import { MusicDetail } from './components/MusicDetail'
import { MusicFormPage } from './components/MusicFormPage'
import { MusicJsonImportDialog } from './components/MusicJsonImportDialog'
import './components/music-interactions.css'
import { MUSIC_TYPE_OPTIONS, musicTypeLabel } from './music-types'

type MusicFilter = 'all' | 'want_to_listen' | 'listened' | 'favorites'
type MusicView =
  | { kind: 'library' }
  | { kind: 'detail'; itemId: string }
  | { kind: 'form'; itemId: string | null }

interface MusicPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

interface AdvancedFilters {
  type: MusicType | 'all'
  genre: string
  artist: string
  year: string
  minRating: string
}

type AdvancedFilterKey = keyof AdvancedFilters

const MUSIC_FORM_ID = 'music-form'
const EMPTY_FILTERS: AdvancedFilters = {
  type: 'all',
  genre: 'all',
  artist: 'all',
  year: 'all',
  minRating: 'all'
}

const tabs: Array<{ id: MusicFilter; label: string; icon?: React.ReactNode }> = [
  { id: 'all', label: 'Все' },
  { id: 'want_to_listen', label: 'Хочу послушать', icon: <Bookmark className="size-4" /> },
  { id: 'listened', label: 'Прослушано', icon: <Check className="size-4" /> },
  { id: 'favorites', label: 'Избранное', icon: <Heart className="size-4" /> }
]

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'ru-RU')
  )
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function Cover({ item }: { item: MusicItemRecord }): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [item.coverUrl])

  if (!item.coverUrl || failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--app-control)] text-[var(--app-muted)]">
        <Image className="size-9 opacity-45" />
        <span className="px-3 text-center text-[11px]">Обложка не указана</span>
      </div>
    )
  }

  return (
    <img
      src={item.coverUrl}
      alt={`Обложка «${item.title}»`}
      loading="lazy"
      className="music-card-cover h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}): React.JSX.Element {
  const selectOptions = Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{ value?: unknown; children?: React.ReactNode }>(child) ||
      child.type !== 'option' ||
      child.props.value === undefined ||
      child.props.value === null
    ) {
      return []
    }

    return [
      {
        value: String(child.props.value),
        label: Children.toArray(child.props.children).join('')
      }
    ]
  })

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-[var(--app-muted)]">{label}</span>
      <AppSelect
        ariaLabel={label}
        value={value}
        options={selectOptions}
        onValueChange={onChange}
      />
    </div>
  )
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }): React.JSX.Element {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 text-xs font-medium text-violet-200">
      {label}
      <button
        type="button"
        aria-label={`Убрать фильтр «${label}»`}
        className="flex size-5 items-center justify-center rounded-md text-violet-200/70 hover:bg-white/[0.08] hover:text-violet-100"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </span>
  )
}

function toUpdateInput(item: MusicItemRecord): UpdateMusicItemInput {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    year: item.year,
    coverUrl: item.coverUrl,
    artists: item.artists,
    album: item.album,
    durationSeconds: item.durationSeconds,
    trackCount: item.trackCount,
    genres: item.genres,
    description: item.description,
    status: item.status,
    favorite: item.favorite,
    rating: item.rating,
    comments: item.comments
  }
}

export function MusicPage({ resourceId, onResourceHandled }: MusicPageProps): React.JSX.Element {
  const [items, setItems] = useState<MusicItemRecord[]>([])
  const [view, setView] = useState<MusicView>({ kind: 'library' })
  const [tab, setTab] = useState<MusicFilter>('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<AdvancedFilters>(EMPTY_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<MusicItemRecord | null>(null)
  const [jsonOpen, setJsonOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeId = view.kind === 'library' ? null : view.itemId
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items]
  )

  const options = useMemo(
    () => ({
      genres: uniqueSorted(items.flatMap((item) => item.genres)),
      artists: uniqueSorted(items.flatMap((item) => item.artists)),
      years: Array.from(new Set(items.flatMap((item) => (item.year === null ? [] : [item.year])))).sort(
        (a, b) => b - a
      )
    }),
    [items]
  )

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== 'all').length,
    [filters]
  )

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    const selectedYear = filters.year === 'all' ? null : Number.parseInt(filters.year, 10)
    const minRating = filters.minRating === 'all' ? null : Number.parseInt(filters.minRating, 10)

    return items.filter((item) => {
      if (tab === 'want_to_listen' && item.status !== 'want_to_listen') return false
      if (tab === 'listened' && item.status !== 'listened') return false
      if (tab === 'favorites' && !item.favorite) return false
      if (filters.type !== 'all' && item.type !== filters.type) return false
      if (filters.genre !== 'all' && !item.genres.includes(filters.genre)) return false
      if (filters.artist !== 'all' && !item.artists.includes(filters.artist)) return false
      if (selectedYear !== null && item.year !== selectedYear) return false
      if (minRating !== null && (item.rating === null || item.rating < minRating)) return false
      if (!normalizedQuery) return true

      return [
        item.title,
        musicTypeLabel(item.type),
        item.album,
        item.year?.toString() ?? '',
        ...item.artists,
        ...item.genres
      ]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [filters, items, query, tab])

  const loadOverview = useCallback(async (): Promise<MusicItemRecord[]> => {
    setError(null)
    try {
      const overview = await musicClient.listOverview()
      setItems(overview.items)
      setView((current) => {
        if (current.kind === 'library' || current.itemId === null) return current
        return overview.items.some((item) => item.id === current.itemId)
          ? current
          : { kind: 'library' }
      })
      return overview.items
    } catch (reason) {
      setError(errorMessage(reason))
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOverview()
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) return
    let cancelled = false
    queueMicrotask(async () => {
      if (cancelled) return
      try {
        const item = await musicClient.getItem({ id: resourceId })
        if (!cancelled && item) {
          setItems((current) =>
            current.some((entry) => entry.id === item.id)
              ? current.map((entry) => (entry.id === item.id ? item : entry))
              : [item, ...current]
          )
          setView({ kind: 'detail', itemId: item.id })
        }
      } finally {
        if (!cancelled) onResourceHandled?.()
      }
    })
    return () => {
      cancelled = true
    }
  }, [onResourceHandled, resourceId])

  function setAdvancedFilter(key: AdvancedFilterKey, value: string): void {
    setFilters((current) => ({ ...current, [key]: value }) as AdvancedFilters)
  }

  function clearAdvancedFilter(key: AdvancedFilterKey): void {
    setFilters((current) => ({ ...current, [key]: 'all' }) as AdvancedFilters)
  }

  async function saveItem(input: CreateMusicItemInput & { id?: string }): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = input.id
        ? await musicClient.updateItem(input as UpdateMusicItemInput)
        : await musicClient.createItem(input)
      setItems((current) => [saved, ...current.filter((item) => item.id !== saved.id)])
      setView({ kind: 'detail', itemId: saved.id })
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function importItems(inputs: CreateMusicItemInput[]): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const created = await musicClient.createItems({ items: inputs })
      setItems((current) => [...created, ...current])
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function updateItem(item: MusicItemRecord): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await musicClient.updateItem(toUpdateInput(item))
      setItems((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)))
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function removeItem(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await musicClient.deleteItem({ id: deleteTarget.id })
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id))
      if (activeId === deleteTarget.id) setView({ kind: 'library' })
      setDeleteTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function searchWeb(searchQuery: string): Promise<void> {
    try {
      await musicClient.searchWeb({ query: searchQuery })
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  if (isLoading) {
    return (
      <main className="flex h-full items-center justify-center bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]">
        <LoaderCircle className="mr-2 size-4 animate-spin" /> Загрузка музыкальной библиотеки…
      </main>
    )
  }

  const headerTitle =
    view.kind === 'form'
      ? view.itemId
        ? 'Редактировать музыку'
        : 'Добавить музыку'
      : 'Музыка'

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="relative isolate mb-5 overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[0_20px_70px_rgb(0_0_0/0.16)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-24 -z-10 size-80 rounded-full bg-violet-900/10 blur-3xl" />

          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                <Disc3 className="size-6" />
              </span>
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">{headerTitle}</h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {view.kind === 'library' && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => setJsonOpen(true)}
                  >
                    <Braces className="size-4" /> Из JSON
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
                    onClick={() => setView({ kind: 'form', itemId: null })}
                  >
                    <Plus className="size-4" /> Добавить музыку
                  </button>
                </>
              )}

              {view.kind === 'form' && (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-50"
                    onClick={() =>
                      setView(
                        view.itemId && activeItem
                          ? { kind: 'detail', itemId: view.itemId }
                          : { kind: 'library' }
                      )
                    }
                  >
                    <ArrowLeft className="size-4" /> {view.itemId ? 'К записи' : 'К библиотеке'}
                  </button>
                  <button
                    type="submit"
                    form={MUSIC_FORM_ID}
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                  >
                    {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {isSaving ? 'Сохраняем…' : view.itemId ? 'Сохранить' : 'Добавить музыку'}
                  </button>
                </>
              )}

              {view.kind === 'detail' && activeItem && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
                    onClick={() => setView({ kind: 'library' })}
                  >
                    <ArrowLeft className="size-4" /> К библиотеке
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-50"
                    onClick={() => setView({ kind: 'form', itemId: activeItem.id })}
                  >
                    <Pencil className="size-4" /> Изменить
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                    onClick={() => setDeleteTarget(activeItem)}
                  >
                    <Trash2 className="size-4" /> Удалить
                  </button>
                </>
              )}
            </div>
          </div>

          {view.kind === 'library' && (
            <>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-[1120px]:grid-cols-1">
                <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
                  <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
                  <input
                    value={query}
                    type="search"
                    aria-label="Поиск по музыке"
                    placeholder="Найти по названию, исполнителю, альбому или жанру"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Очистить поиск"
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                      onClick={() => setQuery('')}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </label>

                <div className="flex min-w-0 items-stretch gap-2 max-[760px]:flex-col">
                  <div role="tablist" aria-label="Разделы музыки" className="flex min-h-12 min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5">
                    {tabs.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        className={
                          tab === item.id
                            ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white'
                            : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                        }
                        onClick={() => setTab(item.id)}
                      >
                        {item.icon}{item.label}
                      </button>
                    ))}
                  </div>

                  <Popover.Root>
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className={
                          activeFilterCount > 0
                            ? 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200'
                            : 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
                        }
                      >
                        <SlidersHorizontal className="size-4" /> Фильтры
                        {activeFilterCount > 0 && <span className="rounded-md bg-violet-400/15 px-1.5 text-[11px]">{activeFilterCount}</span>}
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content align="end" sideOffset={8} collisionPadding={12} className="z-[70] w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 shadow-2xl outline-none">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-sm font-semibold text-[var(--app-text)]">Фильтры библиотеки</h2>
                            <p className="mt-1 text-xs text-[var(--app-muted)]">Тип, исполнитель, жанр, год и оценка.</p>
                          </div>
                          <Popover.Close asChild>
                            <button type="button" aria-label="Закрыть фильтры" className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"><X className="size-4" /></button>
                          </Popover.Close>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <FilterSelect label="Тип" value={filters.type} onChange={(value) => setAdvancedFilter('type', value)}>
                            <option value="all">Все типы</option>
                            {MUSIC_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </FilterSelect>
                          <FilterSelect label="Жанр" value={filters.genre} onChange={(value) => setAdvancedFilter('genre', value)}>
                            <option value="all">Все жанры</option>
                            {options.genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                          </FilterSelect>
                          <FilterSelect label="Исполнитель" value={filters.artist} onChange={(value) => setAdvancedFilter('artist', value)}>
                            <option value="all">Все исполнители</option>
                            {options.artists.map((artist) => <option key={artist} value={artist}>{artist}</option>)}
                          </FilterSelect>
                          <FilterSelect label="Год" value={filters.year} onChange={(value) => setAdvancedFilter('year', value)}>
                            <option value="all">Любой год</option>
                            {options.years.map((year) => <option key={year} value={year.toString()}>{year}</option>)}
                          </FilterSelect>
                          <FilterSelect label="Оценка" value={filters.minRating} onChange={(value) => setAdvancedFilter('minRating', value)}>
                            <option value="all">Любая оценка</option>
                            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating.toString()}>От {rating}</option>)}
                          </FilterSelect>
                        </div>

                        <div className="mt-4 flex justify-end border-t border-[var(--app-border)] pt-3">
                          <button
                            type="button"
                            disabled={activeFilterCount === 0}
                            className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-40"
                            onClick={() => setFilters({ ...EMPTY_FILTERS })}
                          >
                            Сбросить
                          </button>
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-[var(--app-muted)]">Активные фильтры:</span>
                  {filters.type !== 'all' && <ActiveFilterChip label={`Тип: ${musicTypeLabel(filters.type)}`} onRemove={() => clearAdvancedFilter('type')} />}
                  {filters.genre !== 'all' && <ActiveFilterChip label={`Жанр: ${filters.genre}`} onRemove={() => clearAdvancedFilter('genre')} />}
                  {filters.artist !== 'all' && <ActiveFilterChip label={`Исполнитель: ${filters.artist}`} onRemove={() => clearAdvancedFilter('artist')} />}
                  {filters.year !== 'all' && <ActiveFilterChip label={`Год: ${filters.year}`} onRemove={() => clearAdvancedFilter('year')} />}
                  {filters.minRating !== 'all' && <ActiveFilterChip label={`Оценка: от ${filters.minRating}`} onRemove={() => clearAdvancedFilter('minRating')} />}
                  <button type="button" className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]" onClick={() => setFilters({ ...EMPTY_FILTERS })}>Сбросить все</button>
                </div>
              )}
            </>
          )}
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {view.kind === 'form' ? (
          <MusicFormPage key={view.itemId ?? 'new-music'} item={activeItem} formId={MUSIC_FORM_ID} onSave={saveItem} />
        ) : view.kind === 'detail' && activeItem ? (
          <MusicDetail item={activeItem} busy={isSaving} onUpdate={updateItem} onSearchWeb={searchWeb} />
        ) : visibleItems.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300"><Music2 className="size-7" /></span>
            <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{items.length === 0 ? 'Музыкальная библиотека пока пустая' : 'Ничего не найдено'}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">{items.length === 0 ? 'Добавьте первый трек, альбом, EP или сингл.' : 'Попробуйте изменить поиск, раздел или активные фильтры.'}</p>
            {items.length === 0 && <button type="button" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400" onClick={() => setView({ kind: 'form', itemId: null })}><Plus className="size-4" /> Добавить музыку</button>}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(205px,1fr))]">
            {visibleItems.map((item) => {
              const artist = item.artists.length > 0 ? item.artists.join(', ') : 'Исполнитель не указан'
              const duration = formatDuration(item.durationSeconds)
              return (
                <article key={item.id} className="music-card group min-w-0">
                  <div className="music-card-body overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                    <div className="relative aspect-square overflow-hidden bg-[var(--app-workspace)]">
                      <button type="button" aria-label={`Открыть музыку «${item.title}»`} className="absolute inset-0 z-0 overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-inset" onClick={() => setView({ kind: 'detail', itemId: item.id })}>
                        <Cover item={item} />
                        <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                      </button>

                      <button
                        type="button"
                        aria-label={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                        aria-pressed={item.favorite}
                        disabled={isSaving}
                        className={item.favorite ? 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-rose-300/25 bg-black/50 text-rose-300 backdrop-blur-md hover:bg-black/65' : 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/70 backdrop-blur-md hover:text-white'}
                        onClick={() => void updateItem({ ...item, favorite: !item.favorite })}
                      >
                        <Heart className={`size-4 ${item.favorite ? 'fill-current' : ''}`} />
                      </button>

                      <div className="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5 z-10 flex items-end justify-between gap-2">
                        <span className={item.status === 'listened' ? 'inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-black/50 px-2 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-md' : 'inline-flex items-center gap-1 rounded-lg border border-violet-300/20 bg-black/50 px-2 py-1 text-[11px] font-medium text-violet-200 backdrop-blur-md'}>
                          {item.status === 'listened' ? <Check className="size-3" /> : <Bookmark className="size-3" />}
                          {item.status === 'listened' ? 'Прослушано' : 'Хочу послушать'}
                        </span>
                        {item.status === 'listened' && item.rating !== null && <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur-md"><Star className="size-3 fill-current" /> {item.rating.toFixed(1)}</span>}
                      </div>
                    </div>

                    <button type="button" className="flex min-h-20 w-full min-w-0 flex-col items-start justify-center border-t border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-left outline-none hover:bg-[var(--app-control-hover)]" onClick={() => setView({ kind: 'detail', itemId: item.id })}>
                      <span className="block w-full truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-violet-200">{item.title}</span>
                      <span className="mt-0.5 block w-full truncate text-xs text-[var(--app-muted)]">{artist}</span>
                      <span className="mt-1 flex items-center gap-2 text-[10px] text-[var(--app-muted)]/80"><span>{musicTypeLabel(item.type)}</span>{duration && <><span>•</span><span>{duration}</span></>}</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <MusicJsonImportDialog open={jsonOpen} busy={isSaving} onOpenChange={setJsonOpen} onImport={importItems} />

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title="Удалить музыкальную запись?"
        subject={deleteTarget?.title}
        description="Запись, оценка и личные комментарии будут удалены из библиотеки."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={removeItem}
      />
    </main>
  )
}
