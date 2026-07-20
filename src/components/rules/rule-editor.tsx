"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowLeft, Braces, Check, Plus, Save, Trash2 } from "lucide-react"
import { saveRuleAction } from "@/actions/rules"
import { operatorsByType } from "@/domain/prompts/rule-schema"
import type { PromptField, RuleCondition, RuleConditionGroup, RuleOperator } from "@/domain/prompts/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type TemplateOption = { id: string; name: string; content: string; fields: PromptField[] }
type InitialRule = { id?: string; templateId: string; name: string; description: string; conditionTree: RuleConditionGroup; priority: number; customContent: string; enabled: boolean }

const operatorLabels: Record<RuleOperator, string> = {
  equals: "等于", notEquals: "不等于", contains: "包含", notContains: "不包含", startsWith: "开头是", endsWith: "结尾是",
  in: "属于任一值", notIn: "不属于任一值", exists: "已填写", notExists: "未填写", greaterThan: "大于", greaterThanOrEqual: "大于等于", lessThan: "小于", lessThanOrEqual: "小于等于",
}

const newCondition = (field?: PromptField): RuleCondition => ({ id: crypto.randomUUID(), kind: "condition", fieldKey: field?.key ?? "", operator: (field ? operatorsByType[field.type][0] : "equals") as RuleOperator, value: "", caseSensitive: false })
const newGroup = (field?: PromptField): RuleConditionGroup => ({ id: crypto.randomUUID(), kind: "group", combinator: "all", children: [newCondition(field)] })

function updateGroup(tree: RuleConditionGroup, id: string, updater: (group: RuleConditionGroup) => RuleConditionGroup): RuleConditionGroup {
  if (tree.id === id) return updater(tree)
  return { ...tree, children: tree.children.map((node) => node.kind === "group" ? updateGroup(node, id, updater) : node) }
}
function updateCondition(tree: RuleConditionGroup, id: string, patch: Partial<RuleCondition>): RuleConditionGroup {
  return { ...tree, children: tree.children.map((node) => node.kind === "group" ? updateCondition(node, id, patch) : node.id === id ? { ...node, ...patch } : node) }
}
function removeNode(tree: RuleConditionGroup, id: string): RuleConditionGroup {
  return { ...tree, children: tree.children.filter((node) => node.id !== id).map((node) => node.kind === "group" ? removeNode(node, id) : node) }
}

function ValueControl({ condition, field, onChange, label }: { condition: RuleCondition; field?: PromptField; onChange: (value: unknown) => void; label: string }) {
  if (["exists", "notExists"].includes(condition.operator)) return <div className="control flex items-center text-[var(--foreground-muted)]">无需填写值</div>
  if (!field) return <input aria-label={label} className="control" disabled placeholder="请先选择字段" />
  if (["select", "radio"].includes(field.type) && !["in", "notIn"].includes(condition.operator)) return <select aria-label={label} className="control" value={String(condition.value ?? "")} onChange={(e) => onChange(e.target.value)}><option value="">请选择</option>{field.options?.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
  if (["checkbox", "switch"].includes(field.type)) return <select aria-label={label} className="control" value={String(condition.value ?? "true")} onChange={(e) => onChange(e.target.value === "true")}><option value="true">是</option><option value="false">否</option></select>
  const list = ["in", "notIn"].includes(condition.operator)
  return <input aria-label={label} className="control" type={field.type === "number" && !list ? "number" : "text"} value={Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value ?? "")} onChange={(e) => {
    if (list) onChange(e.target.value.split(",").map((item) => item.trim()).filter(Boolean))
    else if (field.type === "number") onChange(e.target.value === "" ? "" : Number(e.target.value))
    else onChange(e.target.value)
  }} placeholder={list ? "多个值用逗号分隔" : "输入期望值"} />
}

function ConditionGroupEditor({ group, fields, depth, onChange, onRemove }: { group: RuleConditionGroup; fields: PromptField[]; depth: number; onChange: (tree: RuleConditionGroup) => void; onRemove?: () => void }) {
  const matchableFields = fields.filter((field) => field.matchable)
  const addCondition = () => onChange(updateGroup(group, group.id, (current) => ({ ...current, children: [...current.children, newCondition(matchableFields[0])] })))
  const addGroup = () => onChange(updateGroup(group, group.id, (current) => ({ ...current, children: [...current.children, newGroup(matchableFields[0])] })))
  return <div className={depth ? "rounded-xl bg-[var(--surface-subtle)] p-3 sm:p-4" : ""}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-secondary)]"><span>满足</span><select aria-label={`${depth ? "嵌套" : "根"}条件组关系`} className="min-h-8 rounded-lg border border-[var(--border-strong)] bg-white px-2" value={group.combinator} onChange={(e) => onChange(updateGroup(group, group.id, (current) => ({ ...current, combinator: e.target.value as "all" | "any" })))}><option value="all">全部条件（AND）</option><option value="any">任一条件（OR）</option></select></div>
      {onRemove && <Button size="sm" variant="ghost" className="hover:text-[var(--danger)]" onClick={onRemove}><Trash2 className="size-3.5" />删除组</Button>}
    </div>
    <div className="space-y-2.5">{group.children.map((node, index) => node.kind === "group" ? <ConditionGroupEditor key={node.id} group={node} fields={fields} depth={depth + 1} onChange={(next) => onChange(updateGroup(group, node.id, () => next))} onRemove={() => onChange(removeNode(group, node.id))} /> : <div key={node.id} className="relative grid gap-2 rounded-xl border border-[var(--border)] bg-white p-3 sm:grid-cols-[minmax(130px,1fr)_minmax(130px,.8fr)_minmax(160px,1.2fr)_36px] sm:items-center">
      <div className="absolute -left-2 top-4 hidden size-5 place-items-center rounded-full bg-[var(--foreground)] text-[9px] font-bold text-white sm:grid">{index + 1}</div>
      <select aria-label={`第 ${depth + 1}-${index + 1} 条件的字段`} className="control" value={node.fieldKey} onChange={(e) => { const field = matchableFields.find((item) => item.key === e.target.value); onChange(updateCondition(group, node.id, { fieldKey: e.target.value, operator: (field ? operatorsByType[field.type][0] : "equals") as RuleOperator, value: "" })) }}><option value="">选择字段</option>{matchableFields.map((field) => <option key={field.id} value={field.key}>{field.label}</option>)}</select>
      <select aria-label={`第 ${depth + 1}-${index + 1} 条件的运算符`} className="control" value={node.operator} onChange={(e) => onChange(updateCondition(group, node.id, { operator: e.target.value as RuleOperator, value: ["exists", "notExists"].includes(e.target.value) ? undefined : "" }))}>{(operatorsByType[matchableFields.find((field) => field.key === node.fieldKey)?.type ?? "text"] as RuleOperator[]).map((operator) => <option key={operator} value={operator}>{operatorLabels[operator]}</option>)}</select>
      <ValueControl label={`第 ${depth + 1}-${index + 1} 条件的值`} condition={node} field={matchableFields.find((field) => field.key === node.fieldKey)} onChange={(value) => onChange(updateCondition(group, node.id, { value }))} />
      <button className="grid size-9 place-items-center justify-self-end rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => onChange(removeNode(group, node.id))} aria-label="删除条件"><Trash2 className="size-4" /></button>
    </div>)}</div>
    <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={addCondition}><Plus className="size-3.5" />添加条件</Button>{depth === 0 && <Button size="sm" variant="ghost" onClick={addGroup}><Braces className="size-3.5" />添加条件组</Button>}</div>
  </div>
}

function naturalSummary(tree: RuleConditionGroup, fields: PromptField[]) {
  const names = new Map(fields.map((field) => [field.key, field.label]))
  const render = (group: RuleConditionGroup): string => group.children.map((node) => node.kind === "group" ? `（${render(node)}）` : `${names.get(node.fieldKey) ?? (node.fieldKey || "未选择字段")} ${operatorLabels[node.operator]} ${["exists", "notExists"].includes(node.operator) ? "" : `“${Array.isArray(node.value) ? node.value.join("、") : node.value ?? ""}”`}`).join(group.combinator === "all" ? "，并且 " : "，或者 ")
  return render(tree) || "尚未添加条件"
}

export function RuleEditor({ templates, initial }: { templates: TemplateOption[]; initial: InitialRule }) {
  const router = useRouter()
  const [rule, setRule] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const template = templates.find((item) => item.id === rule.templateId) ?? templates[0]
  const summary = useMemo(() => naturalSummary(rule.conditionTree, template?.fields ?? []), [rule.conditionTree, template])
  const switchTemplate = (templateId: string) => {
    const next = templates.find((item) => item.id === templateId)
    setRule({ ...rule, templateId, conditionTree: newGroup(next?.fields.find((field) => field.matchable)), customContent: next?.content ?? "" })
  }
  const save = () => {
    setError(null); setSaved(false)
    startTransition(async () => {
      const response = await saveRuleAction(rule)
      if (!response.ok) setError(response.error)
      else { setSaved(true); if (!rule.id) router.replace(`/rules/${response.id}`); router.refresh(); window.setTimeout(() => setSaved(false), 1800) }
    })
  }
  if (!template) return <div className="panel p-8 text-center text-sm text-[var(--foreground-muted)]">请先创建一个模板，再添加规则。</div>
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6"><h2 className="section-title mb-5">规则信息</h2><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="rule-template">所属模板</label><select id="rule-template" className="control" value={rule.templateId} onChange={(e) => switchTemplate(e.target.value)} disabled={Boolean(rule.id)}>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label className="field-label" htmlFor="rule-name">规则名称</label><input id="rule-name" className="control" value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} /></div><div><label className="field-label" htmlFor="rule-priority">优先级</label><input id="rule-priority" className="control" type="number" value={rule.priority} onChange={(e) => setRule({ ...rule, priority: Number(e.target.value) })} /></div><div><label className="field-label" htmlFor="rule-status">状态</label><select id="rule-status" className="control" value={rule.enabled ? "enabled" : "disabled"} onChange={(e) => setRule({ ...rule, enabled: e.target.value === "enabled" })}><option value="enabled">启用</option><option value="disabled">停用</option></select></div><div className="sm:col-span-2"><label className="field-label" htmlFor="rule-description">说明</label><input id="rule-description" className="control" value={rule.description} onChange={(e) => setRule({ ...rule, description: e.target.value })} /></div></div></section>
      <section className="panel p-5 sm:p-6"><div className="mb-5"><h2 className="section-title">匹配条件</h2><p className="mb-0 mt-1 text-xs leading-5 text-[var(--foreground-muted)]">字段、运算符和值会根据模板结构自动约束。</p></div><ConditionGroupEditor group={rule.conditionTree} fields={template.fields} depth={0} onChange={(conditionTree) => setRule({ ...rule, conditionTree })} /></section>
      <section className="panel overflow-hidden"><div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><h2 className="section-title">定制提示词</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">规则命中时使用，支持与通用模板相同的变量。</p></div><div className="p-5 sm:p-6"><textarea aria-label="定制提示词内容" className="control mono min-h-[420px] leading-6" value={rule.customContent} onChange={(e) => setRule({ ...rule, customContent: e.target.value })} /></div></section>
    </div>
    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section className="panel p-5"><div className="mb-3 flex items-center justify-between"><h2 className="section-title">规则摘要</h2><Badge>{rule.conditionTree.combinator === "all" ? "全部满足" : "任一满足"}</Badge></div><p className="m-0 text-sm leading-7 text-[var(--foreground-secondary)]">当 {summary}，则使用“{rule.name || "未命名规则"}”。</p></section>
      <section className="panel p-5"><h2 className="section-title mb-3">可用变量</h2><div className="flex max-h-52 flex-wrap gap-2 overflow-auto">{template.fields.filter((field) => field.includeInPrompt).map((field) => <button key={field.id} className="mono rounded-lg bg-[var(--surface-subtle)] px-2 py-1.5 text-[10px] text-[var(--foreground-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]" onClick={() => setRule({ ...rule, customContent: `${rule.customContent}{{${field.key}}}` })}>{`{{${field.key}}}`}</button>)}</div>{error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-3 text-xs leading-5 text-[var(--danger)]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div>}<div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => router.push("/rules")}><ArrowLeft className="size-4" />取消</Button><Button onClick={save} loading={pending}>{saved ? <Check className="size-4" /> : <Save className="size-4" />}{saved ? "已保存" : "保存"}</Button></div></section>
    </aside>
  </div>
}
