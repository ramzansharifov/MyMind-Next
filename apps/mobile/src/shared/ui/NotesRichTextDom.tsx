'use dom'

import { Editor, mergeAttributes, Node as TiptapNode } from '@tiptap/core'
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

const StudyInternalLinkExtension = TiptapNode.create({
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
          const level = Number(element.getAttribute('data-heading-level'))
          return level === 1 || level === 2 || level === 3 ? level : null
        },
        renderHTML: (attributes) =>
          attributes.headingLevel ? { 'data-heading-level': String(attributes.headingLevel) } : {}
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
        parseHTML: (element) => parseFolderPath(element.getAttribute('data-folder-path')),
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
        'data-study-internal-link': 'true'
      }),
      String(node.attrs.label || 'Внутренняя ссылка')
    ]
  },

  renderText({ node }) {
    return String(node.attrs.label ?? '')
  }
})

function parseFolderPath(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

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
    StudyInternalLinkExtension,
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

function normalizeHref(value: string): string | null {
  const candidate = value.trim()
  if (!candidate) return null
  if (/^(https?:|mailto:|tel:)/i.test(candidate)) return candidate
  if (/^[\w.-]+\.[a-z]{2,}(?:[/#?].*)?$/i.test(candidate)) return `https://${candidate}`
  return null
}

function textAlignment(value: unknown): NotesRichTextAlignment {
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
    alignment: textAlignment(paragraph.textAlign),
    linkActive: editor.isActive('link'),
    href: typeof link.href === 'string' ? link.href : '',
    fontSize: typeof textStyle.fontSize === 'string' ? textStyle.fontSize : 'default',
    color: typeof textStyle.color === 'string' ? textStyle.color : '',
    backgroundColor: typeof highlight.color === 'string' ? highlight.color : '',
    canUndo: editor.can().chain().undo().run(),
    canRedo: editor.can().chain().redo().run()
  }
}

export default function NotesRichTextDom({
  ref,
  html,
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
  const onChangeRef = useRef(onChange)
  const onFocusEditorRef = useRef(onFocusEditor)
  const onFormattingStateRef = useRef(onFormattingState)
  const onHeightChangeRef = useRef(onHeightChange)

  useEffect(() => {
    onChangeRef.current = onChange
    onFocusEditorRef.current = onFocusEditor
    onFormattingStateRef.current = onFormattingState
    onHeightChangeRef.current = onHeightChange
  }, [onChange, onFocusEditor, onFormattingState, onHeightChange])

  const rememberSelection = useCallback((editor: Editor) => {
    savedSelectionRef.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to
    }
  }, [])

  const reportFormatting = useCallback((editor: Editor) => {
    if (editor.isDestroyed) return
    void onFormattingStateRef.current(formattingState(editor))
  }, [])

  const reportHeight = useCallback(() => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return
      const height = Math.max(64, Math.ceil(editor.view.dom.scrollHeight + 18))
      void onHeightChangeRef.current(height)
    })
  }, [])

  const commandChain = useCallback((): ReturnType<Editor['chain']> | null => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return null

    const chain = editor.chain().focus()
    const selection = savedSelectionRef.current
    if (!selection) return chain

    const maxPosition = editor.state.doc.content.size
    const from = Math.max(1, Math.min(selection.from, maxPosition))
    const to = Math.max(from, Math.min(selection.to, maxPosition))
    return chain.setTextSelection({ from, to })
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const editor = new Editor({
      element: mount,
      extensions: createExtensions(),
      content: html || '<p></p>',
      editable: true,
      editorProps: {
        attributes: {
          class: 'notes-editor'
        }
      },
      onCreate: ({ editor: createdEditor }) => {
        editorRef.current = createdEditor
        rememberSelection(createdEditor)
        reportFormatting(createdEditor)
        reportHeight()
      },
      onFocus: ({ editor: focusedEditor }) => {
        rememberSelection(focusedEditor)
        reportFormatting(focusedEditor)
        void onFocusEditorRef.current()
      },
      onBlur: ({ editor: blurredEditor }) => {
        rememberSelection(blurredEditor)
        reportFormatting(blurredEditor)
      },
      onSelectionUpdate: ({ editor: updatedEditor }) => {
        rememberSelection(updatedEditor)
        reportFormatting(updatedEditor)
      },
      onTransaction: ({ editor: updatedEditor }) => {
        reportFormatting(updatedEditor)
        reportHeight()
      },
      onUpdate: ({ editor: updatedEditor }) => {
        rememberSelection(updatedEditor)
        const nextHtml = updatedEditor.getHTML()
        const nextText = updatedEditor.getText({ blockSeparator: '\n\n' })
        void onChangeRef.current(nextHtml, nextText)
        reportHeight()
      }
    })
    editorRef.current = editor

    const observer = new ResizeObserver(() => reportHeight())
    observer.observe(editor.view.dom)
    reportHeight()

    return () => {
      observer.disconnect()
      if (!editor.isDestroyed) editor.destroy()
      if (editorRef.current === editor) editorRef.current = null
    }
  }, [rememberSelection, reportFormatting, reportHeight])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed || editor.getHTML() === html) return
    editor.commands.setContent(html || '<p></p>', {
      emitUpdate: false,
      errorOnInvalidContent: false
    })
    reportHeight()
    reportFormatting(editor)
  }, [html, reportFormatting, reportHeight])

  useDOMImperativeHandle(
    ref,
    () => ({
      command: (...args) => {
        const command = args[0]
        if (typeof command !== 'string') return
        const editor = editorRef.current
        if (!editor || editor.isDestroyed) return

        if (command === 'undo') {
          editor.chain().focus().undo().run()
          return
        }
        if (command === 'redo') {
          editor.chain().focus().redo().run()
          return
        }

        let chain = commandChain()
        if (!chain) return

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
          case 'clearFormatting':
            chain.unsetAllMarks().clearNodes().setTextAlign('left').run()
            break
          case 'unlink':
            if (editor.isActive('link')) chain = chain.extendMarkRange('link')
            chain.unsetLink().run()
            break
        }
      },

      setFontSize: (...args) => {
        const value = args[0]
        if (typeof value !== 'string') return
        const chain = commandChain()
        if (!chain) return
        if (value === 'default') chain.unsetFontSize().run()
        else chain.setFontSize(value).run()
      },

      setTextColor: (...args) => {
        const value = args[0]
        if (value !== null && typeof value !== 'string') return
        const chain = commandChain()
        if (!chain) return
        if (value === null) chain.unsetColor().run()
        else chain.setColor(value).run()
      },

      setHighlightColor: (...args) => {
        const value = args[0]
        if (value !== null && typeof value !== 'string') return
        const chain = commandChain()
        if (!chain) return
        if (value === null) chain.unsetHighlight().run()
        else chain.setHighlight({ color: value }).run()
      },

      setLink: (...args) => {
        const rawHref = args[0]
        if (typeof rawHref !== 'string') return
        const href = normalizeHref(rawHref)
        if (!href) return
        const editor = editorRef.current
        const selection = savedSelectionRef.current
        let chain = commandChain()
        if (!editor || editor.isDestroyed || !chain) return

        if (editor.isActive('link')) {
          chain.extendMarkRange('link').setLink({ href }).run()
          return
        }

        if (selection && selection.from === selection.to) {
          chain
            .insertContent({
              type: 'text',
              text: rawHref.trim(),
              marks: [{ type: 'link', attrs: { href } }]
            })
            .run()
          return
        }

        chain.setLink({ href }).run()
      },

      getSelectedText: async () => {
        const editor = editorRef.current
        if (!editor || editor.isDestroyed) return ''
        const selection = savedSelectionRef.current ?? {
          from: editor.state.selection.from,
          to: editor.state.selection.to
        }
        return editor.state.doc.textBetween(selection.from, selection.to, ' ').trim()
      },

      insertInternalLink: (...args) => {
        const linkHtml = args[0]
        if (typeof linkHtml !== 'string') return
        commandChain()?.insertContent(linkHtml).run()
      },

      focusEditor: async () => {
        commandChain()?.run()
      }
    }),
    [commandChain]
  )

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
      <div ref={mountRef} className="notes-editor-mount" />
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
  .notes-editor-mount { min-height: 64px; }
  .notes-editor {
    width: 100%;
    min-height: 64px;
    padding: 7px 2px 9px;
    outline: none;
    overflow-wrap: anywhere;
    caret-color: var(--accent);
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
  .notes-editor [data-study-internal-link="true"] {
    display: inline-flex;
    max-width: 100%;
    vertical-align: text-bottom;
    padding: 1px 5px;
    border-radius: 6px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-weight: 600;
  }
  .notes-editor .ProseMirror-selectednode[data-study-internal-link="true"] {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 1px;
  }
`
