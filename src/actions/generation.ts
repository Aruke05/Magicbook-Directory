"use server"

import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { generatePrompt } from "@/domain/prompts/generation-service"

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
