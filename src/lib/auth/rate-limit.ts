import "server-only"
import crypto from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "@/db/client"
import { loginRateLimits } from "@/db/schema"
import { getEnv } from "@/lib/env"

const windowMs = 10 * 60 * 1000
const blockMs = 15 * 60 * 1000
const maxAttempts = 5

function keyHash(key: string) {
  return crypto.createHmac("sha256", getEnv().SESSION_SECRET).update(key).digest("hex")
}

export function checkLoginLimit(key: string) {
  const hash = keyHash(key)
  const record = db.select().from(loginRateLimits).where(eq(loginRateLimits.keyHash, hash)).get()
  if (!record) return { allowed: true, hash }
  const now = Date.now()
  if (record.blockedUntil && record.blockedUntil.getTime() > now) return { allowed: false, hash }
  if (now - record.windowStartedAt.getTime() > windowMs) {
    db.delete(loginRateLimits).where(eq(loginRateLimits.keyHash, hash)).run()
    return { allowed: true, hash }
  }
  return { allowed: record.attempts < maxAttempts, hash }
}

export function recordLoginFailure(hash: string) {
  const record = db.select().from(loginRateLimits).where(eq(loginRateLimits.keyHash, hash)).get()
  if (!record) {
    db.insert(loginRateLimits).values({ keyHash: hash, attempts: 1 }).run()
    return
  }
  const attempts = record.attempts + 1
  db.update(loginRateLimits).set({
    attempts,
    blockedUntil: attempts >= maxAttempts ? new Date(Date.now() + blockMs) : null,
  }).where(eq(loginRateLimits.keyHash, hash)).run()
}

export function clearLoginFailures(hash: string) {
  db.delete(loginRateLimits).where(eq(loginRateLimits.keyHash, hash)).run()
}
