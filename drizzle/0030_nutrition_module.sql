CREATE TABLE `nutrition_foods` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `brand` text DEFAULT '' NOT NULL,
  `category` text NOT NULL,
  `base_amount_milli` integer NOT NULL,
  `base_unit` text NOT NULL,
  `calories_milli` integer DEFAULT 0 NOT NULL,
  `protein_milli_g` integer DEFAULT 0 NOT NULL,
  `fat_milli_g` integer DEFAULT 0 NOT NULL,
  `carbs_milli_g` integer DEFAULT 0 NOT NULL,
  `fiber_milli_g` integer DEFAULT 0 NOT NULL,
  `sugar_milli_g` integer DEFAULT 0 NOT NULL,
  `sodium_milli_mg` integer DEFAULT 0 NOT NULL,
  `favorite` integer DEFAULT false NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_foods_category_idx` ON `nutrition_foods` (`category`);
--> statement-breakpoint
CREATE INDEX `nutrition_foods_status_idx` ON `nutrition_foods` (`status`);
--> statement-breakpoint
CREATE INDEX `nutrition_foods_name_idx` ON `nutrition_foods` (`name`);
--> statement-breakpoint
CREATE TABLE `nutrition_recipes` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `servings_milli` integer NOT NULL,
  `favorite` integer DEFAULT false NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_recipes_status_idx` ON `nutrition_recipes` (`status`);
--> statement-breakpoint
CREATE INDEX `nutrition_recipes_name_idx` ON `nutrition_recipes` (`name`);
--> statement-breakpoint
CREATE TABLE `nutrition_recipe_ingredients` (
  `id` text PRIMARY KEY NOT NULL,
  `recipe_id` text NOT NULL,
  `food_id` text NOT NULL,
  `amount_milli` integer NOT NULL,
  `position` integer NOT NULL,
  FOREIGN KEY (`recipe_id`) REFERENCES `nutrition_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`food_id`) REFERENCES `nutrition_foods`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `nutrition_recipe_ingredients_recipe_idx` ON `nutrition_recipe_ingredients` (`recipe_id`,`position`);
--> statement-breakpoint
CREATE INDEX `nutrition_recipe_ingredients_food_idx` ON `nutrition_recipe_ingredients` (`food_id`);
--> statement-breakpoint
CREATE TABLE `nutrition_log_entries` (
  `id` text PRIMARY KEY NOT NULL,
  `date` text NOT NULL,
  `meal_type` text NOT NULL,
  `custom_meal_name` text DEFAULT '' NOT NULL,
  `source_type` text NOT NULL,
  `source_id` text,
  `title_snapshot` text NOT NULL,
  `amount_milli` integer NOT NULL,
  `unit_snapshot` text NOT NULL,
  `calories_milli` integer DEFAULT 0 NOT NULL,
  `protein_milli_g` integer DEFAULT 0 NOT NULL,
  `fat_milli_g` integer DEFAULT 0 NOT NULL,
  `carbs_milli_g` integer DEFAULT 0 NOT NULL,
  `fiber_milli_g` integer DEFAULT 0 NOT NULL,
  `sugar_milli_g` integer DEFAULT 0 NOT NULL,
  `sodium_milli_mg` integer DEFAULT 0 NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_date_idx` ON `nutrition_log_entries` (`date`);
--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_meal_idx` ON `nutrition_log_entries` (`date`,`meal_type`);
--> statement-breakpoint
CREATE INDEX `nutrition_log_entries_source_idx` ON `nutrition_log_entries` (`source_type`,`source_id`);
--> statement-breakpoint
CREATE TABLE `nutrition_water_days` (
  `date` text PRIMARY KEY NOT NULL,
  `water_ml` integer DEFAULT 0 NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nutrition_targets` (
  `id` text PRIMARY KEY NOT NULL,
  `effective_from` text NOT NULL,
  `effective_to` text,
  `calories_milli` integer,
  `protein_milli_g` integer,
  `fat_milli_g` integer,
  `carbs_milli_g` integer,
  `fiber_milli_g` integer,
  `water_ml` integer,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nutrition_targets_period_idx` ON `nutrition_targets` (`effective_from`,`effective_to`);
