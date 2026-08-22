CREATE TABLE `diaries` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`icon` text NOT NULL,
	`paper_pattern` text DEFAULT 'ruled' NOT NULL,
	`paper_tone` text DEFAULT 'natural' NOT NULL,
	`cover_tone` text DEFAULT 'walnut' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `diaries_updated_idx` ON `diaries` (`updated_at`);--> statement-breakpoint
CREATE TABLE `diary_days` (
	`id` text PRIMARY KEY NOT NULL,
	`diary_id` text NOT NULL,
	`day_key` text NOT NULL,
	`mood` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`diary_id`) REFERENCES `diaries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `diary_days_diary_day_uq` ON `diary_days` (`diary_id`,`day_key`);--> statement-breakpoint
CREATE INDEX `diary_days_diary_day_idx` ON `diary_days` (`diary_id`,`day_key`);--> statement-breakpoint
CREATE INDEX `diary_days_diary_updated_idx` ON `diary_days` (`diary_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `diary_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`diary_day_id` text NOT NULL,
	`text` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`diary_day_id`) REFERENCES `diary_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `diary_entries_day_time_idx` ON `diary_entries` (`diary_day_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `diary_entries_updated_idx` ON `diary_entries` (`updated_at`);--> statement-breakpoint
CREATE TABLE `habit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`habit_id` text NOT NULL,
	`date` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_entries_habit_date_unique` ON `habit_entries` (`habit_id`,`date`);--> statement-breakpoint
CREATE INDEX `habit_entries_date_idx` ON `habit_entries` (`date`);--> statement-breakpoint
CREATE INDEX `habit_entries_habit_idx` ON `habit_entries` (`habit_id`);--> statement-breakpoint
CREATE TABLE `habit_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT 'violet' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `habit_groups_position_idx` ON `habit_groups` (`position`,`created_at`);--> statement-breakpoint
CREATE INDEX `habit_groups_name_idx` ON `habit_groups` (`name`);--> statement-breakpoint
CREATE TABLE `habits` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`group_id` text,
	`tracking_type` text DEFAULT 'check' NOT NULL,
	`target_value` integer DEFAULT 1 NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`repeat_every_days` integer DEFAULT 1 NOT NULL,
	`preferred_time` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `habit_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `habits_group_updated_idx` ON `habits` (`group_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `habits_updated_idx` ON `habits` (`updated_at`);--> statement-breakpoint
CREATE TABLE `movies` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`type` text DEFAULT 'movie' NOT NULL,
	`year` integer,
	`poster_url` text,
	`director` text DEFAULT '' NOT NULL,
	`runtime_minutes` integer,
	`season_count` integer,
	`episodes_per_season` integer,
	`episode_runtime_minutes` integer,
	`genres_json` text DEFAULT '[]' NOT NULL,
	`actors_json` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'watchlist' NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`rating` integer,
	`comments` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `movies_status_updated_idx` ON `movies` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `movies_favorite_updated_idx` ON `movies` (`favorite`,`updated_at`);--> statement-breakpoint
CREATE INDEX `movies_title_idx` ON `movies` (`title`);--> statement-breakpoint
CREATE TABLE `music_items` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`type` text DEFAULT 'track' NOT NULL,
	`year` integer,
	`cover_url` text,
	`artists_json` text DEFAULT '[]' NOT NULL,
	`album` text DEFAULT '' NOT NULL,
	`duration_seconds` integer,
	`track_count` integer,
	`genres_json` text DEFAULT '[]' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'want_to_listen' NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`rating` integer,
	`comments` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `music_items_status_updated_idx` ON `music_items` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `music_items_favorite_updated_idx` ON `music_items` (`favorite`,`updated_at`);--> statement-breakpoint
CREATE INDEX `music_items_title_idx` ON `music_items` (`title`);--> statement-breakpoint
CREATE TABLE `nutrition_foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`category` text NOT NULL,
	`base_amount_milli` integer NOT NULL,
	`base_unit` text NOT NULL,
	`calories_milli` integer DEFAULT 0 NOT NULL,
	`protein_milli_g` integer DEFAULT 0 NOT NULL,
	`fat_milli_g` integer DEFAULT 0 NOT NULL,
	`carbs_milli_g` integer DEFAULT 0 NOT NULL,
	`fiber_milli_g` integer DEFAULT 0 NOT NULL,
	`sugar_milli_g` integer DEFAULT 0 NOT NULL,
	`sodium_milli_mg` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_foods_category_idx` ON `nutrition_foods` (`category`);--> statement-breakpoint
CREATE INDEX `nutrition_foods_status_idx` ON `nutrition_foods` (`status`);--> statement-breakpoint
CREATE INDEX `nutrition_foods_name_idx` ON `nutrition_foods` (`name`);--> statement-breakpoint
CREATE TABLE `nutrition_log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`meal_type` text NOT NULL,
	`custom_meal_name` text DEFAULT '' NOT NULL,
	`source_type` text NOT NULL,
	`source_id` text,
	`title_snapshot` text NOT NULL,
	`amount_milli` integer NOT NULL,
	`unit_snapshot` text NOT NULL,
	`calories_milli` integer DEFAULT 0 NOT NULL,
	`protein_milli_g` integer DEFAULT 0 NOT NULL,
	`fat_milli_g` integer DEFAULT 0 NOT NULL,
	`carbs_milli_g` integer DEFAULT 0 NOT NULL,
	`fiber_milli_g` integer DEFAULT 0 NOT NULL,
	`sugar_milli_g` integer DEFAULT 0 NOT NULL,
	`sodium_milli_mg` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_date_idx` ON `nutrition_log_entries` (`date`);--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_meal_idx` ON `nutrition_log_entries` (`date`,`meal_type`);--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_source_idx` ON `nutrition_log_entries` (`source_type`,`source_id`);--> statement-breakpoint
CREATE TABLE `nutrition_recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`food_id` text NOT NULL,
	`amount_milli` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `nutrition_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `nutrition_foods`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `nutrition_recipe_ingredients_recipe_idx` ON `nutrition_recipe_ingredients` (`recipe_id`,`position`);--> statement-breakpoint
CREATE INDEX `nutrition_recipe_ingredients_food_idx` ON `nutrition_recipe_ingredients` (`food_id`);--> statement-breakpoint
CREATE TABLE `nutrition_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`servings_milli` integer NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_recipes_status_idx` ON `nutrition_recipes` (`status`);--> statement-breakpoint
CREATE INDEX `nutrition_recipes_name_idx` ON `nutrition_recipes` (`name`);--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`calories_milli` integer,
	`protein_milli_g` integer,
	`fat_milli_g` integer,
	`carbs_milli_g` integer,
	`fiber_milli_g` integer,
	`water_ml` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_targets_period_idx` ON `nutrition_targets` (`effective_from`,`effective_to`);--> statement-breakpoint
CREATE TABLE `nutrition_water_days` (
	`date` text PRIMARY KEY NOT NULL,
	`water_ml` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_payload` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `password_groups_position_idx` ON `password_groups` (`position`,`created_at`);--> statement-breakpoint
CREATE TABLE `password_items` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text,
	`encrypted_payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `password_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `password_items_group_idx` ON `password_items` (`group_id`);--> statement-breakpoint
CREATE INDEX `password_items_updated_idx` ON `password_items` (`updated_at`);--> statement-breakpoint
CREATE TABLE `password_vault` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`kdf_salt` text NOT NULL,
	`kdf_n` integer NOT NULL,
	`kdf_r` integer NOT NULL,
	`kdf_p` integer NOT NULL,
	`wrapped_key_nonce` text NOT NULL,
	`wrapped_key_ciphertext` text NOT NULL,
	`wrapped_key_tag` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_code_block_names` (
	`block_id` text PRIMARY KEY NOT NULL,
	`material_id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_code_block_names_material_key_unique` ON `study_code_block_names` (`material_id`,`name_key`);--> statement-breakpoint
CREATE INDEX `study_code_block_names_material_idx` ON `study_code_block_names` (`material_id`);--> statement-breakpoint
CREATE TABLE `study_code_node_names` (
	`node_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_code_node_names_key_unique` ON `study_code_node_names` (`name_key`);--> statement-breakpoint
CREATE TABLE `task_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`color` text DEFAULT 'violet' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_groups_position_idx` ON `task_groups` (`position`,`created_at`);--> statement-breakpoint
CREATE INDEX `task_groups_name_idx` ON `task_groups` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`group_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`due_date` text,
	`due_time` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `task_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_status_due_idx` ON `tasks` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_group_status_idx` ON `tasks` (`group_id`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `tasks_updated_idx` ON `tasks` (`updated_at`);--> statement-breakpoint
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
CREATE INDEX `workout_exercises_muscle_group_idx` ON `workout_exercises` (`muscle_group`);--> statement-breakpoint
CREATE INDEX `workout_exercises_status_idx` ON `workout_exercises` (`status`);--> statement-breakpoint
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
CREATE INDEX `workout_program_exercises_program_idx` ON `workout_program_exercises` (`program_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_program_exercises_exercise_idx` ON `workout_program_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_programs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_programs_status_idx` ON `workout_programs` (`status`);--> statement-breakpoint
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
CREATE INDEX `workout_progress_entries_date_idx` ON `workout_progress_entries` (`date`);--> statement-breakpoint
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
	FOREIGN KEY (`exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `workout_progress_metrics_entry_idx` ON `workout_progress_metrics` (`entry_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_progress_metrics_exercise_idx` ON `workout_progress_metrics` (`exercise_id`);--> statement-breakpoint
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
CREATE INDEX `workout_progress_photos_entry_idx` ON `workout_progress_photos` (`entry_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workout_session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text,
	`exercise_title_snapshot` text NOT NULL,
	`muscle_group_snapshot` text NOT NULL,
	`position` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `workout_session_exercises_session_idx` ON `workout_session_exercises` (`session_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_session_exercises_exercise_idx` ON `workout_session_exercises` (`exercise_id`);--> statement-breakpoint
CREATE INDEX `workout_session_exercises_group_idx` ON `workout_session_exercises` (`muscle_group_snapshot`);--> statement-breakpoint
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
CREATE INDEX `workout_sessions_date_idx` ON `workout_sessions` (`date`);--> statement-breakpoint
CREATE INDEX `workout_sessions_program_idx` ON `workout_sessions` (`program_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`reps` integer NOT NULL,
	`weight_milli_kg` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`session_exercise_id`) REFERENCES `workout_session_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_sets_exercise_idx` ON `workout_sets` (`session_exercise_id`,`position`);--> statement-breakpoint
DROP INDEX `finance_templates_state_next_idx`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `schedule_type`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `schedule_interval`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `next_occurrence_at`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `reminder_enabled`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `state`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `last_used_at`;--> statement-breakpoint
ALTER TABLE `finance_accounts` DROP COLUMN `color`;--> statement-breakpoint
ALTER TABLE `finance_limits` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `finance_tags` DROP COLUMN `color`;