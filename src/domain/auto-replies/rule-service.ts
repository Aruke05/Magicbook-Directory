import "server-only"
import { randomUUID } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db/client"
import { autoReplyRules } from "@/db/schema"
import { keywordModes, matchTypes, replySources, type AutoReplyRule, type AutoReplyRuleInput } from "./types"

const ruleInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "请输入规则名称").max(80),
  source: z.enum(replySources),
  matchType: z.enum(matchTypes),
  keywordMode: z.enum(keywordModes),
  keywords: z.array(z.string().trim().min(1)).min(1, "至少填写一个关键词").max(100),
  replyText: z.string().trim().min(1, "请输入回复语句").max(4000),
  ignoreCase: z.boolean(),
  ignoreWhitespace: z.boolean(),
  ignorePunctuation: z.boolean(),
  minOcrConfidence: z.number().int().min(0).max(100),
  priority: z.number().int().min(-9999).max(9999),
  cooldownSeconds: z.number().int().min(0).max(86400),
  allowedChatIds: z.string().max(2000),
  stopOnMatch: z.boolean(),
  enabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.matchType !== "regex") return
  value.keywords.forEach((keyword, index) => {
    try { new RegExp(keyword, value.ignoreCase ? "iu" : "u") }
    catch { context.addIssue({ code: "custom", path: ["keywords", index], message: `正则表达式无效：${keyword}` }) }
  })
})

function parseKeywords(value: string) {
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
  } catch { return [] }
}

function toRule(row: typeof autoReplyRules.$inferSelect): AutoReplyRule {
  return { ...row, keywords: parseKeywords(row.keywords) }
}

export function listAutoReplyRules(options: { enabledOnly?: boolean } = {}) {
  const query = options.enabledOnly
    ? db.select().from(autoReplyRules).where(and(eq(autoReplyRules.enabled, true)))
    : db.select().from(autoReplyRules)
  return query.orderBy(desc(autoReplyRules.priority), desc(autoReplyRules.updatedAt)).all().map(toRule)
}

export function getAutoReplyRule(id: string) {
  const row = db.select().from(autoReplyRules).where(eq(autoReplyRules.id, id)).get()
  return row ? toRule(row) : null
}

export function saveAutoReplyRule(input: AutoReplyRuleInput) {
  const parsed = ruleInputSchema.parse({
    ...input,
    keywords: [...new Set(input.keywords.map((item) => item.trim()).filter(Boolean))],
    allowedChatIds: input.allowedChatIds.trim(),
  })
  const id = parsed.id ?? randomUUID()
  const values = { ...parsed, id, keywords: JSON.stringify(parsed.keywords), updatedAt: new Date() }
  if (parsed.id) {
    const existing = db.select({ id: autoReplyRules.id }).from(autoReplyRules).where(eq(autoReplyRules.id, parsed.id)).get()
    if (!existing) throw new Error("自动回复规则不存在")
    db.update(autoReplyRules).set(values).where(eq(autoReplyRules.id, parsed.id)).run()
  } else {
    db.insert(autoReplyRules).values({ ...values, createdAt: new Date() }).run()
  }
  return id
}

export function setAutoReplyRuleEnabled(id: string, enabled: boolean) {
  db.update(autoReplyRules).set({ enabled, updatedAt: new Date() }).where(eq(autoReplyRules.id, id)).run()
}

export function deleteAutoReplyRule(id: string) {
  db.delete(autoReplyRules).where(eq(autoReplyRules.id, id)).run()
}
