export class StudyMaterialCoordinator {
  private readonly tails = new Map<string, Promise<void>>()

  run<T>(materialId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(materialId) ?? Promise.resolve()
    const result = previous.catch(() => undefined).then(operation)
    const tail = result.then(
      () => undefined,
      () => undefined
    )

    this.tails.set(materialId, tail)

    void tail.then(() => {
      if (this.tails.get(materialId) === tail) {
        this.tails.delete(materialId)
      }
    })

    return result
  }

  runForMany<T>(materialIds: readonly string[], operation: () => Promise<T>): Promise<T> {
    const uniqueIds = [...new Set(materialIds)].sort()

    const acquire = (index: number): Promise<T> => {
      const materialId = uniqueIds[index]

      if (!materialId) {
        return operation()
      }

      return this.run(materialId, () => acquire(index + 1))
    }

    return acquire(0)
  }
}

export const studyMaterialCoordinator = new StudyMaterialCoordinator()
