import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

class ResizeObserverMock implements ResizeObserver {
  observe(): void {
    // jsdom не выполняет реальную раскладку элементов.
  }

  unobserve(): void {
    // Наблюдение в тестовой среде намеренно отключено.
  }

  disconnect(): void {
    // Ресурсы для освобождения отсутствуют.
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverMock
})

Object.defineProperty(globalThis, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    }) as MediaQueryList
})

afterEach(() => {
  cleanup()
})
