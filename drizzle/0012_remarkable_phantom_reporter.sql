CREATE TABLE `finance_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`currency_code` text NOT NULL,
	`initial_balance_minor` integer DEFAULT 0 NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `finance_accounts_currency_idx` ON `finance_accounts` (`currency_code`);--> statement-breakpoint
CREATE INDEX `finance_accounts_type_idx` ON `finance_accounts` (`type`);--> statement-breakpoint
CREATE TABLE `finance_exchange_rates` (
	`currency_code` text PRIMARY KEY NOT NULL,
	`base_currency_code` text NOT NULL,
	`rate_scaled` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `finance_exchange_rates_base_idx` ON `finance_exchange_rates` (`base_currency_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_exchange_rates_currency_base_unique` ON `finance_exchange_rates` (`currency_code`,`base_currency_code`);--> statement-breakpoint
CREATE TABLE `finance_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`currency_code` text NOT NULL,
	`scope_type` text NOT NULL,
	`account_id` text,
	`tag_id` text,
	`period_type` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`warning_percent` integer DEFAULT 80 NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `finance_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_limits_state_idx` ON `finance_limits` (`state`);--> statement-breakpoint
CREATE INDEX `finance_limits_account_state_idx` ON `finance_limits` (`account_id`,`state`);--> statement-breakpoint
CREATE INDEX `finance_limits_tag_state_idx` ON `finance_limits` (`tag_id`,`state`);--> statement-breakpoint
CREATE TABLE `finance_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`base_currency_code` text DEFAULT 'TJS' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `finance_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`icon` text NOT NULL,
	`color` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `finance_tags_type_idx` ON `finance_tags` (`type`);--> statement-breakpoint
CREATE INDEX `finance_tags_name_idx` ON `finance_tags` (`name`);--> statement-breakpoint
CREATE TABLE `finance_transaction_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`account_id` text NOT NULL,
	`signed_amount_minor` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `finance_transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `finance_entries_account_transaction_idx` ON `finance_transaction_entries` (`account_id`,`transaction_id`);--> statement-breakpoint
CREATE INDEX `finance_entries_transaction_idx` ON `finance_transaction_entries` (`transaction_id`);--> statement-breakpoint
CREATE TABLE `finance_transaction_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`source_account_id` text,
	`destination_account_id` text,
	`tag_id` text,
	`source_amount_minor` integer NOT NULL,
	`destination_amount_minor` integer,
	`comment` text DEFAULT '' NOT NULL,
	`schedule_type` text NOT NULL,
	`schedule_interval` integer DEFAULT 1 NOT NULL,
	`next_occurrence_at` integer,
	`reminder_enabled` integer DEFAULT false NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`last_used_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`destination_account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `finance_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `finance_templates_state_next_idx` ON `finance_transaction_templates` (`state`,`next_occurrence_at`);--> statement-breakpoint
CREATE INDEX `finance_templates_type_idx` ON `finance_transaction_templates` (`type`);--> statement-breakpoint
CREATE INDEX `finance_templates_source_account_idx` ON `finance_transaction_templates` (`source_account_id`);--> statement-breakpoint
CREATE INDEX `finance_templates_destination_account_idx` ON `finance_transaction_templates` (`destination_account_id`);--> statement-breakpoint
CREATE INDEX `finance_templates_tag_idx` ON `finance_transaction_templates` (`tag_id`);--> statement-breakpoint
CREATE TABLE `finance_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`tag_id` text,
	`tag_name_snapshot` text,
	`tag_icon_snapshot` text,
	`tag_color_snapshot` text,
	`template_id` text,
	`template_name_snapshot` text,
	`occurred_at` integer NOT NULL,
	`comment` text DEFAULT '' NOT NULL,
	`exchange_rate_scaled` integer,
	`is_system` integer DEFAULT false NOT NULL,
	`system_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `finance_tags`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`template_id`) REFERENCES `finance_transaction_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `finance_transactions_date_idx` ON `finance_transactions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_transactions_type_date_idx` ON `finance_transactions` (`type`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_transactions_tag_date_idx` ON `finance_transactions` (`tag_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_transactions_template_date_idx` ON `finance_transactions` (`template_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `finance_transactions_system_date_idx` ON `finance_transactions` (`is_system`,`occurred_at`);