import { Extension } from '@tiptap/core'
import type { Node as DocumentNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { NOTE_PAGE_HEIGHT } from '../lib/note-appearance'

export const NOTE_PAGE_GAP = 32
export const NOTE_PAGINATION_LAYOUT_EVENT = 'note-pagination-layout'

interface PageBreak {
  position: number
  height: number
  targetTop: number
  inline: boolean
}

interface PaginationState {
  decorations: DecorationSet
  breaks: PageBreak[]
  signature: string
}

interface LayoutUnit {
  position: number
  top: number
  bottom: number
  anchorOffset: number
  caretOffset: number
  inline: boolean
  parentGap: number
}

const paginationKey = new PluginKey<PaginationState>('notePagination')

function createDecorations(document: DocumentNode, breaks: PageBreak[]): DecorationSet {
  return DecorationSet.create(
    document,
    breaks.map((pageBreak, index) =>
      Decoration.widget(
        pageBreak.position,
        () => {
          const spacer = window.document.createElement('span')
          spacer.className = 'note-page-break'
          spacer.style.height = `${pageBreak.height}px`
          spacer.setAttribute('aria-hidden', 'true')
          spacer.dataset.notePageBreak = String(index)
          return spacer
        },
        {
          key: `note-page-${pageBreak.position}-${pageBreak.height}`,
          side: -1,
          marks: [],
          ignoreSelection: true,
          relaxedSide: true
        }
      )
    )
  )
}

/** Use a wrapper's position when its first paragraph moves, so list markers
 * and task checkboxes move with the text rather than staying on the old sheet. */
function wrapperPosition(document: DocumentNode, position: number): number {
  const resolved = document.resolve(position)
  let wrapper = position
  for (let depth = resolved.depth; depth > 0; depth--) {
    if (wrapper !== resolved.start(depth)) break
    wrapper = resolved.before(depth)
  }
  return wrapper
}

function parentGap(element: Element): number {
  const parent = element.parentElement
  if (!parent) return 0
  const style = getComputedStyle(parent)
  return style.display === 'grid' ? parseFloat(style.rowGap) || 0 : 0
}

function textLines(view: EditorView, element: HTMLElement, origin: number): LayoutUnit[] {
  const lines: LayoutUnit[] = []
  const walker = window.document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = window.document.createRange()
  let text: globalThis.Node | null
  while ((text = walker.nextNode())) {
    if (!text.textContent || text.parentElement?.closest('.note-page-break')) continue
    const length = text.textContent.length
    range.selectNodeContents(text)
    const rectangles = Array.from(range.getClientRects())
    let previousOffset = 0
    for (const rectangle of rectangles) {
      if (!rectangle.height || !rectangle.width) continue
      // Locate the first character of each wrapped line with a binary search,
      // rather than measuring every character of long paragraphs.
      let low = previousOffset
      let high = length - 1
      while (low < high) {
        const middle = Math.floor((low + high) / 2)
        range.setStart(text, middle)
        range.setEnd(text, middle + 1)
        if (range.getBoundingClientRect().top < rectangle.top - 1) low = middle + 1
        else high = middle
      }
      previousOffset = low
      const lineHeight = parseFloat(getComputedStyle(text.parentElement ?? element).lineHeight)
      const leading = Math.max(0, (lineHeight || rectangle.height) - rectangle.height) / 2
      const top = rectangle.top - leading - origin
      const bottom = rectangle.bottom + leading - origin
      lines.push({
        position: view.posAtDOM(text, low),
        top,
        bottom,
        anchorOffset: 0,
        caretOffset: leading,
        inline: true,
        parentGap: 0
      })
    }
  }
  // Separate marked text nodes can each span several lines. Merge rectangles
  // in visual order, rather than treating every mark boundary as a new line.
  const merged: LayoutUnit[] = []
  for (const line of lines.sort(
    (left, right) => left.top - right.top || left.position - right.position
  )) {
    const previous = merged.at(-1)
    if (previous && line.top < previous.bottom - 1 && line.bottom > previous.top + 1) {
      const top = Math.min(previous.top, line.top)
      if (line.position < previous.position) {
        previous.position = line.position
        previous.caretOffset = line.top + line.caretOffset - top
      } else {
        previous.caretOffset += previous.top - top
      }
      previous.top = top
      previous.bottom = Math.max(previous.bottom, line.bottom)
    } else merged.push(line)
  }
  return merged
}

function collectUnits(view: EditorView, origin: number): LayoutUnit[] {
  const units: LayoutUnit[] = []
  view.state.doc.descendants((node, position) => {
    if (!node.isTextblock && !node.isAtom) return true
    const element = view.nodeDOM(position)
    if (!(element instanceof HTMLElement)) return false
    const rectangle = element.getBoundingClientRect()
    if (!rectangle.height) return false
    const lines = node.isTextblock ? textLines(view, element, origin) : []
    const anchor = wrapperPosition(view.state.doc, position)
    const wrapper = view.nodeDOM(anchor)
    const wrapperElement = wrapper instanceof HTMLElement ? wrapper : element
    if (lines.length) {
      lines[0].position = anchor
      lines[0].inline = false
      lines[0].anchorOffset = lines[0].top - (wrapperElement.getBoundingClientRect().top - origin)
      lines[0].parentGap = parentGap(wrapperElement)
      units.push(...lines)
    } else {
      units.push({
        position: anchor,
        top: rectangle.top - origin,
        bottom: rectangle.bottom - origin,
        anchorOffset: rectangle.top - wrapperElement.getBoundingClientRect().top,
        caretOffset: 0,
        inline: false,
        parentGap: parentGap(wrapperElement)
      })
    }
    return false
  })
  return units
}

export const NotePagination = Extension.create<{ onPageCountChange: (count: number) => void }>({
  name: 'notePagination',

  addOptions() {
    return { onPageCountChange: () => undefined }
  },

  addProseMirrorPlugins() {
    const onPageCountChange = this.options.onPageCountChange
    return [
      new Plugin<PaginationState>({
        key: paginationKey,
        state: {
          init: () => ({ decorations: DecorationSet.empty, breaks: [], signature: '' }),
          apply(transaction, previous) {
            const layout = transaction.getMeta(paginationKey) as
              Omit<PaginationState, 'decorations'> | undefined
            if (layout) {
              return { ...layout, decorations: createDecorations(transaction.doc, layout.breaks) }
            }
            return transaction.docChanged
              ? {
                  ...previous,
                  signature: '',
                  decorations: previous.decorations.map(transaction.mapping, transaction.doc)
                }
              : previous
          }
        },
        props: {
          decorations: (state) => paginationKey.getState(state)?.decorations
        },
        view(view) {
          let destroyed = false
          let frame = 0
          let correctionFrame = 0
          let revealSelection = false
          const observed = new Set<Element>()

          function schedule(): void {
            if (destroyed || frame) return
            frame = requestAnimationFrame(() => {
              frame = 0
              measure()
            })
          }

          const observer = new ResizeObserver(schedule)
          function observeContent(): void {
            const elements = new Set<Element>([view.dom, ...view.dom.children])
            for (const element of observed) {
              if (!elements.has(element)) {
                observer.unobserve(element)
                observed.delete(element)
              }
            }
            for (const element of elements) {
              if (!observed.has(element)) {
                observed.add(element)
                observer.observe(element)
              }
            }
          }

          function publish(breaks: PageBreak[], signature: string): void {
            view.dispatch(
              view.state.tr
                .setMeta(paginationKey, { breaks, signature })
                .setMeta('addToHistory', false)
            )
          }

          function finishLayout(): void {
            if (!revealSelection) return
            revealSelection = false
            if (view.hasFocus()) {
              view.dispatch(view.state.tr.scrollIntoView().setMeta('addToHistory', false))
            }
          }

          function correct(attempt: number): void {
            if (destroyed || view.composing) return
            if (
              view.dom.closest('[data-note-layout]')?.getAttribute('data-note-layout') === 'canvas'
            ) {
              finishLayout()
              return
            }
            const state = paginationKey.getState(view.state)
            if (!state?.signature) return
            if (!state.breaks.length) {
              finishLayout()
              return
            }
            const origin = view.dom.getBoundingClientRect().top
            let adjustment = 0
            let changed = false
            const breaks = state.breaks.map((pageBreak) => {
              const element = view.nodeDOM(pageBreak.position)
              const actualTop = pageBreak.inline
                ? view.coordsAtPos(pageBreak.position, 1).top - origin
                : element instanceof HTMLElement
                  ? element.getBoundingClientRect().top - origin
                  : pageBreak.targetTop
              const difference = pageBreak.targetTop - actualTop - adjustment
              if (Math.abs(difference) < 1) return pageBreak
              const height = Math.max(0, Math.round((pageBreak.height + difference) * 2) / 2)
              adjustment += height - pageBreak.height
              changed = true
              return { ...pageBreak, height }
            })
            if (changed) {
              publish(breaks, state.signature)
              if (attempt < 2) {
                correctionFrame = requestAnimationFrame(() => correct(attempt + 1))
                return
              }
            }
            finishLayout()
          }

          function measure(): void {
            if (destroyed || view.composing || !view.dom.getBoundingClientRect().width) return
            if (
              view.dom.closest('[data-note-layout]')?.getAttribute('data-note-layout') === 'canvas'
            ) {
              cancelAnimationFrame(correctionFrame)
              if (paginationKey.getState(view.state)?.signature !== 'canvas') {
                publish([], 'canvas')
                onPageCountChange(1)
              }
              finishLayout()
              return
            }
            const style = getComputedStyle(view.dom)
            const height = NOTE_PAGE_HEIGHT
            const inset = parseFloat(style.paddingTop) || 24
            const stride = height + NOTE_PAGE_GAP
            let units: LayoutUnit[]
            view.dom.classList.add('note-pagination-measuring')
            try {
              units = collectUnits(view, view.dom.getBoundingClientRect().top)
            } finally {
              view.dom.classList.remove('note-pagination-measuring')
            }
            let page = 0
            let shift = 0
            const breaks: PageBreak[] = []
            for (const unit of units) {
              if (unit.bottom + shift <= page * stride + height - inset + 0.5) continue
              page++
              const target = page * stride + inset + unit.anchorOffset
              const space = Math.max(0, target - unit.top - shift)
              shift += space
              breaks.push({
                position: unit.position,
                height: Math.max(0, Math.round((space - unit.parentGap) * 2) / 2),
                targetTop: unit.inline ? target + unit.caretOffset : target - unit.anchorOffset,
                inline: unit.inline
              })
            }
            const signature = JSON.stringify([height, inset, page, breaks])
            if (paginationKey.getState(view.state)?.signature === signature) return
            if (correctionFrame) cancelAnimationFrame(correctionFrame)
            publish(breaks, signature)
            onPageCountChange(page + 1)
            correctionFrame = requestAnimationFrame(() => correct(0))
          }

          const mutationObserver = new MutationObserver(schedule)
          mutationObserver.observe(view.dom, {
            childList: true,
            subtree: true,
            characterData: true
          })
          view.dom.addEventListener('load', schedule, true)
          view.dom.addEventListener('compositionend', schedule)
          view.dom.addEventListener(NOTE_PAGINATION_LAYOUT_EVENT, schedule)
          void window.document.fonts?.ready.then(() => schedule())
          observeContent()
          schedule()

          return {
            update(currentView, previousState) {
              if (currentView.state.doc !== previousState.doc) {
                revealSelection ||= currentView.hasFocus()
                observeContent()
                schedule()
              }
            },
            destroy() {
              destroyed = true
              cancelAnimationFrame(frame)
              cancelAnimationFrame(correctionFrame)
              observer.disconnect()
              mutationObserver.disconnect()
              view.dom.removeEventListener('load', schedule, true)
              view.dom.removeEventListener('compositionend', schedule)
              view.dom.removeEventListener(NOTE_PAGINATION_LAYOUT_EVENT, schedule)
            }
          }
        }
      })
    ]
  }
})
