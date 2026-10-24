import { useState } from 'react'
import type { StudyTextBlock } from '@mymind/contracts/study'
import { NotesRichTextBlock } from '../../shared/ui/NotesRichTextBlock'
import { DEFAULT_NOTES_RICH_TEXT_STATE } from '../../shared/ui/notes-rich-text-state'
import {
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
    <div
      className="ui-stack"
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.accent + '33',
        borderRadius: 18,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          paddingInline: 14,
          paddingTop: 13,
          paddingBottom: 4
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.accent,
            fontSize: 11,
            fontWeight: 800
          }}
        >
          ДОПИСАТЬ В КОНЕЦ
        </span>
        <span
          className="ui-text"
          style={{
            marginTop: 3,
            color: theme.muted,
            fontSize: 11.5,
            lineHeight: '16px'
          }}
        >
          Существующие блоки защищены. На телефоне можно добавить только текст.
        </span>
      </div>

      <div
        className="ui-stack"
        style={{
          minHeight: 112,
          paddingInline: 12,
          paddingBottom: 8
        }}
      >
        <NotesRichTextBlock
          block={block}
          registerRef={setEditor}
          activate={() => undefined}
          update={update}
          formattingChanged={setFormatting}
        />
      </div>

      <div
        className="ui-stack"
        style={{
          minHeight: 52,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background
        }}
      >
        <div className="ui-scroll" data-horizontal={true}>
          <div
            className="ui-stack ui-scroll-content"
            style={{
              minHeight: 52,
              alignItems: 'center',
              gap: 3,
              paddingInline: 10,
              paddingBlock: 8,
              flexDirection: 'row'
            }}
          >
            <NotesRichTextInlineControls
              editor={editor}
              state={formatting}
              openSettings={() => setSettingsOpen(true)}
              openLink={() => setLinkOpen(true)}
            />
          </div>
        </div>
      </div>

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
    </div>
  )
}
