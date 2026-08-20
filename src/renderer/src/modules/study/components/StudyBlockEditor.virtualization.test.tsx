import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

const intersectionCallbacks = new Map<Element, IntersectionObserverCallback>()

class MockIntersectionObserver {
  readonly root = null
  readonly rootMargin = '0px'
  readonly thresholds = [0]
  private readonly targets = new Set<Element>()

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.targets.add(target)
    intersectionCallbacks.set(target, this.callback)
  }

  unobserve(target: Element): void {
    this.targets.delete(target)
    intersectionCallbacks.delete(target)
  }

  disconnect(): void {
    this.targets.forEach((target) => intersectionCallbacks.delete(target))
    this.targets.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

afterEach(() => {
  intersectionCallbacks.clear()
  vi.unstubAllGlobals()
})

describe('StudyBlockEditor virtualization', () => {
  it('keeps distant blocks as lightweight placeholders and mounts them before they enter view', async () => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    const document: StudyDocument = {
      version: 1,
      blocks: Array.from({ length: 20 }, (_, index) => ({
        id: `heading-${index + 1}`,
        type: 'heading' as const,
        text: `Заголовок ${index + 1}`,
        level: 1 as const
      }))
    }

    const { container } = render(
      <StudyBlockEditor
        materialId="large-material"
        document={document}
        mode="edit"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('Заголовок 1')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Заголовок 20')).not.toBeInTheDocument()

    const distantBlock = container.querySelector<HTMLElement>('[data-study-block-id="heading-20"]')

    expect(distantBlock).toHaveAttribute('data-study-block-viewport', 'placeholder')
    expect(distantBlock?.querySelector('[data-study-block-placeholder]')).toBeInTheDocument()
    expect(distantBlock?.style.height).not.toBe('')

    const callback = distantBlock ? intersectionCallbacks.get(distantBlock) : undefined
    expect(callback).toBeDefined()

    act(() => {
      callback?.(
        [
          {
            target: distantBlock!,
            isIntersecting: true,
            intersectionRatio: 1,
            time: 0,
            boundingClientRect: distantBlock!.getBoundingClientRect(),
            intersectionRect: distantBlock!.getBoundingClientRect(),
            rootBounds: null
          } as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      )
    })

    await waitFor(() => expect(screen.getByDisplayValue('Заголовок 20')).toBeInTheDocument())
    expect(distantBlock).toHaveAttribute('data-study-block-viewport', 'mounted')
  })
})
