import { describe, expect, it } from 'vitest'
import type { BoardSnapshot } from '@mymind/contracts/boards'
import { BoardSaveQueue, type BoardSaveState } from './board-save-queue'

function deferred(): {
  promise: Promise<void>
  resolve: () => void
  reject: (reason?: unknown) => void
} {
  let resolve!: () => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function snapshot(value: number): BoardSnapshot {
  return { value }
}

describe('BoardSaveQueue', () => {
  it('serializes saves and persists the newest snapshot after an in-flight save', async () => {
    const first = deferred()
    const saved: BoardSnapshot[] = []
    let calls = 0
    const queue = new BoardSaveQueue(
      async (next) => {
        calls += 1
        if (calls === 1) await first.promise
        saved.push(next)
      },
      () => undefined
    )

    queue.update(snapshot(1))
    const saving = queue.saveLatest()
    queue.update(snapshot(2))
    first.resolve()
    await saving

    expect(saved).toEqual([snapshot(1), snapshot(2)])
    expect(queue.hasUnsavedChanges()).toBe(false)
  })

  it('keeps the newest snapshot dirty when a save fails and can retry it', async () => {
    const saved: BoardSnapshot[] = []
    let fail = true
    const states: BoardSaveState[] = []
    const queue = new BoardSaveQueue(
      async (next) => {
        if (fail) throw new Error('offline')
        saved.push(next)
      },
      (state) => states.push(state)
    )

    queue.update(snapshot(7))
    await expect(queue.flush()).rejects.toThrow('offline')
    expect(queue.hasUnsavedChanges()).toBe(true)
    expect(states.at(-1)).toBe('error')

    fail = false
    await queue.flush()
    expect(saved).toEqual([snapshot(7)])
    expect(queue.hasUnsavedChanges()).toBe(false)
    expect(states.at(-1)).toBe('saved')
  })

  it('does not accept new snapshots after disposal', async () => {
    const saved: BoardSnapshot[] = []
    const queue = new BoardSaveQueue(
      async (next) => {
        saved.push(next)
      },
      () => undefined
    )
    queue.dispose()
    queue.update(snapshot(1))
    await queue.flush()
    expect(saved).toEqual([])
  })
})
