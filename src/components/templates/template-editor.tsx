"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronRight, Copy, Plus, Save, Trash2, Variable } from "lucide-react"
import { saveTemplateAction } from "@/actions/templates"
import { fieldTypes, type PromptField } from "@/domain/prompts/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

type InitialTemplate = {
  id?: string
  categoryId: string | null
  name: string
  slug: string
  description: string
  content: string
  enabled: boolean
  fields: PromptField[]
}

const fieldTypeLabels: Record<PromptField["type"], string> = {
  text: "单行文本", textarea: "多行文本", number: "数字", select: "下拉选择", radio: "单选",
  checkbox: "复选框", "multi-select": "多选", switch: "开关", code: "代码", url: "网址", json: "JSON", markdown: "Markdown",
}

const newField = (index: number): PromptField => ({
  id: crypto.randomUUID(), key: `field${index + 1}`, label: "新字段", type: "text", required: false,
  sortOrder: index, width: "full", matchable: true, includeInPrompt: true, storeInHistory: true, sensitive: false,
})

export function TemplateEditor({ initial, categories }: { initial: InitialTemplate; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [template, setTemplate] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(initial.fields[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const sortedFields = useMemo(() => [...template.fields].sort((a, b) => a.sortOrder - b.sortOrder), [template.fields])
  const updateField = (id: string, patch: Partial<PromptField>) => setTemplate((current) => ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field) }))
  const addField = () => {
    const field = newField(template.fields.length)
    setTemplate((current) => ({ ...current, fields: [...current.fields, field] }))
    setExpanded(field.id)
  }
  const duplicateField = (field: PromptField) => {
    const copy = { ...field, id: crypto.randomUUID(), key: `${field.key}Copy`, label: `${field.label}副本`, sortOrder: template.fields.length }
    setTemplate((current) => ({ ...current, fields: [...current.fields, copy] }))
    setExpanded(copy.id)
  }
  const removeField = (field: PromptField) => {
    setTemplate((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id).map((item, index) => ({ ...item, sortOrder: index })) }))
  }
  const moveField = (id: string, offset: number) => {
    const list = [...sortedFields]
    const from = list.findIndex((field) => field.id === id)
    const to = from + offset
    if (from < 0 || to < 0 || to >= list.length) return
    ;[list[from], list[to]] = [list[to], list[from]]
    setTemplate((current) => ({ ...current, fields: list.map((field, index) => ({ ...field, sortOrder: index })) }))
  }
  const insertVariable = (key: string, conditional = false) => {
    const area = textareaRef.current
    const token = conditional ? `{{#if ${key}}}\n{{${key}}}\n{{/if}}` : `{{${key}}}`
    if (!area) return
    const start = area.selectionStart
    const next = `${template.content.slice(0, start)}${token}${template.content.slice(area.selectionEnd)}`
    setTemplate((current) => ({ ...current, content: next }))
    requestAnimationFrame(() => { area.focus(); area.setSelectionRange(start + token.length, start + token.length) })
  }
  const save = () => {
    setError(null); setSaved(false)
    startTransition(async () => {
      const response = await saveTemplateAction({ ...template, fields: sortedFields })
      if (!response.ok) setError(response.error)
      else {
        setSaved(true)
        if (!template.id) router.replace(`/templates/${response.id}`)
        router.refresh()
        window.setTimeout(() => setSaved(false), 1800)
      }
    })
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <h2 className="section-title mb-5">基本信息</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="name">模板名称 *</label><input id="name" className="control" value={template.name} onChange={(e) => setTemplate({ ...template, name: e.target.value })} placeholder="例如：代码审查" /></div>
          <div><label className="field-label" htmlFor="slug">模板标识 *</label><input id="slug" className="control mono" value={template.slug} onChange={(e) => setTemplate({ ...template, slug: e.target.value.toLowerCase() })} placeholder="code-review" /></div>
          <div><label className="field-label" htmlFor="category">模板分类</label><select id="category" className="control" value={template.categoryId ?? ""} onChange={(e) => setTemplate({ ...template, categoryId: e.target.value || null })}><option value="">未分类</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="description">模板说明</label><textarea id="description" className="control min-h-20" value={template.description} onChange={(e) => setTemplate({ ...template, description: e.target.value })} placeholder="说明这个模板适合解决什么问题" /></div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={template.enabled} onChange={(e) => setTemplate({ ...template, enabled: e.target.checked })} className="size-4 accent-[var(--accent)]" /><span><strong className="font-semibold">启用模板</strong><span className="ml-2 text-[var(--foreground-muted)]">停用后不会出现在生成页</span></span></label>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><h2 className="section-title">动态字段</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">字段数量不限，顺序变化不会影响规则引用。</p></div><Button size="sm" variant="secondary" onClick={addField}><Plus className="size-3.5" />添加字段</Button></div>
        {sortedFields.length ? <div className="divide-y divide-[var(--border)]">{sortedFields.map((field, index) => {
          const open = expanded === field.id
          return <div key={field.id}>
            <div className="flex min-h-16 items-center gap-2 px-3 py-3 sm:px-5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(open ? null : field.id)} aria-expanded={open}>
                {open ? <ChevronDown className="size-4 shrink-0 text-[var(--foreground-muted)]" /> : <ChevronRight className="size-4 shrink-0 text-[var(--foreground-muted)]" />}
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{field.label}</span><span className="mono mt-0.5 block truncate text-[11px] text-[var(--foreground-muted)]">{field.key}</span></span>
              </button>
              <Badge>{fieldTypeLabels[field.type]}</Badge>{field.required && <Badge tone="accent">必填</Badge>}
              <div className="hidden items-center sm:flex">
                <button className="grid size-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" onClick={() => moveField(field.id, -1)} disabled={index === 0} aria-label={`上移${field.label}`}><ArrowUp className="size-3.5" /></button>
                <button className="grid size-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" onClick={() => moveField(field.id, 1)} disabled={index === sortedFields.length - 1} aria-label={`下移${field.label}`}><ArrowDown className="size-3.5" /></button>
              </div>
            </div>
            {open && <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-5 sm:px-11">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="field-label">字段名称</label><input aria-label={`${field.label}的字段名称`} className="control" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} /></div>
                <div><label className="field-label">字段 Key</label><input aria-label={`${field.label}的字段 Key`} className="control mono" value={field.key} onChange={(e) => updateField(field.id, { key: e.target.value })} /></div>
                <div><label className="field-label">字段类型</label><select aria-label={`${field.label}的字段类型`} className="control" value={field.type} onChange={(e) => updateField(field.id, { type: e.target.value as PromptField["type"] })}>{fieldTypes.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}</select></div>
                <div><label className="field-label">字段宽度</label><select aria-label={`${field.label}的字段宽度`} className="control" value={field.width} onChange={(e) => updateField(field.id, { width: e.target.value as "full" | "half" })}><option value="full">整行</option><option value="half">半行</option></select></div>
                <div><label className="field-label">分组</label><input aria-label={`${field.label}的分组`} className="control" value={field.group ?? ""} onChange={(e) => updateField(field.id, { group: e.target.value })} placeholder="例如：项目信息" /></div>
                <div><label className="field-label">占位提示</label><input aria-label={`${field.label}的占位提示`} className="control" value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} /></div>
                <div className="sm:col-span-2"><label className="field-label">字段说明</label><input aria-label={`${field.label}的字段说明`} className="control" value={field.description ?? ""} onChange={(e) => updateField(field.id, { description: e.target.value })} /></div>
                {["select", "radio", "multi-select"].includes(field.type) && <div className="sm:col-span-2"><label className="field-label">选项（每行使用“名称=值”）</label><textarea aria-label={`${field.label}的选项`} className="control mono min-h-24" value={field.options?.map((item) => `${item.label}=${item.value}`).join("\n") ?? ""} onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").filter(Boolean).map((line) => { const [label, ...rest] = line.split("="); return { label: label.trim(), value: (rest.join("=") || label).trim() } }) })} /></div>}
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--foreground-secondary)]">
                {[["required", "必填"], ["matchable", "可用于规则"], ["includeInPrompt", "可用于模板"], ["storeInHistory", "写入历史"], ["sensitive", "敏感信息"]].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={Boolean(field[key as keyof PromptField])} onChange={(e) => updateField(field.id, { [key]: e.target.checked })} />{label}</label>)}
              </div>
              <div className="mt-4 flex items-center justify-between"><div className="flex gap-1 sm:hidden"><Button size="sm" variant="ghost" onClick={() => moveField(field.id, -1)} disabled={index === 0}><ArrowUp className="size-3.5" />上移</Button><Button size="sm" variant="ghost" onClick={() => moveField(field.id, 1)} disabled={index === sortedFields.length - 1}><ArrowDown className="size-3.5" />下移</Button></div><div className="ml-auto flex gap-1"><Button size="sm" variant="ghost" onClick={() => duplicateField(field)} aria-label={`复制${field.label}`}><Copy className="size-3.5" />复制</Button><ConfirmDialog title={`删除字段“${field.label}”？`} description="保存模板时会再次检查模板变量和规则引用；仍被引用的字段无法删除。" onConfirm={() => removeField(field)} trigger={<Button size="sm" variant="ghost" className="hover:text-[var(--danger)]" aria-label={`删除${field.label}`}><Trash2 className="size-3.5" />删除</Button>} /></div></div>
            </div>}
          </div>
        })}</div> : <div className="px-6 py-10 text-center text-sm text-[var(--foreground-muted)]">当前模板没有字段，仍可直接生成固定提示词。</div>}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><h2 className="section-title">通用提示词</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">没有定制规则命中时使用此内容。</p></div>
        <div className="p-5 sm:p-6"><textarea ref={textareaRef} className="control mono min-h-[420px] leading-6" value={template.content} onChange={(e) => setTemplate({ ...template, content: e.target.value })} placeholder="输入提示词内容，并通过右侧变量面板插入字段…" /></div>
      </section>
    </div>

    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section className="panel p-5"><div className="mb-4 flex items-center gap-2"><Variable className="size-4 text-[var(--accent)]" /><h2 className="section-title">可用变量</h2></div>{sortedFields.filter((field) => field.includeInPrompt).length ? <div className="max-h-72 space-y-1 overflow-auto">{sortedFields.filter((field) => field.includeInPrompt).map((field) => <div key={field.id} className="group flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-[var(--surface-subtle)]"><div className="min-w-0"><div className="truncate text-xs font-semibold">{field.label}</div><div className="mono truncate text-[10px] text-[var(--foreground-muted)]">{`{{${field.key}}}`}</div></div><div className="hidden shrink-0 gap-1 group-hover:flex"><button className="rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => insertVariable(field.key)}>插入</button><button className="rounded-md px-2 py-1 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]" onClick={() => insertVariable(field.key, true)}>条件</button></div></div>)}</div> : <p className="text-xs leading-5 text-[var(--foreground-muted)]">添加字段并启用“可用于模板”后，可在这里快速插入变量。</p>}</section>
      <section className="panel overflow-hidden"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="section-title">内容预览</h2></div><pre className="mono m-0 max-h-60 overflow-auto whitespace-pre-wrap break-words bg-[var(--surface-subtle)] p-5 text-[11px] leading-5 text-[var(--foreground-secondary)]">{template.content || "通用提示词内容会显示在这里。"}</pre></section>
      <section className="panel p-5"><h2 className="section-title mb-3">保存检查</h2><ul className="m-0 space-y-2 pl-0 text-xs leading-5 text-[var(--foreground-secondary)]">{["字段 Key 在模板内唯一", "规则引用与字段类型兼容", "模板变量全部可解析"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />{item}</li>)}</ul>{error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-3 text-xs leading-5 text-[var(--danger)]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div>}<div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => router.push("/templates")}><ArrowLeft className="size-4" />取消</Button><Button onClick={save} loading={pending}>{saved ? <Check className="size-4" /> : <Save className="size-4" />}{saved ? "已保存" : "保存"}</Button></div></section>
    </aside>
  </div>
}
