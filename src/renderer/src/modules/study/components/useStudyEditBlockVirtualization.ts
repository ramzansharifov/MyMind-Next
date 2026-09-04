import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { StudyBlock } from '../../../../../shared/contracts/study'

export const STUDY_EDIT_VIRTUALIZATION_THRESHOLD = 16
export const STUDY_EDIT_INITIAL_RENDER_COUNT = 6
export const STUDY_EDIT_VIRTUALIZATION_OVERSCAN_PX = 1600

interface StudyEditBlockVirtualizationInput {
  block: StudyBlock
  index: number
  enabled: boolean
  pinned: boolean
}

export function shouldVirtualizeStudyEditBlocks(
  blockCount: number,
  intersectionObserverAvailable = typeof IntersectionObserver !== 'undefined'
): boolean {
  return intersectionObserverAvailable && blockCount >= STUDY_EDIT_VIRTUALIZATION_THRESHOLD
}

export function useStudyEditBlockVirtualization({
  block,
  index,
  enabled,
  pinned
}: StudyEditBlockVirtualizationInput) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [nearViewport, setNearViewport] = useState(
    () => !enabled || index < STUDY_EDIT_INITIAL_RENDER_COUNT
  )
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true)
      return undefined
    }

    const node = containerRef.current

    if (!node) {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (entry) {
          setNearViewport(entry.isIntersecting)
        }
      },
      {
        root: findStudyEditScrollRoot(node),
        rootMargin: `${STUDY_EDIT_VIRTUALIZATION_OVERSCAN_PX}px 0px`,
        threshold: 0
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [enabled])

  const shouldRenderContent = !enabled || pinned || nearViewport

  useLayoutEffect(() => {
    if (!enabled || !shouldRenderContent) {
      return undefined
    }

    const node = contentRef.current

    if (!node) {
      return undefined
    }

    const measuredNode = node

    function measure(): void {
      const nextHeight = Math.ceil(measuredNode.getBoundingClientRect().height)

      if (nextHeight <= 0) {
        return
      }

      setMeasuredHeight((currentHeight) => {
        if (currentHeight !== null && Math.abs(currentHeight - nextHeight) <= 1) {
          return currentHeight
        }

        return nextHeight
      })
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      return undefined
    }

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(measuredNode)

    return () => resizeObserver.disconnect()
  }, [block.id, enabled, shouldRenderContent])

  return {
    containerRef,
    contentRef,
    shouldRenderContent,
    placeholderHeight: measuredHeight ?? estimateStudyEditBlockHeight(block)
  }
}

export function estimateStudyEditBlockHeight(block: StudyBlock): number {
  switch (block.type) {
    case 'text': {
      const explicitLines = Math.max(1, block.text.split(/\r?\n/).length)
      const wrappedLines = Math.max(1, Math.ceil(block.text.length / 78))
      const visualLines = Math.max(explicitLines, wrappedLines)
      return clamp(104 + visualLines * 25, 132, 2200)
    }
    case 'heading':
      return block.level === 1 ? 156 : block.level === 2 ? 132 : 116
    case 'code': {
      const lines = Math.max(3, block.source.split(/\r?\n/).length)
      return clamp(92 + lines * 23, 168, 690)
    }
    case 'markdown': {
      const lines = Math.max(4, block.source.split(/\r?\n/).length)
      return clamp(120 + lines * 22, 210, 1500)
    }
    case 'latex': {
      const lines = Math.max(2, block.source.split(/\r?\n/).length)
      return clamp(160 + lines * 20, 220, 900)
    }
    case 'mermaid':
      return 420
    case 'image':
    case 'video':
      return 420
    case 'audio':
      return 150
    case 'file':
      return 130
    case 'divider':
      return 88
    case 'board':
      return 460
  }
}

function findStudyEditScrollRoot(node: HTMLElement): Element | null {
  const declaredRoot = node.closest<HTMLElement>('[data-study-scroll-container]')

  if (declaredRoot) {
    return declaredRoot
  }

  let parent = node.parentElement

  while (parent) {
    const overflowY = window.getComputedStyle(parent).overflowY

    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return parent
    }

    parent = parent.parentElement
  }

  return null
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}
