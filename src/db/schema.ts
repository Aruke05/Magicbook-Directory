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
