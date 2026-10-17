let active = false
const listeners = new Set<() => void>()
export const syncActivity = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  snapshot: (): boolean => active,
  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (active) throw new Error('Операция профиля или синхронизации уже выполняется')
    active = true
    listeners.forEach((listener) => listener())
    try {
      return await operation()
    } finally {
      active = false
      listeners.forEach((listener) => listener())
    }
  }
}
