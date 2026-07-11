CREATE TABLE `study_link_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`material_id` text NOT NULL,
	`heading_id` text,
	`title` text NOT NULL,
	`heading_level` integer,
	`position` integer NOT NULL,
	`search_text` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`material_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `study_link_targets_material_position_idx` ON `study_link_targets` (`material_id`,`position`);--> statement-breakpoint
CREATE INDEX `study_link_targets_search_idx` ON `study_link_targets` (`search_text`);