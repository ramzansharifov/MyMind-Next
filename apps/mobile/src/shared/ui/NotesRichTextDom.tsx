'use dom'

import { Editor, Node, mergeAttributes } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { useDOMImperativeHandle, type DOMImperativeFactory } from 'expo/dom'
import { useCallback, useEffect, useRef, type Ref } from 'react'

export type NotesRichTextAlignment = 'left' | 'center' | 'right' | 'justify'

export interface NotesRichTextFormattingState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  blockquote: boolean
  bulletList: boolean
  orderedList: boolean
  alignment: NotesRichTextAlignment
  linkActive: boolean
  href: string
  fontSize: string
  color: string
  backgroundColor: string
  canUndo: boolean
  canRedo: boolean
}

export type NotesRichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'code'
  | 'blockquote'
  | 'bulletList'
  | 'orderedList'
  | 'indent'
  | 'outdent'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'undo'
  | 'redo'
  | 'clearFormatting'
  | 'unlink'

type NotesDomBridgeMethod = DOMImperativeFactory[string]

export interface NotesRichTextDomRef extends DOMImperativeFactory {
  command: NotesDomBridgeMethod
  setFontSize: NotesDomBridgeMethod
  setTextColor: NotesDomBridgeMethod
  setHighlightColor: NotesDomBridgeMethod
  setLink: NotesDomBridgeMethod
  getSelectedText: () => Promise<string>
  insertInternalLink: NotesDomBridgeMethod
  focusEditor: () => Promise<void>
}

export interface NotesRichTextDomProps {
  ref: Ref<NotesRichTextDomRef>
  dom?: import('expo/dom').DOMProps
  html: string
  plainText: string
  textColor: string
  mutedColor: string
  borderColor: string
  surfaceColor: string
  accentColor: string
  onChange: (html: string, plainText: string) => Promise<void>
  onFocusEditor: () => Promise<void>
  onFormattingState: (state: NotesRichTextFormattingState) => Promise<void>
  onHeightChange: (height: number) => Promise<void>
}

interface SavedSelection {
  from: number
  to: number
}

const StudyInternalLinkNode = Node.create({
  name: 'studyInternalLink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      targetKind: {
        default: 'material',
        parseHTML: (element) =>
          element.getAttribute('data-target-kind') === 'heading' ? 'heading' : 'material',
        renderHTML: (attributes) => ({ 'data-target-kind': attributes.targetKind })
      },
      materialId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-material-id') ?? '',
        renderHTML: (attributes) => ({ 'data-material-id': attributes.materialId })
      },
      headingId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-heading-id'),
        renderHTML: (attributes) =>
          attributes.headingId ? { 'data-heading-id': attributes.headingId } : {}
      },
      headingLevel: {
        default: null,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('data-heading-level'))
          return value === 1 || value === 2 || value === 3 ? value : null
        },
        renderHTML: (attributes) =>
          attributes.headingLevel
            ? { 'data-heading-level': String(attributes.headingLevel) }
            : {}
      },
      labelMode: {
        default: 'auto',
        parseHTML: (element) =>
          element.getAttribute('data-label-mode') === 'custom' ? 'custom' : 'auto',
        renderHTML: (attributes) => ({ 'data-label-mode': attributes.labelMode })
      },
      label: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-label') ?? element.textContent ?? '',
        renderHTML: (attributes) => ({ 'data-label': attributes.label })
      },
      materialTitle: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-material-title') ?? '',
        renderHTML: (attributes) => ({ 'data-material-title': attributes.materialTitle })
      },
      folderPath: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-folder-path')
          if (!raw) return []
          try {
            const parsed: unknown = JSON.parse(raw)
            return Array.isArray(parsed)
              ? parsed.filter((item): item is string => typeof item === 'string')
              : []
          } catch {
            return []
          }
        },
        renderHTML: (attributes) => ({
          'data-folder-path': JSON.stringify(
            Array.isArray(attributes.folderPath) ? attributes.folderPath : []
          )
        })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-study-internal-link="true"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-study-internal-link': 'true',
        contenteditable: 'false'
      }),
      String(node.attrs.label || 'Внутренняя ссылка')
    ]
  },

  renderText({ node }) {
    return String(node.attrs.label ?? '')
  }
})

function createExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      codeBlock: false,
      horizontalRule: false,
      link: {
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        enableClickSelection: true,
        defaultProtocol: 'https',
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }
    }),
    StudyInternalLinkNode,
    TextAlign.configure({
      types: ['paragraph'],
      alignments: ['left', 'center', 'right', 'justify']
    }),
    TextStyleKit,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({
      placeholder: 'Начните писать…',
      showOnlyWhenEditable: true
    })
  ]
}

function normalizeHref(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value
  if (/^[\w.-]+\.[a-z]{2,}(?:[/#?].*)?$/i.test(value)) return `https://${value}`
  return null
}

function alignment(value: unknown): NotesRichTextAlignment {
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left'
}

function formattingState(editor: Editor): NotesRichTextFormattingState {
  const textStyle = editor.getAttributes('textStyle')
  const paragraph = editor.getAttributes('paragraph')
  const link = editor.getAttributes('link')
  const highlight = editor.getAttributes('highlight')

  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    code: editor.isActive('code'),
    blockquote: editor.isActive('blockquote'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    alignment: alignment(paragraph.textAlign),
    linkActive: editor.isActive('link'),
    href: typeof link.href === 'string' ? link.href : '',
    fontSize: typeof textStyle.fontSize === 'string' ? textStyle.fontSize : 'default',
    color: typeof textStyle.color === 'string' ? textStyle.color : '',
    backgroundColor: typeof highlight.color === 'string' ? highlight.color : '',
    canUndo: editor.can().chain().undo().run(),
    canRedo: editor.can().chain().redo().run()
  }
}

function safeSelection(editor: Editor, selection: SavedSelection | null): SavedSelection {
  const max = editor.state.doc.content.size
  const fallback = {
    from: editor.state.selection.from,
    to: editor.state.selection.to
  }
  if (!selection) return fallback
  const from = Math.max(1, Math.min(selection.from, max))
  const to = Math.max(from, Math.min(selection.to, max))
  return { from, to }
}

export default function NotesRichTextDom({
  ref,
  html,
  plainText: _plainText,
  textColor,
  mutedColor,
  borderColor,
  surfaceColor,
  accentColor,
  onChange,
  onFocusEditor,
  onFormattingState,
  onHeightChange
}: NotesRichTextDomProps): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const savedSelectionRef = useRef<SavedSelection | null>(null)
  const lastEmittedHtmlRef = useRef<string | null>(null)
  const callbacksRef = useRef({
    onChange,
    onFocusEditor,
    onFormattingState,
    onHeightChange
  })

  useEffect(() => {
    callbacksRef.current = {
      onChange,
      onFocusEditor,
      onFormattingState,
      onHeightChange
    }
  }, [onChange, onFocusEditor, onFormattingState, onHeightChange])

  const emitFormatting = useCallback((editor: Editor): void => {
    if (editor.isDestroyed) return
    void callbacksRef.current.onFormattingState(formattingState(editor))
  }, [])

  const rememberSelection = useCallback(
    (editor: Editor): void => {
      if (editor.isDestroyed) return
      savedSelectionRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to
      }
      emitFormatting(editor)
    },
    [emitFormatting]
  )

  const commandChain = useCallback((editor: Editor) => {
    const selection = safeSelection(editor, savedSelectionRef.current)
    return editor.chain().focus().setTextSelection(selection)
  }, [])

  useDOMImperativeHandle(
    ref,
    () => ({
      command: (...args) => {
        const editor = editorRef.current
        const command = args[0]
        if (!editor || editor.isDestroyed || typeof command !== 'string') return

        const chain = commandChain(editor)
        switch (command) {
          case 'bold':
            chain.toggleBold().run()
            break
          case 'italic':
            chain.toggleItalic().run()
            break
          case 'underline':
            chain.toggleUnderline().run()
            break
          case 'strike':
            chain.toggleStrike().run()
            break
          case 'code':
            chain.toggleCode().run()
            break
          case 'blockquote':
            chain.toggleBlockquote().run()
            break
          case 'bulletList':
            chain.toggleBulletList().run()
            break
          case 'orderedList':
            chain.toggleOrderedList().run()
            break
          case 'indent':
            chain.sinkListItem('listItem').run()
            break
          case 'outdent':
            chain.liftListItem('listItem').run()
            break
          case 'alignLeft':
            chain.setTextAlign('left').run()
            break
          case 'alignCenter':
            chain.setTextAlign('center').run()
            break
          case 'alignRight':
            chain.setTextAlign('right').run()
            break
          case 'alignJustify':
            chain.setTextAlign('justify').run()
            break
          case 'undo':
            editor.chain().focus().undo().run()
            break
          case 'redo':
            editor.chain().focus().redo().run()
            break
          case 'clearFormatting':
            chain.unsetAllMarks().clearNodes().setTextAlign('left').run()
            break
          case 'unlink':
            if (editor.isActive('link')) chain.extendMarkRange('link')
            chain.unsetLink().run()
            break
        }
        rememberSelection(editor)
      },
      setFontSize: (...args) => {
        const editor = editorRef.current
        const value = args[0]
        if (!editor || editor.isDestroyed || typeof value !== 'string') return
        const chain = commandChain(editor)
        if (value === 'default') chain.unsetFontSize().run()
        else chain.setFontSize(value).run()
        rememberSelection(editor)
      },
      setTextColor: (...args) => {
        const editor = editorRef.current
        const value = args[0]
        if (!editor || editor.isDestroyed || (value !== null && typeof value !== 'string')) return
        const chain = commandChain(editor)
        if (value === null) chain.unsetColor().run()
        else chain.setColor(value).run()
        rememberSelection(editor)
      },
      setHighlightColor: (...args) => {
        const editor = editorRef.current
        const value = args[0]
        if (!editor || editor.isDestroyed || (value !== null && typeof value !== 'string')) return
        const chain = commandChain(editor)
        if (value === null) chain.unsetHighlight().run()
        else chain.setHighlight({ color: value }).run()
        rememberSelection(editor)
      },
      setLink: (...args) => {
        const editor = editorRef.current
        const rawHref = args[0]
        if (!editor || editor.isDestroyed || typeof rawHref !== 'string') return
        const href = normalizeHref(rawHref)
        if (!href) return

        const selection = safeSelection(editor, savedSelectionRef.current)
        const chain = commandChain(editor)

        if (editor.isActive('link')) {
          chain.extendMarkRange('link').setLink({ href }).run()
        } else if (selection.from === selection.to) {
          chain
            .insertContent({
              type: 'text',
              text: rawHref.trim(),
              marks: [{ type: 'link', attrs: { href } }]
            })
            .run()
        } else {
          chain.setLink({ href }).run()
        }
        rememberSelection(editor)
      },
      getSelectedText: async () => {
        const editor = editorRef.current
        if (!editor || editor.isDestroyed) return ''
        const selection = safeSelection(editor, savedSelectionRef.current)
        return editor.state.doc.textBetween(selection.from, selection.to, ' ')
      },
      insertInternalLink: (...args) => {
        const editor = editorRef.current
        const linkHtml = args[0]
        if (!editor || editor.isDestroyed || typeof linkHtml !== 'string') return
        commandChain(editor).insertContent(linkHtml).run()
        rememberSelection(editor)
      },
      focusEditor: async () => {
        const editor = editorRef.current
        if (!editor || editor.isDestroyed) return
        commandChain(editor).run()
      }
    }),
    [commandChain, rememberSelection]
  )

  useEffect(() => {
    const element = mountRef.current
    if (!element) return undefined

    const editor = new Editor({
      element,
      extensions: createExtensions(),
      content: html || '<p></p>',
      editorProps: {
        attributes: {
          class: 'notes-editor',
          'aria-label': 'Текстовый блок',
          role: 'textbox',
          'aria-multiline': 'true'
        }
      },
      onFocus: ({ editor: current }) => {
        rememberSelection(current)
        void callbacksRef.current.onFocusEditor()
      },
      onSelectionUpdate: ({ editor: current }) => {
        rememberSelection(current)
      },
      onTransaction: ({ editor: current }) => {
        emitFormatting(current)
      },
      onUpdate: ({ editor: current }) => {
        const nextHtml = current.getHTML()
        const nextText = current.getText({ blockSeparator: '\n\n' })
        lastEmittedHtmlRef.current = nextHtml
        void callbacksRef.current.onChange(nextHtml, nextText)
        emitFormatting(current)
      }
    })

    editorRef.current = editor
    rememberSelection(editor)

    const dom = editor.view.dom
    const reportHeight = (): void => {
      const height = Math.max(64, Math.ceil(dom.scrollHeight + 18))
      void callbacksRef.current.onHeightChange(height)
    }

    const observer = new ResizeObserver(reportHeight)
    observer.observe(dom)
    reportHeight()

    return () => {
      observer.disconnect()
      if (editorRef.current === editor) editorRef.current = null
      editor.destroy()
    }
  }, [emitFormatting, rememberSelection])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return
    if (html === lastEmittedHtmlRef.current) return
    if (editor.getHTML() === html) return
    editor.commands.setContent(html || '<p></p>', {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
    rememberSelection(editor)
  }, [html, rememberSelection])

  return (
    <main
      className="notes-rich-root"
      style={
        {
          '--text': textColor,
          '--muted': mutedColor,
          '--border': borderColor,
          '--surface': surfaceColor,
          '--accent': accentColor
        } as React.CSSProperties
      }
    >
      <div ref={mountRef} />
      <style>{styles}</style>
    </main>
  )
}

const styles = `
  html, body, #root { margin: 0; width: 100%; min-height: 1px; background: transparent; }
  * { box-sizing: border-box; }
  body { overflow: hidden; }
  .notes-rich-root {
    width: 100%;
    min-height: 64px;
    color: var(--text);
    background: transparent;
    font: 17px/1.55 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .notes-editor {
    width: 100%;
    min-height: 64px;
    padding: 7px 2px 9px;
    outline: none;
    overflow-wrap: anywhere;
    caret-color: var(--accent);
    color: var(--text);
  }
  .notes-editor p { margin: 0 0 0.72em; }
  .notes-editor p:last-child { margin-bottom: 0; }
  .notes-editor p.is-editor-empty:first-child::before {
    content: attr(data-placeholder);
    float: left;
    height: 0;
    color: var(--muted);
    pointer-events: none;
  }
  .notes-editor strong, .notes-editor b { font-weight: 700; }
  .notes-editor em, .notes-editor i { font-style: italic; }
  .notes-editor u { text-decoration: underline; }
  .notes-editor s, .notes-editor strike { text-decoration: line-through; }
  .notes-editor code {
    padding: 1px 5px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  .notes-editor blockquote {
    margin: 0.5em 0;
    padding: 3px 0 3px 12px;
    border-left: 3px solid var(--accent);
    color: var(--muted);
  }
  .notes-editor ul, .notes-editor ol { margin: 0.5em 0; padding-left: 1.55em; }
  .notes-editor li { margin: 0.22em 0; }
  .notes-editor a { color: var(--accent); text-decoration: underline; }
  .notes-editor mark { border-radius: 3px; padding: 0 1px; color: inherit; }
  .notes-editor [data-study-internal-link="true"] {
    display: inline;
    padding: 1px 4px;
    border-radius: 5px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-weight: 600;
  }
`
