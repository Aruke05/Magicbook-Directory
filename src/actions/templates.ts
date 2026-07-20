"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/db/client"
import { promptTemplates } from "@/db/schema"
import { requireSession } from "@/lib/auth/session"
import { copyTemplate, deleteTemplate, saveTemplate } from "@/domain/prompts/template-service"
import type { PromptField } from "@/domain/prompts/types"

export type TemplateInput = {
  id?: string
  categoryId: string | null
  name: string
  slug: string
  description: string
  content: string
  fields: PromptField[]
  enabled: boolean
}

export async function saveTemplateAction(input: TemplateInput) {
  await requireSession()
  try {
    const id = saveTemplate(input)
    revalidatePath("/")
    revalidatePath("/templates")
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "保存模板失败" }
  }
}

export async function toggleTemplateAction(id: string, enabled: boolean) {
  await requireSession()
  db.update(promptTemplates).set({ enabled, updatedAt: new Date() }).where(eq(promptTemplates.id, id)).run()
  revalidatePath("/")
  revalidatePath("/templates")
}

export async function copyTemplateAction(id: string) {
  await requireSession()
  const copyId = copyTemplate(id)
  revalidatePath("/templates")
  redirect(`/templates/${copyId}`)
}

export async function deleteTemplateAction(id: string) {
  await requireSession()
  deleteTemplate(id)
  revalidatePath("/")
  revalidatePath("/templates")
}
