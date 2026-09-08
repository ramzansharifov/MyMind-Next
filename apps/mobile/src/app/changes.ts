const listeners = new Set<() => void>()
export function notifyDataChanged(): void {
  for (const listener of listeners) listener()
}
export function subscribeDataChanges(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
