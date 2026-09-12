'use dom'

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

function safeCommandState(command: string): boolean {
  try {
    return document.queryCommandState(command)
  } catch {
    return false
  }
}

function closestElement(selection: Selection | null): HTMLElement | null {
  const node = selection?.anchorNode
  if (!node) return null
  return (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement | null
}

function ancestor(element: HTMLElement | null, selector: string): HTMLElement | null {
  return element?.closest(selector) as HTMLElement | null
}

function formattingState(): NotesRichTextFormattingState {
  const selection = window.getSelection()
  const element = closestElement(selection)
  const paragraph = ancestor(element, 'p,div,li,blockquote')
  const textStyle = ancestor(element, 'span[style],font[style],font[color]')
  const highlight = ancestor(element, 'mark')
  const code = ancestor(element, 'code')
  const link = ancestor(element, 'a')
  const blockquote = ancestor(element, 'blockquote')
  const bulletList = ancestor(element, 'ul')
  const orderedList = ancestor(element, 'ol')
  const computed = element ? getComputedStyle(element) : null
  const alignment = (paragraph ? getComputedStyle(paragraph).textAlign : '') as string
  const mappedAlignment: NotesRichTextAlignment =
    alignment === 'center' || alignment === 'right' || alignment === 'justify' ? alignment : 'left'

  return {
    bold:
      safeCommandState('bold') ||
      Boolean(computed && Number.parseInt(computed.fontWeight, 10) >= 600),
    italic: safeCommandState('italic') || computed?.fontStyle === 'italic',
    underline:
      safeCommandState('underline') || Boolean(computed?.textDecorationLine.includes('underline')),
    strike:
      safeCommandState('strikeThrough') ||
      Boolean(computed?.textDecorationLine.includes('line-through')),
    code: Boolean(code),
    blockquote: Boolean(blockquote),
    bulletList: Boolean(bulletList),
    orderedList: Boolean(orderedList),
    alignment: mappedAlignment,
    linkActive: Boolean(link),
    href: link instanceof HTMLAnchorElement ? link.href : '',
    fontSize: textStyle?.style.fontSize || 'default',
    color: textStyle?.style.color || textStyle?.getAttribute('color') || '',
    backgroundColor:
      highlight?.style.backgroundColor || highlight?.getAttribute('data-color') || '',
    canUndo: document.queryCommandEnabled('undo'),
    canRedo: document.queryCommandEnabled('redo')
  }
}

function sanitizeHref(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value
  if (/^[\w.-]+\.[a-z]{2,}(?:[/#?].*)?$/i.test(value)) return `https://${value}`
  return null
}

function isSelectionInside(root: HTMLElement, selection: Selection | null): boolean {
  const node = selection?.anchorNode
  return Boolean(node && (node === root || root.contains(node)))
}

function restoreRange(root: HTMLElement, range: Range | null): void {
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  if (range && root.contains(range.commonAncestorContainer)) {
    selection.addRange(range)
    return
  }
  const fallback = document.createRange()
  fallback.selectNodeContents(root)
  fallback.collapse(false)
  selection.addRange(fallback)
}

function selectedHtmlWrap(tag: string): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (range.collapsed) return

  const parent = closestElement(selection)
  const existing = ancestor(parent, tag)
  if (existing) {
    const fragment = document.createDocumentFragment()
    while (existing.firstChild) fragment.appendChild(existing.firstChild)
    existing.replaceWith(fragment)
    return
  }

  const wrapper = document.createElement(tag)
  try {
    range.surroundContents(wrapper)
  } catch {
    const fragment = range.extractContents()
    wrapper.appendChild(fragment)
    range.insertNode(wrapper)
  }
  selection.removeAllRanges()
  const next = document.createRange()
  next.selectNodeContents(wrapper)
  selection.addRange(next)
}

function normalizeLegacyFonts(): void {
  document.querySelectorAll<HTMLFontElement>('font').forEach((font) => {
    const span = document.createElement('span')
    const color = font.getAttribute('color')
    const size = font.getAttribute('data-mymind-font-size')
    if (color) span.style.color = color
    if (size) span.style.fontSize = size
    while (font.firstChild) span.appendChild(font.firstChild)
    font.replaceWith(span)
  })
}

function applyFontSize(fontSize: string): void {
  const nextSize = fontSize === 'default' ? '1rem' : fontSize
  document.execCommand('fontSize', false, '7')
  document.querySelectorAll<HTMLFontElement>('font[size="7"]').forEach((font) => {
    font.removeAttribute('size')
    font.setAttribute('data-mymind-font-size', nextSize)
  })
  normalizeLegacyFonts()
}

function selectionHtml(html: string): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const holder = document.createElement('template')
  holder.innerHTML = html
  const fragment = holder.content
  const last = fragment.lastChild
  range.insertNode(fragment)
  if (last) {
    const next = document.createRange()
    next.setStartAfter(last)
    next.collapse(true)
    selection.removeAllRanges()
    selection.addRange(next)
  }
}

function applyHighlight(color: string | null): void {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  const current = ancestor(closestElement(selection), 'mark')

  if (!color) {
    if (!current) return
    const fragment = document.createDocumentFragment()
    while (current.firstChild) fragment.appendChild(current.firstChild)
    current.replaceWith(fragment)
    return
  }

  if (current) {
    current.setAttribute('data-color', color)
    current.style.backgroundColor = color
    return
  }

  if (range.collapsed) return
  const mark = document.createElement('mark')
  mark.setAttribute('data-color', color)
  mark.style.backgroundColor = color
  try {
    range.surroundContents(mark)
  } catch {
    const fragment = range.extractContents()
    mark.appendChild(fragment)
    range.insertNode(mark)
  }
  const next = document.createRange()
  next.selectNodeContents(mark)
  selection.removeAllRanges()
  selection.addRange(next)
}

export default function NotesRichTextDom({
  ref,
  html,
  plainText,
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const savedRangeRef = useRef<Range | null>(null)
  const lastEmittedHtmlRef = useRef<string | null>(null)
  const emitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rememberSelection = useCallback(() => {
    const root = editorRef.current
    const selection = window.getSelection()
    if (!root || !selection || selection.rangeCount === 0 || !isSelectionInside(root, selection)) {
      return
    }
    savedRangeRef.current = selection.getRangeAt(0).cloneRange()
    void onFormattingState(formattingState())
  }, [onFormattingState])

  const emit = useCallback(() => {
    const root = editorRef.current
    if (!root) return
    const nextHtml = root.innerHTML || '<p></p>'
    const nextText = root.innerText.replace(/\u00a0/g, ' ')
    lastEmittedHtmlRef.current = nextHtml
    void onChange(nextHtml, nextText)
    void onFormattingState(formattingState())
  }, [onChange, onFormattingState])

  const scheduleEmit = useCallback(() => {
    if (emitTimerRef.current) clearTimeout(emitTimerRef.current)
    emitTimerRef.current = setTimeout(() => {
      emitTimerRef.current = null
      emit()
    }, 0)
  }, [emit])

  const run = useCallback(
    (operation: () => void) => {
      const root = editorRef.current
      if (!root) return
      root.focus()
      restoreRange(root, savedRangeRef.current)
      operation()
      rememberSelection()
      scheduleEmit()
    },
    [rememberSelection, scheduleEmit]
  )

  useDOMImperativeHandle(
    ref,
    () => ({
      command: (...args) => {
        const command = args[0]
        if (typeof command !== 'string') return
        run(() => {
          switch (command) {
            case 'bold':
              document.execCommand('bold')
              break
            case 'italic':
              document.execCommand('italic')
              break
            case 'underline':
              document.execCommand('underline')
              break
            case 'strike':
              document.execCommand('strikeThrough')
              break
            case 'code':
              selectedHtmlWrap('code')
              break
            case 'blockquote': {
              const active = Boolean(ancestor(closestElement(window.getSelection()), 'blockquote'))
              document.execCommand('formatBlock', false, active ? 'p' : 'blockquote')
              break
            }
            case 'bulletList':
              document.execCommand('insertUnorderedList')
              break
            case 'orderedList':
              document.execCommand('insertOrderedList')
              break
            case 'indent':
              document.execCommand('indent')
              break
            case 'outdent':
              document.execCommand('outdent')
              break
            case 'alignLeft':
              document.execCommand('justifyLeft')
              break
            case 'alignCenter':
              document.execCommand('justifyCenter')
              break
            case 'alignRight':
              document.execCommand('justifyRight')
              break
            case 'alignJustify':
              document.execCommand('justifyFull')
              break
            case 'undo':
              document.execCommand('undo')
              break
            case 'redo':
              document.execCommand('redo')
              break
            case 'clearFormatting':
              document.execCommand('removeFormat')
              document.execCommand('formatBlock', false, 'p')
              document.execCommand('justifyLeft')
              break
            case 'unlink':
              document.execCommand('unlink')
              break
          }
        })
      },
      setFontSize: (...args) => {
        const fontSize = args[0]
        if (typeof fontSize !== 'string') return
        run(() => applyFontSize(fontSize))
      },
      setTextColor: (...args) => {
        const value = args[0]
        if (value !== null && typeof value !== 'string') return
        run(() => {
          const root = editorRef.current
          if (!root) return
          const nextColor = value || getComputedStyle(root).color
          document.execCommand('foreColor', false, nextColor)
          normalizeLegacyFonts()
        })
      },
      setHighlightColor: (...args) => {
        const value = args[0]
        if (value !== null && typeof value !== 'string') return
        run(() => applyHighlight(value))
      },
      setLink: (...args) => {
        const rawHref = args[0]
        if (typeof rawHref !== 'string') return
        const href = sanitizeHref(rawHref)
        if (!href) return
        run(() => {
          const selection = window.getSelection()
          if (!selection || selection.rangeCount === 0) return
          if (selection.getRangeAt(0).collapsed) {
            selectionHtml(
              `<a href="${href.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" target="_blank" rel="noopener noreferrer">${rawHref.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a>`
            )
          } else {
            document.execCommand('createLink', false, href)
            document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
              link.target = '_blank'
              link.rel = 'noopener noreferrer'
            })
          }
        })
      },
      getSelectedText: async () => {
        const root = editorRef.current
        if (!root) return ''
        root.focus()
        restoreRange(root, savedRangeRef.current)
        return window.getSelection()?.toString() ?? ''
      },
      insertInternalLink: (...args) => {
        const linkHtml = args[0]
        if (typeof linkHtml !== 'string') return
        run(() => selectionHtml(linkHtml))
      },
      focusEditor: async () => {
        editorRef.current?.focus()
        if (editorRef.current) restoreRange(editorRef.current, savedRangeRef.current)
      }
    }),
    [rememberSelection, run, scheduleEmit]
  )

  useEffect(() => {
    const root = editorRef.current
    if (!root) return
    if (html === lastEmittedHtmlRef.current) return
    const nextHtml = html || '<p></p>'
    if (root.innerHTML !== nextHtml) root.innerHTML = nextHtml
  }, [html])

  useEffect(() => {
    const root = editorRef.current
    if (!root) return undefined

    const selectionListener = (): void => rememberSelection()
    document.addEventListener('selectionchange', selectionListener)

    const observer = new ResizeObserver(() => {
      const height = Math.max(64, Math.ceil(root.scrollHeight + 20))
      void onHeightChange(height)
    })
    observer.observe(root)
    void onHeightChange(Math.max(64, Math.ceil(root.scrollHeight + 20)))

    return () => {
      document.removeEventListener('selectionchange', selectionListener)
      observer.disconnect()
      if (emitTimerRef.current) clearTimeout(emitTimerRef.current)
    }
  }, [onHeightChange, rememberSelection])

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
      <div
        ref={editorRef}
        className="notes-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Текстовый блок"
        data-placeholder={plainText.trim() ? '' : 'Начните писать…'}
        onFocus={() => {
          rememberSelection()
          void onFocusEditor()
        }}
        onInput={() => {
          rememberSelection()
          scheduleEmit()
        }}
        onKeyUp={rememberSelection}
        onMouseUp={rememberSelection}
      />
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
  }
  .notes-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--muted);
    pointer-events: none;
  }
  .notes-editor p { margin: 0 0 0.72em; }
  .notes-editor p:last-child { margin-bottom: 0; }
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
    display: inline;
    padding: 1px 4px;
    border-radius: 5px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    font-weight: 600;
  }
`
