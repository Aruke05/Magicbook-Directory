CREATE TABLE `auto_reply_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text DEFAULT 'both' NOT NULL,
	`match_type` text DEFAULT 'contains' NOT NULL,
	`keyword_mode` text DEFAULT 'any' NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`reply_text` text NOT NULL,
	`ignore_case` integer DEFAULT true NOT NULL,
	`ignore_whitespace` integer DEFAULT false NOT NULL,
	`ignore_punctuation` integer DEFAULT false NOT NULL,
	`min_ocr_confidence` integer DEFAULT 65 NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`cooldown_seconds` integer DEFAULT 10 NOT NULL,
	`allowed_chat_ids` text DEFAULT '' NOT NULL,
	`stop_on_match` integer DEFAULT true NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auto_reply_rules_enabled_idx` ON `auto_reply_rules` (`enabled`);--> statement-breakpoint
CREATE INDEX `auto_reply_rules_priority_idx` ON `auto_reply_rules` (`priority`);