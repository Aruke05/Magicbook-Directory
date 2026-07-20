"use server"

import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { generatePrompt } from "@/domain/prompts/generation-service"
import { getTemplate } from "@/domain/prompts/template-service"
import { buildFieldValuesSchema } from "@/domain/prompts/field-schema"

export async function generatePromptAction(templateId: string, input: Record<string, unknown>, saveHistory = true) {
  await requireSession()
  try {
    return { ok: true as const, result: generatePrompt(templateId, input, saveHistory) }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false as const, error: error.issues[0]?.message ?? "请检查填写内容", issues: error.flatten().fieldErrors }
    }
    return { ok: false as const, error: error instanceof Error ? error.message : "生成失败，请稍后重试" }
  }
}

export async function testPromptRulesAction(templateId: string, input: Record<string, unknown>) {
  await requireSession()
  try {
    const template = getTemplate(templateId, true)
    if (!template) return { ok: false as const, error: "模板不存在或已停用" }
    const normalizedInput = buildFieldValuesSchema(template.fields).parse(input)
    return { ok: true as const, normalizedInput, result: generatePrompt(templateId, normalizedInput, false) }
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false as const, error: error.issues[0]?.message ?? "请检查输入内容" }
    return { ok: false as const, error: error instanceof Error ? error.message : "规则测试失败" }
  }
}
