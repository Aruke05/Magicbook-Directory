import type { PromptField } from "./types"

const variablePattern = /{{\s*([A-Za-z][A-Za-z0-9_]*)\s*}}/g
const ifPattern = /{{#if\s+([A-Za-z][A-Za-z0-9_]*)\s*}}([\s\S]*?){{\/if}}/g

function hasValue(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function formatValue(value: unknown) {
  if (value === undefined || value === null) return ""
  if (Array.isArray(value)) return value.join("、")
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  if (typeof value === "boolean") return value ? "是" : "否"
  return String(value)
}

export function templateReferences(content: string) {
  const references = new Set<string>()
  for (const match of content.matchAll(variablePattern)) references.add(match[1])
  for (const match of content.matchAll(ifPattern)) references.add(match[1])
  return [...references]
}

export function validateTemplate(content: string, fields: PromptField[]) {
  if (!content.trim()) throw new Error("提示词内容不能为空")
  const allowed = new Set(fields.filter((field) => field.includeInPrompt).map((field) => field.key))
  const invalid = templateReferences(content).filter((key) => !allowed.has(key))
  if (invalid.length) throw new Error(`模板引用了无效变量：${invalid.join("、")}`)
  const openings = content.match(/{{#if\s+/g)?.length ?? 0
  const closings = content.match(/{{\/if}}/g)?.length ?? 0
  if (openings !== closings) throw new Error("模板条件区块没有正确闭合")
  return true
}

export function renderTemplate(content: string, fields: PromptField[], values: Record<string, unknown>) {
  validateTemplate(content, fields)
  let rendered = content
  for (let index = 0; index < 10 && rendered.includes("{{#if"); index += 1) {
    rendered = rendered.replace(ifPattern, (_block, key: string, body: string) => hasValue(values[key]) ? body : "")
  }
  rendered = rendered.replace(variablePattern, (_token, key: string) => formatValue(values[key]))
  if (/{{[^}]+}}/.test(rendered)) throw new Error("生成结果中仍有未解析变量，请检查模板内容")
  return rendered.replace(/\n{3,}/g, "\n\n").trim()
}

export function sanitizeHistoryInput(fields: PromptField[], values: Record<string, unknown>) {
  return Object.fromEntries(fields.flatMap((field) => {
    if (!field.storeInHistory) return []
    if (field.sensitive) return [[field.key, "[敏感信息未保存]"]]
    const value = values[field.key]
    if (typeof value === "string" && value.length > 4000) return [[field.key, `${value.slice(0, 4000)}…`]]
    return [[field.key, value]]
  }))
}
