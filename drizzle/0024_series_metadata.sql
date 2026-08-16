ALTER TABLE `movies` ADD `season_count` integer;
--> statement-breakpoint
ALTER TABLE `movies` ADD `episodes_per_season` integer;
--> statement-breakpoint
ALTER TABLE `movies` ADD `episode_runtime_minutes` integer;
--> statement-breakpoint
UPDATE `movies`
SET `episode_runtime_minutes` = `runtime_minutes`, `runtime_minutes` = NULL
WHERE `type` IN ('series', 'animated_series') AND `runtime_minutes` IS NOT NULL;
--> statement-breakpoint
UPDATE `movies` SET `type` = 'movie' WHERE `type` = 'anime';
