import { Extension, Node, type Editor, type Extensions } from '@tiptap/core'
import { TaskList } from '@tiptap/extension-list'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as DocumentNode } from '@tiptap/pm/model'
import type { NoteBlock, NoteDocument } from '@mymind/contracts/notes'
import { normalizeStudyRemoteImageUrl, parseStudyYouTubeUrl } from '@mymind/core/study-remote-media'
import { resolveStudyRichTextHtml } from '../../shared/ui/richTextHtml'
import { NoteTaskItem } from './MobileNoteTaskItem'
import { NoteHighlightContrast } from './MobileNoteHighlightContrast'
export type MobileNoteAttachment = Extract<
  NoteBlock,
  {
    type: 'image' | 'video' | 'audio' | 'file'
  }
>
export type AttachmentAction = 'select' | 'settings' | 'open' | 'record' | 'preview'
export const attachmentDeleteKey = new PluginKey('mobileNoteAttachmentDelete')
export const isAttachment = (name: string): boolean =>
  name === 'noteAttachment' || name === 'noteVoiceRecording'
export function canvasHtml(document: NoteDocument): string {
  const texts = document.blocks.filter((block) => block.type === 'text' || block.type === 'heading')
  const referenced = new Set<string>()
  texts.forEach((block) => {
    if (block.type !== 'text' || !block.html) return
    const parsed = new DOMParser().parseFromString(block.html, 'text/html')
    parsed
      .querySelectorAll('[data-note-attachment-id]')
      .forEach((element) => referenced.add(element.getAttribute('data-note-attachment-id') ?? ''))
  })
  return (
    document.blocks
      .map((block) => {
        if (block.type === 'text') return resolveStudyRichTextHtml(block)
        if (block.type === 'heading') {
          const span = window.document.createElement('span')
          span.textContent = block.text
          span.style.fontSize = { 1: '2rem', 2: '1.65rem', 3: '1.35rem' }[block.level]
          if (block.color) span.style.color = block.color
          if (block.backgroundColor) {
            const highlight = window.document.createElement('mark')
            highlight.textContent = block.text
            highlight.setAttribute('data-color', block.backgroundColor)
            highlight.style.backgroundColor = block.backgroundColor
            span.replaceChildren(highlight)
          }
          return `<p style="text-align:${block.alignment ?? 'left'}"><strong>${span.outerHTML}</strong></p>`
        }
        if (['image', 'audio', 'video', 'file'].includes(block.type) && !referenced.has(block.id)) {
          const marker = window.document.createElement('div')
          marker.setAttribute('data-note-attachment-id', block.id)
          return marker.outerHTML
        }
        return ''
      })
      .join('') || '<p></p>'
  )
}
export function canvasAttachments(editor: Editor): MobileNoteAttachment[] {
  const result = new Map<string, MobileNoteAttachment>()
  editor.state.doc.descendants((node) => {
    if (isAttachment(node.type.name) && node.attrs.attachment)
      result.set(node.attrs.attachment.id, node.attrs.attachment)
  })
  return [...result.values()]
}
function counts(document: DocumentNode): Map<string, number> {
  const result = new Map<string, number>()
  document.descendants((node) => {
    if (isAttachment(node.type.name) && node.attrs.attachment?.id) {
      const id = String(node.attrs.attachment.id)
      result.set(id, (result.get(id) ?? 0) + 1)
    }
  })
  return result
}
interface CanvasOptions {
  getAttachment(id: string): MobileNoteAttachment | undefined
  getUri(id: string): string | undefined
  onClick(id: string, action: AttachmentAction): void
  refreshers: Set<() => void>
}
export function noteCanvasExtensions(options: CanvasOptions): Extensions {
  const Attachment = Node.create({
    name: 'noteAttachment',
    group: 'block',
    atom: true,
    selectable: true,
    isolating: true,
    addAttributes() {
      return {
        attachment: {
          default: null,
          rendered: false,
          parseHTML: (element) =>
            options.getAttachment(element.getAttribute('data-note-attachment-id') ?? '') ?? null
        }
      }
    },
    parseHTML() {
      return [{ tag: 'div[data-note-attachment-id]:not([data-note-voice-recording="true"])' }]
    },
    renderHTML({ node }) {
      return ['div', { 'data-note-attachment-id': node.attrs.attachment?.id ?? '' }]
    },
    addNodeView() {
      return ({ node, editor, getPos }) => {
        let current = node
        const dom = window.document.createElement('figure')
        dom.className = 'mobile-note-attachment'
        dom.contentEditable = 'false'
        dom.tabIndex = 0
        function button(label: string, onClick: () => void, className = ''): HTMLButtonElement {
          const control = window.document.createElement('button')
          control.type = 'button'
          control.textContent = label
          control.className = className
          control.setAttribute(
            'aria-label',
            className === 'mobile-note-expand' ? 'Развернуть изображение' : label
          )
          control.onclick = (event) => {
            event.stopPropagation()
            onClick()
          }
          return control
        }
        function render(): void {
          const block = current.attrs.attachment as MobileNoteAttachment | null
          dom
            .querySelectorAll('audio,video')
            .forEach((media) => (media as HTMLMediaElement).pause())
          dom.replaceChildren()
          if (!block) return
          const voice = current.type.name === 'noteVoiceRecording'
          const labels = {
            image: 'Изображение',
            video: 'Видео',
            audio: voice ? 'Голосовое' : 'Аудио',
            file: 'Файл'
          }
          if (block.title) {
            const caption = window.document.createElement('figcaption')
            caption.textContent = block.title
            dom.append(caption)
          }
          const asset = block.source.type === 'local' ? block.source.asset : undefined
          const uri = asset
            ? options.getUri(block.id)
            : block.source.type === 'url'
              ? block.source.url
              : undefined
          if (block.type === 'image' && uri) {
            const image = window.document.createElement('img')
            image.src = asset ? uri : (normalizeStudyRemoteImageUrl(uri) ?? '')
            image.alt = block.title || asset?.name || 'Изображение'
            image.style.height = `${Math.min(block.imageHeight ?? 360, 600)}px`
            image.style.objectFit = block.imageFit ?? 'contain'
            image.onerror = () => {
              image.alt = 'Изображение недоступно'
              if (!dom.querySelector('.mobile-note-image-fallback'))
                dom.append(
                  button(
                    'Посмотреть изображение',
                    () => options.onClick(block.id, 'preview'),
                    'mobile-note-image-fallback'
                  )
                )
            }
            dom.append(
              image,
              button('⛶', () => options.onClick(block.id, 'preview'), 'mobile-note-expand')
            )
          } else if (block.type === 'video' && uri && block.source.type === 'url') {
            const parsed = parseStudyYouTubeUrl(uri)
            if (parsed) {
              const iframe = window.document.createElement('iframe')
              iframe.src = parsed.embedUrl
              iframe.title = block.title || 'Видео'
              iframe.allowFullscreen = true
              iframe.allow = 'fullscreen; encrypted-media; picture-in-picture'
              dom.append(iframe)
            }
          } else if ((block.type === 'audio' || block.type === 'video') && uri) {
            const media = window.document.createElement(block.type)
            media.src = uri
            media.controls = true
            media.preload = 'metadata'
            media.setAttribute('playsinline', '')
            dom.append(media)
            if (asset)
              dom.append(
                button(block.type === 'audio' ? 'Открыть плеер' : 'Открыть на устройстве', () =>
                  options.onClick(block.id, block.type === 'audio' ? 'preview' : 'open')
                )
              )
          } else if (block.type === 'file' && asset) {
            dom.append(
              button(
                `↗ ${block.title || asset.name}`,
                () => options.onClick(block.id, 'open'),
                'mobile-note-file'
              )
            )
          } else {
            const empty = window.document.createElement('div')
            empty.className = 'mobile-note-empty'
            empty.textContent = labels[block.type]
            dom.append(empty)
            if (voice && editor.isEditable)
              dom.append(button('Начать запись', () => options.onClick(block.id, 'record')))
          }
          if (editor.isEditable)
            dom.append(
              button(
                'Настройки',
                () => options.onClick(block.id, 'settings'),
                'mobile-note-attachment-settings'
              )
            )
        }
        dom.addEventListener('click', (event) => {
          const block = current.attrs.attachment as MobileNoteAttachment | null
          if (!block || !editor.isEditable) return
          const target = event.target as HTMLElement
          if (target.closest('button, audio, video, iframe')) return
          const position = getPos()
          if (typeof position === 'number') editor.commands.setNodeSelection(position)
          options.onClick(block.id, 'select')
        })
        options.refreshers.add(render)
        render()
        return {
          dom,
          update(next) {
            if (next.type !== current.type) return false
            const changed = !next.eq(current)
            current = next
            if (changed) render()
            return true
          },
          selectNode() {
            dom.dataset.selected = 'true'
          },
          deselectNode() {
            delete dom.dataset.selected
          },
          stopEvent: (event) =>
            Boolean((event.target as HTMLElement)?.closest('button, audio, video, iframe')),
          ignoreMutation: () => true,
          destroy() {
            options.refreshers.delete(render)
            dom.querySelectorAll('audio,video').forEach((media) => {
              ;(media as HTMLMediaElement).pause()
              media.removeAttribute('src')
            })
          }
        }
      }
    }
  })
  const Voice = Attachment.extend({
    name: 'noteVoiceRecording',
    parseHTML() {
      return [{ tag: 'div[data-note-attachment-id][data-note-voice-recording="true"]' }]
    },
    renderHTML({ node }) {
      return [
        'div',
        {
          'data-note-attachment-id': node.attrs.attachment?.id ?? '',
          'data-note-voice-recording': 'true'
        }
      ]
    }
  })
  const Divider = Node.create({
    name: 'noteDivider',
    group: 'block',
    atom: true,
    selectable: true,
    addAttributes() {
      return {
        variant: {
          default: 'solid',
          rendered: false,
          parseHTML: (el) => el.getAttribute('data-divider-variant') || 'solid'
        },
        thickness: {
          default: 3,
          rendered: false,
          parseHTML: (el) =>
            Math.max(1, Math.min(12, Number(el.getAttribute('data-divider-thickness')) || 3))
        }
      }
    },
    parseHTML() {
      return [{ tag: 'div[data-note-divider]' }, { tag: 'hr' }]
    },
    renderHTML({ node }) {
      return [
        'div',
        {
          'data-note-divider': '',
          'data-divider-variant': node.attrs.variant,
          'data-divider-thickness': node.attrs.thickness,
          class: 'mobile-note-divider',
          role: 'separator',
          contenteditable: 'false',
          style: `--divider-size:${node.attrs.thickness}px`
        },
        ['span', { 'aria-hidden': 'true' }]
      ]
    }
  })
  const Guard = Extension.create({
    name: 'mobileNoteAttachmentGuard',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: attachmentDeleteKey,
          filterTransaction(tr, state) {
            if (!tr.docChanged) return true
            const after = counts(tr.doc)
            for (const [id, count] of counts(state.doc)) {
              if ((after.get(id) ?? 0) < count && tr.getMeta(attachmentDeleteKey) !== id)
                return false
            }
            return true
          }
        })
      ]
    }
  })
  return [
    Attachment,
    Voice,
    Divider,
    Guard,
    NoteHighlightContrast,
    TaskList.extend({
      addCommands() {
        return {
          ...this.parent?.(),
          toggleTaskList:
            () =>
            ({ commands }) =>
              commands.toggleList(this.name, this.options.itemTypeName, true)
        }
      }
    }),
    NoteTaskItem.configure({ nested: true })
  ]
}
