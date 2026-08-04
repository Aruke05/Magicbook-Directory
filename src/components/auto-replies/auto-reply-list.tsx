"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ImageIcon, MessageSquareReply, Pencil, Plus, Power, Search, Trash2, Type } from "lucide-react"
import { deleteAutoReplyRuleAction, toggleAutoReplyRuleAction } from "@/actions/auto-replies"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import type { MatchType, ReplySource } from "@/domain/auto-replies/types"

type RuleItem = {
  id: string
  name: string
  source: ReplySource
  matchType: MatchType
  keywordMode: "any" | "all"
  keywords: string[]
  replyText: string
  priority: number
  cooldownSeconds: number
  enabled: boolean
  updatedAt: string
}

const sourceLabels: Record<ReplySource, string> = { text: "文字", image: "图片 OCR", both: "文字与图片" }
const matchLabels: Record<MatchType, string> = { contains: "包含", exact: "完全匹配", regex: "正则" }

export function AutoReplyList({ rules }: { rules: RuleItem[] }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all")
  const [busy, startTransition] = useTransition()
  const router = useRouter()
  const filtered = useMemo(() => rules.filter((rule) => {
    const haystack = `${rule.name} ${rule.keywords.join(" ")} ${rule.replyText}`.toLocaleLowerCase()
    return haystack.includes(search.toLocaleLowerCase()) && (status === "all" || rule.enabled === (status === "enabled"))
  }), [rules, search, status])
  const mutate = (task: () => Promise<unknown>) => startTransition(async () => { await task(); router.refresh() })

  return <>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--foreground-muted)]" /><input className="control pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索名称、关键词或回复内容" aria-label="搜索自动回复规则" /></div>
      <div className="flex rounded-xl bg-[var(--surface-hover)] p-1">
        {(["all", "enabled", "disabled"] as const).map((value) => <button key={value} onClick={() => setStatus(value)} className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition ${status === value ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}>{value === "all" ? "全部" : value === "enabled" ? "已启用" : "已停用"}</button>)}
      </div>
    </div>
    <div className="panel overflow-hidden" aria-busy={busy}>
      {filtered.length ? <div className="divide-y divide-[var(--border)]">{filtered.map((rule) => <article key={rule.id} className="grid gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-subtle)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 truncate text-[15px] font-semibold">{rule.name}</h2><Badge tone={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "已启用" : "已停用"}</Badge><Badge tone="accent">优先级 {rule.priority}</Badge></div>
          <div className="mt-3 flex flex-wrap gap-2">{rule.keywords.slice(0, 6).map((keyword) => <span key={keyword} className="mono rounded-lg bg-[var(--surface-hover)] px-2 py-1 text-[11px] text-[var(--foreground-secondary)]">{keyword}</span>)}{rule.keywords.length > 6 && <span className="px-1 py-1 text-[11px] text-[var(--foreground-muted)]">+{rule.keywords.length - 6}</span>}</div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">回复：{rule.replyText}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)]"><span className="flex items-center gap-1">{rule.source === "image" ? <ImageIcon className="size-3" /> : <Type className="size-3" />}{sourceLabels[rule.source]}</span><span>{matchLabels[rule.matchType]} · {rule.keywordMode === "any" ? "任意命中" : "全部命中"}</span><span>冷却 {rule.cooldownSeconds}s</span><span>更新于 {rule.updatedAt}</span></div>
        </div>
        <div className="flex items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm"><Link href={`/auto-replies/${rule.id}`}><Pencil className="size-3.5" />编辑</Link></Button>
          <Button variant="ghost" size="icon" title={rule.enabled ? "停用规则" : "启用规则"} onClick={() => mutate(() => toggleAutoReplyRuleAction(rule.id, !rule.enabled))}><Power className="size-4" /></Button>
          <ConfirmDialog title={`删除“${rule.name}”？`} description="删除后机器人将不再使用此规则，操作无法撤销。" onConfirm={() => mutate(() => deleteAutoReplyRuleAction(rule.id))} trigger={<Button variant="ghost" size="icon" title="删除规则" className="hover:text-[var(--danger)]"><Trash2 className="size-4" /></Button>} />
        </div>
      </article>)}</div> : <EmptyState icon={MessageSquareReply} title="没有找到自动回复规则" description={rules.length ? "尝试调整搜索关键词或状态筛选。" : "创建第一条规则，机器人即可根据文字或图片内容自动回复。"} action={!rules.length ? <Button asChild><Link href="/auto-replies/new"><Plus className="size-4" />新建规则</Link></Button> : undefined} />}
    </div>
  </>
}
