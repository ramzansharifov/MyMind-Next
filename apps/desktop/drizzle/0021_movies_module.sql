CREATE TABLE `movies` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `original_title` text,
  `year` integer,
  `poster_url` text,
  `director` text DEFAULT '' NOT NULL,
  `runtime_minutes` integer,
  `genres_json` text DEFAULT '[]' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'watchlist' NOT NULL,
  `favorite` integer DEFAULT false NOT NULL,
  `rating` real,
  `watched_at` integer,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `movies_status_updated_idx` ON `movies` (`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `movies_favorite_updated_idx` ON `movies` (`favorite`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `movies_title_idx` ON `movies` (`title`);
