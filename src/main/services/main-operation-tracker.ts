export class MainOperationTracker {
  private activeOperations = 0
  private acceptingNewOperations = true
  private readonly idleWaiters = new Set<() => void>()

  run<T>(operation: () => T | PromiseLike<T>): Promise<T> {
    if (!this.acceptingNewOperations) {
      return Promise.reject(new Error('Application is shutting down'))
    }

    this.activeOperations += 1

    return Promise.resolve()
      .then(operation)
      .finally(() => {
        this.activeOperations -= 1

        if (this.activeOperations === 0) {
          const waiters = [...this.idleWaiters]
          this.idleWaiters.clear()
          waiters.forEach((resolve) => resolve())
        }
      })
  }

  pauseNewOperations(): void {
    this.acceptingNewOperations = false
  }

  resumeNewOperations(): void {
    this.acceptingNewOperations = true
  }

  whenIdle(): Promise<void> {
    if (this.activeOperations === 0) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      this.idleWaiters.add(resolve)
    })
  }

  getActiveOperationCount(): number {
    return this.activeOperations
  }

  isAcceptingNewOperations(): boolean {
    return this.acceptingNewOperations
  }
}

export const mainOperationTracker = new MainOperationTracker()
