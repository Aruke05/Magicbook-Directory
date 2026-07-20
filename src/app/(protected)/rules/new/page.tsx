import crypto from "node:crypto"
import { RuleEditor } from "@/components/rules/rule-editor"
import { listTemplates } from "@/domain/prompts/template-service"
import type { RuleConditionGroup } from "@/domain/prompts/types"

export const metadata = { title: "新建规则" }

export default function NewRulePage() {
  const templates = listTemplates().map(({ id, name, content, fields }) => ({ id, name, content, fields }))
  const field = templates[0]?.fields.find((item) => item.matchable)
  const tree: RuleConditionGroup = { id: crypto.randomUUID(), kind: "group", combinator: "all", children: field ? [{ id: crypto.randomUUID(), kind: "condition", fieldKey: field.key, operator: "equals", value: "", caseSensitive: false }] : [] }
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">新建规则</h1><p className="page-description">组合模板字段，定义何时使用更具针对性的提示词。</p></div></header><RuleEditor templates={templates} initial={{ templateId: templates[0]?.id ?? "", name: "", description: "", conditionTree: tree, priority: 50, customContent: templates[0]?.content ?? "", enabled: true }} /></div>
}
