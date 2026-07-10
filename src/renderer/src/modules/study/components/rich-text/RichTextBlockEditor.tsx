import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect } from 'react'

import { createRichTextExtensions } from './extensions'

interface RichTextBlockEditorProps {
  html: string
  onChange: (html: string, plainText: string) => void
  onActivate: (editor: Editor) => void
  onReady: (editor: Editor) => void
  onDispose?: (editor: Editor) => void
}

export function RichTextBlockEditor({
  html,
  onChange,
  onActivate,
  onReady,
  onDispose
}: RichTextBlockEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: createRichTextExtensions(false),
    content: html,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor'
      }
    },
    onCreate: ({ editor: createdEditor }) => {
      queueMicrotask(() => {
        onReady(createdEditor)
      })
    },
    onFocus: ({ editor: focusedEditor }) => {
      queueMicrotask(() => {
        onActivate(focusedEditor)
      })
    },
    onUpdate: ({ editor: updatedEditor }) => {
      const nextHtml = updatedEditor.getHTML()
      const nextPlainText = updatedEditor.getText({
        blockSeparator: '\n\n'
      })

      queueMicrotask(() => {
        onChange(nextHtml, nextPlainText)
      })
    }
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    return () => {
      onDispose?.(editor)
    }
  }, [editor, onDispose])
  useEffect(() => {
    if (!editor) {
      return
    }

    if (editor.getHTML() === html) {
      return
    }

    editor.commands.setContent(html, {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
  }, [editor, html])

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
    extensions: createRichTextExtensions(true),
    content: html,
    editable: false,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'mymind-rich-text-editor mymind-rich-text-viewer'
      }
    }
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    if (editor.getHTML() === html) {
      return
    }

    editor.commands.setContent(html, {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
  }, [editor, html])

  if (!plainText.trim()) {
    return <p className="text-sm text-(--app-muted)">Пустой текстовый блок</p>
  }

  if (!editor) {
    return <p className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-300">{plainText}</p>
  }

  return <EditorContent editor={editor} />
}
