import { notFound } from "next/navigation"
import { RuleEditor } from "@/components/rules/rule-editor"
import { getRule } from "@/domain/prompts/rule-service"
import { listTemplates } from "@/domain/prompts/template-service"

export const metadata = { title: "编辑规则" }
export const dynamic = "force-dynamic"

export default async function EditRulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rule = getRule(id)
  if (!rule) notFound()
  const templates = listTemplates().map(({ id: templateId, name, content, fields }) => ({ id: templateId, name, content, fields }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">编辑规则</h1><p className="page-description">调整条件、优先级与命中后使用的专属内容。</p></div></header><RuleEditor templates={templates} initial={{ id: rule.id, templateId: rule.templateId, name: rule.name, description: rule.description, conditionTree: rule.conditionTree, priority: rule.priority, customContent: rule.customContent, enabled: rule.enabled }} /></div>
}
