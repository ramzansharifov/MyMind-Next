ALTER TABLE `workout_exercises` ADD `uses_external_weight` integer DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `workout_session_exercises` ADD `uses_external_weight_snapshot` integer DEFAULT true NOT NULL;
