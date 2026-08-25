from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding='utf-8')


def replace_once(value: str, old: str, new: str, label: str) -> str:
    count = value.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return value.replace(old, new, 1)


path = 'src/shared/validation/nutrition.ts'
value = read(path)
value = replace_once(
    value,
    'const targetSchema = (maximum: number) =>\n',
    'const targetSchema = (maximum: number): z.ZodNullable<z.ZodNumber> =>\n',
    'target schema return type',
)
write(path, value)

path = 'src/main/repositories/nutrition.repository.test.ts'
value = read(path)
value = replace_once(
    value,
    'function createChicken() {\n',
    'function createChicken(): ReturnType<typeof createNutritionFood> {\n',
    'repository test helper return type',
)
write(path, value)

path = 'src/renderer/src/modules/nutrition/NutritionPage.tsx'
value = read(path)
value = replace_once(
    value,
    """  useEffect(() => {
    setIsLoading(true)
    void loadOverview()
  }, [loadOverview])
""",
    """  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsLoading(true)
      void loadOverview()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadOverview])
""",
    'overview loading effect',
)
value = replace_once(
    value,
    """  useEffect(() => {
    if (!overview || !resourceId || handledResourceRef.current === resourceId) return

    handledResourceRef.current = resourceId
    const entry = overview.entries.find((candidate) => candidate.id === resourceId)
    if (entry) {
      setTab('diary')
      setEditingLog(entry)
      setInitialMeal(entry.mealType)
      setLogDialogOpen(true)
    }
    onResourceHandled?.()
  }, [onResourceHandled, overview, resourceId])

  const foods = overview?.foods ?? []
  const recipes = overview?.recipes ?? []
""",
    """  useEffect(() => {
    if (!overview || !resourceId || handledResourceRef.current === resourceId) return

    const timerId = window.setTimeout(() => {
      if (handledResourceRef.current === resourceId) return
      handledResourceRef.current = resourceId
      const entry = overview.entries.find((candidate) => candidate.id === resourceId)
      if (entry) {
        setTab('diary')
        setEditingLog(entry)
        setInitialMeal(entry.mealType)
        setLogDialogOpen(true)
      }
      onResourceHandled?.()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [onResourceHandled, overview, resourceId])

  const foods = useMemo(() => overview?.foods ?? [], [overview])
  const recipes = useMemo(() => overview?.recipes ?? [], [overview])
""",
    'resource effect and stable catalog arrays',
)
write(path, value)

print('Applied Nutrition lint and hook-quality fixes')
