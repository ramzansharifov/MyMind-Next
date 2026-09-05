CREATE TABLE `__new_movies` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `original_title` text,
  `year` integer,
  `poster_url` text,
  `director` text DEFAULT '' NOT NULL,
  `runtime_minutes` integer,
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
INSERT INTO `__new_movies` (
  `id`, `title`, `original_title`, `year`, `poster_url`, `director`, `runtime_minutes`,
  `genres_json`, `actors_json`, `description`, `status`, `favorite`, `rating`, `comments`,
  `created_at`, `updated_at`
)
SELECT
  `id`, `title`, `original_title`, `year`, `poster_url`, `director`, `runtime_minutes`,
  `genres_json`, '[]', `description`, `status`, `favorite`,
  CASE WHEN `status` = 'watched' THEN CAST(ROUND(`rating`) AS INTEGER) ELSE NULL END,
  `notes`, `created_at`, `updated_at`
FROM `movies`;
--> statement-breakpoint
DROP TABLE `movies`;
--> statement-breakpoint
ALTER TABLE `__new_movies` RENAME TO `movies`;
--> statement-breakpoint
CREATE INDEX `movies_status_updated_idx` ON `movies` (`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `movies_favorite_updated_idx` ON `movies` (`favorite`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `movies_title_idx` ON `movies` (`title`);
