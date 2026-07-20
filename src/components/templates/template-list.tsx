"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Copy, FileText, Pencil, Plus, Power, Search, Trash2 } from "lucide-react"
import { copyTemplateAction, deleteTemplateAction, toggleTemplateAction } from "@/actions/templates"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type TemplateItem = {
  id: string
  name: string
  slug: string
  description: string
  enabled: boolean
  fieldCount: number
  updatedAt: string
  categoryId: string | null
  categoryName: string
}

export function TemplateList({ templates, categories }: { templates: TemplateItem[]; categories: Array<{ id: string; name: string }> }) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | "enabled" | "disabled">("all")
  const [categoryId, setCategoryId] = useState("all")
  const [busy, startTransition] = useTransition()
  const router = useRouter()
  const filtered = useMemo(() => templates.filter((template) => {
    const matchesSearch = `${template.name} ${template.slug} ${template.description}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    const matchesStatus = status === "all" || (status === "enabled" ? template.enabled : !template.enabled)
    const matchesCategory = categoryId === "all" || template.categoryId === categoryId
    return matchesSearch && matchesStatus && matchesCategory
  }), [categoryId, search, status, templates])

  const mutate = (task: () => Promise<unknown>) => startTransition(async () => { await task(); router.refresh() })

  return <>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--foreground-muted)]" /><input className="control pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索模板名称或标识" aria-label="搜索模板" /></div>
      <div className="flex flex-wrap items-center gap-2"><select className="control w-auto min-w-36" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="按分类筛选"><option value="all">全部分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className="flex rounded-xl bg-[var(--surface-hover)] p-1">
        {(["all", "enabled", "disabled"] as const).map((value) => <button key={value} onClick={() => setStatus(value)} className={`min-h-8 rounded-lg px-3 text-xs font-semibold transition ${status === value ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-muted)]"}`}>{value === "all" ? "全部" : value === "enabled" ? "已启用" : "已停用"}</button>)}
      </div></div>
    </div>
    <div className="panel overflow-hidden" aria-busy={busy}>
      {filtered.length ? <div className="divide-y divide-[var(--border)]">{filtered.map((template) => <article key={template.id} className="group grid gap-4 px-5 py-5 transition-colors hover:bg-[var(--surface-subtle)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="m-0 truncate text-[15px] font-semibold">{template.name}</h2><Badge tone={template.enabled ? "success" : "neutral"}>{template.enabled ? "已启用" : "已停用"}</Badge></div>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-[var(--foreground-secondary)]">{template.description || "暂无说明"}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)]"><span>{template.categoryName}</span><span className="mono">{template.slug}</span><span>{template.fieldCount} 个字段</span><span>更新于 {template.updatedAt}</span></div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <Button asChild variant="ghost" size="sm"><Link href={`/templates/${template.id}`}><Pencil className="size-3.5" />编辑</Link></Button>
          <Button variant="ghost" size="icon" title="复制模板" onClick={() => mutate(() => copyTemplateAction(template.id))}><Copy className="size-4" /></Button>
          <Button variant="ghost" size="icon" title={template.enabled ? "停用模板" : "启用模板"} onClick={() => mutate(() => toggleTemplateAction(template.id, !template.enabled))}><Power className="size-4" /></Button>
          <ConfirmDialog title={`删除“${template.name}”？`} description="模板会被删除，已有生成历史仍会保留快照。此操作无法撤销。" onConfirm={() => mutate(() => deleteTemplateAction(template.id))} trigger={<Button variant="ghost" size="icon" title="删除模板" className="hover:text-[var(--danger)]"><Trash2 className="size-4" /></Button>} />
        </div>
      </article>)}</div> : <EmptyState icon={FileText} title="没有找到模板" description={templates.length ? "尝试调整搜索关键词或状态筛选。" : "创建第一个模板，为不同任务定义字段与提示词内容。"} action={!templates.length ? <Button asChild><Link href="/templates/new"><Plus className="size-4" />新建模板</Link></Button> : undefined} />}
    </div>
  </>
}
