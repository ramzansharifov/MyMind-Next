import { useMemo, useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import type { CreateMovieInput } from '@mymind/contracts/movies'
import type { CreateMusicItemInput } from '@mymind/contracts/music'
import { parseMoviesJson, parseMusicJson } from '@mymind/core/catalog-json-import'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useTheme } from '../../shared/ui/theme'

const MOVIE_EXAMPLE = `[
  {
    "title": "Аркейн",
    "originalTitle": "Arcane",
    "type": "animated_series",
    "year": 2021,
    "seasonCount": 2,
    "episodesPerSeason": 9,
    "episodeRuntimeMinutes": 42,
    "genres": ["Анимация", "Драма"],
    "status": "watched",
    "favorite": true,
    "rating": 9
  }
]`

const MUSIC_EXAMPLE = `[
  {
    "title": "Blinding Lights",
    "type": "track",
    "year": 2019,
    "artists": ["The Weeknd"],
    "album": "After Hours",
    "durationSeconds": 200,
    "genres": ["Synth-pop", "R&B"],
    "status": "listened",
    "favorite": true,
    "rating": 9
  }
]`

interface CatalogJsonImportModalProps {
  mode: 'movies' | 'music'
  close(): void
  importMovies(items: CreateMovieInput[]): void | Promise<void>
  importMusic(items: CreateMusicItemInput[]): void | Promise<void>
}

export function CatalogJsonImportModal({
  mode,
  close,
  importMovies,
  importMusic
}: CatalogJsonImportModalProps): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const parsed = useMemo(
    () =>
      mode === 'movies'
        ? { mode: 'movies' as const, ...parseMoviesJson(value) }
        : { mode: 'music' as const, ...parseMusicJson(value) },
    [mode, value]
  )
  const error = submitError || parsed.error || ''
  const title = mode === 'movies' ? 'Добавить фильмы из JSON' : 'Добавить музыку из JSON'
  const example = mode === 'movies' ? MOVIE_EXAMPLE : MUSIC_EXAMPLE

  const requestClose = (): void => {
    if (busy) return
    if (!value.trim()) {
      close()
      return
    }
    void confirm({
      title: 'Закрыть импорт?',
      description: 'Введённый JSON будет потерян.',
      confirmLabel: 'Закрыть',
      tone: 'warning',
      notice: null,
      onConfirm: close
    })
  }

  const submit = async (): Promise<void> => {
    if (busy || parsed.error || parsed.items.length === 0) return
    setBusy(true)
    setSubmitError('')
    try {
      if (parsed.mode === 'movies') await importMovies(parsed.items)
      else await importMusic(parsed.items)
      setValue('')
      close()
    } catch (reason) {
      setSubmitError(messageFor(reason))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
      title={title}
      description="Один объект или массив до 100 записей. Проверка выполняется локально до записи в базу."
      icon={mode === 'movies' ? 'movies' : 'music'}
      presentation="sheet"
      busy={busy}
      footer={
        <>
          <Button label="Отмена" disabled={busy} onPress={requestClose} />
          <Button
            label={
              busy
                ? 'Добавление…'
                : parsed.items.length > 1
                  ? `Добавить ${parsed.items.length}`
                  : 'Добавить'
            }
            primary
            disabled={busy || parsed.items.length === 0 || Boolean(parsed.error)}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 28 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Пример" disabled={busy} onPress={() => setValue(example)} />
          <Button label="Очистить" disabled={busy || !value} onPress={() => setValue('')} />
        </View>

        <TextInput
          accessibilityLabel={mode === 'movies' ? 'JSON фильмов' : 'JSON музыки'}
          value={value}
          onChangeText={(next) => {
            setValue(next)
            setSubmitError('')
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder={
            mode === 'movies'
              ? '[{ "title": "Аркейн", "type": "animated_series" }]'
              : '[{ "title": "Blinding Lights", "type": "track" }]'
          }
          placeholderTextColor={theme.muted}
          style={{
            minHeight: 300,
            color: theme.text,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            padding: 14,
            textAlignVertical: 'top',
            fontFamily: 'monospace',
            fontSize: 14,
            lineHeight: 21
          }}
        />

        {error ? <ErrorState message={error} /> : null}
        {!error && parsed.items.length > 0 ? (
          <Label muted>Готово к добавлению: {parsed.items.length}</Label>
        ) : null}
      </ScrollView>
    </AppDialog>
  )}
