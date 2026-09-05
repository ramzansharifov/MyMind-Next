CREATE TABLE `finance_limit_accounts` (
  `limit_id` text NOT NULL,
  `account_id` text NOT NULL,
  FOREIGN KEY (`limit_id`) REFERENCES `finance_limits`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`account_id`) REFERENCES `finance_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_limit_accounts_limit_account_unique` ON `finance_limit_accounts` (`limit_id`,`account_id`);
--> statement-breakpoint
CREATE INDEX `finance_limit_accounts_account_idx` ON `finance_limit_accounts` (`account_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `finance_limit_accounts` (`limit_id`, `account_id`)
SELECT `id`, `account_id`
FROM `finance_limits`
WHERE `account_id` IS NOT NULL;
