from pathlib import Path

path = Path('.github/scripts/workouts-reports-patch.py')
source = path.read_text(encoding='utf-8')
needle = '    "  sets: number\\n  reps: number\\n  volumeKg: number\\n",'
replacement = '    "export interface WorkoutReportSummary {\\n  sessions: number\\n  activeDays: number\\n  exercises: number\\n  sets: number\\n  reps: number\\n  volumeKg: number\\n",'
if source.count(needle) != 1:
    raise RuntimeError(f'Expected one summary patch argument, got {source.count(needle)}')
path.write_text(source.replace(needle, replacement, 1), encoding='utf-8')
