DROP INDEX IF EXISTS `habits_group_status_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `habits_status_start_idx`;
--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `description`;
--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `status`;
--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `start_date`;
--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `end_date`;
--> statement-breakpoint
ALTER TABLE `habits` DROP COLUMN `archived_on`;
--> statement-breakpoint
CREATE INDEX `habits_group_updated_idx` ON `habits` (`group_id`,`updated_at`);
