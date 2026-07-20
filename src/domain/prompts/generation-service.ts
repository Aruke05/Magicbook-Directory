import "server-only"
import crypto from "node:crypto"
import { db } from "@/db/client"
import { promptGenerations } from "@/db/schema"
import { buildFieldValuesSchema, resolveMappedFieldValues } from "./field-schema"
import { renderTemplate, sanitizeHistoryInput } from "./renderer"
import { getTemplate } from "./template-service"
import type { PromptGenerationResult } from "./types"

export function generatePrompt(templateId: string, rawInput: Record<string, unknown>, saveHistory = true): PromptGenerationResult {
  const template = getTemplate(templateId, true)
  if (!template) throw new Error("模板不存在或已停用")
  const inputValues = buildFieldValuesSchema(template.fields).parse(rawInput)
  const values = resolveMappedFieldValues(template.fields, inputValues)
  const content = renderTemplate(template.content, template.fields, values)
  const result: PromptGenerationResult = {
    content,
    templateId: template.id,
    templateName: template.name,
  }
  if (saveHistory) {
    db.insert(promptGenerations).values({
      id: crypto.randomUUID(),
      templateId: template.id,
      templateName: template.name,
      inputData: JSON.stringify(sanitizeHistoryInput(template.fields, values)),
      generatedContent: content,
    }).run()
  }
  return result
}
