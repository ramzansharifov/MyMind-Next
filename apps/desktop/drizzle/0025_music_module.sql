CREATE TABLE `music_items` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `type` text DEFAULT 'track' NOT NULL,
  `year` integer,
  `cover_url` text,
  `artists_json` text DEFAULT '[]' NOT NULL,
  `album` text DEFAULT '' NOT NULL,
  `duration_seconds` integer,
  `track_count` integer,
  `genres_json` text DEFAULT '[]' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'want_to_listen' NOT NULL,
  `favorite` integer DEFAULT false NOT NULL,
  `rating` integer,
  `comments` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `music_items_status_updated_idx` ON `music_items` (`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `music_items_favorite_updated_idx` ON `music_items` (`favorite`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `music_items_title_idx` ON `music_items` (`title`);
