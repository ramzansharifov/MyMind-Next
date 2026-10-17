import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import type { StudyVoiceRecorderControls } from '../../study/components/file/StudyVoiceRecorder'
import type { NoteAttachmentBlock } from '../lib/note-canvas-document'
import { NoteAttachmentView } from './NoteAttachmentView'

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
