DROP TABLE `prompt_rules`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_prompt_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text,
	`template_name` text NOT NULL,
	`input_data` text NOT NULL,
	`generated_content` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_prompt_generations`("id", "template_id", "template_name", "input_data", "generated_content", "created_at") SELECT "id", "template_id", "template_name", "input_data", "generated_content", "created_at" FROM `prompt_generations`;--> statement-breakpoint
DROP TABLE `prompt_generations`;--> statement-breakpoint
ALTER TABLE `__new_prompt_generations` RENAME TO `prompt_generations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `generations_template_idx` ON `prompt_generations` (`template_id`);--> statement-breakpoint
CREATE INDEX `generations_created_idx` ON `prompt_generations` (`created_at`);