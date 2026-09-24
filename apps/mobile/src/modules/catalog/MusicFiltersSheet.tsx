import { useMemo, useState } from 'react'
import { ScrollView } from 'react-native'
import type { MusicItemRecord } from '@mymind/contracts/music'

import { AppDialog } from '../../shared/ui/AppDialog'
import { Button } from '../../shared/ui/primitives'
import { musicFilterArtists, musicFilterYears } from './music-presentation'
import { SearchableFilterDropdown } from './SearchableFilterDropdown'

export interface MusicLibraryFilters {
  artist: string
  year: string
}

export function MusicFiltersSheet({
  items,
  value,
  onClose,
  onApply
}: {
  items: readonly MusicItemRecord[]
  value: MusicLibraryFilters
  onClose(): void
  onApply(value: MusicLibraryFilters): void
}): React.JSX.Element {
  const artists = useMemo(() => musicFilterArtists(items), [items])
  const years = useMemo(() => musicFilterYears(items).map((year) => String(year)), [items])
  const [draft, setDraft] = useState<MusicLibraryFilters>({ ...value })

  const reset = (): void => {
    setDraft({ artist: '', year: '' })
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Фильтры библиотеки"
      description="Настройте музыкальную библиотеку"
      icon="music"
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
        <SearchableFilterDropdown
          label="Исполнитель"
          value={draft.artist}
          options={artists}
          placeholder="Все исполнители"
          onChange={(artist) => setDraft((previous) => ({ ...previous, artist }))}
        />

        <SearchableFilterDropdown
          label="Год"
          value={draft.year}
          options={years}
          placeholder="Любой год"
          onChange={(year) => setDraft((previous) => ({ ...previous, year }))}
        />
      </ScrollView>
    </AppDialog>
  )
}
