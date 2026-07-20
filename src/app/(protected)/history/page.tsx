import { desc } from "drizzle-orm"
import { db } from "@/db/client"
import { promptGenerations } from "@/db/schema"
import { HistoryList } from "@/components/history/history-list"
import { requireSession } from "@/lib/auth/session"
import { formatDate, safeJsonParse } from "@/lib/utils"

export const metadata = { title: "生成历史" }
export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  await requireSession()
  const items = db.select().from(promptGenerations).orderBy(desc(promptGenerations.createdAt)).limit(100).all().map((item) => ({ id: item.id, templateId: item.templateId, templateName: item.templateName, inputData: safeJsonParse<Record<string, unknown>>(item.inputData, {}), content: item.generatedContent, createdAt: formatDate(item.createdAt) }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">生成历史</h1><p className="page-description">最近 100 条记录。敏感字段会按照模板配置隐藏或省略。</p></div></header><HistoryList items={items} /></div>
}
