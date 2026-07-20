"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, Pencil, Plus, Power, Search, ScrollText, Trash2 } from "lucide-react"
import { copyRuleAction, deleteRuleAction, toggleRuleAction } from "@/actions/rules"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type RuleItem = { id: string; name: string; description: string; templateId: string; templateName: string; priority: number; enabled: boolean; summary: string; updatedAt: string }
type TemplateOption = { id: string; name: string }

export function RuleList({ rules, templates }: { rules: RuleItem[]; templates: TemplateOption[] }) {
  const [search, setSearch] = useState("")
  const [templateId, setTemplateId] = useState("all")
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const filtered = useMemo(() => rules.filter((rule) => (templateId === "all" || rule.templateId === templateId) && `${rule.name} ${rule.description} ${rule.summary}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [rules, search, templateId])
  const mutate = (task: () => Promise<unknown>) => startTransition(async () => { await task(); router.refresh() })
  return <>
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--foreground-muted)]" /><input className="control pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索规则或条件" aria-label="搜索规则" /></div>
      <select className="control" value={templateId} onChange={(e) => setTemplateId(e.target.value)} aria-label="按模板筛选"><option value="all">全部模板</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select>
    </div>
    <div className="panel overflow-hidden" aria-busy={pending}>
      {filtered.length ? <div className="divide-y divide-[var(--border)]">{filtered.map((rule) => <article key={rule.id} className="grid gap-4 px-5 py-5 hover:bg-[var(--surface-subtle)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="m-0 truncate text-[15px] font-semibold">{rule.name}</h2><Badge tone={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "已启用" : "已停用"}</Badge><Badge tone="accent">优先级 {rule.priority}</Badge></div><p className="mb-0 mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">{rule.summary}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)]"><span>{rule.templateName}</span><span>更新于 {rule.updatedAt}</span></div></div>
        <div className="flex flex-wrap justify-end gap-1"><Button asChild size="sm" variant="ghost"><Link href={`/rules/${rule.id}`}><Pencil className="size-3.5" />编辑</Link></Button><Button variant="ghost" size="icon" title="复制规则" onClick={() => mutate(() => copyRuleAction(rule.id))}><Copy className="size-4" /></Button><Button variant="ghost" size="icon" title={rule.enabled ? "停用规则" : "启用规则"} onClick={() => mutate(() => toggleRuleAction(rule.id, !rule.enabled))}><Power className="size-4" /></Button><ConfirmDialog title={`删除“${rule.name}”？`} description="删除后该规则将不再参与匹配，已有生成历史仍保留规则名称快照。" onConfirm={() => mutate(() => deleteRuleAction(rule.id))} trigger={<Button variant="ghost" size="icon" title="删除规则" className="hover:text-[var(--danger)]"><Trash2 className="size-4" /></Button>} /></div>
      </article>)}</div> : <EmptyState icon={ScrollText} title="没有找到规则" description={rules.length ? "尝试调整关键词或模板筛选。" : "创建定制规则，让特定输入使用更准确的提示词。"} action={!rules.length ? <Button asChild><Link href="/rules/new"><Plus className="size-4" />新建规则</Link></Button> : undefined} />}
    </div>
  </>
}
