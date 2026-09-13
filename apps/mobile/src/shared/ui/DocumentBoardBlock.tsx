import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { StudyBoardBlock } from '@mymind/contracts/study'
import { ArrowRight, LayoutDashboard, Presentation } from 'lucide-react-native'

import { useTheme } from './theme'

export type OpenDocumentBoard = (block: StudyBoardBlock) => Promise<void>

function useBoardAction(
  block: StudyBoardBlock,
  openBoard: OpenDocumentBoard | undefined,
  onError: ((reason: unknown) => void) | undefined
): { pending: boolean; error: string; open: () => void } {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  return {
    pending,
    error,
    open: () => {
      if (!openBoard || pending) return
      setPending(true)
      setError('')
      void openBoard(block)
        .catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : 'Не удалось открыть доску')
          onError?.(reason)
        })
        .finally(() => setPending(false))
    }
  }
}

function BoardCard({
  block,
  mode,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  mode: 'edit' | 'read'
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const action = useBoardAction(block, openBoard, onError)
  const ActionIcon = mode === 'read' ? LayoutDashboard : ArrowRight

  return (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 20,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <View
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: theme.accent + '1A'
          }}
        >
          <Presentation size={20} color={theme.accent} />
        </View>

        <View style={{ minWidth: 0, flex: 1, paddingRight: openBoard ? 42 : 0 }}>
          <Text
            style={{
              color: theme.accent,
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase'
            }}
          >
            Доска
          </Text>
          <Text
            numberOfLines={1}
            style={{ marginTop: 4, color: theme.text, fontSize: 18, lineHeight: 23, fontWeight: '600' }}
          >
            {block.title ?? 'Доска материала'}
          </Text>
          <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 20 }}>
            {block.boardId
              ? 'Доска связана с этим блоком и сохраняется в модуле «Доски».'
              : 'При первом открытии будет создана отдельная связанная доска.'}
          </Text>
          {action.error ? (
            <Text style={{ marginTop: 8, color: theme.error, fontSize: 12, lineHeight: 18 }}>
              {action.error}
            </Text>
          ) : null}
        </View>

        {openBoard ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={block.boardId ? 'Открыть доску' : 'Создать доску'}
            accessibilityState={{ disabled: action.pending }}
            disabled={action.pending}
            hitSlop={5}
            onPress={action.open}
            style={({ pressed }) => ({
              position: 'absolute',
              top: 0,
              right: 0,
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.accent + '40',
              borderRadius: 12,
              backgroundColor: pressed ? theme.accent + '2E' : theme.accent + '1A',
              opacity: action.pending ? 0.55 : pressed ? 0.78 : 1
            })}
          >
            <ActionIcon size={17} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

export function DocumentBoardEditor({
  block,
  update: _update,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  update(block: StudyBoardBlock): void
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  return <BoardCard block={block} mode="edit" openBoard={openBoard} onError={onError} />
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
  return <BoardCard block={block} mode="read" openBoard={openBoard} onError={onError} />
}
