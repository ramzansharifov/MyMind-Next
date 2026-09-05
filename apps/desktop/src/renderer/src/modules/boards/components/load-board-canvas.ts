export async function loadBoardCanvas(): Promise<{
  default: (typeof import('./BoardCanvas'))['BoardCanvas']
}> {
  const { BoardCanvas } = await import('./BoardCanvas')

  return {
    default: BoardCanvas
  }
}
