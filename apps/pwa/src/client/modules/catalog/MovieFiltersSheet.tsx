import { Action } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import type { MovieRecord, MovieType } from '@mymind/contracts/movies'
import { Check, Star } from 'lucide-react'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { SearchableFilterDropdown } from './SearchableFilterDropdown'
import {
  collectMovieFilterOptions,
  type MovieAdvancedFilters,
  type MovieSort
} from './movie-filters'
const TYPE_OPTIONS: ReadonlyArray<{
  value: MovieType
  label: string
}> = [
  { value: 'movie', label: 'Фильм' },
  { value: 'series', label: 'Сериал' },
  { value: 'cartoon', label: 'Мультфильм' },
  { value: 'animated_series', label: 'Мультсериал' }
]
const SORT_OPTIONS: ReadonlyArray<{
  value: MovieSort
  label: string
}> = [
  { value: 'recent', label: 'Недавно изменённые' },
  { value: 'title', label: 'По названию' },
  { value: 'rating', label: 'По оценке' },
  { value: 'year', label: 'По году' }
]
function ToggleCard({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-selected={active}
      onClick={onClick}
      style={{
        minHeight: 44,
        flexGrow: 1,
        flexBasis: 138,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingInline: 12,
        borderWidth: 1,
        borderColor: active ? theme.accent + '80' : theme.border,
        borderRadius: 13,
        backgroundColor: active ? theme.accent + '16' : theme.surface,
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: active ? theme.accent + '16' : theme.raised,
        opacity: 0.76
      }}
    >
      <span
        className="ui-text"
        data-lines={1}
        style={{
          flex: '1 1 0%',
          color: active ? theme.accent : theme.text,
          fontSize: 13,
          lineHeight: '18px',
          fontWeight: active ? '700' : '600',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {label}
      </span>
      {active ? <Check size={15} color={theme.accent} strokeWidth={2.6} /> : null}
    </Action>
  )
}
export function MovieFiltersSheet({
  movies,
  value,
  onClose,
  onApply
}: {
  movies: readonly MovieRecord[]
  value: MovieAdvancedFilters
  onClose(): void
  onApply(value: MovieAdvancedFilters): void
}): React.JSX.Element {
  const theme = useTheme()
  const options = useMemo(() => collectMovieFilterOptions(movies), [movies])
  const [draft, setDraft] = useState<MovieAdvancedFilters>({
    ...value,
    types: [...value.types]
  })
  const set = <K extends keyof MovieAdvancedFilters>(
    key: K,
    next: MovieAdvancedFilters[K]
  ): void => {
    setDraft((previous) => ({ ...previous, [key]: next }))
  }
  const reset = (): void => {
    setDraft({
      types: [],
      genre: '',
      year: '',
      director: '',
      actor: '',
      minRating: 0,
      sort: 'recent'
    })
  }
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Фильтры и сортировка"
      description="Настройте библиотеку фильмов"
      icon="movies"
      presentation="sheet"
      footer={
        <>
          <Button label="Сбросить" ghost onClick={reset} />
          <Button label="Отмена" onClick={onClose} />
          <Button
            label="Сохранить"
            icon="check"
            primary
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          />
        </>
      }
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            padding: 16,
            gap: 22,
            paddingBottom: 28
          }}
        >
          <div
            className="ui-stack"
            style={{
              gap: 9
            }}
          >
            <Label>Тип</Label>
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 11.5,
                lineHeight: '16px'
              }}
            >
              Можно выбрать несколько
            </span>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              {TYPE_OPTIONS.map((option) => {
                const active = draft.types.includes(option.value)
                return (
                  <ToggleCard
                    key={option.value}
                    label={option.label}
                    active={active}
                    onClick={() =>
                      set(
                        'types',
                        active
                          ? draft.types.filter((type) => type !== option.value)
                          : [...draft.types, option.value]
                      )
                    }
                  />
                )
              })}
            </div>
          </div>

          <SearchableFilterDropdown
            label="Жанр"
            value={draft.genre}
            options={options.genres}
            placeholder="Все жанры"
            onChange={(next) => set('genre', next)}
          />

          <div
            className="ui-stack"
            style={{
              gap: 7
            }}
          >
            <Label>Год</Label>
            <AppTextField
              aria-label="Год"
              value={draft.year}
              onValueChange={(next) => set('year', next.replace(/[^0-9]/g, '').slice(0, 4))}
              inputMode={'numeric'}
              placeholder="Любой год"
            />
          </div>

          <SearchableFilterDropdown
            label="Режиссёр"
            value={draft.director}
            options={options.directors}
            placeholder="Все режиссёры"
            onChange={(next) => set('director', next)}
          />

          <SearchableFilterDropdown
            label="Актёр"
            value={draft.actor}
            options={options.actors}
            placeholder="Все актёры"
            onChange={(next) => set('actor', next)}
          />

          <div
            className="ui-stack"
            style={{
              gap: 9
            }}
          >
            <Label>Минимальная оценка</Label>
            <div
              className="ui-stack"
              role={'slider'}
              aria-label={
                draft.minRating > 0
                  ? `Минимальная оценка ${draft.minRating} из 10`
                  : 'Минимальная оценка не выбрана'
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
              }}
            >
              {Array.from({ length: 10 }, (_, index) => {
                const rating = index + 1
                const active = rating <= draft.minRating
                return (
                  <Action
                    hitPadding={3}
                    key={rating}
                    role={'button'}
                    aria-label={`Минимум ${rating} из 10`}
                    aria-selected={draft.minRating === rating}
                    onClick={() => set('minRating', draft.minRating === rating ? 0 : rating)}
                    style={{
                      width: 30,
                      height: 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 9,
                      backgroundColor: draft.minRating === rating ? '#f59e0b18' : 'transparent',
                      opacity: 1
                    }}
                    pressedStyle={{
                      backgroundColor: draft.minRating === rating ? '#f59e0b18' : theme.raised,
                      opacity: 0.72
                    }}
                  >
                    <Star
                      size={21}
                      color={active ? '#fbbf24' : theme.muted}
                      fill={active ? '#fbbf24' : 'none'}
                      strokeWidth={active ? 2 : 1.8}
                    />
                  </Action>
                )
              })}
            </div>
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 11.5,
                lineHeight: '16px'
              }}
            >
              {draft.minRating
                ? `Показывать фильмы с оценкой от ${draft.minRating}/10`
                : 'Оценка не ограничена'}
            </span>
          </div>

          <div
            className="ui-stack"
            style={{
              gap: 9
            }}
          >
            <Label>Порядок</Label>
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 11.5,
                lineHeight: '16px'
              }}
            >
              Можно выбрать только один вариант
            </span>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <ToggleCard
                  key={option.value}
                  label={option.label}
                  active={draft.sort === option.value}
                  onClick={() => set('sort', option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  )
}
