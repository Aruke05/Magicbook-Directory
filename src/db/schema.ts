import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
}

export const promptCategories = sqliteTable("prompt_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [uniqueIndex("categories_slug_idx").on(table.slug)])

export const promptTemplates = sqliteTable("prompt_templates", {
  id: text("id").primaryKey(),
  categoryId: text("category_id").references(() => promptCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  content: text("content").notNull(),
  fieldSchema: text("field_schema").notNull().default("[]"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("templates_slug_idx").on(table.slug),
  index("templates_category_idx").on(table.categoryId),
  index("templates_enabled_idx").on(table.enabled),
])

export const globalParameters = sqliteTable("global_parameters", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind", { enum: ["fixed", "select", "mapping"] }).notNull().default("fixed"),
  valueType: text("value_type", { enum: ["text", "url", "multiline"] }).notNull().default("text"),
  value: text("value").notNull().default(""),
  options: text("options").notNull().default("[]"),
  sourceParameterKey: text("source_parameter_key"),
  mappingRules: text("mapping_rules").notNull().default("[]"),
  fallback: text("fallback").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("global_parameters_key_idx").on(table.key),
  index("global_parameters_enabled_idx").on(table.enabled),
  index("global_parameters_sort_idx").on(table.sortOrder),
])

export const promptGenerations = sqliteTable("prompt_generations", {
  id: text("id").primaryKey(),
  templateId: text("template_id").references(() => promptTemplates.id, { onDelete: "set null" }),
  templateName: text("template_name").notNull(),
  inputData: text("input_data").notNull(),
  generatedContent: text("generated_content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  index("generations_template_idx").on(table.templateId),
  index("generations_created_idx").on(table.createdAt),
])

export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  userAgent: text("user_agent").notNull().default(""),
}, (table) => [uniqueIndex("sessions_token_hash_idx").on(table.tokenHash)])

export const loginRateLimits = sqliteTable("login_rate_limits", {
  keyHash: text("key_hash").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: integer("window_started_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  blockedUntil: integer("blocked_until", { mode: "timestamp" }),
})

export const autoReplyRules = sqliteTable("auto_reply_rules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  source: text("source", { enum: ["text", "image", "both"] }).notNull().default("both"),
  matchType: text("match_type", { enum: ["contains", "exact", "regex"] }).notNull().default("contains"),
  keywordMode: text("keyword_mode", { enum: ["any", "all"] }).notNull().default("any"),
  keywords: text("keywords").notNull().default("[]"),
  replyText: text("reply_text").notNull(),
  ignoreCase: integer("ignore_case", { mode: "boolean" }).notNull().default(true),
  ignoreWhitespace: integer("ignore_whitespace", { mode: "boolean" }).notNull().default(false),
  ignorePunctuation: integer("ignore_punctuation", { mode: "boolean" }).notNull().default(false),
  minOcrConfidence: integer("min_ocr_confidence").notNull().default(65),
  priority: integer("priority").notNull().default(0),
  cooldownSeconds: integer("cooldown_seconds").notNull().default(10),
  allowedChatIds: text("allowed_chat_ids").notNull().default(""),
  stopOnMatch: integer("stop_on_match", { mode: "boolean" }).notNull().default(true),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, (table) => [
  index("auto_reply_rules_enabled_idx").on(table.enabled),
  index("auto_reply_rules_priority_idx").on(table.priority),
])
