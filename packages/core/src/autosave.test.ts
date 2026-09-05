import { describe, expect, it, vi } from 'vitest'
import { AutosaveQueue } from './autosave'

function deferred<T = void>(): {
  promise: Promise<T>
  resolve(value: T | PromiseLike<T>): void
  reject(reason?: unknown): void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('AutosaveQueue', () => {
  it('coalesces debounced snapshots and flushes the latest value', async () => {
    const saved: string[] = []
    const queue = new AutosaveQueue<string>(async (value) => {
      saved.push(value)
    }, { delayMs: 10_000 })

    queue.schedule('first')
    queue.schedule('latest')
    await queue.flush()

    expect(saved).toEqual(['latest'])
    expect(queue.hasPendingChanges()).toBe(false)
  })

  it('serializes a newer snapshot scheduled while a save is in progress', async () => {
    const first = deferred<void>()
    const saved: string[] = []
    const queue = new AutosaveQueue<string>(async (value) => {
      saved.push(value)
      if (value === 'first') await first.promise
    }, { delayMs: 10_000 })

    queue.schedule('first')
    const flushing = queue.flush()
    await Promise.resolve()
    queue.schedule('second')
    first.resolve()
    await flushing

    expect(saved).toEqual(['first', 'second'])
    expect(queue.hasPendingChanges()).toBe(false)
  })

  it('keeps a failed latest snapshot dirty so a later flush can retry it', async () => {
    let failures = 1
    const save = vi.fn(async () => {
      if (failures-- > 0) throw new Error('disk full')
    })
    const queue = new AutosaveQueue(save, { delayMs: 10_000 })

    queue.schedule('draft')
    await expect(queue.flush()).rejects.toThrow('disk full')
    expect(queue.hasPendingChanges()).toBe(true)

    await queue.flush()
    expect(save).toHaveBeenCalledTimes(2)
    expect(queue.hasPendingChanges()).toBe(false)
  })

  it('allows a newer full snapshot to supersede an older failed save', async () => {
    const first = deferred<void>()
    const errors: unknown[] = []
    const saved: string[] = []
    const queue = new AutosaveQueue<string>(
      async (value) => {
        saved.push(value)
        if (value === 'old') await first.promise
      },
      { delayMs: 10_000, onError: (error) => errors.push(error) }
    )

    queue.schedule('old')
    const flushing = queue.flush()
    await Promise.resolve()
    queue.schedule('new')
    first.reject(new Error('old failed'))
    await flushing

    expect(saved).toEqual(['old', 'new'])
    expect(errors).toHaveLength(1)
    expect(queue.hasPendingChanges()).toBe(false)
  })
})