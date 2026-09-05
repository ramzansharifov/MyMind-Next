import { describe, expect, it } from 'vitest'

import { StudyMaterialCoordinator } from './study-material-coordinator'

describe('StudyMaterialCoordinator', () => {
  it('serializes operations for the same material', async () => {
    const coordinator = new StudyMaterialCoordinator()
    const events: string[] = []
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const first = coordinator.run('material-1', async () => {
      events.push('first:start')
      await firstGate
      events.push('first:end')
    })
    const second = coordinator.run('material-1', async () => {
      events.push('second:start')
      events.push('second:end')
    })

    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(events).toEqual(['first:start'])

    releaseFirst?.()
    await Promise.all([first, second])

    expect(events).toEqual(['first:start', 'first:end', 'second:start', 'second:end'])
  })

  it('does not block different materials', async () => {
    const coordinator = new StudyMaterialCoordinator()
    let releaseFirst: (() => void) | undefined
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    let secondCompleted = false

    const first = coordinator.run('material-1', () => firstGate)
    const second = coordinator.run('material-2', async () => {
      secondCompleted = true
    })

    await second
    expect(secondCompleted).toBe(true)

    releaseFirst?.()
    await first
  })

  it('continues after a failed operation', async () => {
    const coordinator = new StudyMaterialCoordinator()

    const failed = coordinator.run('material-1', async () => {
      throw new Error('save failed')
    })
    const recovered = coordinator.run('material-1', async () => 'saved')

    await expect(failed).rejects.toThrow('save failed')
    await expect(recovered).resolves.toBe('saved')
  })
})
