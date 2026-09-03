from pathlib import Path
import json


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one occurrence, found {count}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


options_path = 'src/renderer/src/modules/workouts/workout-options.tsx'
replace_once(
    options_path,
    "export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'\n",
    "export type WorkoutMuscleFamily = 'arms' | 'back' | 'chest' | 'abs' | 'legs'\nexport type WorkoutExerciseCategory = 'arms' | 'back' | 'legs' | 'core'\n",
)
replace_once(
    options_path,
    """export const WORKOUT_MUSCLE_FAMILY_OPTIONS: Array<{
  value: WorkoutMuscleFamily
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'chest', label: 'Грудные мышцы' },
  { value: 'abs', label: 'Пресс' },
  { value: 'legs', label: 'Ноги' }
]
""",
    """export const WORKOUT_MUSCLE_FAMILY_OPTIONS: Array<{
  value: WorkoutMuscleFamily
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'chest', label: 'Грудные мышцы' },
  { value: 'abs', label: 'Пресс' },
  { value: 'legs', label: 'Ноги' }
]

export const WORKOUT_EXERCISE_CATEGORY_OPTIONS: Array<{
  value: WorkoutExerciseCategory
  label: string
}> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'core', label: 'Корпус' }
]

const WORKOUT_EXERCISE_CATEGORY_BY_GROUP: Record<WorkoutMuscleGroup, WorkoutExerciseCategory> = {
  arms: 'arms',
  shoulders: 'arms',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  back: 'back',
  lats: 'back',
  traps: 'back',
  lower_back: 'back',
  chest: 'core',
  abs: 'core',
  legs: 'legs',
  glutes: 'legs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs'
}

export function workoutExerciseCategoryForGroups(
  groups: WorkoutMuscleGroup[]
): WorkoutExerciseCategory {
  return WORKOUT_EXERCISE_CATEGORY_BY_GROUP[groups[0] ?? 'arms']
}
""",
)

page_path = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
page = page_path.read_text(encoding='utf-8')
old_import = """import {
  WORKOUT_MUSCLE_GROUP_OPTIONS,
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  workoutMuscleGroupsLabel
} from './workout-options'
"""
new_import = """import {
  WORKOUT_EXERCISE_CATEGORY_OPTIONS,
  WORKOUT_MUSCLE_GROUP_OPTIONS,
  workoutExerciseCategoryForGroups,
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  workoutMuscleGroupsLabel,
  type WorkoutExerciseCategory
} from './workout-options'
"""
if page.count(old_import) != 1:
    raise SystemExit('WorkoutsPage import anchor mismatch')
page = page.replace(old_import, new_import, 1)
page = page.replace(
    "type MuscleFilter = 'all' | WorkoutMuscleGroup\n",
    "type MuscleFilter = 'all' | WorkoutMuscleGroup\ntype ExerciseCategoryFilter = 'all' | WorkoutExerciseCategory\n",
    1,
)
page = page.replace(
    "  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all')\n",
    "  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all')\n  const [exerciseCategoryFilter, setExerciseCategoryFilter] =\n    useState<ExerciseCategoryFilter>('all')\n",
    1,
)

start = page.index('  const filteredExercises = useMemo(() => {')
end = page.index('  const filteredPrograms = useMemo(() => {', start)
filtered_block = """  const filteredExercises = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return exercises.filter((exercise) => {
      if (
        exerciseCategoryFilter !== 'all' &&
        workoutExerciseCategoryForGroups(exercise.muscleGroups) !== exerciseCategoryFilter
      ) {
        return false
      }
      return (
        !normalized ||
        `${exercise.title} ${workoutMuscleGroupsLabel(exercise.muscleGroups)}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalized)
      )
    })
  }, [exerciseCategoryFilter, exercises, query])

  const exerciseSections = useMemo(
    () =>
      WORKOUT_EXERCISE_CATEGORY_OPTIONS.map((category) => ({
        ...category,
        exercises: filteredExercises
          .filter(
            (exercise) =>
              workoutExerciseCategoryForGroups(exercise.muscleGroups) === category.value
          )
          .sort((left, right) => left.title.localeCompare(right.title, 'ru-RU'))
      })).filter((category) => category.exercises.length > 0),
    [filteredExercises]
  )

"""
page = page[:start] + filtered_block + page[end:]

toolbar_start = page.index("    if (tab === 'exercises') {")
toolbar_end = page.index("    if (tab === 'programs') {", toolbar_start)
toolbar = """    if (tab === 'exercises') {
      return (
        <div className="flex flex-wrap gap-2">
          <label className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search className="size-4 text-[var(--app-muted)]" />
            <input
              type="search"
              value={query}
              placeholder="Найти упражнение…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div
            role="group"
            aria-label="Раздел упражнений"
            className="flex h-10 max-w-full shrink-0 gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1"
          >
            <button
              type="button"
              aria-pressed={exerciseCategoryFilter === 'all'}
              className={cn(
                'h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors',
                exerciseCategoryFilter === 'all'
                  ? 'bg-violet-500 font-semibold text-white'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setExerciseCategoryFilter('all')}
            >
              Все
            </button>
            {WORKOUT_EXERCISE_CATEGORY_OPTIONS.map((category) => (
              <button
                key={category.value}
                type="button"
                aria-pressed={exerciseCategoryFilter === category.value}
                className={cn(
                  'h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors',
                  exerciseCategoryFilter === category.value
                    ? 'bg-violet-500 font-semibold text-white'
                    : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setExerciseCategoryFilter(category.value)}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      )
    }

"""
page = page[:toolbar_start] + toolbar + page[toolbar_end:]

reset_anchor = """                  setQuery('')
                  setMuscleFilter('all')
                  setProgramFilter('all')
"""
reset_new = """                  setQuery('')
                  setMuscleFilter('all')
                  setExerciseCategoryFilter('all')
                  setProgramFilter('all')
"""
if page.count(reset_anchor) != 1:
    raise SystemExit('tab reset anchor mismatch')
page = page.replace(reset_anchor, reset_new, 1)

render_start = page.rfind("      {tab === 'exercises' && (")
render_end = page.index("      {tab === 'programs' && (", render_start)
render_block = """      {tab === 'exercises' && (
        <section className="mt-5 space-y-6">
          {filteredExercises.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
              <Target className="size-8 text-violet-300" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--app-text)]">
                {exercises.length === 0 ? 'Упражнений пока нет' : 'Ничего не найдено'}
              </h2>
              <p className="mt-1 max-w-md text-sm text-[var(--app-muted)]">
                {exercises.length === 0
                  ? 'Добавьте своё упражнение — оно появится в библиотеке вместе с базовыми упражнениями.'
                  : 'Измените поисковый запрос или выберите другой раздел.'}
              </p>
            </div>
          ) : (
            exerciseSections.map((section) => (
              <div key={section.value} className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold text-[var(--app-text)]">{section.label}</h2>
                  <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-0.5 text-[11px] font-medium text-[var(--app-muted)]">
                    {section.exercises.length}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {section.exercises.map((exercise) => {
                    const classes = workoutMuscleGroupClasses[exercise.muscleGroup]
                    return (
                      <article
                        key={exercise.id}
                        className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                      >
                        <div className="flex items-start gap-3">
                          <WorkoutMuscleArtwork
                            groups={exercise.muscleGroups}
                            className="size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate font-semibold text-[var(--app-text)]">
                                {exercise.title}
                              </h3>
                            </div>
                            <span
                              className={cn('mt-1 inline-block text-xs font-medium', classes.text)}
                            >
                              {workoutMuscleGroupsLabel(exercise.muscleGroups)}
                            </span>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Tooltip content={`Изменить «${exercise.title}»`} side="top">
                              <button
                                type="button"
                                aria-label={`Изменить «${exercise.title}»`}
                                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                                onClick={() => {
                                  setEditingExercise(exercise)
                                  setExerciseDialogOpen(true)
                                }}
                              >
                                <Pencil className="size-4" />
                              </button>
                            </Tooltip>
                            <Tooltip content={`Удалить «${exercise.title}»`} side="top">
                              <button
                                type="button"
                                aria-label={`Удалить «${exercise.title}»`}
                                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                                onClick={() => setDeleteExerciseTarget(exercise)}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

"""
page = page[:render_start] + render_block + page[render_end:]
page_path.write_text(page, encoding='utf-8')

test_path = 'src/renderer/src/modules/workouts/WorkoutsPage.test.tsx'
replace_once(
    test_path,
    """    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти упражнение…'))
    expect(moduleHeader).toContainElement(screen.getByRole('combobox', { name: 'Группа мышц' }))
""",
    """    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти упражнение…'))
    const exerciseCategoryGroup = screen.getByRole('group', { name: 'Раздел упражнений' })
    expect(moduleHeader).toContainElement(exerciseCategoryGroup)
    expect(exerciseCategoryGroup).toHaveTextContent('Все')
    expect(exerciseCategoryGroup).toHaveTextContent('Руки')
    expect(exerciseCategoryGroup).toHaveTextContent('Спина')
    expect(exerciseCategoryGroup).toHaveTextContent('Ноги')
    expect(exerciseCategoryGroup).toHaveTextContent('Корпус')
""",
)
replace_once(
    test_path,
    """    expect(screen.getByText('Сгибания на бицепс с гантелями')).toBeInTheDocument()
    expect(screen.getByText('Бицепс')).toBeInTheDocument()
  })

  it('opens the muscle map for a workout program', async () => {
""",
    """    expect(screen.getByRole('heading', { name: 'Руки' })).toBeInTheDocument()
    expect(screen.getByText('Сгибания на бицепс с гантелями')).toBeInTheDocument()
    expect(screen.getByText('Бицепс')).toBeInTheDocument()
  })

  it('separates the exercise library into arms, back, legs and core', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValueOnce({
      exercises: [
        curl,
        {
          ...curl,
          id: 'exercise-pull-up',
          title: 'Подтягивания',
          muscleGroup: 'lats',
          muscleGroups: ['lats', 'biceps'],
          usesExternalWeight: false
        },
        {
          ...curl,
          id: 'exercise-squat',
          title: 'Приседания со штангой',
          muscleGroup: 'quadriceps',
          muscleGroups: ['quadriceps', 'glutes', 'hamstrings']
        },
        {
          ...curl,
          id: 'exercise-bench',
          title: 'Жим штанги лёжа',
          muscleGroup: 'chest',
          muscleGroups: ['chest', 'triceps', 'shoulders']
        }
      ],
      programs: [],
      sessions: [],
      progressEntries: []
    })
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Упражнения/ }))

    expect(screen.getByRole('heading', { name: 'Руки' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Спина' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ноги' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Корпус' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Спина' }))
    expect(screen.getByRole('heading', { name: 'Спина' })).toBeInTheDocument()
    expect(screen.getByText('Подтягивания')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Руки' })).not.toBeInTheDocument()
    expect(screen.queryByText('Жим штанги лёжа')).not.toBeInTheDocument()
  })

  it('opens the muscle map for a workout program', async () => {
""",
)

migration = """WITH default_exercises (id, title, muscle_group, uses_external_weight) AS (
  VALUES
    ('10000000-0000-4000-8000-000000000001', 'Жим гантелей над головой', '["shoulders","triceps"]', 1),
    ('10000000-0000-4000-8000-000000000002', 'Разведения гантелей в стороны', '["shoulders"]', 1),
    ('10000000-0000-4000-8000-000000000003', 'Сгибания рук с гантелями', '["biceps","forearms"]', 1),
    ('10000000-0000-4000-8000-000000000004', 'Сгибания рук со штангой', '["biceps","forearms"]', 1),
    ('10000000-0000-4000-8000-000000000005', 'Французский жим', '["triceps"]', 1),
    ('10000000-0000-4000-8000-000000000006', 'Разгибание рук на верхнем блоке', '["triceps"]', 1),
    ('10000000-0000-4000-8000-000000000007', 'Подтягивания', '["lats","biceps"]', 0),
    ('10000000-0000-4000-8000-000000000008', 'Тяга верхнего блока', '["lats","biceps"]', 1),
    ('10000000-0000-4000-8000-000000000009', 'Тяга горизонтального блока', '["lats","traps"]', 1),
    ('10000000-0000-4000-8000-000000000010', 'Тяга штанги в наклоне', '["lats","traps","lower_back"]', 1),
    ('10000000-0000-4000-8000-000000000011', 'Становая тяга', '["lower_back","glutes","hamstrings","traps"]', 1),
    ('10000000-0000-4000-8000-000000000012', 'Гиперэкстензия', '["lower_back","glutes"]', 0),
    ('10000000-0000-4000-8000-000000000013', 'Приседания со штангой', '["quadriceps","glutes","hamstrings"]', 1),
    ('10000000-0000-4000-8000-000000000014', 'Приседания с собственным весом', '["quadriceps","glutes"]', 0),
    ('10000000-0000-4000-8000-000000000015', 'Жим ногами', '["quadriceps","glutes"]', 1),
    ('10000000-0000-4000-8000-000000000016', 'Выпады с гантелями', '["quadriceps","glutes","hamstrings"]', 1),
    ('10000000-0000-4000-8000-000000000017', 'Румынская тяга', '["hamstrings","glutes","lower_back"]', 1),
    ('10000000-0000-4000-8000-000000000018', 'Подъёмы на носки стоя', '["calves"]', 1),
    ('10000000-0000-4000-8000-000000000019', 'Жим штанги лёжа', '["chest","triceps","shoulders"]', 1),
    ('10000000-0000-4000-8000-000000000020', 'Жим гантелей лёжа', '["chest","triceps"]', 1),
    ('10000000-0000-4000-8000-000000000021', 'Отжимания', '["chest","triceps","shoulders"]', 0),
    ('10000000-0000-4000-8000-000000000022', 'Скручивания', '["abs"]', 0),
    ('10000000-0000-4000-8000-000000000023', 'Подъём ног в висе', '["abs"]', 0),
    ('10000000-0000-4000-8000-000000000024', 'Русские скручивания с весом', '["abs"]', 1)
)
INSERT INTO workout_exercises (
  id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at
)
SELECT
  candidate.id,
  candidate.title,
  candidate.muscle_group,
  candidate.uses_external_weight,
  '',
  'active',
  1788453300000,
  1788453300000
FROM default_exercises AS candidate
WHERE NOT EXISTS (
  SELECT 1
  FROM workout_exercises AS existing
  WHERE existing.id = candidate.id OR trim(existing.title) = candidate.title
);
"""
Path('drizzle/0044_workout_default_exercises.sql').write_text(migration, encoding='utf-8')

journal_path = Path('drizzle/meta/_journal.json')
journal = json.loads(journal_path.read_text(encoding='utf-8'))
entries = journal.get('entries', [])
if any(entry.get('idx') == 44 or entry.get('tag') == '0044_workout_default_exercises' for entry in entries):
    raise SystemExit('0044 journal entry already exists')
if not entries or entries[-1].get('idx') != 43:
    raise SystemExit('unexpected migration journal tail')
entries.append(
    {
        'idx': 44,
        'version': '6',
        'when': 1788453300000,
        'tag': '0044_workout_default_exercises',
        'breakpoints': True,
    }
)
journal_path.write_text(json.dumps(journal, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

defaults_test = """import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { closeDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { listWorkoutsOverview } from './workouts.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-workout-defaults-'))
  initializeDatabaseForTesting(join(root, 'workouts-defaults.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('default workout exercise catalog', () => {
  it('seeds a practical base library with bodyweight and weighted exercises', () => {
    const exercises = listWorkoutsOverview().exercises

    expect(exercises).toHaveLength(24)
    expect(exercises).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Подтягивания',
          muscleGroups: ['lats', 'biceps'],
          usesExternalWeight: false
        }),
        expect.objectContaining({
          title: 'Приседания со штангой',
          muscleGroups: ['quadriceps', 'glutes', 'hamstrings'],
          usesExternalWeight: true
        }),
        expect.objectContaining({
          title: 'Жим штанги лёжа',
          muscleGroups: ['chest', 'triceps', 'shoulders'],
          usesExternalWeight: true
        }),
        expect.objectContaining({
          title: 'Скручивания',
          muscleGroups: ['abs'],
          usesExternalWeight: false
        })
      ])
    )
  })
})
"""
Path('src/main/repositories/workouts.defaults.test.ts').write_text(defaults_test, encoding='utf-8')
