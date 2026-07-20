"use server"

import { revalidatePath } from "next/cache"
import { eq } from "drizzle-orm"
import { db } from "@/db/client"
import { promptGenerations } from "@/db/schema"
import { requireSession } from "@/lib/auth/session"

export async function deleteHistoryAction(id: string) {
  await requireSession()
  db.delete(promptGenerations).where(eq(promptGenerations.id, id)).run()
  revalidatePath("/history")
}
