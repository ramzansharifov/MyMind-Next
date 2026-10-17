import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useCallback, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { StudyFileBlockView } from '../../study/components/file/StudyFileBlockView'
import {
  StudyVoiceRecorder,
  type StudyVoiceRecorderControls
} from '../../study/components/file/StudyVoiceRecorder'
import { useStudyBlockAssetClient } from '../../study/components/study-block-asset-context'
import { notesBlockAssetClient } from '../api/notes-client'
import type { NoteAttachmentBlock } from '../lib/note-canvas-document'

export function NoteAttachmentView({
  node,
  editor,
  extension,
  selected,
  getPos,
  updateAttributes
}: NodeViewProps): React.JSX.Element {
  const assetClient = useStudyBlockAssetClient()
  const attachment = node.attrs.attachment as NoteAttachmentBlock | null
  const attachmentId = attachment?.id
  const isVoiceRecording = node.type.name === 'noteVoiceRecording'
  const onVoiceControlsChange = useCallback(
    (controls: StudyVoiceRecorderControls | null) => {
      if (attachmentId) extension.options.onVoiceControlsChange(attachmentId, controls)
    },
    [attachmentId, extension]
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
