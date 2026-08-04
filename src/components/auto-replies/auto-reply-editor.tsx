"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Check, Save } from "lucide-react"
import { saveAutoReplyRuleAction } from "@/actions/auto-replies"
import { Button } from "@/components/ui/button"
import type { AutoReplyRuleInput } from "@/domain/auto-replies/types"

export function AutoReplyEditor({ initial }: { initial: AutoReplyRuleInput }) {
  const [rule, setRule] = useState(initial)
  const [keywordsText, setKeywordsText] = useState(initial.keywords.join("\n"))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const save = () => startTransition(async () => {
    setError("")
    setSaved(false)
    const result = await saveAutoReplyRuleAction({ ...rule, keywords: keywordsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) })
    if (!result.ok) { setError(result.error); return }
    setSaved(true)
    if (!rule.id) router.replace(`/auto-replies/${result.id}`)
    router.refresh()
  })

  const setNumber = (key: "minOcrConfidence" | "priority" | "cooldownSeconds", value: string) => setRule({ ...rule, [key]: Number.parseInt(value || "0", 10) })

  return <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]" onSubmit={(event) => { event.preventDefault(); save() }}>
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="field-label">规则名称</label><input className="control" value={rule.name} onChange={(event) => setRule({ ...rule, name: event.target.value })} placeholder="例如：支付成功回复" /></div>
          <div><label className="field-label">识别消息类型</label><select className="control" value={rule.source} onChange={(event) => setRule({ ...rule, source: event.target.value as AutoReplyRuleInput["source"] })}><option value="both">文字与图片</option><option value="text">仅文字</option><option value="image">仅图片 OCR</option></select></div>
          <div><label className="field-label">匹配方式</label><select className="control" value={rule.matchType} onChange={(event) => setRule({ ...rule, matchType: event.target.value as AutoReplyRuleInput["matchType"] })}><option value="contains">包含关键词</option><option value="exact">完全匹配</option><option value="regex">正则表达式</option></select></div>
          <div><label className="field-label">关键词关系</label><select className="control" value={rule.keywordMode} onChange={(event) => setRule({ ...rule, keywordMode: event.target.value as AutoReplyRuleInput["keywordMode"] })}><option value="any">任意一个命中</option><option value="all">全部命中</option></select></div>
          <div><label className="field-label">优先级</label><input className="control" type="number" min="-9999" max="9999" value={rule.priority} onChange={(event) => setNumber("priority", event.target.value)} /><p className="field-help">数值越大越先匹配。</p></div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><h2 className="section-title">关键词与回复</h2></div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div><label className="field-label">关键词或正则表达式（每行一个）</label><textarea className="control mono min-h-44" value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} placeholder={rule.matchType === "regex" ? "payment\\s+success\n交易成功" : "payment successful\n支付成功"} /><p className="field-help">空行会自动忽略，重复关键词保存时会自动去除。</p></div>
          <div><label className="field-label">回复语句</label><textarea className="control min-h-36" value={rule.replyText} onChange={(event) => setRule({ ...rule, replyText: event.target.value })} placeholder="已识别到支付成功，请稍候处理。" /><p className="field-help">机器人会引用触发规则的原消息进行回复。</p></div>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><h2 className="section-title">识别与范围</h2></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div><label className="field-label">OCR最低置信度（0～100）</label><input className="control" type="number" min="0" max="100" value={rule.minOcrConfidence} onChange={(event) => setNumber("minOcrConfidence", event.target.value)} /><p className="field-help">低于此分数的图片文字不会参与匹配。</p></div>
          <div><label className="field-label">冷却时间（秒）</label><input className="control" type="number" min="0" max="86400" value={rule.cooldownSeconds} onChange={(event) => setNumber("cooldownSeconds", event.target.value)} /><p className="field-help">同一群组中同一规则的最短回复间隔。</p></div>
          <div className="sm:col-span-2"><label className="field-label">允许的群组 ID</label><textarea className="control mono min-h-24" value={rule.allowedChatIds} onChange={(event) => setRule({ ...rule, allowedChatIds: event.target.value })} placeholder="-1001234567890, -1009876543210" /><p className="field-help">逗号或换行分隔；留空时使用 Worker 的全局群组白名单。</p></div>
          <div className="space-y-3 sm:col-span-2">
            {([
              ["ignoreCase", "忽略英文字母大小写"],
              ["ignoreWhitespace", "匹配时忽略空格与换行"],
              ["ignorePunctuation", "匹配时忽略标点符号"],
              ["stopOnMatch", "命中后停止继续匹配"],
              ["enabled", "启用此规则"],
            ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm text-[var(--foreground-secondary)]"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={rule[key]} onChange={(event) => setRule({ ...rule, [key]: event.target.checked })} />{label}</label>)}
          </div>
        </div>
      </section>
    </div>

    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section className="panel p-5"><h2 className="section-title">规则说明</h2><ul className="mt-3 space-y-2 pl-5 text-xs leading-5 text-[var(--foreground-secondary)]"><li>文字消息直接使用正文匹配。</li><li>图片消息会合并图片说明和 OCR 文字。</li><li>规则按优先级从高到低执行。</li><li>每条 Telegram 更新只处理一次。</li></ul></section>
      <section className="panel p-5">{error && <div role="alert" className="mb-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-3 text-xs leading-5 text-[var(--danger)]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div>}<div className="grid grid-cols-2 gap-2"><Button asChild variant="secondary"><Link href="/auto-replies"><ArrowLeft className="size-4" />取消</Link></Button><Button type="submit" loading={pending}>{saved ? <Check className="size-4" /> : <Save className="size-4" />}{saved ? "已保存" : "保存"}</Button></div></section>
    </aside>
  </form>
}
