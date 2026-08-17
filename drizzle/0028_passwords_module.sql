CREATE TABLE `password_vault` (
  `id` text PRIMARY KEY NOT NULL,
  `version` integer DEFAULT 1 NOT NULL,
  `kdf_salt` text NOT NULL,
  `kdf_n` integer NOT NULL,
  `kdf_r` integer NOT NULL,
  `kdf_p` integer NOT NULL,
  `wrapped_key_nonce` text NOT NULL,
  `wrapped_key_ciphertext` text NOT NULL,
  `wrapped_key_tag` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `password_groups` (
  `id` text PRIMARY KEY NOT NULL,
  `encrypted_payload` text NOT NULL,
  `position` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `password_groups_position_idx` ON `password_groups` (`position`,`created_at`);
--> statement-breakpoint
CREATE TABLE `password_items` (
  `id` text PRIMARY KEY NOT NULL,
  `group_id` text,
  `encrypted_payload` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`group_id`) REFERENCES `password_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `password_items_group_idx` ON `password_items` (`group_id`);
--> statement-breakpoint
CREATE INDEX `password_items_updated_idx` ON `password_items` (`updated_at`);
