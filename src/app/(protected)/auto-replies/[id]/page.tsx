import { notFound } from "next/navigation"
import { AutoReplyEditor } from "@/components/auto-replies/auto-reply-editor"
import { getAutoReplyRule } from "@/domain/auto-replies/rule-service"

export const metadata = { title: "编辑自动回复规则" }
export const dynamic = "force-dynamic"

export default async function EditAutoReplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = getAutoReplyRule(id)
  if (!rule) notFound()
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">编辑自动回复规则</h1><p className="page-description">调整关键词、OCR条件、优先级与回复语句。</p></div></header><AutoReplyEditor initial={rule} /></div>
}
