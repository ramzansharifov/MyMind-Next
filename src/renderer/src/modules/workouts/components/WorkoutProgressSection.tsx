import * as Collapsible from '@radix-ui/react-collapsible'

import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronDown,
  Images,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  TrendingUp
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoRecord,
  WorkoutProgressPhotoView
} from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { DeleteConfirmationDialog } from '../../../shared/ui/DeleteConfirmationDialog'
import { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'

interface WorkoutProgressSectionProps {
  entries: WorkoutProgressEntryRecord[]
  busy: boolean
  onEdit: (entry: WorkoutProgressEntryRecord) => void
  onDelete: (entry: WorkoutProgressEntryRecord) => void
  onImportPhoto: (entryId: string, view: WorkoutProgressPhotoView) => Promise<void>
  onRemovePhoto: (id: string) => Promise<void>
}

interface DatedPhoto {
  photo: WorkoutProgressPhotoRecord
  date: string
}

const FIXED_PHOTO_VIEWS: Array<{
  value: Exclude<WorkoutProgressPhotoView, 'custom'>
  label: string
}> = [
  { value: 'front', label: 'Спереди' },
  { value: 'left', label: 'Слева' },
  { value: 'right', label: 'Справа' },
  { value: 'back', label: 'Сзади' }
]

const PHOTO_VIEW_LABELS: Record<WorkoutProgressPhotoView, string> = {
  front: 'Спереди',
  left: 'Слева',
  right: 'Справа',
  back: 'Сзади',
  custom: 'Другой ракурс'
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

function formatWeight(value: number): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function formatDelta(value: number): string {
  if (value === 0) return '0 кг'
  return `${value > 0 ? '+' : '−'}${formatWeight(Math.abs(value))} кг`
}

function BodyWeightChart({
  entries
}: {
  entries: WorkoutProgressEntryRecord[]
}): React.JSX.Element {
  const points = entries
    .filter((entry): entry is WorkoutProgressEntryRecord & { bodyWeightKg: number } =>
      Number.isFinite(entry.bodyWeightKg)
    )
    .sort((left, right) => left.date.localeCompare(right.date))

  if (points.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-5 text-center text-sm text-[var(--app-muted)]">
        Укажите вес тела хотя бы в одной контрольной точке, чтобы увидеть динамику.
      </div>
    )
  }

  const width = 640
  const height = 180
  const paddingX = 24
  const paddingTop = 22
  const paddingBottom = 30
  const values = points.map((entry) => entry.bodyWeightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 1)
  const plotHeight = height - paddingTop - paddingBottom
  const plotWidth = width - paddingX * 2
  const coordinates = points.map((entry, index) => ({
    entry,
    x:
      points.length === 1
        ? width / 2
        : paddingX + (plotWidth * index) / Math.max(points.length - 1, 1),
    y: paddingTop + ((max - entry.bodyWeightKg) / span) * plotHeight
  }))
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 pt-3 pb-2">
      <svg
        role="img"
        aria-label="Динамика веса тела"
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible text-violet-400"
        preserveAspectRatio="none"
      >
        <line
          x1={paddingX}
          y1={paddingTop + plotHeight}
          x2={width - paddingX}
          y2={paddingTop + plotHeight}
          stroke="var(--app-border)"
          strokeWidth="1"
        />
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {coordinates.map(({ entry, x, y }) => (
          <g key={entry.id}>
            <circle cx={x} cy={y} r="5" fill="currentColor" />
            <circle cx={x} cy={y} r="9" fill="currentColor" opacity="0.12" />
          </g>
        ))}
      </svg>
      <div className="-mt-4 flex items-center justify-between px-2 text-[11px] text-[var(--app-muted)]">
        <span>{formatShortDate(points[0]!.date)}</span>
        <span>
          {formatWeight(min)}–{formatWeight(max)} кг
        </span>
        <span>{formatShortDate(points.at(-1)!.date)}</span>
      </div>
    </div>
  )
}

function PhotoPreview({
  item,
  label,
  onOpen
}: {
  item: DatedPhoto
  label: string
  onOpen: (item: DatedPhoto) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="group relative min-h-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-left"
      onClick={() => onOpen(item)}
    >
      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={item.photo.url}
          alt={`${label} · ${formatDate(item.date)}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pt-10 pb-3 text-white">
        <div className="text-xs font-semibold">{label}</div>
        <div className="mt-0.5 text-[11px] text-white/75">{formatDate(item.date)}</div>
      </div>
    </button>
  )
}

export function WorkoutProgressSection({
  entries,
  busy,
  onEdit,
  onDelete,
  onImportPhoto,
  onRemovePhoto
}: WorkoutProgressSectionProps): React.JSX.Element {
  const [comparisonView, setComparisonView] =
    useState<Exclude<WorkoutProgressPhotoView, 'custom'>>('front')
  const [viewer, setViewer] = useState<DatedPhoto | null>(null)
  const [photoToDelete, setPhotoToDelete] = useState<DatedPhoto | null>(null)

  const chronologicalEntries = useMemo(
    () => [...entries].sort((left, right) => left.date.localeCompare(right.date)),
    [entries]
  )
  const weightEntries = chronologicalEntries.filter(
    (entry): entry is WorkoutProgressEntryRecord & { bodyWeightKg: number } =>
      Number.isFinite(entry.bodyWeightKg)
  )
  const firstWeight = weightEntries[0]?.bodyWeightKg ?? null
  const latestWeight = weightEntries.at(-1)?.bodyWeightKg ?? null
  const weightDelta =
    firstWeight === null || latestWeight === null ? null : latestWeight - firstWeight
  const totalPhotos = entries.reduce((sum, entry) => sum + entry.photos.length, 0)

  const comparisonPhotos = useMemo(
    () =>
      chronologicalEntries.flatMap((entry) =>
        entry.photos
          .filter((photo) => photo.view === comparisonView)
          .map((photo) => ({ photo, date: entry.date }))
      ),
    [chronologicalEntries, comparisonView]
  )
  const comparisonFirst = comparisonPhotos[0] ?? null
  const comparisonLast = comparisonPhotos.at(-1) ?? null
  const hasComparison =
    comparisonFirst !== null &&
    comparisonLast !== null &&
    comparisonFirst.photo.id !== comparisonLast.photo.id

  async function confirmPhotoDelete(): Promise<void> {
    if (!photoToDelete) return
    await onRemovePhoto(photoToDelete.photo.id)
    setPhotoToDelete(null)
    if (viewer?.photo.id === photoToDelete.photo.id) setViewer(null)
  }

  if (entries.length === 0) {
    return (
      <section className="mt-5">
        <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
          <TrendingUp className="size-10 text-violet-300" />
          <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
            Начните фиксировать прогресс
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
            Создавайте контрольные точки, записывайте вес и показатели упражнений, а затем
            добавляйте фотографии спереди, сбоку и сзади. Одинаковые ракурсы помогут сравнивать
            форму между датами без лишнего шума.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
            <Scale className="size-4 text-violet-300" /> Текущий вес
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">
            {latestWeight === null ? '—' : `${formatWeight(latestWeight)} кг`}
          </div>
          <div className="mt-1 text-xs text-[var(--app-muted)]">Последняя контрольная точка</div>
        </div>
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
            <TrendingUp className="size-4 text-violet-300" /> Изменение веса
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">
            {weightDelta === null ? '—' : formatDelta(weightDelta)}
          </div>
          <div className="mt-1 text-xs text-[var(--app-muted)]">От первой записи до последней</div>
        </div>
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
            <CalendarDays className="size-4 text-violet-300" /> Контрольные точки
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{entries.length}</div>
          <div className="mt-1 text-xs text-[var(--app-muted)]">Записей прогресса</div>
        </div>
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
            <Images className="size-4 text-violet-300" /> Фотографии
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{totalPhotos}</div>
          <div className="mt-1 text-xs text-[var(--app-muted)]">Локально сохранённых снимков</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
          <div className="flex items-center gap-2">
            <Scale className="size-5 text-violet-300" />
            <div>
              <h2 className="text-sm font-semibold text-[var(--app-text)]">Динамика веса</h2>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                Все контрольные точки с указанным весом тела.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <BodyWeightChart entries={entries} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Images className="size-5 text-violet-300" />
              <div>
                <h2 className="text-sm font-semibold text-[var(--app-text)]">
                  Визуальный прогресс
                </h2>
                <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                  Сравнение самого раннего и последнего снимка одного ракурса.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
              {FIXED_PHOTO_VIEWS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={comparisonView === option.value}
                  className={`h-8 rounded-lg px-2.5 text-xs font-medium transition-colors ${
                    comparisonView === option.value
                      ? 'bg-violet-500/15 text-violet-200'
                      : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }`}
                  onClick={() => setComparisonView(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {comparisonFirst ? (
            <div className="mt-4 grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
              <PhotoPreview item={comparisonFirst} label="Было" onOpen={setViewer} />
              <ArrowRight className="size-5 shrink-0 text-[var(--app-muted)]" />
              {hasComparison && comparisonLast ? (
                <PhotoPreview item={comparisonLast} label="Стало" onOpen={setViewer} />
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-center text-xs leading-5 text-[var(--app-muted)]">
                  Добавьте этот же ракурс в следующую контрольную точку, чтобы получить сравнение.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex min-h-52 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-6 text-center text-sm leading-6 text-[var(--app-muted)]">
              Для ракурса «{PHOTO_VIEW_LABELS[comparisonView]}» пока нет фотографий. Добавьте снимок
              в одной из контрольных точек ниже.
            </div>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <TrendingUp className="size-5 text-violet-300" />
        <div>
          <h2 className="text-base font-semibold text-[var(--app-text)]">История прогресса</h2>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            Показатели, самочувствие и фотографии каждой контрольной точки.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => {
          const customPhotos = entry.photos.filter((photo) => photo.view === 'custom')
          return (
            <Collapsible.Root key={entry.id} defaultOpen={false} asChild>
              <article className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-5 text-violet-300" />
                      <h3 className="text-base font-semibold text-[var(--app-text)]">
                        {formatDate(entry.date)}
                      </h3>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                      {entry.bodyWeightKg !== null && (
                        <span className="inline-flex items-center gap-1.5">
                          <Scale className="size-3.5" /> {formatWeight(entry.bodyWeightKg)} кг
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Images className="size-3.5" /> {entry.photos.length} фото
                      </span>
                      <span>{entry.metrics.length} показателей</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Collapsible.Trigger asChild>
                      <button
                        type="button"
                        aria-label={`Развернуть или свернуть запись прогресса за ${formatDate(entry.date)}`}
                        className="group flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                      >
                        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </Collapsible.Trigger>
                    <button
                      type="button"
                      aria-label={`Изменить прогресс за ${formatDate(entry.date)}`}
                      className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                      onClick={() => onEdit(entry)}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить прогресс за ${formatDate(entry.date)}`}
                      className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => onDelete(entry)}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <Collapsible.Content className="overflow-hidden">
                  {(entry.wellbeing || entry.notes) && (
                    <div className="mt-4 grid gap-2 md:grid-cols-2">
                      {entry.wellbeing && (
                        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
                          <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                            Самочувствие
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-[var(--app-text)]">
                            {entry.wellbeing}
                          </p>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
                          <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                            Наблюдения
                          </div>
                          <p className="mt-1.5 text-sm leading-6 text-[var(--app-text)]">
                            {entry.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.metrics.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {entry.metrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <WorkoutMuscleArtwork
                              groups={metric.muscleGroups}
                              className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold text-[var(--app-text)]">
                                {metric.exerciseTitle}
                              </div>
                              <div className="mt-0.5 text-[10px] text-[var(--app-muted)]">
                                {metric.usesExternalWeight
                                  ? 'С дополнительным весом'
                                  : 'Без дополнительного веса'}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                            {metric.usesExternalWeight
                              ? `${formatWeight(metric.weightKg)} кг × ${metric.reps}`
                              : `${metric.reps} повторений`}
                          </div>
                          {metric.comment && (
                            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                              {metric.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--app-text)]">
                          Фотографии формы
                        </h4>
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          Для точного сравнения сохраняйте похожее расстояние, позу и освещение.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                      {FIXED_PHOTO_VIEWS.map((option) => {
                        const photo = entry.photos.find(
                          (candidate) => candidate.view === option.value
                        )
                        if (!photo) {
                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-label={`Добавить фото ${option.label.toLocaleLowerCase('ru-RU')} за ${formatDate(entry.date)}`}
                              disabled={busy}
                              className="flex aspect-[4/5] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-center text-[var(--app-muted)] transition-colors hover:border-violet-500/35 hover:bg-violet-500/5 hover:text-violet-200 disabled:opacity-45"
                              onClick={() => void onImportPhoto(entry.id, option.value)}
                            >
                              <Camera className="size-6" />
                              <span className="mt-2 text-xs font-semibold">{option.label}</span>
                              <span className="mt-1 text-[10px]">Добавить фото</span>
                            </button>
                          )
                        }

                        const item = { photo, date: entry.date }
                        return (
                          <div
                            key={option.value}
                            className="group/photo relative aspect-[4/5] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]"
                          >
                            <button
                              type="button"
                              className="size-full"
                              aria-label={`Открыть фото ${option.label.toLocaleLowerCase('ru-RU')} за ${formatDate(entry.date)}`}
                              onClick={() => setViewer(item)}
                            >
                              <img
                                src={photo.url}
                                alt={`${option.label} · ${formatDate(entry.date)}`}
                                className="size-full object-cover"
                              />
                            </button>
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-2.5 pt-8 pb-2 text-white">
                              <span className="text-[11px] font-semibold">{option.label}</span>
                              <div className="flex gap-1 opacity-0 transition-opacity group-hover/photo:opacity-100 focus-within:opacity-100">
                                <button
                                  type="button"
                                  aria-label={`Заменить фото ${option.label.toLocaleLowerCase('ru-RU')} за ${formatDate(entry.date)}`}
                                  disabled={busy}
                                  className="flex size-7 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur hover:bg-black/75 disabled:opacity-45"
                                  onClick={() => void onImportPhoto(entry.id, option.value)}
                                >
                                  <RefreshCw className="size-3.5" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Удалить фото ${option.label.toLocaleLowerCase('ru-RU')} за ${formatDate(entry.date)}`}
                                  disabled={busy}
                                  className="flex size-7 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur hover:bg-red-500/80 disabled:opacity-45"
                                  onClick={() => setPhotoToDelete(item)}
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-[var(--app-border)]" />
                      <span className="text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                        Другие ракурсы
                      </span>
                      <div className="h-px flex-1 bg-[var(--app-border)]" />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      {customPhotos.map((photo) => {
                        const item = { photo, date: entry.date }
                        return (
                          <div
                            key={photo.id}
                            className="group/photo relative aspect-[4/5] overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]"
                          >
                            <button
                              type="button"
                              className="size-full"
                              aria-label={`Открыть другой ракурс за ${formatDate(entry.date)}`}
                              onClick={() => setViewer(item)}
                            >
                              <img
                                src={photo.url}
                                alt={`Другой ракурс · ${formatDate(entry.date)}`}
                                className="size-full object-cover"
                              />
                            </button>
                            <button
                              type="button"
                              aria-label={`Удалить другой ракурс за ${formatDate(entry.date)}`}
                              disabled={busy}
                              className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover/photo:opacity-100 focus:opacity-100 disabled:opacity-45"
                              onClick={() => setPhotoToDelete(item)}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        )
                      })}
                      <button
                        type="button"
                        aria-label={`Добавить другой ракурс за ${formatDate(entry.date)}`}
                        disabled={busy}
                        className="flex aspect-[4/5] min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-center text-[var(--app-muted)] transition-colors hover:border-violet-500/35 hover:bg-violet-500/5 hover:text-violet-200 disabled:opacity-45"
                        onClick={() => void onImportPhoto(entry.id, 'custom')}
                      >
                        <Plus className="size-5" />
                        <span className="mt-2 text-xs font-semibold">Другой ракурс</span>
                      </button>
                    </div>
                  </div>
                </Collapsible.Content>
              </article>
            </Collapsible.Root>
          )
        })}
      </div>

      <AppDialog
        open={viewer !== null}
        onOpenChange={(open) => {
          if (!open) setViewer(null)
        }}
        title={viewer ? PHOTO_VIEW_LABELS[viewer.photo.view] : 'Фотография прогресса'}
        description={viewer ? `Фотография прогресса за ${formatDate(viewer.date)}` : ''}
        icon={<Images />}
        size="xl"
        bodyClassName="bg-black/35 p-3"
      >
        {viewer && (
          <div className="flex min-h-0 flex-col items-center">
            <img
              src={viewer.photo.url}
              alt={`${PHOTO_VIEW_LABELS[viewer.photo.view]} · ${formatDate(viewer.date)}`}
              className="max-h-[68vh] max-w-full rounded-xl object-contain"
            />
            <div className="mt-3 text-xs text-[var(--app-muted)]">
              {formatDate(viewer.date)} · {viewer.photo.fileName}
            </div>
          </div>
        )}
      </AppDialog>

      <DeleteConfirmationDialog
        open={photoToDelete !== null}
        title="Удалить фотографию прогресса?"
        subject={photoToDelete ? PHOTO_VIEW_LABELS[photoToDelete.photo.view] : undefined}
        description="Фотография будет удалена из этой контрольной точки и из локального хранилища MyMind."
        notice="Восстановить фотографию после удаления нельзя"
        isSubmitting={busy}
        onOpenChange={(open) => {
          if (!open) setPhotoToDelete(null)
        }}
        onConfirm={confirmPhotoDelete}
      />
    </section>
  )
}
