CREATE TABLE `workout_exercises` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `muscle_group` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_muscle_group_idx` ON `workout_exercises` (`muscle_group`);
--> statement-breakpoint
CREATE INDEX `workout_exercises_status_idx` ON `workout_exercises` (`status`);
--> statement-breakpoint
CREATE TABLE `workout_programs` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_programs_status_idx` ON `workout_programs` (`status`);
--> statement-breakpoint
CREATE TABLE `workout_program_exercises` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text NOT NULL,
  `exercise_id` text NOT NULL,
  `position` integer NOT NULL,
  `planned_sets` integer DEFAULT 3 NOT NULL,
  `target_reps` integer,
  `notes` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`program_id`) REFERENCES `workout_programs`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `workout_program_exercises_program_idx` ON `workout_program_exercises` (`program_id`,`position`);
--> statement-breakpoint
CREATE INDEX `workout_program_exercises_exercise_idx` ON `workout_program_exercises` (`exercise_id`);
--> statement-breakpoint
CREATE TABLE `workout_sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `program_id` text,
  `program_name_snapshot` text,
  `title` text DEFAULT '' NOT NULL,
  `date` text NOT NULL,
  `duration_minutes` integer,
  `comment` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`program_id`) REFERENCES `workout_programs`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_sessions_date_idx` ON `workout_sessions` (`date`);
--> statement-breakpoint
CREATE INDEX `workout_sessions_program_idx` ON `workout_sessions` (`program_id`);
--> statement-breakpoint
CREATE TABLE `workout_session_exercises` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL,
  `exercise_id` text,
  `exercise_title_snapshot` text NOT NULL,
  `muscle_group_snapshot` text NOT NULL,
  `position` integer NOT NULL,
  `comment` text DEFAULT '' NOT NULL,
  FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_session_exercises_session_idx` ON `workout_session_exercises` (`session_id`,`position`);
--> statement-breakpoint
CREATE INDEX `workout_session_exercises_exercise_idx` ON `workout_session_exercises` (`exercise_id`);
--> statement-breakpoint
CREATE INDEX `workout_session_exercises_group_idx` ON `workout_session_exercises` (`muscle_group_snapshot`);
--> statement-breakpoint
CREATE TABLE `workout_sets` (
  `id` text PRIMARY KEY NOT NULL,
  `session_exercise_id` text NOT NULL,
  `position` integer NOT NULL,
  `reps` integer NOT NULL,
  `weight_milli_kg` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`session_exercise_id`) REFERENCES `workout_session_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`session_exercise_id`,`position`);
--> statement-breakpoint
CREATE TABLE `workout_progress_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `date` text NOT NULL,
  `body_weight_milli_kg` integer,
  `wellbeing` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_progress_entries_date_idx` ON `workout_progress_entries` (`date`);
--> statement-breakpoint
CREATE TABLE `workout_progress_metrics` (
  `id` text PRIMARY KEY NOT NULL,
  `entry_id` text NOT NULL,
  `exercise_id` text,
  `exercise_title_snapshot` text NOT NULL,
  `muscle_group_snapshot` text NOT NULL,
  `weight_milli_kg` integer DEFAULT 0 NOT NULL,
  `reps` integer NOT NULL,
  `comment` text DEFAULT '' NOT NULL,
  `position` integer NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `workout_progress_entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workout_progress_metrics_entry_idx` ON `workout_progress_metrics` (`entry_id`,`position`);
--> statement-breakpoint
CREATE INDEX `workout_progress_metrics_exercise_idx` ON `workout_progress_metrics` (`exercise_id`);
--> statement-breakpoint
CREATE TABLE `workout_progress_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `entry_id` text NOT NULL,
  `asset_id` text NOT NULL,
  `file_name` text NOT NULL,
  `mime_type` text NOT NULL,
  `size` integer NOT NULL,
  `url` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `workout_progress_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_progress_photos_entry_idx` ON `workout_progress_photos` (`entry_id`,`created_at`);
