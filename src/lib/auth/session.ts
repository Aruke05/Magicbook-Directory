import "server-only"
import crypto from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/db/client"
import { adminSessions } from "@/db/schema"
import { getEnv } from "@/lib/env"

export const sessionCookieName = "magicbook_session"
const cookieMaxAge = 60 * 60 * 24 * 365 * 10

function tokenHash(token: string) {
  return crypto.createHmac("sha256", getEnv().SESSION_SECRET).update(token).digest("hex")
}

export async function createSession(userAgent: string) {
  const token = crypto.randomBytes(32).toString("base64url")
  db.insert(adminSessions).values({
    id: crypto.randomUUID(),
    tokenHash: tokenHash(token),
    userAgent: userAgent.slice(0, 500),
  }).run()
  const cookieStore = await cookies()
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookieMaxAge,
  })
}

export async function getSession() {
  const token = (await cookies()).get(sessionCookieName)?.value
  if (!token) return null
  const session = db.select().from(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token))).get()
  if (!session) return null
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    db.update(adminSessions).set({ lastSeenAt: new Date() }).where(eq(adminSessions.id, session.id)).run()
  }
  return session
}

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(sessionCookieName)?.value
  if (token) db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token))).run()
  cookieStore.delete(sessionCookieName)
}

export function secureCredentialEqual(actual: string, expected: string) {
  const actualHash = crypto.createHash("sha256").update(actual).digest()
  const expectedHash = crypto.createHash("sha256").update(expected).digest()
  return crypto.timingSafeEqual(actualHash, expectedHash)
}
