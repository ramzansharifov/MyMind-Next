import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { MovieRecord, MovieType } from '@mymind/contracts/movies'
import { Check, ChevronDown, Search, Star, X } from 'lucide-react-native'

import { AppDialog } from '../../shared/ui/AppDialog'
import { AppTextField } from '../../shared/ui/FormControls'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  collectMovieFilterOptions,
  type MovieAdvancedFilters,
  type MovieSort
} from './movie-filters'

const TYPE_OPTIONS: ReadonlyArray<{ value: MovieType; label: string }> = [
  { value: 'movie', label: 'Фильм' },
  { value: 'series', label: 'Сериал' },
  { value: 'cartoon', label: 'Мультфильм' },
  { value: 'animated_series', label: 'Мультсериал' }
]

const SORT_OPTIONS: ReadonlyArray<{ value: MovieSort; label: string }> = [
  { value: 'recent', label: 'Недавно изменённые' },
  { value: 'title', label: 'По названию' },
  { value: 'rating', label: 'По оценке' },
  { value: 'year', label: 'По году' }
]

function ToggleCard({
  label,
  active,
  onPress
}: {
  label: string
  active: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        flexGrow: 1,
        flexBasis: 138,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: active ? theme.accent + '80' : theme.border,
        borderRadius: 13,
        backgroundColor: active
          ? theme.accent + '16'
          : pressed
            ? theme.raised
            : theme.surface,
        opacity: pressed ? 0.76 : 1
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: active ? theme.accent : theme.text,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: active ? '700' : '600'
        }}
      >
        {label}
      </Text>
      {active ? <Check size={15} color={theme.accent} strokeWidth={2.6} /> : null}
    </Pressable>
  )
}

function SearchableDropdown({
  label,
  value,
  options,
  placeholder,
  onChange
}: {
  label: string
  value: string
  options: readonly string[]
  placeholder: string
  onChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('ru')
  const visibleOptions = useMemo(
    () =>
      normalizedSearch
        ? options.filter((option) =>
            option.toLocaleLowerCase('ru').includes(normalizedSearch)
          )
        : options,
    [normalizedSearch, options]
  )

  const close = (): void => {
    setOpen(false)
    setSearch('')
  }

  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, selected: Boolean(value) }}
        onPress={() => {
          if (open) close()
          else setOpen(true)
        }}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 13,
          borderWidth: 1,
          borderColor: open || value ? theme.accent + '6A' : theme.border,
          borderRadius: 14,
          backgroundColor: value ? theme.accent + '0D' : pressed ? theme.raised : theme.surface,
          opacity: pressed ? 0.76 : 1
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value ? theme.text : theme.muted,
            fontSize: 14
          }}
        >
          {value || placeholder}
        </Text>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Сбросить фильтр «${label}»`}
            hitSlop={7}
            onPress={(event) => {
              event.stopPropagation()
              onChange('')
              close()
            }}
            style={({ pressed }) => ({
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 9,
              backgroundColor: pressed ? theme.raised : 'transparent'
            })}
          >
            <X size={15} color={theme.muted} />
          </Pressable>
        ) : (
          <ChevronDown
            size={17}
            color={theme.muted}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        )}
      </Pressable>

      {open ? (
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <View
            style={{
              minHeight: 46,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Search size={16} color={theme.muted} />
            <AppTextField
              value={search}
              onChangeText={setSearch}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={`Поиск: ${label.toLocaleLowerCase('ru')}`}
              style={{
                flex: 1,
                minHeight: 42,
                paddingHorizontal: 0,
                paddingVertical: 8,
                borderWidth: 0,
                borderRadius: 0,
                backgroundColor: 'transparent',
                fontSize: 14
              }}
            />
          </View>

          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 210 }}
            contentContainerStyle={{ padding: 6, gap: 3 }}
          >
            {visibleOptions.length ? (
              visibleOptions.map((option) => {
                const active = option === value
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      onChange(option)
                      close()
                    }}
                    style={({ pressed }) => ({
                      minHeight: 42,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: active
                        ? theme.accent + '12'
                        : pressed
                          ? theme.raised
                          : 'transparent'
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: active ? theme.accent : theme.text,
                        fontSize: 13.5,
                        fontWeight: active ? '700' : '500'
                      }}
                    >
                      {option}
                    </Text>
                    {active ? <Check size={15} color={theme.accent} /> : null}
                  </Pressable>
                )
              })
            ) : (
              <Text
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 14,
                  color: theme.muted,
                  fontSize: 12.5,
                  textAlign: 'center'
                }}
              >
                Ничего не найдено
              </Text>
            )}
          </ScrollView>
        </View>
      ) : null}
    </View>
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
          <Button label="Сбросить" ghost onPress={reset} />
          <Button label="Отмена" onPress={onClose} />
          <Button
            label="Сохранить"
            icon="check"
            primary
            onPress={() => {
              onApply(draft)
              onClose()
            }}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 22, paddingBottom: 28 }}
      >
        <View style={{ gap: 9 }}>
          <Label>Тип</Label>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
            Можно выбрать несколько
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPE_OPTIONS.map((option) => {
              const active = draft.types.includes(option.value)
              return (
                <ToggleCard
                  key={option.value}
                  label={option.label}
                  active={active}
                  onPress={() =>
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
          </View>
        </View>

        <SearchableDropdown
          label="Жанр"
          value={draft.genre}
          options={options.genres}
          placeholder="Все жанры"
          onChange={(next) => set('genre', next)}
        />

        <View style={{ gap: 7 }}>
          <Label>Год</Label>
          <AppTextField
            accessibilityLabel="Год"
            value={draft.year}
            onChangeText={(next) => set('year', next.replace(/[^0-9]/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="Любой год"
          />
        </View>

        <SearchableDropdown
          label="Режиссёр"
          value={draft.director}
          options={options.directors}
          placeholder="Все режиссёры"
          onChange={(next) => set('director', next)}
        />

        <SearchableDropdown
          label="Актёр"
          value={draft.actor}
          options={options.actors}
          placeholder="Все актёры"
          onChange={(next) => set('actor', next)}
        />

        <View style={{ gap: 9 }}>
          <Label>Минимальная оценка</Label>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel={
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
                <Pressable
                  key={rating}
                  accessibilityRole="button"
                  accessibilityLabel={`Минимум ${rating} из 10`}
                  accessibilityState={{ selected: draft.minRating === rating }}
                  hitSlop={3}
                  onPress={() => set('minRating', draft.minRating === rating ? 0 : rating)}
                  style={({ pressed }) => ({
                    width: 30,
                    height: 34,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9,
                    backgroundColor:
                      draft.minRating === rating
                        ? '#f59e0b18'
                        : pressed
                          ? theme.raised
                          : 'transparent',
                    opacity: pressed ? 0.72 : 1
                  })}
                >
                  <Star
                    size={21}
                    color={active ? '#fbbf24' : theme.muted}
                    fill={active ? '#fbbf24' : 'none'}
                    strokeWidth={active ? 2 : 1.8}
                  />
                </Pressable>
              )
            })}
          </View>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
            {draft.minRating
              ? `Показывать фильмы с оценкой от ${draft.minRating}/10`
              : 'Оценка не ограничена'}
          </Text>
        </View>

        <View style={{ gap: 9 }}>
          <Label>Порядок</Label>
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
            Можно выбрать только один вариант
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SORT_OPTIONS.map((option) => (
              <ToggleCard
                key={option.value}
                label={option.label}
                active={draft.sort === option.value}
                onPress={() => set('sort', option.value)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </AppDialog>
  )
}
