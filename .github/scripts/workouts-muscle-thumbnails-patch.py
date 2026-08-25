from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new), encoding='utf-8')


# workout-options: keep the public icon API, but make it render the same MuscleMap artwork.
path = 'src/renderer/src/modules/workouts/workout-options.tsx'
replace(
    path,
    "import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'\n",
    "import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'\nimport { WorkoutMuscleArtwork } from './components/WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """export function WorkoutMuscleGroupIcon({\n  group,\n  className\n}: {\n  group: WorkoutMuscleGroup\n  className?: string\n}): React.JSX.Element {\n  const family = workoutMuscleFamilyForGroup(group)\n  const Icon =\n    WORKOUT_MUSCLE_GROUP_OPTIONS.find((option) => option.value === group)?.icon ??\n    (family === 'back'\n      ? Shield\n      : family === 'legs'\n        ? Footprints\n        : family === 'chest'\n          ? HeartPulse\n          : family === 'abs'\n            ? CircleDot\n            : Dumbbell)\n  return <Icon aria-hidden=\"true\" className={className} />\n}\n""",
    """export function WorkoutMuscleGroupIcon({\n  group,\n  className\n}: {\n  group: WorkoutMuscleGroup\n  className?: string\n}): React.JSX.Element {\n  return <WorkoutMuscleArtwork groups={[group]} className={className} />\n}\n"""
)

# WorkoutsPage: use the shared artwork for exercise/session/program/progress representations.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.tsx'
replace(
    path,
    "import { WorkoutExerciseDialog } from './components/WorkoutExerciseDialog'\n",
    "import { WorkoutExerciseDialog } from './components/WorkoutExerciseDialog'\nimport { WorkoutMuscleArtwork } from './components/WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """                const groups = [\n                  ...new Set(session.exercises.map((exercise) => exercise.muscleGroup))\n                ]\n""",
    """                const groups = [\n                  ...new Set(session.exercises.flatMap((exercise) => exercise.muscleGroups))\n                ]\n"""
)
replace(
    path,
    """                      <button\n                        type=\"button\"\n                        className=\"flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300\"\n                        onClick={() => {\n                          setSelectedSession(session)\n                          setSessionDetailOpen(true)\n                        }}\n                      >\n                        <Dumbbell className=\"size-5\" />\n                      </button>\n""",
    """                      <button\n                        type=\"button\"\n                        className=\"flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1\"\n                        onClick={() => {\n                          setSelectedSession(session)\n                          setSessionDetailOpen(true)\n                        }}\n                      >\n                        <WorkoutMuscleArtwork groups={groups} className=\"size-9 rounded-lg\" />\n                      </button>\n"""
)
replace(
    path,
    """                      <span\n                        className={cn(\n                          'flex size-10 shrink-0 items-center justify-center rounded-xl border',\n                          classes.soft,\n                          classes.text,\n                          classes.border\n                        )}\n                      >\n                        <WorkoutMuscleGroupIcon group={exercise.muscleGroup} className=\"size-5\" />\n                      </span>\n""",
    """                      <WorkoutMuscleArtwork\n                        groups={exercise.muscleGroups}\n                        className=\"size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5\"\n                      />\n"""
)
replace(
    path,
    """                          <span\n                            className={cn(\n                              'flex size-7 items-center justify-center rounded-lg border',\n                              classes.soft,\n                              classes.text,\n                              classes.border\n                            )}\n                          >\n                            <WorkoutMuscleGroupIcon\n                              group={exercise.muscleGroup}\n                              className=\"size-3.5\"\n                            />\n                          </span>\n""",
    """                          <WorkoutMuscleArtwork\n                            groups={exercise.muscleGroups}\n                            className=\"size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5\"\n                          />\n"""
)
replace(
    path,
    """                              <span\n                                className={cn(\n                                  'flex size-7 items-center justify-center rounded-lg border',\n                                  classes.soft,\n                                  classes.text,\n                                  classes.border\n                                )}\n                              >\n                                <WorkoutMuscleGroupIcon\n                                  group={metric.muscleGroup}\n                                  className=\"size-3.5\"\n                                />\n                              </span>\n""",
    """                              <WorkoutMuscleArtwork\n                                groups={metric.muscleGroups}\n                                className=\"size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5\"\n                              />\n"""
)

# Program editor: show anatomy next to every exercise in the ordered list.
path = 'src/renderer/src/modules/workouts/components/WorkoutProgramDialog.tsx'
replace(
    path,
    "import { workoutMuscleGroupsLabel } from '../workout-options'\n",
    "import { workoutMuscleGroupsLabel } from '../workout-options'\nimport { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """                  <span className=\"flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xs font-semibold text-violet-300\">\n                    {index + 1}\n                  </span>\n                  <div className=\"min-w-0 flex-1\">\n""",
    """                  <span className=\"flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xs font-semibold text-violet-300\">\n                    {index + 1}\n                  </span>\n                  {exercise && (\n                    <WorkoutMuscleArtwork\n                      groups={exercise.muscleGroups}\n                      className=\"size-10 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5\"\n                    />\n                  )}\n                  <div className=\"min-w-0 flex-1\">\n"""
)

# Session editor: replace the generic dumbbell in each exercise block.
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDialog.tsx'
replace(
    path,
    "import { workoutMuscleGroupsLabel } from '../workout-options'\n",
    "import { workoutMuscleGroupsLabel } from '../workout-options'\nimport { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """                    <span className=\"flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300\">\n                      <Dumbbell className=\"size-4\" />\n                    </span>\n""",
    """                    {exercise ? (\n                      <WorkoutMuscleArtwork\n                        groups={exercise.muscleGroups}\n                        className=\"size-11 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5\"\n                      />\n                    ) : (\n                      <span className=\"flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300\">\n                        <Dumbbell className=\"size-4\" />\n                      </span>\n                    )}\n"""
)

# Progress editor: show the same artwork for each tracked exercise.
path = 'src/renderer/src/modules/workouts/components/WorkoutProgressDialog.tsx'
replace(
    path,
    "import { workoutMuscleGroupLabel } from '../workout-options'\n",
    "import { workoutMuscleGroupLabel } from '../workout-options'\nimport { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """                <div className=\"flex items-start justify-between gap-3\">\n                  <div>\n                    <div className=\"font-semibold text-[var(--app-text)]\">\n                      {exercise?.title ?? 'Упражнение недоступно'}\n                    </div>\n                    {exercise && (\n                      <div className=\"mt-0.5 text-xs text-[var(--app-muted)]\">\n                        {workoutMuscleGroupLabel(exercise.muscleGroup)}\n                      </div>\n                    )}\n                  </div>\n""",
    """                <div className=\"flex items-start justify-between gap-3\">\n                  <div className=\"flex min-w-0 items-start gap-3\">\n                    {exercise && (\n                      <WorkoutMuscleArtwork\n                        groups={exercise.muscleGroups}\n                        className=\"size-11 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5\"\n                      />\n                    )}\n                    <div className=\"min-w-0\">\n                      <div className=\"font-semibold text-[var(--app-text)]\">\n                        {exercise?.title ?? 'Упражнение недоступно'}\n                      </div>\n                      {exercise && (\n                        <div className=\"mt-0.5 text-xs text-[var(--app-muted)]\">\n                          {workoutMuscleGroupLabel(exercise.muscleGroup)}\n                        </div>\n                      )}\n                    </div>\n                  </div>\n"""
)

# Session details: use all saved muscle zones instead of only the legacy primary-zone icon.
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDetailDialog.tsx'
replace(path, "import { cn } from '../../../shared/lib/cn'\n", '')
replace(
    path,
    """import {\n  workoutMuscleGroupClasses,\n  workoutMuscleGroupLabel,\n  WorkoutMuscleGroupIcon\n} from '../workout-options'\n""",
    "import { workoutMuscleGroupLabel } from '../workout-options'\nimport { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'\n"
)
replace(
    path,
    """            {session.exercises.map((exercise) => {\n              const classes = workoutMuscleGroupClasses[exercise.muscleGroup]\n              const volume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)\n""",
    """            {session.exercises.map((exercise) => {\n              const volume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)\n"""
)
replace(
    path,
    """                    <span className={cn('flex size-9 items-center justify-center rounded-xl border', classes.soft, classes.text, classes.border)}>\n                      <WorkoutMuscleGroupIcon group={exercise.muscleGroup} className=\"size-4\" />\n                    </span>\n""",
    """                    <WorkoutMuscleArtwork\n                      groups={exercise.muscleGroups}\n                      className=\"size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5\"\n                    />\n"""
)

print('Workout muscle thumbnail patches applied successfully.')
