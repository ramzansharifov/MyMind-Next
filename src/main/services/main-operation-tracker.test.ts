import { describe, expect, it, vi } from 'vitest'

import { MainOperationTracker } from './main-operation-tracker'

interface Deferred<Value> {
  promise: Promise<Value>
  resolve(value: Value): void
  reject(reason: unknown): void
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: ((value: Value) => void) | undefined
  let rejectPromise: ((reason: unknown) => void) | undefined

  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  return {
    promise,
    resolve: (value) => {
      resolvePromise?.(value)
    },
    reject: (reason) => {
      rejectPromise?.(reason)
    }
  }
}

describe('MainOperationTracker', () => {
  it('waits until every active operation settles', async () => {
    const first = createDeferred<string>()
    const second = createDeferred<string>()
    const tracker = new MainOperationTracker()

    const firstResult = tracker.run(() => first.promise)
    const secondResult = tracker.run(() => second.promise)
    const idleListener = vi.fn()

    void tracker.whenIdle().then(idleListener)

    expect(tracker.getActiveOperationCount()).toBe(2)
    expect(idleListener).not.toHaveBeenCalled()

    first.resolve('first')
    await firstResult

    expect(tracker.getActiveOperationCount()).toBe(1)
    expect(idleListener).not.toHaveBeenCalled()

    second.resolve('second')
    await secondResult
    await tracker.whenIdle()

    expect(tracker.getActiveOperationCount()).toBe(0)
    expect(idleListener).toHaveBeenCalledOnce()
  })

  it('rejects new operations while shutdown draining is active', async () => {
    const tracker = new MainOperationTracker()
    const operation = vi.fn(() => 'result')

    tracker.pauseNewOperations()

    await expect(tracker.run(operation)).rejects.toThrow('Application is shutting down')
    expect(operation).not.toHaveBeenCalled()
  })

  it('accepts operations again after shutdown is cancelled', async () => {
    const tracker = new MainOperationTracker()

    tracker.pauseNewOperations()
    tracker.resumeNewOperations()

    await expect(tracker.run(() => 'result')).resolves.toBe('result')
    expect(tracker.isAcceptingNewOperations()).toBe(true)
  })
})
