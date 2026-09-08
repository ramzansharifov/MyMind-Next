// Additive migration for native Workouts persistence. Previous schema versions remain immutable.
export const mobileSchemaV5: readonly string[] = [
  `CREATE TABLE workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    uses_external_weight INTEGER DEFAULT true NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX workout_exercises_muscle_group_idx ON workout_exercises (muscle_group)',
  'CREATE INDEX workout_exercises_status_idx ON workout_exercises (status)',
  `CREATE TABLE workout_programs (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX workout_programs_status_idx ON workout_programs (status)',
  `CREATE TABLE workout_program_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    program_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    planned_sets INTEGER DEFAULT 3 NOT NULL,
    target_reps INTEGER,
    notes TEXT DEFAULT '' NOT NULL,
    FOREIGN KEY (program_id) REFERENCES workout_programs(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON UPDATE NO ACTION ON DELETE RESTRICT
  )`,
  'CREATE INDEX workout_program_exercises_program_idx ON workout_program_exercises (program_id, position)',
  'CREATE INDEX workout_program_exercises_exercise_idx ON workout_program_exercises (exercise_id)',
  `CREATE TABLE workout_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    program_id TEXT,
    program_name_snapshot TEXT,
    title TEXT DEFAULT '' NOT NULL,
    date TEXT NOT NULL,
    duration_minutes INTEGER,
    comment TEXT DEFAULT '' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (program_id) REFERENCES workout_programs(id) ON UPDATE NO ACTION ON DELETE SET NULL
  )`,
  'CREATE INDEX workout_sessions_date_idx ON workout_sessions (date)',
  'CREATE INDEX workout_sessions_program_idx ON workout_sessions (program_id)',
  `CREATE TABLE workout_session_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL,
    exercise_id TEXT,
    exercise_title_snapshot TEXT NOT NULL,
    muscle_group_snapshot TEXT NOT NULL,
    uses_external_weight_snapshot INTEGER DEFAULT true NOT NULL,
    position INTEGER NOT NULL,
    comment TEXT DEFAULT '' NOT NULL,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON UPDATE NO ACTION ON DELETE RESTRICT
  )`,
  'CREATE INDEX workout_session_exercises_session_idx ON workout_session_exercises (session_id, position)',
  'CREATE INDEX workout_session_exercises_exercise_idx ON workout_session_exercises (exercise_id)',
  'CREATE INDEX workout_session_exercises_group_idx ON workout_session_exercises (muscle_group_snapshot)',
  `CREATE TABLE workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight_milli_kg INTEGER DEFAULT 0 NOT NULL,
    FOREIGN KEY (session_exercise_id) REFERENCES workout_session_exercises(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  'CREATE INDEX workout_sets_exercise_idx ON workout_sets (session_exercise_id, position)',
  `CREATE TABLE workout_progress_entries (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL,
    body_weight_milli_kg INTEGER,
    wellbeing TEXT DEFAULT '' NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  'CREATE INDEX workout_progress_entries_date_idx ON workout_progress_entries (date)',
  `CREATE TABLE workout_progress_metrics (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL,
    exercise_id TEXT,
    exercise_title_snapshot TEXT NOT NULL,
    muscle_group_snapshot TEXT NOT NULL,
    uses_external_weight_snapshot INTEGER DEFAULT true NOT NULL,
    weight_milli_kg INTEGER DEFAULT 0 NOT NULL,
    reps INTEGER NOT NULL,
    comment TEXT DEFAULT '' NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES workout_progress_entries(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES workout_exercises(id) ON UPDATE NO ACTION ON DELETE RESTRICT
  )`,
  'CREATE INDEX workout_progress_metrics_entry_idx ON workout_progress_metrics (entry_id, position)',
  'CREATE INDEX workout_progress_metrics_exercise_idx ON workout_progress_metrics (exercise_id)',
  `CREATE TABLE workout_progress_photos (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    url TEXT NOT NULL,
    view TEXT DEFAULT 'custom' NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES workout_progress_entries(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  'CREATE INDEX workout_progress_photos_entry_idx ON workout_progress_photos (entry_id, created_at)',
  'CREATE INDEX workout_progress_photos_entry_view_idx ON workout_progress_photos (entry_id, view, created_at)',
  `WITH default_exercises (id, title, muscle_group, uses_external_weight) AS (
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
  SELECT id, title, muscle_group, uses_external_weight, '', 'active', 1788453300000, 1788453300000
  FROM default_exercises`
]
