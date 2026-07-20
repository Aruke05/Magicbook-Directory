"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/db/client"
import { promptRules } from "@/db/schema"
import { requireSession } from "@/lib/auth/session"
import { copyRule, deleteRule, saveRule } from "@/domain/prompts/rule-service"
import type { RuleConditionGroup } from "@/domain/prompts/types"

export type RuleInput = {
  id?: string
  templateId: string
  name: string
  description: string
  conditionTree: RuleConditionGroup
  priority: number
  customContent: string
  enabled: boolean
}

export async function saveRuleAction(input: RuleInput) {
  await requireSession()
  try {
    const id = saveRule(input)
    revalidatePath("/rules")
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "保存规则失败" }
  }
}

export async function toggleRuleAction(id: string, enabled: boolean) {
  await requireSession()
  db.update(promptRules).set({ enabled, updatedAt: new Date() }).where(eq(promptRules.id, id)).run()
  revalidatePath("/rules")
}

export async function copyRuleAction(id: string) {
  await requireSession()
  const copyId = copyRule(id)
  revalidatePath("/rules")
  redirect(`/rules/${copyId}`)
}

export async function deleteRuleAction(id: string) {
  await requireSession()
  deleteRule(id)
  revalidatePath("/rules")
}
