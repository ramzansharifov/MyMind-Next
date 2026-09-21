import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { StudyTextBlock } from '@mymind/contracts/study'

import { NotesRichTextBlock } from '../../shared/ui/NotesRichTextBlock'
import {
  DEFAULT_NOTES_RICH_TEXT_STATE,
  NotesQuickLinkDialog,
  NotesRichTextInlineControls,
  NotesRichTextSettingsSheet
} from '../../shared/ui/NotesRichTextControls'
import type {
  NotesRichTextDomRef,
  NotesRichTextFormattingState
} from '../../shared/ui/NotesRichTextDom'
import { useTheme } from '../../shared/ui/theme'

export function MobileNoteAppendEditor({
  block,
  update
}: {
  block: StudyTextBlock
  update(block: StudyTextBlock): void
}): React.JSX.Element {
  const theme = useTheme()
  const [editor, setEditor] = useState<NotesRichTextDomRef | null>(null)
  const [formatting, setFormatting] = useState<NotesRichTextFormattingState>(
    DEFAULT_NOTES_RICH_TEXT_STATE
  )
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  return (
    <View
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.accent + '33',
        borderRadius: 18,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 13,
          paddingBottom: 4
        }}
      >
        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>
          ДОПИСАТЬ В КОНЕЦ
        </Text>
        <Text style={{ marginTop: 3, color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
          Существующие блоки защищены. На телефоне можно добавить только текст.
        </Text>
      </View>

      <View style={{ minHeight: 112, paddingHorizontal: 12, paddingBottom: 8 }}>
        <NotesRichTextBlock
          block={block}
          registerRef={setEditor}
          activate={() => undefined}
          update={update}
          formattingChanged={setFormatting}
        />
      </View>

      <View
        style={{
          minHeight: 52,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            minHeight: 52,
            alignItems: 'center',
            gap: 3,
            paddingHorizontal: 10,
            paddingVertical: 8
          }}
        >
          <NotesRichTextInlineControls
            editor={editor}
            state={formatting}
            openSettings={() => setSettingsOpen(true)}
            openLink={() => setLinkOpen(true)}
          />
        </ScrollView>
      </View>

      <NotesRichTextSettingsSheet
        open={settingsOpen}
        close={() => setSettingsOpen(false)}
        editor={editor}
        state={formatting}
      />
      <NotesQuickLinkDialog
        key={linkOpen ? 'open' : 'closed'}
        open={linkOpen}
        close={() => setLinkOpen(false)}
        editor={editor}
        state={formatting}
      />
    </View>
  )
}
