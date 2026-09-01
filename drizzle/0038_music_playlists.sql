CREATE TABLE `music_playlists` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `music_playlists_name_idx` ON `music_playlists` (`name`);
--> statement-breakpoint
CREATE INDEX `music_playlists_updated_idx` ON `music_playlists` (`updated_at`);
--> statement-breakpoint
CREATE TABLE `music_playlist_items` (
  `playlist_id` text NOT NULL,
  `music_item_id` text NOT NULL,
  `created_at` integer NOT NULL,
  PRIMARY KEY(`playlist_id`, `music_item_id`),
  FOREIGN KEY (`playlist_id`) REFERENCES `music_playlists`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`music_item_id`) REFERENCES `music_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `music_playlist_items_music_item_idx` ON `music_playlist_items` (`music_item_id`);
