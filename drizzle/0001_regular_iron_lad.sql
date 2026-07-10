CREATE TABLE `study_materials` (
	`node_id` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`plain_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `study_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`is_expanded` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_nodes_parent_position_idx` ON `study_nodes` (`parent_id`,`position`);--> statement-breakpoint
CREATE INDEX `study_nodes_title_idx` ON `study_nodes` (`title`);