import "server-only"
import crypto from "node:crypto"
import { and, desc, eq, like, ne } from "drizzle-orm"
import { db } from "@/db/client"
import { promptCategories, promptTemplates } from "@/db/schema"
import { getGlobalParameterKeys, listGlobalParameters } from "@/domain/global-parameters/service"
import { parseFields, promptFieldsSchema } from "./field-schema"
import { validateTemplate } from "./renderer"
import type { PromptField, TemplateRecord } from "./types"

function toTemplate(row: typeof promptTemplates.$inferSelect): TemplateRecord {
  return { ...row, fields: parseFields(row.fieldSchema) }
}

export function listTemplates(options: { enabledOnly?: boolean; search?: string } = {}) {
  const conditions = []
  if (options.enabledOnly) conditions.push(eq(promptTemplates.enabled, true))
  if (options.search) conditions.push(like(promptTemplates.name, `%${options.search}%`))
  const rows = db.select().from(promptTemplates).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(promptTemplates.updatedAt)).all()
  return rows.map(toTemplate)
}

export function listCategories() {
  return db.select().from(promptCategories).orderBy(promptCategories.sortOrder, promptCategories.name).all()
}

export function getTemplate(id: string, enabledOnly = false) {
  const row = db.select().from(promptTemplates).where(enabledOnly
    ? and(eq(promptTemplates.id, id), eq(promptTemplates.enabled, true))
    : eq(promptTemplates.id, id)).get()
  return row ? toTemplate(row) : null
}

export function validateTemplateInput(input: {
  id?: string
  categoryId: string | null
  name: string
  slug: string
  description: string
  content: string
  fields: PromptField[]
  enabled: boolean
}) {
  if (!input.name.trim()) throw new Error("模板名称不能为空")
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new Error("模板标识只能使用小写字母、数字和连字符")
  const duplicate = db.select({ id: promptTemplates.id }).from(promptTemplates).where(input.id
    ? and(eq(promptTemplates.slug, input.slug), ne(promptTemplates.id, input.id))
    : eq(promptTemplates.slug, input.slug)).get()
  if (duplicate) throw new Error("模板标识已存在")
  const fields = promptFieldsSchema.parse(input.fields)
  fields.forEach((field) => {
    if (field.validation?.pattern) {
      try { new RegExp(field.validation.pattern) } catch { throw new Error(`字段“${field.label}”的正则表达式无效`) }
    }
  })
  const globalParameters = listGlobalParameters({ enabledOnly: true })
  const globalKeys = new Set(globalParameters.map((parameter) => parameter.key))
  for (const field of fields) {
    if (!field.mapping) continue
    const localSource = fields.find((item) => item.key === field.mapping?.sourceFieldKey)
    const globalSource = globalParameters.find((parameter) => parameter.key === field.mapping?.sourceFieldKey)
    if (!localSource && !globalSource) throw new Error(`字段“${field.label}”的映射来源不存在`)
    if (globalSource && globalSource.kind !== "select") throw new Error(`字段“${field.label}”只能使用选项型全局参数作为映射来源`)
  }
  const conflict = fields.find((field) => globalKeys.has(field.key))
  if (conflict) throw new Error(`字段 Key“${conflict.key}”与全局参数冲突，请删除模板内的重复字段`)
  validateTemplate(input.content, fields, getGlobalParameterKeys())
  return { ...input, name: input.name.trim(), slug: input.slug.trim(), fields }
}

export function saveTemplate(input: Parameters<typeof validateTemplateInput>[0]) {
  const valid = validateTemplateInput(input)
  const now = new Date()
  if (valid.id) {
    const existing = getTemplate(valid.id)
    if (!existing) throw new Error("模板不存在")
    db.update(promptTemplates).set({
      name: valid.name,
      categoryId: valid.categoryId,
      slug: valid.slug,
      description: valid.description.trim(),
      content: valid.content,
      fieldSchema: JSON.stringify(valid.fields),
      enabled: valid.enabled,
      updatedAt: now,
    }).where(eq(promptTemplates.id, valid.id)).run()
    return valid.id
  }
  const id = crypto.randomUUID()
  db.insert(promptTemplates).values({
    id,
    categoryId: valid.categoryId,
    name: valid.name,
    slug: valid.slug,
    description: valid.description.trim(),
    content: valid.content,
    fieldSchema: JSON.stringify(valid.fields),
    enabled: valid.enabled,
    updatedAt: now,
  }).run()
  return id
}

export function copyTemplate(id: string) {
  const template = getTemplate(id)
  if (!template) throw new Error("模板不存在")
  let suffix = 1
  let slug = `${template.slug}-copy`
  while (db.select({ id: promptTemplates.id }).from(promptTemplates).where(eq(promptTemplates.slug, slug)).get()) {
    suffix += 1
    slug = `${template.slug}-copy-${suffix}`
  }
  return saveTemplate({ ...template, id: undefined, name: `${template.name} 副本`, slug, enabled: false })
}

export function deleteTemplate(id: string) {
  db.delete(promptTemplates).where(eq(promptTemplates.id, id)).run()
}
