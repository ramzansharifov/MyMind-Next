from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return content.replace(old, new, 1)


# Shared contracts: photo angles and progress metric load mode snapshot.
path = 'src/shared/contracts/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "export const WORKOUT_ENTITY_STATUSES = ['active', 'archived'] as const\n\n",
    "export const WORKOUT_ENTITY_STATUSES = ['active', 'archived'] as const\n\n"
    "export const WORKOUT_PROGRESS_PHOTO_VIEWS = [\n"
    "  'front',\n"
    "  'left',\n"
    "  'right',\n"
    "  'back',\n"
    "  'custom'\n"
    "] as const\n\n",
    'progress photo view constants',
)
s = replace_once(
    s,
    "export type WorkoutEntityStatus = (typeof WORKOUT_ENTITY_STATUSES)[number]\n",
    "export type WorkoutEntityStatus = (typeof WORKOUT_ENTITY_STATUSES)[number]\n"
    "export type WorkoutProgressPhotoView = (typeof WORKOUT_PROGRESS_PHOTO_VIEWS)[number]\n",
    'progress photo view type',
)
s = replace_once(
    s,
    "  muscleGroup: WorkoutMuscleGroup\n  muscleGroups: WorkoutMuscleGroup[]\n  weightKg: number\n  reps: number\n  comment: string\n}\n\nexport interface WorkoutProgressPhotoRecord",
    "  muscleGroup: WorkoutMuscleGroup\n  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  weightKg: number\n  reps: number\n  comment: string\n}\n\nexport interface WorkoutProgressPhotoRecord",
    'progress metric load mode',
)
s = replace_once(
    s,
    "  size: number\n  url: string\n  createdAt: number\n}\n\nexport interface WorkoutProgressEntryRecord",
    "  size: number\n  url: string\n  view: WorkoutProgressPhotoView\n  createdAt: number\n}\n\nexport interface WorkoutProgressEntryRecord",
    'progress photo view record',
)
s = replace_once(
    s,
    "export interface ImportWorkoutProgressPhotoInput {\n  entryId: string\n}\n",
    "export interface ImportWorkoutProgressPhotoInput {\n  entryId: string\n  view: WorkoutProgressPhotoView\n}\n",
    'progress photo import view',
)
write(path, s)

# Validation.
path = 'src/shared/validation/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "  WORKOUT_ENTITY_STATUSES,\n  WORKOUT_MUSCLE_GROUPS,\n",
    "  WORKOUT_ENTITY_STATUSES,\n  WORKOUT_MUSCLE_GROUPS,\n  WORKOUT_PROGRESS_PHOTO_VIEWS,\n",
    'photo views validation import',
)
s = replace_once(
    s,
    "export const importWorkoutProgressPhotoInputSchema = z.object({ entryId: idSchema })\n",
    "export const importWorkoutProgressPhotoInputSchema = z.object({\n"
    "  entryId: idSchema,\n"
    "  view: z.enum(WORKOUT_PROGRESS_PHOTO_VIEWS)\n"
    "})\n",
    'photo view validation',
)
write(path, s)

# Drizzle schema.
path = 'src/main/database/schema/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "import type { WorkoutEntityStatus, WorkoutMuscleGroup } from '../../../shared/contracts/workouts'\n",
    "import type {\n"
    "  WorkoutEntityStatus,\n"
    "  WorkoutMuscleGroup,\n"
    "  WorkoutProgressPhotoView\n"
    "} from '../../../shared/contracts/workouts'\n",
    'schema photo view import',
)
s = replace_once(
    s,
    "    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),\n"
    "    weightMilliKg: integer('weight_milli_kg').notNull().default(0),\n"
    "    reps: integer('reps').notNull(),\n",
    "    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),\n"
    "    usesExternalWeightSnapshot: integer('uses_external_weight_snapshot', { mode: 'boolean' })\n"
    "      .notNull()\n"
    "      .default(true),\n"
    "    weightMilliKg: integer('weight_milli_kg').notNull().default(0),\n"
    "    reps: integer('reps').notNull(),\n",
    'progress metric mode snapshot schema',
)
s = replace_once(
    s,
    "    size: integer('size').notNull(),\n"
    "    url: text('url').notNull(),\n"
    "    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()\n"
    "  },\n"
    "  (table) => [index('workout_progress_photos_entry_idx').on(table.entryId, table.createdAt)]\n"
    ")",
    "    size: integer('size').notNull(),\n"
    "    url: text('url').notNull(),\n"
    "    view: text('view').$type<WorkoutProgressPhotoView>().notNull().default('custom'),\n"
    "    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()\n"
    "  },\n"
    "  (table) => [\n"
    "    index('workout_progress_photos_entry_idx').on(table.entryId, table.createdAt),\n"
    "    index('workout_progress_photos_entry_view_idx').on(table.entryId, table.view, table.createdAt)\n"
    "  ]\n"
    ")",
    'progress photo view schema',
)
write(path, s)

# Repository snapshots, storage and photo angles.
path = 'src/main/repositories/workouts.repository.ts'
s = read(path)
s = replace_once(
    s,
    "  WorkoutProgressPhotoRecord,\n  WorkoutReport,\n",
    "  WorkoutProgressPhotoRecord,\n  WorkoutProgressPhotoView,\n  WorkoutReport,\n",
    'repository photo view import',
)
s = replace_once(
    s,
    "  exercise_title_snapshot: string\n  muscle_group_snapshot: string\n  weight_milli_kg: number\n",
    "  exercise_title_snapshot: string\n  muscle_group_snapshot: string\n  uses_external_weight_snapshot: number\n  weight_milli_kg: number\n",
    'progress metric row mode',
)
s = replace_once(
    s,
    "  size: number\n  url: string\n  created_at: number\n}\n\nconst EXERCISE_SELECT",
    "  size: number\n  url: string\n  view: WorkoutProgressPhotoView\n  created_at: number\n}\n\nconst EXERCISE_SELECT",
    'progress photo row view',
)
s = replace_once(
    s,
    "const PROGRESS_METRIC_SELECT = `SELECT id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, weight_milli_kg, reps, comment, position FROM workout_progress_metrics`\n"
    "const PROGRESS_PHOTO_SELECT = `SELECT id, entry_id, asset_id, file_name, mime_type, size, url, created_at FROM workout_progress_photos`\n",
    "const PROGRESS_METRIC_SELECT = `SELECT id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, weight_milli_kg, reps, comment, position FROM workout_progress_metrics`\n"
    "const PROGRESS_PHOTO_SELECT = `SELECT id, entry_id, asset_id, file_name, mime_type, size, url, view, created_at FROM workout_progress_photos`\n",
    'progress selects',
)
s = replace_once(
    s,
    "    size: row.size,\n    url: row.url,\n    createdAt: row.created_at\n",
    "    size: row.size,\n    url: row.url,\n    view: row.view,\n    createdAt: row.created_at\n",
    'progress photo mapper view',
)
s = replace_once(
    s,
    "      muscleGroup: primaryMuscleGroup(parseMuscleGroups(row.muscle_group_snapshot)),\n"
    "      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),\n"
    "      weightKg: fromMilliKg(row.weight_milli_kg),\n"
    "      reps: row.reps,\n"
    "      comment: row.comment\n"
    "    })\n"
    "    metricsByEntry.set(row.entry_id, list)\n",
    "      muscleGroup: primaryMuscleGroup(parseMuscleGroups(row.muscle_group_snapshot)),\n"
    "      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),\n"
    "      usesExternalWeight: Boolean(row.uses_external_weight_snapshot),\n"
    "      weightKg: fromMilliKg(row.weight_milli_kg),\n"
    "      reps: row.reps,\n"
    "      comment: row.comment\n"
    "    })\n"
    "    metricsByEntry.set(row.entry_id, list)\n",
    'progress metric mapper mode',
)
s = replace_once(
    s,
    "    `INSERT INTO workout_progress_metrics\n"
    "      (id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, weight_milli_kg, reps, comment, position)\n"
    "     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`\n",
    "    `INSERT INTO workout_progress_metrics\n"
    "      (id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, weight_milli_kg, reps, comment, position)\n"
    "     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n",
    'progress metric insert columns',
)
s = replace_once(
    s,
    "      exercise.title,\n"
    "      serializeMuscleGroups(exercise.muscleGroups),\n"
    "      toMilliKg(metric.weightKg),\n"
    "      metric.reps,\n"
    "      metric.comment,\n"
    "      index\n"
    "    )\n"
    "  })\n"
    "}\n\nexport function createWorkoutProgressEntry",
    "      exercise.title,\n"
    "      serializeMuscleGroups(exercise.muscleGroups),\n"
    "      exercise.usesExternalWeight ? 1 : 0,\n"
    "      toMilliKg(exercise.usesExternalWeight ? metric.weightKg : 0),\n"
    "      metric.reps,\n"
    "      metric.comment,\n"
    "      index\n"
    "    )\n"
    "  })\n"
    "}\n\nexport function createWorkoutProgressEntry",
    'progress metric insert mode values',
)
s = replace_once(
    s,
    "export function addWorkoutProgressPhoto(\n"
    "  entryId: string,\n"
    "  asset: { id: string; name: string; mimeType: string; size: number; url: string }\n"
    "): WorkoutProgressPhotoRecord {\n",
    "export function addWorkoutProgressPhoto(\n"
    "  entryId: string,\n"
    "  view: WorkoutProgressPhotoView,\n"
    "  asset: { id: string; name: string; mimeType: string; size: number; url: string }\n"
    "): WorkoutProgressPhotoRecord {\n",
    'add progress photo view signature',
)
s = replace_once(
    s,
    "      `INSERT INTO workout_progress_photos\n"
    "        (id, entry_id, asset_id, file_name, mime_type, size, url, created_at)\n"
    "       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`\n"
    "    )\n"
    "    .run(id, entryId, asset.id, asset.name, asset.mimeType, asset.size, asset.url, createdAt)\n",
    "      `INSERT INTO workout_progress_photos\n"
    "        (id, entry_id, asset_id, file_name, mime_type, size, url, view, created_at)\n"
    "       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`\n"
    "    )\n"
    "    .run(\n"
    "      id,\n"
    "      entryId,\n"
    "      asset.id,\n"
    "      asset.name,\n"
    "      asset.mimeType,\n"
    "      asset.size,\n"
    "      asset.url,\n"
    "      view,\n"
    "      createdAt\n"
    "    )\n",
    'add progress photo view values',
)
write(path, s)

# Asset service: fixed angles replace the previous image only after a successful new import.
path = 'src/main/services/workout-progress-assets.ts'
s = read(path)
s = replace_once(
    s,
    "import type { WorkoutProgressPhotoRecord } from '../../shared/contracts/workouts'\n",
    "import type {\n"
    "  WorkoutProgressPhotoRecord,\n"
    "  WorkoutProgressPhotoView\n"
    "} from '../../shared/contracts/workouts'\n",
    'asset service photo view import',
)
s = replace_once(
    s,
    "export async function importWorkoutProgressPhoto(\n"
    "  entryId: string,\n"
    "  parentWindow: BrowserWindow | null\n"
    "): Promise<WorkoutProgressPhotoRecord | null> {\n"
    "  getWorkoutProgressEntry(entryId)\n"
    "  const owner = progressAssetOwner(entryId)\n"
    "  const prepared = await selectStudyAssetForImport({ nodeId: owner, kind: 'image' }, parentWindow)\n"
    "  if (!prepared) return null\n\n"
    "  const asset = await persistPreparedStudyAssetImport(owner, prepared)\n"
    "  try {\n"
    "    return addWorkoutProgressPhoto(entryId, asset)\n"
    "  } catch (reason) {\n"
    "    await removeAssetDirectory(entryId, asset.id).catch(() => undefined)\n"
    "    throw reason\n"
    "  }\n"
    "}\n",
    "export async function importWorkoutProgressPhoto(\n"
    "  entryId: string,\n"
    "  view: WorkoutProgressPhotoView,\n"
    "  parentWindow: BrowserWindow | null\n"
    "): Promise<WorkoutProgressPhotoRecord | null> {\n"
    "  const entry = getWorkoutProgressEntry(entryId)\n"
    "  const previousPhotos =\n"
    "    view === 'custom' ? [] : entry.photos.filter((photo) => photo.view === view)\n"
    "  const owner = progressAssetOwner(entryId)\n"
    "  const prepared = await selectStudyAssetForImport({ nodeId: owner, kind: 'image' }, parentWindow)\n"
    "  if (!prepared) return null\n\n"
    "  const asset = await persistPreparedStudyAssetImport(owner, prepared)\n"
    "  try {\n"
    "    const imported = addWorkoutProgressPhoto(entryId, view, asset)\n"
    "    for (const previous of previousPhotos) {\n"
    "      await removeWorkoutProgressPhoto(previous.id)\n"
    "    }\n"
    "    return imported\n"
    "  } catch (reason) {\n"
    "    await removeAssetDirectory(entryId, asset.id).catch(() => undefined)\n"
    "    throw reason\n"
    "  }\n"
    "}\n",
    'asset service fixed photo replacement',
)
write(path, s)

# IPC passes angle through validated input.
path = 'src/main/ipc/register-workouts-ipc.ts'
s = read(path)
s = replace_once(
    s,
    "      return importWorkoutProgressPhoto(input.entryId, parentWindow)\n",
    "      return importWorkoutProgressPhoto(input.entryId, input.view, parentWindow)\n",
    'ipc progress photo view',
)
write(path, s)

# Progress dialog respects bodyweight exercises.
path = 'src/renderer/src/modules/workouts/components/WorkoutProgressDialog.tsx'
s = read(path)
s = replace_once(
    s,
    "      metrics: metrics.map((metric) => ({\n"
    "        exerciseId: metric.exerciseId,\n"
    "        weightKg: Number(metric.weightKg || 0),\n"
    "        reps: Number(metric.reps),\n"
    "        comment: metric.comment\n"
    "      }))\n",
    "      metrics: metrics.map((metric) => ({\n"
    "        exerciseId: metric.exerciseId,\n"
    "        weightKg: exerciseMap.get(metric.exerciseId)?.usesExternalWeight\n"
    "          ? Number(metric.weightKg || 0)\n"
    "          : 0,\n"
    "        reps: Number(metric.reps),\n"
    "        comment: metric.comment\n"
    "      }))\n",
    'progress dialog bodyweight save',
)
s = replace_once(
    s,
    '      description="Зафиксируйте текущую форму, вес и контрольные показатели в ключевых упражнениях. Фото можно добавить после сохранения записи."\n',
    '      description="Зафиксируйте вес, самочувствие и контрольные показатели. После сохранения добавьте фотографии формы по стандартным ракурсам для визуального сравнения."\n',
    'progress dialog description',
)
s = replace_once(
    s,
    "              Например: жим лёжа — 80 кг × 8, присед — 100 кг × 5.\n",
    "              Для упражнений с дополнительным весом фиксируются вес и повторения, для\n"
    "              упражнений с собственным весом — повторения.\n",
    'progress dialog metric help',
)
old_fields = '''                <div className="mt-3 grid gap-3 sm:grid-cols-[140px_140px_minmax(0,1fr)]">
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Вес, кг</span>
                    <input
                      type="number"
                      min={0}
                      step="0.25"
                      value={metric.weightKg}
                      placeholder="0"
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { weightKg: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Повторения</span>
                    <input
                      type="number"
                      min={1}
                      value={metric.reps}
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { reps: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Комментарий</span>
                    <input
                      value={metric.comment}
                      maxLength={4000}
                      placeholder="Техника, RPE, ощущения…"
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { comment: event.target.value })}
                    />
                  </label>
                </div>'''
new_fields = '''                <div
                  className={`mt-3 grid gap-3 ${
                    exercise?.usesExternalWeight
                      ? 'sm:grid-cols-[140px_140px_minmax(0,1fr)]'
                      : 'sm:grid-cols-[140px_minmax(0,1fr)]'
                  }`}
                >
                  {exercise?.usesExternalWeight && (
                    <label className="space-y-1.5">
                      <span className="text-xs text-[var(--app-muted)]">Вес, кг</span>
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={metric.weightKg}
                        placeholder="0"
                        className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                        onChange={(event) => updateMetric(index, { weightKg: event.target.value })}
                      />
                    </label>
                  )}
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Повторения</span>
                    <input
                      type="number"
                      min={1}
                      value={metric.reps}
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { reps: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Комментарий</span>
                    <input
                      value={metric.comment}
                      maxLength={4000}
                      placeholder="Техника, RPE, ощущения…"
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { comment: event.target.value })}
                    />
                  </label>
                </div>'''
s = replace_once(s, old_fields, new_fields, 'progress dialog mode-aware fields')
write(path, s)

# Main page delegates the Progress tab to the dedicated component.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.tsx'
s = read(path)
s = replace_once(s, '  Camera,\n', '', 'remove inline progress camera import')
s = replace_once(s, '  Scale,\n', '', 'remove inline progress scale import')
s = replace_once(
    s,
    "  WorkoutProgressEntryRecord,\n  WorkoutReport,\n",
    "  WorkoutProgressEntryRecord,\n  WorkoutProgressPhotoView,\n  WorkoutReport,\n",
    'page progress photo view import',
)
s = replace_once(
    s,
    "import { WorkoutProgressDialog } from './components/WorkoutProgressDialog'\n",
    "import { WorkoutProgressDialog } from './components/WorkoutProgressDialog'\n"
    "import { WorkoutProgressSection } from './components/WorkoutProgressSection'\n",
    'page progress section import',
)
s = replace_once(
    s,
    "  async function importPhoto(entryId: string): Promise<void> {\n"
    "    setIsBusy(true)\n"
    "    setError(null)\n"
    "    try {\n"
    "      await workoutsClient.importProgressPhoto({ entryId })\n"
    "      await loadOverview()\n"
    "    } catch (reason) {\n"
    "      setError(errorMessage(reason))\n"
    "    } finally {\n"
    "      setIsBusy(false)\n"
    "    }\n"
    "  }\n",
    "  async function importPhoto(\n"
    "    entryId: string,\n"
    "    view: WorkoutProgressPhotoView\n"
    "  ): Promise<void> {\n"
    "    setIsBusy(true)\n"
    "    setError(null)\n"
    "    try {\n"
    "      await workoutsClient.importProgressPhoto({ entryId, view })\n"
    "      await loadOverview()\n"
    "    } catch (reason) {\n"
    "      setError(errorMessage(reason))\n"
    "      throw reason\n"
    "    } finally {\n"
    "      setIsBusy(false)\n"
    "    }\n"
    "  }\n",
    'page import photo view',
)
start_marker = "      {tab === 'progress' && (\n"
end_marker = "      {tab === 'reports' && (\n"
start = s.find(start_marker)
end = s.find(end_marker, start + len(start_marker))
if start < 0 or end < 0:
    raise RuntimeError('Could not locate Progress tab block')
progress_block = """      {tab === 'progress' && (
        <WorkoutProgressSection
          entries={progressEntries}
          busy={isBusy}
          onEdit={(entry) => {
            setEditingProgress(entry)
            setProgressDialogOpen(true)
          }}
          onDelete={setDeleteProgressTarget}
          onImportPhoto={importPhoto}
          onRemovePhoto={removePhoto}
        />
      )}

"""
s = s[:start] + progress_block + s[end:]
write(path, s)

# Repository regression tests for bodyweight metrics and photo view persistence.
path = 'src/main/repositories/workouts.repository.test.ts'
s = read(path)
s = replace_once(
    s,
    "import {\n  createWorkoutExercise,\n",
    "import {\n  addWorkoutProgressPhoto,\n  createWorkoutExercise,\n",
    'repository test photo helper import',
)
s = replace_once(
    s,
    "          exerciseId: squat.id,\n          muscleGroups: ['quadriceps', 'glutes'],\n          weightKg: 110,\n",
    "          exerciseId: squat.id,\n          muscleGroups: ['quadriceps', 'glutes'],\n          usesExternalWeight: true,\n          weightKg: 110,\n",
    'weighted progress snapshot regression',
)
insert_marker = """  it('builds broad reports by muscle group, exercise, program and workload', () => {
"""
new_test = """  it('stores bodyweight progress without fake weight and keeps photo angles', () => {
    const pullUp = createWorkoutExercise({
      title: 'Подтягивания для прогресса',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false,
      status: 'active'
    })
    const entry = createWorkoutProgressEntry({
      date: '2026-08-20',
      bodyWeightKg: 77.8,
      wellbeing: '',
      notes: '',
      metrics: [{ exerciseId: pullUp.id, weightKg: 30, reps: 12, comment: '' }]
    })

    const front = addWorkoutProgressPhoto(entry.id, 'front', {
      id: 'asset-front',
      name: 'front.jpg',
      mimeType: 'image/jpeg',
      size: 1200,
      url: 'mymind-asset://workout-progress/front.jpg'
    })
    const custom = addWorkoutProgressPhoto(entry.id, 'custom', {
      id: 'asset-custom',
      name: 'custom.jpg',
      mimeType: 'image/jpeg',
      size: 900,
      url: 'mymind-asset://workout-progress/custom.jpg'
    })

    const stored = listWorkoutsOverview().progressEntries[0]
    expect(stored?.metrics[0]).toMatchObject({
      exerciseId: pullUp.id,
      usesExternalWeight: false,
      weightKg: 0,
      reps: 12
    })
    expect(front.view).toBe('front')
    expect(custom.view).toBe('custom')
    expect(stored?.photos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: front.id, view: 'front' }),
        expect.objectContaining({ id: custom.id, view: 'custom' })
      ])
    )
  })

""" + insert_marker
s = replace_once(s, insert_marker, new_test, 'bodyweight progress and photo view test')
write(path, s)

# Journal: register migration 0034 exactly once.
path = 'drizzle/meta/_journal.json'
data = json.loads(read(path))
entries = data.get('entries')
if not isinstance(entries, list):
    raise RuntimeError('Invalid drizzle journal entries')
if any(item.get('tag') == '0034_workouts_progress_visual_tracking' for item in entries):
    raise RuntimeError('0034 migration already registered')
if not entries or entries[-1].get('idx') != 33:
    raise RuntimeError(f'Unexpected last migration: {entries[-1] if entries else None}')
entries.append(
    {
        'idx': 34,
        'version': '6',
        'when': 1787667600000,
        'tag': '0034_workouts_progress_visual_tracking',
        'breakpoints': True,
    }
)
write(path, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

print('Workout Progress visual tracking patch applied.')
