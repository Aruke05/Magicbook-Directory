import Link from "next/link"
import { Beaker, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RuleList } from "@/components/rules/rule-list"
import { listRules } from "@/domain/prompts/rule-service"
import { listTemplates } from "@/domain/prompts/template-service"
import type { RuleConditionGroup } from "@/domain/prompts/types"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "定制规则" }
export const dynamic = "force-dynamic"

function summary(tree: RuleConditionGroup) {
  const render = (group: RuleConditionGroup): string => group.children.map((node) => node.kind === "group" ? `（${render(node)}）` : `${node.fieldKey} ${node.operator} ${Array.isArray(node.value) ? node.value.join("、") : node.value ?? ""}`).join(group.combinator === "all" ? " 且 " : " 或 ")
  return `当 ${render(tree)}`
}

export default function RulesPage() {
  const templates = listTemplates().map(({ id, name }) => ({ id, name }))
  const names = new Map(templates.map((item) => [item.id, item.name]))
  const rules = listRules().map((rule) => ({ id: rule.id, name: rule.name, description: rule.description, templateId: rule.templateId, templateName: names.get(rule.templateId) ?? "已删除模板", priority: rule.priority, enabled: rule.enabled, summary: summary(rule.conditionTree), updatedAt: formatDate(rule.updatedAt) }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">定制规则</h1><p className="page-description">以自然语言式条件组合多个字段，并决定命中时使用的专属内容。</p></div><div className="flex gap-2"><Button asChild variant="secondary"><Link href="/rules/test"><Beaker className="size-4" />测试规则</Link></Button><Button asChild><Link href="/rules/new"><Plus className="size-4" />新建规则</Link></Button></div></header><RuleList rules={rules} templates={templates} /></div>
}
