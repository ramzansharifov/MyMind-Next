DROP INDEX IF EXISTS `finance_templates_state_next_idx`;--> statement-breakpoint
UPDATE `finance_limits` SET `period_type` = 'month' WHERE `period_type` = 'custom';--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `schedule_type`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `schedule_interval`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `next_occurrence_at`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `reminder_enabled`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `state`;--> statement-breakpoint
ALTER TABLE `finance_transaction_templates` DROP COLUMN `last_used_at`;--> statement-breakpoint
ALTER TABLE `finance_limits` DROP COLUMN `name`;
