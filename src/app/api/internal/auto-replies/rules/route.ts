import { timingSafeEqual } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { listAutoReplyRules } from "@/domain/auto-replies/rule-service"
import { getEnv } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function authorized(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${getEnv().INTERNAL_API_SECRET}`)
  const actual = Buffer.from(request.headers.get("authorization") ?? "")
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function parseChatIds(value: string) {
  return [...new Set(value.split(/[\s,，]+/).map((item) => item.trim()).filter(Boolean))]
}

export function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rules = listAutoReplyRules({ enabledOnly: true }).map((rule) => ({
    id: rule.id,
    name: rule.name,
    source: rule.source,
    matchType: rule.matchType,
    keywordMode: rule.keywordMode,
    keywords: rule.keywords,
    replyText: rule.replyText,
    ignoreCase: rule.ignoreCase,
    ignoreWhitespace: rule.ignoreWhitespace,
    ignorePunctuation: rule.ignorePunctuation,
    minOcrConfidence: rule.minOcrConfidence,
    priority: rule.priority,
    cooldownSeconds: rule.cooldownSeconds,
    allowedChatIds: parseChatIds(rule.allowedChatIds),
    stopOnMatch: rule.stopOnMatch,
  }))
  return NextResponse.json({ rules }, { headers: { "Cache-Control": "no-store" } })
}
