import { Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { useCallback, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'

import { StudyFileBlockView } from '../../study/components/file/StudyFileBlockView'
import {
  StudyVoiceRecorder,
  type StudyVoiceRecorderControls
} from '../../study/components/file/StudyVoiceRecorder'
import { useStudyBlockAssetClient } from '../../study/components/study-block-asset-context'
import { notesBlockAssetClient } from '../api/notes-client'
import type { NoteAttachmentBlock } from '../lib/note-canvas-document'

interface NoteAttachmentOptions {
  noteId: string
  getAttachment: (id: string) => NoteAttachmentBlock | undefined
  onSelect: (id: string | null) => void
  onVoiceControlsChange: (id: string, controls: StudyVoiceRecorderControls | null) => void
}

export const NoteAttachment = Node.create<NoteAttachmentOptions>({
  name: 'noteAttachment',
  group: 'block',
  atom: true,
  selectable: true,
  isolating: true,

  addOptions() {
    return {
      noteId: '',
      getAttachment: () => undefined,
      onSelect: () => undefined,
      onVoiceControlsChange: () => undefined
    }
  },

  addAttributes() {
    return {
      attachment: {
        default: null,
        rendered: false,
        parseHTML: (element) =>
          this.options.getAttachment(element.getAttribute('data-note-attachment-id') ?? '') ?? null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-note-attachment-id]:not([data-note-voice-recording="true"])',
        getAttrs: (element) =>
          this.options.getAttachment(element.getAttribute('data-note-attachment-id') ?? '')
            ? null
            : false
      }
    ]
  },

  renderHTML({ node }) {
    const attachment = node.attrs.attachment as NoteAttachmentBlock | null
    return ['div', { 'data-note-attachment-id': attachment?.id ?? '' }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NoteAttachmentView)
  }
})

export const NoteVoiceRecording = NoteAttachment.extend({
  name: 'noteVoiceRecording',

  parseHTML() {
    return [
      {
        tag: 'div[data-note-attachment-id][data-note-voice-recording="true"]',
        getAttrs: (element) =>
          this.options.getAttachment(element.getAttribute('data-note-attachment-id') ?? '')
            ?.type === 'audio'
            ? null
            : false
      }
    ]
  },

  renderHTML({ node }) {
    const attachment = node.attrs.attachment as NoteAttachmentBlock | null
    return [
      'div',
      {
        'data-note-attachment-id': attachment?.id ?? '',
        'data-note-voice-recording': 'true'
      }
    ]
  }
})

export function isNoteAttachmentNodeName(name: string): boolean {
  return name === 'noteAttachment' || name === 'noteVoiceRecording'
}

function NoteAttachmentView({
  node,
  editor,
  extension,
  selected,
  getPos,
  updateAttributes
}: NodeViewProps): React.JSX.Element {
  const assetClient = useStudyBlockAssetClient()
  const attachment = node.attrs.attachment as NoteAttachmentBlock | null
  const isVoiceRecording = node.type.name === 'noteVoiceRecording'
  const onVoiceControlsChange = useCallback(
    (controls: StudyVoiceRecorderControls | null) => {
      if (attachment?.id) extension.options.onVoiceControlsChange(attachment.id, controls)
    },
    [attachment?.id, extension]
  )

  function selectAttachment(focus: boolean): void {
    const position = getPos()
    if (!editor.isEditable || typeof position !== 'number') return
    if (focus) {
      editor.chain().focus(undefined, { scrollIntoView: false }).setNodeSelection(position).run()
    } else {
      editor.commands.setNodeSelection(position)
    }
    extension.options.onSelect(attachment?.id ?? null)
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className="note-canvas-attachment"
      data-selected={editor.isEditable && selected ? 'true' : 'false'}
      role="group"
      aria-label={isVoiceRecording ? 'Голосовая запись заметки' : 'Вложение заметки'}
      tabIndex={editor.isEditable ? 0 : undefined}
      onClickCapture={(event: MouseEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        if (target.closest('[role="dialog"]')) return
        selectAttachment(!target.closest('button, a, input, textarea, select, [role="slider"]'))
      }}
      onFocusCapture={(event: FocusEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        if (!target.closest('[role="dialog"]')) selectAttachment(false)
      }}
      onKeyDownCapture={(event: KeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement
        const field = target.closest('input, textarea, select, [role="textbox"], [role="slider"]')
        if (
          !editor.isEditable ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.nativeEvent.isComposing ||
          target.isContentEditable ||
          target.closest('[role="dialog"]') ||
          (field && event.currentTarget.contains(field))
        ) {
          return
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault()
          event.stopPropagation()
        } else if (
          event.target === event.currentTarget &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault()
          selectAttachment(true)
        }
      }}
    >
      {attachment?.type === 'audio' && isVoiceRecording && editor.isEditable ? (
        <StudyVoiceRecorder
          layout="horizontal"
          showRecordAgainButton={false}
          onControlsChange={onVoiceControlsChange}
          materialId={extension.options.noteId}
          block={attachment}
          saveRecording={notesBlockAssetClient.saveRecordedAudio}
          onOpenFile={assetClient.openAsset}
          onChange={(recordedBlock) => {
            const position = getPos()
            if (typeof position !== 'number' || editor.isDestroyed) return
            const current = editor.state.doc.nodeAt(position)
            const latest = current?.attrs.attachment as NoteAttachmentBlock | undefined
            if (
              current?.type.name !== 'noteVoiceRecording' ||
              latest?.type !== 'audio' ||
              latest.id !== recordedBlock.id
            )
              return
            updateAttributes({
              attachment: {
                ...latest,
                source: recordedBlock.source,
                title: latest.title?.trim() || recordedBlock.title
              }
            })
          }}
        />
      ) : attachment ? (
        <StudyFileBlockView
          block={attachment}
          onOpenFile={assetClient.openAsset}
          imagePresentation="plain"
        />
      ) : null}
    </NodeViewWrapper>
  )
}
