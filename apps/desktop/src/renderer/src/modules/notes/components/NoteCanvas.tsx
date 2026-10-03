import { TaskList } from '@tiptap/extension-list'
import { NodeSelection } from '@tiptap/pm/state'
import { EditorContent, useEditor } from '@tiptap/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { NoteDocument } from '../../../../../shared/contracts/notes'
import type { StudyAssetKind } from '../../../../../shared/contracts/study'
import type { StudyVoiceRecorderControls } from '../../study/components/file/StudyVoiceRecorder'
import { createRichTextExtensions } from '../../study/components/rich-text/extensions'
import { RichTextSettings } from '../../study/components/rich-text/RichTextSettings'
import { StudyBlockEditor } from '../../study/components/StudyBlockEditor'
import {
  getNoteAttachments,
  getNoteCanvas,
  getNoteLegacyContent,
  updateNoteCanvas,
  type NoteAttachmentBlock
} from '../lib/note-canvas-document'
import { isNoteAttachmentNodeName, NoteAttachment, NoteVoiceRecording } from './NoteAttachment'
import { NoteAttachmentButtons } from './NoteAttachmentButtons'
import {
  NoteAttachmentDeletionGuard,
  noteAttachmentDeletionKey
} from './NoteAttachmentDeletionGuard'
import { NoteAttachmentSettings } from './NoteAttachmentSettings'
import { NoteDivider } from './NoteDivider'
import { NoteDividerSettings } from './NoteDividerSettings'
import { NoteTaskItem } from './NoteTaskItem'
import './NoteDivider.css'
import './NoteTaskList.css'

interface NoteCanvasProps {
  noteId: string
  document: NoteDocument
  mode: 'edit' | 'read'
  onChange: (document: NoteDocument) => void
}

export function NoteCanvas({
  noteId,
  document,
  mode,
  onChange
}: NoteCanvasProps): React.JSX.Element {
  const [canvasId] = useState(
    () =>
      document.blocks.find((block) => block.type === 'text' || block.type === 'heading')?.id ??
      crypto.randomUUID()
  )
  const canvas = useMemo(() => getNoteCanvas(document, canvasId), [document, canvasId])
  const legacyContent = useMemo(() => getNoteLegacyContent(document), [document])
  const attachments = useMemo(() => getNoteAttachments(document), [document])
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null)
  const selectedAttachment = attachments.find(
    (attachment) => attachment.id === selectedAttachmentId
  )
  const attachmentSettingsRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef(document)
  const onChangeRef = useRef(onChange)
  const [voiceControls, setVoiceControls] = useState<Record<string, StudyVoiceRecorderControls>>({})
  const onVoiceControlsChange = useCallback(
    (id: string, controls: StudyVoiceRecorderControls | null) => {
      setVoiceControls((current) => {
        if (!controls && !current[id]) return current
        const next = { ...current }
        if (controls) next[id] = controls
        else delete next[id]
        return next
      })
    },
    []
  )

  useEffect(() => {
    if (selectedAttachmentId) attachmentSettingsRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedAttachmentId, mode])

  function addAttachment(kind: StudyAssetKind | 'voice'): void {
    if (!editor || editor.isDestroyed || mode !== 'edit') return
    const attachment: NoteAttachmentBlock = {
      id: crypto.randomUUID(),
      type: kind === 'voice' ? 'audio' : kind,
      source: { type: 'local' }
    }
    const content = [
      {
        type: kind === 'voice' ? 'noteVoiceRecording' : 'noteAttachment',
        attrs: { attachment }
      },
      { type: 'paragraph' }
    ]
    const chain = editor.chain().focus()
    const insertion =
      editor.state.selection instanceof NodeSelection
        ? chain.insertContentAt(editor.state.selection.to, content)
        : chain.insertContent(content)
    insertion
      .command(({ tr }) => {
        tr.doc.descendants((node, position) => {
          if (
            isNoteAttachmentNodeName(node.type.name) &&
            node.attrs.attachment?.id === attachment.id
          ) {
            tr.setSelection(NodeSelection.create(tr.doc, position))
            return false
          }
          return true
        })
        return true
      })
      .run()
  }

  function updateAttachment(attachment: NoteAttachmentBlock): void {
    if (!editor || editor.isDestroyed || mode !== 'edit') return
    editor.commands.command(({ tr }) => {
      let updated = false
      tr.doc.descendants((node, position) => {
        if (
          isNoteAttachmentNodeName(node.type.name) &&
          node.attrs.attachment?.id === attachment.id
        ) {
          tr.setNodeMarkup(position, undefined, { ...node.attrs, attachment })
          updated = true
          return false
        }
        return true
      })
      return updated
    })
  }

  function deleteAttachment(id: string): void {
    if (!editor || editor.isDestroyed || mode !== 'edit') return
    const removed = editor.commands.command(({ tr }) => {
      let target: { position: number; size: number } | undefined
      tr.doc.descendants((node, position) => {
        if (isNoteAttachmentNodeName(node.type.name) && node.attrs.attachment?.id === id) {
          target = { position, size: node.nodeSize }
          return false
        }
        return true
      })
      if (!target) return false
      tr.delete(target.position, target.position + target.size)
      tr.setMeta(noteAttachmentDeletionKey, id)
      return true
    })
    if (removed) {
      setSelectedAttachmentId(null)
      editor.commands.focus()
    }
  }

  useEffect(() => {
    documentRef.current = document
    onChangeRef.current = onChange
  }, [document, onChange])

  const editor = useEditor(
    {
      extensions: [
        ...createRichTextExtensions(mode === 'read', {
          internalLinks: false,
          placeholder: 'Начните писать заметку…'
        }),
        NoteDivider,
        NoteAttachmentDeletionGuard,
        NoteAttachment.configure({
          noteId,
          getAttachment: (id) =>
            getNoteAttachments(documentRef.current).find((attachment) => attachment.id === id),
          onSelect: setSelectedAttachmentId
        }),
        NoteVoiceRecording.configure({
          noteId,
          getAttachment: (id) =>
            getNoteAttachments(documentRef.current).find((attachment) => attachment.id === id),
          onSelect: setSelectedAttachmentId,
          onVoiceControlsChange
        }),
        TaskList,
        NoteTaskItem.configure({
          nested: true,
          HTMLAttributes: { 'data-type': 'taskItem' },
          a11y: {
            checkboxLabel: (node) => `Отметить пункт: ${node.textContent || 'Новый пункт'}`
          }
        })
      ],
      content: canvas.html,
      editable: mode === 'edit',
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: 'mymind-rich-text-editor note-canvas-text',
          role: mode === 'read' ? 'document' : 'textbox',
          'aria-label': 'Текст заметки',
          'aria-multiline': 'true'
        }
      },
      onUpdate: ({ editor: currentEditor }) => {
        const currentAttachments: NoteAttachmentBlock[] = []
        currentEditor.state.doc.descendants((node) => {
          if (isNoteAttachmentNodeName(node.type.name) && node.attrs.attachment) {
            currentAttachments.push(node.attrs.attachment as NoteAttachmentBlock)
          }
        })
        const nextDocument = updateNoteCanvas(
          documentRef.current,
          {
            id: canvasId,
            type: 'text',
            html: currentEditor.getHTML(),
            text: currentEditor.getText({ blockSeparator: '\n\n' })
          },
          currentAttachments
        )
        documentRef.current = nextDocument
        onChangeRef.current(nextDocument)
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        const selection = currentEditor.state.selection
        const attachment =
          selection instanceof NodeSelection && isNoteAttachmentNodeName(selection.node.type.name)
            ? (selection.node.attrs.attachment as NoteAttachmentBlock | undefined)
            : undefined
        setSelectedAttachmentId(attachment?.id ?? null)
      }
    },
    [mode]
  )

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.getHTML() === canvas.html) return
    editor.commands.setContent(canvas.html ?? '<p></p>', {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
  }, [editor, canvas.html])

  return (
    <div
      className="note-canvas-layout"
      data-note-editor-content
      data-settings-visible={mode === 'edit' ? 'true' : 'false'}
    >
      <div className="note-canvas-scroll" data-note-editor-scroll-container>
        <article className="note-canvas-page" aria-label="Содержимое заметки">
          <EditorContent editor={editor} className="note-canvas-content" />
          {legacyContent.length > 0 && (
            <details className="note-canvas-legacy">
              <summary>Другие материалы заметки ({legacyContent.length})</summary>
              <div data-note-legacy-content>
                <StudyBlockEditor
                  materialId={noteId}
                  document={{ version: 1, blocks: legacyContent }}
                  mode="read"
                  focusMode
                  boardSource="notes"
                  onChange={() => undefined}
                />
              </div>
            </details>
          )}
        </article>
      </div>

      {mode === 'edit' && (
        <aside className="note-canvas-settings" aria-label="Настройки текста заметки">
          <div className="note-canvas-settings-scroll">
            {editor && !editor.isDestroyed ? (
              <RichTextSettings editor={editor} compact>
                <NoteDividerSettings editor={editor} />
                <NoteAttachmentButtons onAdd={addAttachment} />
                {selectedAttachment && (
                  <div ref={attachmentSettingsRef}>
                    <NoteAttachmentSettings
                      key={selectedAttachment.id}
                      noteId={noteId}
                      block={selectedAttachment}
                      isVoiceRecording={editor.isActive('noteVoiceRecording')}
                      onRecordAgain={voiceControls[selectedAttachment.id]?.startRecording}
                      isRecordingBusy={voiceControls[selectedAttachment.id]?.isBusy ?? false}
                      onChange={updateAttachment}
                      onDelete={() => deleteAttachment(selectedAttachment.id)}
                      onClose={() => setSelectedAttachmentId(null)}
                    />
                  </div>
                )}
              </RichTextSettings>
            ) : null}
          </div>
        </aside>
      )}
    </div>
  )
}
