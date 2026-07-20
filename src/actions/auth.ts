"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getEnv } from "@/lib/env"
import { checkLoginLimit, clearLoginFailures, recordLoginFailure } from "@/lib/auth/rate-limit"
import { createSession, deleteCurrentSession, secureCredentialEqual } from "@/lib/auth/session"

export type LoginState = { error?: string }

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ username: formData.get("username"), password: formData.get("password") })
  if (!parsed.success) return { error: "账号或密码错误" }

  const requestHeaders = await headers()
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local"
  const limit = checkLoginLimit(`${ip}:${parsed.data.username.toLocaleLowerCase()}`)
  if (!limit.allowed) return { error: "尝试次数过多，请稍后再试" }

  const env = getEnv()
  const valid = secureCredentialEqual(parsed.data.username, env.ADMIN_USERNAME)
    && secureCredentialEqual(parsed.data.password, env.ADMIN_PASSWORD)
  if (!valid) {
    recordLoginFailure(limit.hash)
    return { error: "账号或密码错误" }
  }

  clearLoginFailures(limit.hash)
  await createSession(requestHeaders.get("user-agent") ?? "")
  redirect("/")
}

export async function logoutAction() {
  await deleteCurrentSession()
  redirect("/login")
}
