"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireSession } from "@/lib/auth/session"
import { deleteGlobalParameter, saveGlobalParameter } from "@/domain/global-parameters/service"
import type { GlobalParameterInput } from "@/domain/global-parameters/types"

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback
  return error instanceof Error ? error.message : fallback
}

function revalidateGlobalParameterConsumers() {
  revalidatePath("/")
  revalidatePath("/templates")
  revalidatePath("/global-parameters")
}

export async function saveGlobalParameterAction(input: GlobalParameterInput & { id?: string }) {
  await requireSession()
  try {
    const id = saveGlobalParameter(input)
    revalidateGlobalParameterConsumers()
    return { ok: true as const, id }
  } catch (error) {
    return { ok: false as const, error: errorMessage(error, "保存全局参数失败") }
  }
}

export async function deleteGlobalParameterAction(id: string) {
  await requireSession()
  try {
    deleteGlobalParameter(id)
    revalidateGlobalParameterConsumers()
    return { ok: true as const }
  } catch (error) {
    return { ok: false as const, error: errorMessage(error, "删除全局参数失败") }
  }
}
