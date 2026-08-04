"use server"

import { revalidatePath } from "next/cache"
import { requireSession } from "@/lib/auth/session"
import { deleteAutoReplyRule, saveAutoReplyRule, setAutoReplyRuleEnabled } from "@/domain/auto-replies/rule-service"
import type { AutoReplyRuleInput } from "@/domain/auto-replies/types"

export async function saveAutoReplyRuleAction(input: AutoReplyRuleInput) {
  await requireSession()
  try {
    const id = saveAutoReplyRule(input)
    revalidatePath("/auto-replies")
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "保存自动回复规则失败" }
  }
}

export async function toggleAutoReplyRuleAction(id: string, enabled: boolean) {
  await requireSession()
  setAutoReplyRuleEnabled(id, enabled)
  revalidatePath("/auto-replies")
}

export async function deleteAutoReplyRuleAction(id: string) {
  await requireSession()
  deleteAutoReplyRule(id)
  revalidatePath("/auto-replies")
}
