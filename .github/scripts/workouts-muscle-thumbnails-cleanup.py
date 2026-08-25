from pathlib import Path

path = Path('src/renderer/src/modules/workouts/WorkoutsPage.tsx')
text = path.read_text(encoding='utf-8')
patterns = [
    (
        """                    {program.exercises.map((item, index) => {\n                      const exercise = exerciseMap.get(item.exerciseId)\n                      if (!exercise) return null\n                      const classes = workoutMuscleGroupClasses[exercise.muscleGroup]\n                      return (\n""",
        """                    {program.exercises.map((item, index) => {\n                      const exercise = exerciseMap.get(item.exerciseId)\n                      if (!exercise) return null\n                      return (\n""",
    ),
    (
        """                      {entry.metrics.map((metric) => {\n                        const classes = workoutMuscleGroupClasses[metric.muscleGroup]\n                        return (\n""",
        """                      {entry.metrics.map((metric) => {\n                        return (\n""",
    ),
]

for old, new in patterns:
    if old not in text:
        raise SystemExit(f'Cleanup pattern not found: {old[:120]!r}')
    text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
print('Unused workout icon classes removed successfully.')
