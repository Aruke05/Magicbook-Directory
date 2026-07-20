"use client"

import { useState, useTransition } from "react"
import { Check, Clipboard, Clock3, RefreshCcw, Trash2 } from "lucide-react"
import { deleteHistoryAction } from "@/actions/history"
import { generatePromptAction } from "@/actions/generation"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type HistoryItem = { id: string; templateId: string | null; templateName: string; inputData: Record<string, unknown>; content: string; createdAt: string }

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [records, setRecords] = useState(items)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const copy = async (content: string) => { try { await navigator.clipboard.writeText(content); setFeedback("已复制提示词"); window.setTimeout(() => setFeedback(null), 1600) } catch { setFeedback("复制失败，请手动复制") } }
  const regenerate = (item: HistoryItem) => startTransition(async () => {
    if (!item.templateId) return setFeedback("原模板已删除，无法重新生成")
    const response = await generatePromptAction(item.templateId, item.inputData)
    if (response.ok) { await copy(response.result.content); setFeedback("已重新生成并复制") } else setFeedback(response.error)
  })
  const remove = (id: string) => startTransition(async () => { await deleteHistoryAction(id); setRecords((current) => current.filter((item) => item.id !== id)) })
  if (!records.length) return <div className="panel"><EmptyState icon={Clock3} title="还没有生成记录" description="生成的提示词会显示在这里，方便再次复制或使用原数据重新生成。" /></div>
  return <div className="space-y-3" aria-busy={pending}>
    {feedback && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-xs font-semibold text-white shadow-xl"><Check className="size-3.5" />{feedback}</div>}
    {records.map((item) => <article key={item.id} className="panel overflow-hidden"><div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="min-w-0"><h2 className="m-0 truncate text-[15px] font-semibold">{item.templateName}</h2><p className="mb-0 mt-2 text-xs text-[var(--foreground-muted)]">{item.createdAt} · {item.content.length.toLocaleString()} 个字符</p></div><div className="flex flex-wrap justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => copy(item.content)}><Clipboard className="size-3.5" />复制</Button><Button size="sm" variant="ghost" onClick={() => regenerate(item)} disabled={!item.templateId}><RefreshCcw className="size-3.5" />重新生成</Button><ConfirmDialog title="删除这条生成记录？" description="删除后无法恢复，但不会影响原模板。" onConfirm={() => remove(item.id)} trigger={<Button size="icon" variant="ghost" className="hover:text-[var(--danger)]" aria-label="删除历史"><Trash2 className="size-4" /></Button>} /></div></div><details className="border-t border-[var(--border)]"><summary className="cursor-pointer px-5 py-3 text-xs font-semibold text-[var(--foreground-secondary)] sm:px-6">查看内容与输入摘要</summary><div className="grid border-t border-[var(--border)] lg:grid-cols-[minmax(220px,.55fr)_minmax(0,1.45fr)]"><pre className="mono m-0 max-h-96 overflow-auto border-b border-[var(--border)] bg-white p-5 text-[11px] leading-5 text-[var(--foreground-secondary)] lg:border-b-0 lg:border-r">{JSON.stringify(item.inputData, null, 2)}</pre><pre className="prompt-output m-0 max-h-96 min-h-52">{item.content}</pre></div></details></article>)}
  </div>
}
