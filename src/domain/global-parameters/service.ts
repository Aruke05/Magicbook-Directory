import "server-only"
import crypto from "node:crypto"
import { asc, eq, ne } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db/client"
import { globalParameters, promptTemplates } from "@/db/schema"
import { templateReferences } from "@/domain/prompts/renderer"
import type { PromptField, TemplateRecord } from "@/domain/prompts/types"
import {
  globalParameterKinds,
  globalParameterValueTypes,
  type GlobalParameter,
  type GlobalParameterInput,
  type GlobalParameterMappingRule,
  type GlobalParameterOption,
} from "./types"

const optionSchema = z.object({
  label: z.string().trim().min(1, "选项名称不能为空"),
  value: z.string().trim().min(1, "选项值不能为空"),
})

const mappingRuleSchema = z.object({
  sourceValues: z.array(z.string()),
  output: z.string(),
})

const parameterSchema = z.object({
  id: z.string().optional(),
  key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "参数 Key 必须以字母开头，且只能包含字母、数字和下划线"),
  label: z.string().trim().min(1, "参数名称不能为空"),
  description: z.string(),
  kind: z.enum(globalParameterKinds),
  valueType: z.enum(globalParameterValueTypes),
  value: z.string(),
  options: z.array(optionSchema),
  sourceParameterKey: z.string().nullable(),
  mappingRules: z.array(mappingRuleSchema),
  fallback: z.string(),
  enabled: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
})

function parseJsonArray<T>(value: string, schema: z.ZodType<T[]>): T[] {
  try {
    return schema.parse(JSON.parse(value))
  } catch {
    return []
  }
}

function toParameter(row: typeof globalParameters.$inferSelect): GlobalParameter {
  return {
    ...row,
    options: parseJsonArray<GlobalParameterOption>(row.options, z.array(optionSchema)),
    mappingRules: parseJsonArray<GlobalParameterMappingRule>(row.mappingRules, z.array(mappingRuleSchema)),
  }
}

export function listGlobalParameters(options: { enabledOnly?: boolean } = {}) {
  const rows = db.select().from(globalParameters)
    .where(options.enabledOnly ? eq(globalParameters.enabled, true) : undefined)
    .orderBy(asc(globalParameters.sortOrder), asc(globalParameters.label))
    .all()
  return rows.map(toParameter)
}

export function getGlobalParameter(id: string) {
  const row = db.select().from(globalParameters).where(eq(globalParameters.id, id)).get()
  return row ? toParameter(row) : null
}

function parameterUsage(key: string, ignoreParameterId?: string) {
  const dependent = listGlobalParameters().find((parameter) => parameter.id !== ignoreParameterId && parameter.sourceParameterKey === key)
  const template = db.select({ name: promptTemplates.name, content: promptTemplates.content, fieldSchema: promptTemplates.fieldSchema })
    .from(promptTemplates)
    .all()
    .find((item) => {
      if (templateReferences(item.content).includes(key)) return true
      try {
        const fields = JSON.parse(item.fieldSchema) as PromptField[]
        return fields.some((field) => field.mapping?.sourceFieldKey === key)
      } catch {
        return false
      }
    })
  return { dependent, template }
}

function validateOptions(options: GlobalParameterOption[]) {
  if (!options.length) throw new Error("选项参数至少需要一个选项")
  const values = new Set<string>()
  for (const option of options) {
    const normalized = option.value.trim().toLocaleLowerCase()
    if (values.has(normalized)) throw new Error(`选项值“${option.value}”重复`)
    values.add(normalized)
  }
}

function validateMappingRules(rules: GlobalParameterMappingRule[]) {
  const values = new Set<string>()
  for (const rule of rules) {
    for (const sourceValue of rule.sourceValues.map((value) => value.trim()).filter(Boolean)) {
      const normalized = sourceValue.toLocaleLowerCase()
      if (values.has(normalized)) throw new Error(`来源值“${sourceValue}”配置了多次`)
      values.add(normalized)
    }
  }
}

function canBeMappingSource(parameter: Pick<GlobalParameter, "kind" | "valueType">) {
  return parameter.kind === "select" || (parameter.kind === "mapping" && parameter.valueType !== "multiline")
}

function validateMappingSource(parameterKey: string, sourceParameterKey: string, parameters: GlobalParameter[]) {
  const byKey = new Map(parameters.map((parameter) => [parameter.key, parameter]))
  const source = byKey.get(sourceParameterKey)
  if (!source || !canBeMappingSource(source)) throw new Error("映射来源必须是选项参数或单行映射参数")

  const visited = new Set([parameterKey])
  let current: GlobalParameter | undefined = source
  while (current) {
    if (visited.has(current.key)) throw new Error("全局参数之间不能形成循环映射")
    visited.add(current.key)
    if (current.kind !== "mapping" || !current.sourceParameterKey) break
    current = byKey.get(current.sourceParameterKey)
  }
}

export function saveGlobalParameter(input: GlobalParameterInput & { id?: string }) {
  const valid = parameterSchema.parse(input)
  const existing = valid.id ? getGlobalParameter(valid.id) : null
  if (valid.id && !existing) throw new Error("全局参数不存在")
  if (existing && existing.key !== valid.key) throw new Error("参数创建后不能修改 Key，避免已有模板失效")

  const duplicate = db.select({ id: globalParameters.id }).from(globalParameters).where(valid.id
    ? ne(globalParameters.id, valid.id)
    : undefined).all().find((item) => {
      const parameter = getGlobalParameter(item.id)
      return parameter?.key.toLocaleLowerCase() === valid.key.toLocaleLowerCase()
    })
  if (duplicate) throw new Error("参数 Key 已存在")

  const parameters = listGlobalParameters()
  if (valid.kind === "select") validateOptions(valid.options)
  if (existing && existing.kind !== valid.kind) {
    const usage = parameterUsage(valid.key, valid.id)
    if (usage.dependent) throw new Error(`“${usage.dependent.label}”正在使用此参数作为映射来源，不能修改取值方式`)
  }
  if (existing && existing.kind === "mapping" && valid.kind === "mapping" && valid.valueType === "multiline") {
    const usage = parameterUsage(valid.key, valid.id)
    if (usage.dependent) throw new Error(`“${usage.dependent.label}”正在使用此参数作为映射来源，输出格式必须保持单行`)
  }
  if (valid.kind === "mapping") {
    if (!valid.sourceParameterKey) throw new Error("请选择映射来源参数")
    if (valid.sourceParameterKey === valid.key) throw new Error("参数不能映射自身")
    validateMappingSource(valid.key, valid.sourceParameterKey, parameters)
    validateMappingRules(valid.mappingRules)
  }
  if (!valid.enabled && existing?.enabled) {
    const usage = parameterUsage(valid.key, valid.id)
    if (usage.dependent) throw new Error(`“${usage.dependent.label}”正在使用此参数作为映射来源，暂时不能停用`)
    if (usage.template) throw new Error(`模板“${usage.template.name}”正在使用此参数，暂时不能停用`)
  }

  const values = {
    key: valid.key,
    label: valid.label.trim(),
    description: valid.description.trim(),
    kind: valid.kind,
    valueType: valid.valueType,
    value: valid.kind === "fixed" ? valid.value : "",
    options: JSON.stringify(valid.kind === "select" ? valid.options : []),
    sourceParameterKey: valid.kind === "mapping" ? valid.sourceParameterKey : null,
    mappingRules: JSON.stringify(valid.kind === "mapping" ? valid.mappingRules : []),
    fallback: valid.kind === "mapping" ? valid.fallback : "",
    enabled: valid.enabled,
    sortOrder: valid.sortOrder,
    updatedAt: new Date(),
  }

  if (valid.id) {
    db.update(globalParameters).set(values).where(eq(globalParameters.id, valid.id)).run()
    return valid.id
  }
  const id = crypto.randomUUID()
  db.insert(globalParameters).values({ id, ...values }).run()
  return id
}

export function deleteGlobalParameter(id: string) {
  const parameter = getGlobalParameter(id)
  if (!parameter) throw new Error("全局参数不存在")
  const usage = parameterUsage(parameter.key, parameter.id)
  if (usage.dependent) throw new Error(`“${usage.dependent.label}”正在使用此参数作为映射来源，无法删除`)
  if (usage.template) throw new Error(`模板“${usage.template.name}”正在使用此参数，无法删除`)
  db.delete(globalParameters).where(eq(globalParameters.id, id)).run()
}

export function getGlobalParameterKeys() {
  return listGlobalParameters({ enabledOnly: true }).map((parameter) => parameter.key)
}

function referencedParameterKeys(parameters: GlobalParameter[], template: Pick<TemplateRecord, "content" | "fields">) {
  const byKey = new Map(parameters.map((parameter) => [parameter.key, parameter]))
  const needed = new Set(templateReferences(template.content))
  for (const field of template.fields) {
    if (field.mapping?.sourceFieldKey && byKey.has(field.mapping.sourceFieldKey)) needed.add(field.mapping.sourceFieldKey)
  }

  let changed = true
  while (changed) {
    changed = false
    for (const key of [...needed]) {
      const parameter = byKey.get(key)
      if (parameter?.kind === "mapping" && parameter.sourceParameterKey && !needed.has(parameter.sourceParameterKey)) {
        needed.add(parameter.sourceParameterKey)
        changed = true
      }
    }
  }
  return needed
}

export function globalParameterInputFields(template: Pick<TemplateRecord, "content" | "fields">): PromptField[] {
  const parameters = listGlobalParameters({ enabledOnly: true })
  const needed = referencedParameterKeys(parameters, template)
  return parameters
    .filter((parameter) => needed.has(parameter.key) && parameter.kind === "select")
    .map((parameter) => ({
      id: `global-${parameter.id}`,
      key: parameter.key,
      label: parameter.label,
      description: parameter.description,
      type: "select",
      required: true,
      options: parameter.options,
      sortOrder: parameter.sortOrder,
      width: "full",
      includeInPrompt: true,
      storeInHistory: true,
      sensitive: false,
      group: "全局参数",
    }))
}

export function resolveGlobalParameterValues(
  template: Pick<TemplateRecord, "content" | "fields">,
  input: Record<string, unknown>,
) {
  const parameters = listGlobalParameters({ enabledOnly: true })
  const needed = referencedParameterKeys(parameters, template)
  const values: Record<string, unknown> = {}

  for (const parameter of parameters.filter((item) => item.kind === "fixed" && needed.has(item.key))) {
    values[parameter.key] = parameter.value
  }
  for (const parameter of parameters.filter((item) => item.kind === "select")) {
    if (!needed.has(parameter.key)) continue
    const selected = String(input[parameter.key] ?? "").trim()
    if (!parameter.options.some((option) => option.value === selected)) {
      throw new Error(`请选择有效的“${parameter.label}”`)
    }
    values[parameter.key] = selected
  }

  let changed = true
  while (changed) {
    changed = false
    for (const parameter of parameters.filter((item) => item.kind === "mapping" && needed.has(item.key))) {
      if (Object.hasOwn(values, parameter.key)) continue
      const sourceValue = String(values[parameter.sourceParameterKey ?? ""] ?? input[parameter.sourceParameterKey ?? ""] ?? "").trim()
      if (!sourceValue) continue
      const normalized = sourceValue.toLocaleLowerCase()
      const rule = parameter.mappingRules.find((item) => item.sourceValues.some((value) => value.trim().toLocaleLowerCase() === normalized))
      values[parameter.key] = rule?.output ?? parameter.fallback
      changed = true
    }
  }
  return values
}
