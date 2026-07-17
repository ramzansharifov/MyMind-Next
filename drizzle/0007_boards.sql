CREATE TABLE `board_documents` (
	`node_id` text PRIMARY KEY NOT NULL,
	`snapshot` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`node_id`) REFERENCES `board_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `board_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_expanded` integer DEFAULT true NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`source_study_node_id` text,
	`source_material_id` text,
	`source_block_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `board_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_study_node_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_material_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `board_nodes_parent_position_idx` ON `board_nodes` (`parent_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `board_nodes_source_study_node_unique` ON `board_nodes` (`source_study_node_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `board_nodes_source_material_block_unique` ON `board_nodes` (`source_material_id`,`source_block_id`);