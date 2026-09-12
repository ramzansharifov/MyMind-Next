import { useState } from 'react'
import { View } from 'react-native'
import type { StudyTextBlock } from '@mymind/contracts/study'

import NotesRichTextDom, {
  type NotesRichTextDomRef,
  type NotesRichTextFormattingState
} from './NotesRichTextDom'
import { useTheme } from './theme'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function initialHtml(block: StudyTextBlock): string {
  return block.html?.trim() ? block.html : `<p>${escapeHtml(block.text)}</p>`
}

export function NotesRichTextBlock({
  block,
  active,
  registerRef,
  update,
  activate,
  formattingChanged
}: {
  block: StudyTextBlock
  active: boolean
  registerRef(ref: NotesRichTextDomRef | null): void
  update(block: StudyTextBlock): void
  activate(): void
  formattingChanged(state: NotesRichTextFormattingState): void
}): React.JSX.Element {
  const theme = useTheme()
  const [height, setHeight] = useState(92)

  return (
    <View
      style={{
        minHeight: Math.max(72, height),
        overflow: 'hidden',
        borderRadius: 10,
        backgroundColor: active ? theme.accent + '05' : 'transparent'
      }}
    >
      <NotesRichTextDom
        ref={registerRef}
        html={initialHtml(block)}
        plainText={block.text}
        textColor={theme.text}
        mutedColor={theme.muted}
        borderColor={theme.border}
        surfaceColor={theme.raised}
        accentColor={theme.accent}
        onChange={async (html, text) => {
          if (html === block.html && text === block.text) return
          update({ ...block, html, text })
        }}
        onFocusEditor={async () => {
          activate()
        }}
        onFormattingState={async (state) => {
          formattingChanged(state)
        }}
        onHeightChange={async (nextHeight) => {
          const normalized = Math.max(72, Math.min(1600, Math.ceil(nextHeight)))
          setHeight((current) => (Math.abs(current - normalized) >= 2 ? normalized : current))
        }}
        dom={{
          scrollEnabled: false,
          style: { height: Math.max(72, height), backgroundColor: 'transparent' }
        }}
      />
    </View>
  )
}
