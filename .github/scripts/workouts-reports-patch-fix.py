from pathlib import Path

path = Path('.github/scripts/workouts-reports-patch.py')
source = path.read_text(encoding='utf-8')

summary_needle = '    "  sets: number\\n  reps: number\\n  volumeKg: number\\n",'
summary_replacement = '    "export interface WorkoutReportSummary {\\n  sessions: number\\n  activeDays: number\\n  exercises: number\\n  sets: number\\n  reps: number\\n  volumeKg: number\\n",'
if source.count(summary_needle) != 1:
    raise RuntimeError(f'Expected one summary patch argument, got {source.count(summary_needle)}')
source = source.replace(summary_needle, summary_replacement, 1)

summary_new_needle = '    "  sets: number\\n  reps: number\\n  externalWeightSets: number\\n  externalWeightReps: number\\n  bodyweightSets: number\\n  bodyweightReps: number\\n  volumeKg: number\\n",'
summary_new_replacement = '    "export interface WorkoutReportSummary {\\n  sessions: number\\n  activeDays: number\\n  exercises: number\\n  sets: number\\n  reps: number\\n  externalWeightSets: number\\n  externalWeightReps: number\\n  bodyweightSets: number\\n  bodyweightReps: number\\n  volumeKg: number\\n",'
if source.count(summary_new_needle) != 1:
    raise RuntimeError(
        f'Expected one summary replacement argument, got {source.count(summary_new_needle)}'
    )
source = source.replace(summary_new_needle, summary_new_replacement, 1)

day_block = '''s = replace_once(
    s,
    "      reps: 0,\\n      volumeKg: 0,\\n      durationMinutes: 0\\n",
    "      reps: 0,\\n      externalWeightSets: 0,\\n      bodyweightSets: 0,\\n      volumeKg: 0,\\n      durationMinutes: 0\\n",
    'day mode totals',
)'''
day_replacement = '''s = replace_once(
    s,
    "    const day = dayMap.get(session.date) ?? {\\n      date: session.date,\\n      sessions: 0,\\n      sets: 0,\\n      reps: 0,\\n      volumeKg: 0,\\n      durationMinutes: 0\\n",
    "    const day = dayMap.get(session.date) ?? {\\n      date: session.date,\\n      sessions: 0,\\n      sets: 0,\\n      reps: 0,\\n      externalWeightSets: 0,\\n      bodyweightSets: 0,\\n      volumeKg: 0,\\n      durationMinutes: 0\\n",
    'day mode totals',
)'''
if source.count(day_block) != 1:
    raise RuntimeError(f'Expected one day patch block, got {source.count(day_block)}')
source = source.replace(day_block, day_replacement, 1)

program_fixture_block = '''s = replace_once(
    s,
    "        sets: 2,\\n        reps: 22,\\n        volumeKg: 328,\\n        durationMinutes: 60\\n",
    "        sets: 2,\\n        reps: 22,\\n        externalWeightSets: 2,\\n        bodyweightSets: 0,\\n        volumeKg: 328,\\n        durationMinutes: 60\\n",
    'UI program report mode fixture',
)'''
program_fixture_replacement = '''s = replace_once(
    s,
    "        programId: program.id,\\n        name: program.name,\\n        sessions: 1,\\n        sets: 2,\\n        reps: 22,\\n        volumeKg: 328,\\n        durationMinutes: 60\\n",
    "        programId: program.id,\\n        name: program.name,\\n        sessions: 1,\\n        sets: 2,\\n        reps: 22,\\n        externalWeightSets: 2,\\n        bodyweightSets: 0,\\n        volumeKg: 328,\\n        durationMinutes: 60\\n",
    'UI program report mode fixture',
)'''
if source.count(program_fixture_block) != 1:
    raise RuntimeError(
        f'Expected one program fixture patch block, got {source.count(program_fixture_block)}'
    )
source = source.replace(program_fixture_block, program_fixture_replacement, 1)

path.write_text(source, encoding='utf-8')
