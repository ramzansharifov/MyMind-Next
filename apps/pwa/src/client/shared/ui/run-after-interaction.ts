/** Let the current pointer/click finish before opening a sheet or changing focus. */
export function runAfterInteraction(callback: () => void): void {
  setTimeout(callback, 0)
}
