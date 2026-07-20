import "server-only"
import crypto from "node:crypto"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db/client"
import { promptRules } from "@/db/schema"
import { getTemplate } from "./template-service"
import { parseConditionTree, validateConditionTree } from "./rule-schema"
import { validateTemplate } from "./renderer"
import type { RuleConditionGroup, RuleRecord } from "./types"

function toRule(row: typeof promptRules.$inferSelect): RuleRecord {
  return { ...row, conditionTree: parseConditionTree(row.conditionTree) }
}

export function listRules(templateId?: string) {
  return db.select().from(promptRules).where(templateId ? eq(promptRules.templateId, templateId) : undefined).orderBy(desc(promptRules.priority), desc(promptRules.updatedAt)).all().map(toRule)
}

export function getRule(id: string) {
  const row = db.select().from(promptRules).where(eq(promptRules.id, id)).get()
  return row ? toRule(row) : null
}

export function saveRule(input: {
  id?: string
  templateId: string
  name: string
  description: string
  conditionTree: RuleConditionGroup
  priority: number
  customContent: string
  enabled: boolean
}) {
  const template = getTemplate(input.templateId)
  if (!template) throw new Error("所属模板不存在")
  if (!input.name.trim()) throw new Error("规则名称不能为空")
  validateConditionTree(input.conditionTree, template.fields)
  validateTemplate(input.customContent, template.fields)
  const values = {
    templateId: input.templateId,
    name: input.name.trim(),
    description: input.description.trim(),
    conditionTree: JSON.stringify(input.conditionTree),
    priority: Math.trunc(input.priority),
    customContent: input.customContent,
    enabled: input.enabled,
    updatedAt: new Date(),
  }
  if (input.id) {
    db.update(promptRules).set(values).where(eq(promptRules.id, input.id)).run()
    return input.id
  }
  const id = crypto.randomUUID()
  db.insert(promptRules).values({ id, ...values }).run()
  return id
}

export function copyRule(id: string) {
  const rule = getRule(id)
  if (!rule) throw new Error("规则不存在")
  return saveRule({ ...rule, id: undefined, name: `${rule.name} 副本`, enabled: false })
}

export function deleteRule(id: string) {
  db.delete(promptRules).where(eq(promptRules.id, id)).run()
}
