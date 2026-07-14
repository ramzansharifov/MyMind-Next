ALTER TABLE `study_link_targets` ADD `material_title` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_link_targets` ADD `folder_path` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `study_link_targets` ADD `folder_path_search` text DEFAULT '' NOT NULL;