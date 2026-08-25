ALTER TABLE `workout_progress_metrics` ADD `uses_external_weight_snapshot` integer DEFAULT true NOT NULL;
--> statement-breakpoint
UPDATE `workout_progress_metrics`
SET `uses_external_weight_snapshot` = COALESCE(
  (
    SELECT `uses_external_weight`
    FROM `workout_exercises`
    WHERE `workout_exercises`.`id` = `workout_progress_metrics`.`exercise_id`
  ),
  1
);
--> statement-breakpoint
ALTER TABLE `workout_progress_photos` ADD `view` text DEFAULT 'custom' NOT NULL;
--> statement-breakpoint
CREATE INDEX `workout_progress_photos_entry_view_idx` ON `workout_progress_photos` (`entry_id`, `view`, `created_at`);