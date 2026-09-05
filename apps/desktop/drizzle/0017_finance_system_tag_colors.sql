UPDATE `finance_transactions`
SET `tag_color_snapshot` = CASE (
  SELECT `type` FROM `finance_tags` WHERE `finance_tags`.`id` = `finance_transactions`.`tag_id`
)
  WHEN 'income' THEN '#34d399'
  WHEN 'expense' THEN '#f87171'
  WHEN 'both' THEN '#fbbf24'
  ELSE `tag_color_snapshot`
END
WHERE `tag_id` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `finance_accounts` DROP COLUMN `color`;
--> statement-breakpoint
ALTER TABLE `finance_tags` DROP COLUMN `color`;
