import { useState } from 'react'
import { TextInput, View } from 'react-native'
import type { StudyBoardBlock } from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

export type OpenDocumentBoard = (block: StudyBoardBlock) => Promise<void>

function useBoardAction(
  block: StudyBoardBlock,
  openBoard: OpenDocumentBoard | undefined,
  onError: ((reason: unknown) => void) | undefined
): { pending: boolean; open: () => void } {
  const [pending, setPending] = useState(false)

  return {
    pending,
    open: () => {
      if (!openBoard || pending) return
      setPending(true)
      void openBoard(block)
        .catch((reason: unknown) => onError?.(reason))
        .finally(() => setPending(false))
    }
  }
}

export function DocumentBoardEditor({
  block,
  update,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  update(block: StudyBoardBlock): void
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const action = useBoardAction(block, openBoard, onError)

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        accessibilityLabel="Название доски"
        placeholder="Доска"
        placeholderTextColor={theme.muted}
        value={block.title ?? ''}
        onChangeText={(title) => update({ ...block, title: title || undefined })}
        style={{
          color: theme.text,
          backgroundColor: theme.raised,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: designTokens.radius.md,
          padding: 12,
          minHeight: 48,
          fontSize: 16
        }}
      />
      <Label muted>
        {block.boardId
          ? 'Доска связана с этим блоком и хранится в разделе «Доски».'
          : 'При первом открытии будет создана связанная локальная доска.'}
      </Label>
      {openBoard ? (
        <Button
          label={action.pending ? 'Открытие…' : block.boardId ? 'Открыть доску' : 'Создать доску'}
          selected
          disabled={action.pending}
          onPress={action.open}
        />
      ) : null}
    </View>
  )
}

export function DocumentBoardReader({
  block,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const action = useBoardAction(block, openBoard, onError)

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: designTokens.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <Label>{block.title || 'Доска'}</Label>
      <Label muted>
        {block.boardId
          ? 'Связанная доска сохранена локально.'
          : 'Доска будет создана при первом открытии.'}
      </Label>
      {openBoard ? (
        <Button
          label={action.pending ? 'Открытие…' : block.boardId ? 'Открыть доску' : 'Создать доску'}
          selected
          disabled={action.pending}
          onPress={action.open}
        />
      ) : null}
    </View>
  )
}
