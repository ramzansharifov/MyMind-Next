import { useMemo, useState } from 'react'
import { Platform, ScrollView, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { stringifyMovieJson, type MovieRecord } from '@mymind/contracts/movies'

import { AppDialog } from '../../shared/ui/AppDialog'
import { Button } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'

export function CatalogJsonViewerModal({
  title,
  description,
  value,
  close
}: {
  title: string
  description: string
  value: MovieRecord | readonly MovieRecord[]
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const json = useMemo(() => stringifyMovieJson(value), [value])

  const copy = async (): Promise<void> => {
    setCopyError('')
    try {
      await Clipboard.setStringAsync(json)
      setCopied(true)
    } catch {
      setCopyError('Не удалось скопировать JSON в буфер обмена')
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={title}
      description={description}
      icon="json"
      presentation="sheet"
      footer={
        <>
          <Button label="Закрыть" onPress={close} />
          <Button
            label={copied ? 'Скопировано' : 'Копировать'}
            icon={copied ? 'check' : 'copy'}
            primary
            onPress={() => void copy()}
          />
        </>
      }
    >
      <View style={{ flex: 1, minHeight: 0, padding: 14, gap: 10 }}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 13,
            backgroundColor: theme.background
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>
            Полная сохранённая запись MyMind, включая id, createdAt и updatedAt. Эти служебные поля
            игнорируются текущим JSON-импортом, поэтому скопированные данные можно использовать и
            для повторного импорта.
          </Text>
        </View>

        <ScrollView
          style={{
            flex: 1,
            minHeight: 0,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.background
          }}
          contentContainerStyle={{ padding: 14 }}
          nestedScrollEnabled
        >
          <Text
            selectable
            accessibilityLabel="JSON данных фильмов"
            style={{
              color: theme.text,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              fontSize: 12,
              lineHeight: 19
            }}
          >
            {json}
          </Text>
        </ScrollView>

        {copyError ? (
          <Text style={{ color: theme.error, fontSize: 12.5, lineHeight: 18 }}>{copyError}</Text>
        ) : null}
      </View>
    </AppDialog>
  )
}
