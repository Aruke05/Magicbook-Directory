import Link from "next/link"
import { Plus } from "lucide-react"
import { AutoReplyList } from "@/components/auto-replies/auto-reply-list"
import { Button } from "@/components/ui/button"
import { listAutoReplyRules } from "@/domain/auto-replies/rule-service"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "自动回复" }
export const dynamic = "force-dynamic"

export default function AutoRepliesPage() {
  const rules = listAutoReplyRules().map((rule) => ({ ...rule, updatedAt: formatDate(rule.updatedAt) }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">自动回复</h1><p className="page-description">配置 Telegram 文字和图片 OCR 的关键词、匹配规则与回复语句。</p></div><Button asChild><Link href="/auto-replies/new"><Plus className="size-4" />新建规则</Link></Button></header><AutoReplyList rules={rules} /></div>
}
