CREATE TABLE `study_code_node_names` (
  `node_id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `name_key` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`node_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_code_node_names_key_unique` ON `study_code_node_names` (`name_key`);
--> statement-breakpoint
CREATE TABLE `study_code_block_names` (
  `block_id` text PRIMARY KEY NOT NULL,
  `material_id` text NOT NULL,
  `name` text NOT NULL,
  `name_key` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`material_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_code_block_names_material_key_unique` ON `study_code_block_names` (`material_id`,`name_key`);
--> statement-breakpoint
CREATE INDEX `study_code_block_names_material_idx` ON `study_code_block_names` (`material_id`);
