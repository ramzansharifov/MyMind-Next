ALTER TABLE `board_nodes` ADD `icon` text;
--> statement-breakpoint
UPDATE board_nodes SET icon = 'folder' WHERE type = 'folder' AND icon IS NULL;
--> statement-breakpoint
UPDATE board_nodes
SET icon = COALESCE((SELECT icon FROM study_nodes WHERE study_nodes.id = board_nodes.source_study_node_id), 'folder')
WHERE type = 'folder' AND source_study_node_id IS NOT NULL;
