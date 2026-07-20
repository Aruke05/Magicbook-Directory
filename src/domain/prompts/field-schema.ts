import { z } from "zod"
import { fieldTypes, type PromptField } from "./types"

const optionSchema = z.object({
  label: z.string().trim().min(1, "选项名称不能为空"),
  value: z.string().trim().min(1, "选项值不能为空"),
})

export const promptFieldSchema = z.object({
  id: z.string().min(1),
  key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "字段 Key 必须以字母开头，且只能包含字母、数字和下划线"),
  label: z.string().trim().min(1, "字段名称不能为空"),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  type: z.enum(fieldTypes),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  options: z.array(optionSchema).optional(),
  validation: z
    .object({
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  sortOrder: z.number().int(),
  width: z.enum(["full", "half"]),
  matchable: z.boolean(),
  includeInPrompt: z.boolean(),
  storeInHistory: z.boolean(),
  sensitive: z.boolean(),
  group: z.string().optional(),
  advanced: z.boolean().optional(),
})

export const promptFieldsSchema = z
  .array(promptFieldSchema)
  .superRefine((fields, ctx) => {
    const keys = new Set<string>()
    fields.forEach((field, index) => {
      if (keys.has(field.key)) {
        ctx.addIssue({
          code: "custom",
          message: `字段 Key “${field.key}” 重复`,
          path: [index, "key"],
        })
      }
      keys.add(field.key)
      if (["select", "radio", "multi-select"].includes(field.type) && !field.options?.length) {
        ctx.addIssue({
          code: "custom",
          message: "该字段类型至少需要一个选项",
          path: [index, "options"],
        })
      }
    })
  })

function textSchema(field: PromptField) {
  let schema = z.string()
  if (field.required) schema = schema.trim().min(1, `${field.label}不能为空`)
  if (field.validation?.minLength !== undefined) {
    schema = schema.min(field.validation.minLength, `${field.label}至少需要 ${field.validation.minLength} 个字符`)
  }
  if (field.validation?.maxLength !== undefined) {
    schema = schema.max(field.validation.maxLength, `${field.label}不能超过 ${field.validation.maxLength} 个字符`)
  }
  if (field.validation?.pattern) {
    try {
      schema = schema.regex(new RegExp(field.validation.pattern), `${field.label}格式不正确`)
    } catch {
      // 字段配置校验会在保存时报告无效表达式，运行时避免抛出内部错误。
    }
  }
  if (field.type === "url") schema = schema.refine((value) => !value || z.url().safeParse(value).success, `${field.label}不是有效网址`)
  if (field.type === "json") schema = schema.refine((value) => {
    if (!value.trim()) return !field.required
    try {
      JSON.parse(value)
      return true
    } catch {
      return false
    }
  }, `${field.label}不是有效 JSON`)
  return schema
}

export function buildFieldValuesSchema(fields: PromptField[]) {
  const shape: Record<string, z.ZodType> = {}
  for (const field of fields) {
    if (field.type === "number") {
      let numberSchema = z.preprocess(
        (value) => value === "" || value === null || value === undefined ? undefined : Number(value),
        z.number({ error: `${field.label}必须是数字` }).finite().optional(),
      )
      if (field.required) {
        numberSchema = numberSchema.refine((value) => value !== undefined, `${field.label}不能为空`)
      }
      shape[field.key] = numberSchema.refine((value) => {
        if (value === undefined) return true
        if (field.validation?.min !== undefined && value < field.validation.min) return false
        if (field.validation?.max !== undefined && value > field.validation.max) return false
        return true
      }, `${field.label}超出允许范围`)
    } else if (field.type === "checkbox" || field.type === "switch") {
      shape[field.key] = z.boolean().default(Boolean(field.defaultValue))
    } else if (field.type === "multi-select") {
      const schema = z.array(z.string())
      shape[field.key] = field.required ? schema.min(1, `${field.label}至少选择一项`) : schema.default([])
    } else {
      shape[field.key] = textSchema(field).default(typeof field.defaultValue === "string" ? field.defaultValue : "")
    }
  }
  return z.object(shape)
}

export function parseFields(value: string): PromptField[] {
  const parsed = JSON.parse(value) as unknown
  return promptFieldsSchema.parse(parsed).sort((a, b) => a.sortOrder - b.sortOrder)
}
