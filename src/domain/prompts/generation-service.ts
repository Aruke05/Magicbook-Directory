import "server-only"
import crypto from "node:crypto"
import { db } from "@/db/client"
import { promptGenerations } from "@/db/schema"
import { buildFieldValuesSchema } from "./field-schema"
import { matchRules } from "./rule-engine"
import { renderTemplate, sanitizeHistoryInput } from "./renderer"
import { listRules } from "./rule-service"
import { getTemplate } from "./template-service"
import type { PromptGenerationResult } from "./types"

export function generatePrompt(templateId: string, rawInput: Record<string, unknown>, saveHistory = true): PromptGenerationResult {
  const template = getTemplate(templateId, true)
  if (!template) throw new Error("模板不存在或已停用")
  const values = buildFieldValuesSchema(template.fields).parse(rawInput)
  const rules = listRules(template.id).filter((rule) => rule.enabled)
  const { selected, evaluations } = matchRules(rules, values)
  const content = renderTemplate(selected?.customContent ?? template.content, template.fields, values)
  const result: PromptGenerationResult = {
    content,
    templateId: template.id,
    templateName: template.name,
    source: selected ? "custom-rule" : "default-template",
    matchedRuleId: selected?.id,
    matchedRuleName: selected?.name,
    ruleEvaluations: evaluations,
  }
  if (saveHistory) {
    db.insert(promptGenerations).values({
      id: crypto.randomUUID(),
      templateId: template.id,
      matchedRuleId: selected?.id,
      templateName: template.name,
      matchedRuleName: selected?.name,
      inputData: JSON.stringify(sanitizeHistoryInput(template.fields, values)),
      generatedContent: content,
      source: result.source,
    }).run()
  }
  return result
}
