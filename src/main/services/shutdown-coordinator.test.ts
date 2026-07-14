import { describe, expect, it, vi, type Mock } from 'vitest'

import {
  ShutdownCoordinator,
  type ShutdownCoordinatorOptions,
  type ShutdownTarget
} from './shutdown-coordinator'

interface Deferred<Value> {
  promise: Promise<Value>
  resolve(value: Value): void
}

interface ScheduledTask {
  callback(): void
  cancelled: boolean
}

function createDeferred<Value>(): Deferred<Value> {
  let resolvePromise: ((value: Value) => void) | undefined

  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: (value) => {
      resolvePromise?.(value)
    }
  }
}

function createManualScheduler(): {
  schedule: NonNullable<ShutdownCoordinatorOptions['scheduleTimeout']>
  runNext(): void
  pendingCount(): number
} {
  const tasks: ScheduledTask[] = []

  return {
    schedule: (callback) => {
      const task: ScheduledTask = {
        callback,
        cancelled: false
      }

      tasks.push(task)

      return () => {
        task.cancelled = true
      }
    },
    runNext: () => {
      const task = tasks.find((candidate) => !candidate.cancelled)

      if (!task) {
        throw new Error('No scheduled timeout is available')
      }

      task.cancelled = true
      task.callback()
    },
    pendingCount: () => tasks.filter((task) => !task.cancelled).length
  }
}

function createTarget(): {
  target: ShutdownTarget
  sendRequest: Mock<(requestId: string) => void>
  close: Mock<() => void>
  setAvailable(value: boolean): void
} {
  let available = true
  const sendRequest = vi.fn<(requestId: string) => void>()
  const close = vi.fn<() => void>()

  return {
    target: {
      sendRequest,
      close,
      isAvailable: () => available
    },
    sendRequest,
    close,
    setAvailable: (value) => {
      available = value
    }
  }
}

async function flushPromises(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('ShutdownCoordinator', () => {
  it('waits for renderer flush and every active main operation before closing', async () => {
    const scheduler = createManualScheduler()
    const activeOperations = createDeferred<void>()
    const closeResources = vi.fn()
    const pauseOperations = vi.fn()
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources,
      pauseOperations,
      resumeOperations: vi.fn(),
      waitForOperations: () => activeOperations.promise,
      resolveFallback: async () => 'cancel',
      scheduleTimeout: scheduler.schedule
    })

    coordinator.requestShutdown(target.target)

    const requestId = target.sendRequest.mock.calls[0][0]
    const responsePromise = coordinator.respond({
      requestId,
      decision: 'success'
    })

    expect(pauseOperations).toHaveBeenCalledOnce()
    expect(closeResources).not.toHaveBeenCalled()
    expect(target.close).not.toHaveBeenCalled()

    activeOperations.resolve()
    await responsePromise

    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
    expect(coordinator.isApproved()).toBe(true)
  })

  it('shows fallback after a renderer timeout and can continue waiting', async () => {
    const scheduler = createManualScheduler()
    const resolveFallback = vi.fn(async () => 'retry' as const)
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources: vi.fn(),
      pauseOperations: vi.fn(),
      resumeOperations: vi.fn(),
      waitForOperations: () => Promise.resolve(),
      resolveFallback,
      scheduleTimeout: scheduler.schedule
    })

    coordinator.requestShutdown(target.target)
    const requestId = target.sendRequest.mock.calls[0][0]

    scheduler.runNext()
    await flushPromises()

    expect(resolveFallback).toHaveBeenCalledWith({
      reason: 'renderer-timeout',
      canRetry: true
    })
    expect(scheduler.pendingCount()).toBe(1)

    await coordinator.respond({
      requestId,
      decision: 'cancel'
    })

    expect(coordinator.isPending()).toBe(false)
  })

  it('uses native fallback when the renderer becomes unavailable', async () => {
    const scheduler = createManualScheduler()
    const closeResources = vi.fn()
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources,
      pauseOperations: vi.fn(),
      resumeOperations: vi.fn(),
      waitForOperations: () => Promise.resolve(),
      resolveFallback: async ({ reason, canRetry }) => {
        expect(reason).toBe('renderer-gone')
        expect(canRetry).toBe(false)
        return 'force'
      },
      scheduleTimeout: scheduler.schedule
    })

    coordinator.requestShutdown(target.target)
    target.setAvailable(false)
    coordinator.notifyRendererUnavailable('renderer-gone')

    await flushPromises()

    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
  })

  it('can cancel shutdown when active operations exceed the drain timeout', async () => {
    const scheduler = createManualScheduler()
    const activeOperations = createDeferred<void>()
    const resumeOperations = vi.fn()
    const closeResources = vi.fn()
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources,
      pauseOperations: vi.fn(),
      resumeOperations,
      waitForOperations: () => activeOperations.promise,
      resolveFallback: async ({ reason }) => {
        expect(reason).toBe('operations-timeout')
        return 'cancel'
      },
      scheduleTimeout: scheduler.schedule
    })

    coordinator.requestShutdown(target.target)
    const requestId = target.sendRequest.mock.calls[0][0]

    const responsePromise = coordinator.respond({
      requestId,
      decision: 'success'
    })

    scheduler.runNext()
    await responsePromise

    expect(resumeOperations).toHaveBeenCalledOnce()
    expect(closeResources).not.toHaveBeenCalled()
    expect(target.close).not.toHaveBeenCalled()
    expect(coordinator.isPending()).toBe(false)
  })

  it('keeps a failed renderer request open for retry or explicit force close', async () => {
    const scheduler = createManualScheduler()
    const closeResources = vi.fn()
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources,
      pauseOperations: vi.fn(),
      resumeOperations: vi.fn(),
      waitForOperations: () => Promise.resolve(),
      resolveFallback: async () => 'cancel',
      scheduleTimeout: scheduler.schedule
    })

    coordinator.requestShutdown(target.target)
    const requestId = target.sendRequest.mock.calls[0][0]

    await coordinator.respond({
      requestId,
      decision: 'failed'
    })

    expect(coordinator.isPending()).toBe(true)
    expect(closeResources).not.toHaveBeenCalled()

    await coordinator.respond({
      requestId,
      decision: 'force'
    })

    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
  })

  it('drains operations before quitting when no renderer window exists', async () => {
    const scheduler = createManualScheduler()
    const activeOperations = createDeferred<void>()
    const closeResources = vi.fn()
    const target = createTarget()

    const coordinator = new ShutdownCoordinator({
      closeResources,
      pauseOperations: vi.fn(),
      resumeOperations: vi.fn(),
      waitForOperations: () => activeOperations.promise,
      resolveFallback: async () => 'cancel',
      scheduleTimeout: scheduler.schedule
    })

    const shutdownPromise = coordinator.requestShutdownWithoutRenderer(target.target)

    expect(closeResources).not.toHaveBeenCalled()

    activeOperations.resolve()
    await shutdownPromise

    expect(closeResources).toHaveBeenCalledOnce()
    expect(target.close).toHaveBeenCalledOnce()
  })
})
