import "server-only"
import crypto from "node:crypto"
import { db } from "@/db/client"
import { promptGenerations } from "@/db/schema"
import { globalParameterInputFields, listGlobalParameters, resolveGlobalParameterValues } from "@/domain/global-parameters/service"
import { buildFieldValuesSchema, resolveMappedFieldValues } from "./field-schema"
import { renderTemplate, sanitizeHistoryInput } from "./renderer"
import { getTemplate } from "./template-service"
import type { PromptGenerationResult } from "./types"

export function generatePrompt(templateId: string, rawInput: Record<string, unknown>, saveHistory = true): PromptGenerationResult {
  const template = getTemplate(templateId, true)
  if (!template) throw new Error("模板不存在或已停用")
  const globalInputFields = globalParameterInputFields(template)
  const inputValues = buildFieldValuesSchema([...template.fields, ...globalInputFields]).parse(rawInput)
  const globalValues = resolveGlobalParameterValues(template, inputValues)
  const globalFieldNames = new Map(listGlobalParameters({ enabledOnly: true }).map((parameter) => [parameter.key, parameter.label]))
  const values = resolveMappedFieldValues(template.fields, { ...inputValues, ...globalValues }, globalFieldNames)
  const content = renderTemplate(template.content, template.fields, values, [...globalFieldNames.keys()])
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
      inputData: JSON.stringify({
        ...Object.fromEntries(globalInputFields.map((field) => [field.key, values[field.key]])),
        ...sanitizeHistoryInput(template.fields, values),
      }),
      generatedContent: content,
    }).run()
  }
  return result
}
