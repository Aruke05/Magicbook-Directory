CREATE TABLE `admin_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_idx` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `login_rate_limits` (
	`key_hash` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL,
	`blocked_until` integer
);
--> statement-breakpoint
CREATE TABLE `prompt_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_idx` ON `prompt_categories` (`slug`);--> statement-breakpoint
CREATE TABLE `prompt_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text,
	`matched_rule_id` text,
	`template_name` text NOT NULL,
	`matched_rule_name` text,
	`input_data` text NOT NULL,
	`generated_content` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`matched_rule_id`) REFERENCES `prompt_rules`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `generations_template_idx` ON `prompt_generations` (`template_id`);--> statement-breakpoint
CREATE INDEX `generations_created_idx` ON `prompt_generations` (`created_at`);--> statement-breakpoint
CREATE TABLE `prompt_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`condition_tree` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`custom_content` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `prompt_templates`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rules_template_idx` ON `prompt_rules` (`template_id`);--> statement-breakpoint
CREATE INDEX `rules_enabled_idx` ON `prompt_rules` (`enabled`);--> statement-breakpoint
CREATE INDEX `rules_priority_idx` ON `prompt_rules` (`priority`);--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`field_schema` text DEFAULT '[]' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `prompt_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `templates_slug_idx` ON `prompt_templates` (`slug`);--> statement-breakpoint
CREATE INDEX `templates_category_idx` ON `prompt_templates` (`category_id`);--> statement-breakpoint
CREATE INDEX `templates_enabled_idx` ON `prompt_templates` (`enabled`);