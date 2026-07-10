import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'

import { createRichTextExtensions } from './extensions'

const editorExtensions = createRichTextExtensions(false)
const viewerExtensions = createRichTextExtensions(true)

interface RichTextBlockEditorProps {
  html: string
  onChange: (html: string, plainText: string) => void
  onActivate: (editor: Editor) => void
  onReady: (editor: Editor) => void
  onStateChange: () => void
}

export function RichTextBlockEditor({
  html,
  onChange,
  onActivate,
  onReady,
  onStateChange
}: RichTextBlockEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: editorExtensions,
    content: html,
    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor'
      }
    },
    onCreate: ({ editor: createdEditor }) => {
      onReady(createdEditor)
    },
    onFocus: ({ editor: focusedEditor }) => {
      onActivate(focusedEditor)
      onStateChange()
    },
    onSelectionUpdate: () => {
      onStateChange()
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onChange(
        updatedEditor.getHTML(),
        updatedEditor.getText({
          blockSeparator: '\n\n'
        })
      )

      onStateChange()
    }
  })

  if (!editor) {
    return <div className="min-h-32 animate-pulse rounded-lg bg-white/[0.025]" />
  }

  return <EditorContent editor={editor} className="min-h-32" />
}

interface RichTextViewerProps {
  html: string
  plainText: string
}

export function RichTextViewer({ html, plainText }: RichTextViewerProps): React.JSX.Element {
  const editor = useEditor({
    extensions: viewerExtensions,
    content: html,
    editable: false,
    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor mymind-rich-text-viewer'
      }
    }
  })

  if (!plainText.trim()) {
    return <p className="text-sm text-[var(--app-muted)]">Пустой текстовый блок</p>
  }

  if (!editor) {
    return <p className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-300">{plainText}</p>
  }

  return <EditorContent editor={editor} />
}
