"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Braces, Check, ChevronDown, ChevronRight, Copy, Plus, Save, Trash2, Variable } from "lucide-react"
import { saveTemplateAction } from "@/actions/templates"
import { fieldTypes, type PromptField } from "@/domain/prompts/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { AdaptiveSelect, SearchableMultiSelect } from "@/components/ui/searchable-select"

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
  checkbox: "复选框", "multi-select": "多选", switch: "开关", code: "代码", url: "网址", json: "JSON", markdown: "Markdown", mapping: "自动映射",
}

const newField = (index: number): PromptField => ({
  id: crypto.randomUUID(), key: `field${index + 1}`, label: "新字段", type: "text", required: false,
  sortOrder: index, width: "full", includeInPrompt: true, storeInHistory: true, sensitive: false,
})

const serializeOptions = (field: PromptField) => field.options?.map((item) => `${item.label}=${item.value}`).join("\n") ?? ""

const parseOptions = (value: string) => value
  .split("\n")
  .filter((line) => line.trim().length > 0)
  .map((line) => {
    const [label, ...rest] = line.split("=")
    return { label: label.trim(), value: (rest.join("=") || label).trim() }
  })

function MappingSourceValuePicker({
  label,
  options,
  values,
  onChange,
}: {
  label: string
  options: NonNullable<PromptField["options"]>
  values: string[]
  onChange: (values: string[]) => void
}) {
  return <SearchableMultiSelect
    options={options.map((option) => ({ ...option, meta: option.label === option.value ? undefined : option.value }))}
    values={values.map((value) => value.trim()).filter(Boolean)}
    onValuesChange={onChange}
    placeholder="请选择匹配选项"
    searchPlaceholder="搜索匹配选项"
    ariaLabel={label}
  />
}

export function TemplateEditor({ initial, categories }: { initial: InitialTemplate; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [template, setTemplate] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(initial.fields[0]?.id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [insertFieldId, setInsertFieldId] = useState(initial.fields.find((field) => field.includeInPrompt)?.id ?? "")
  const [optionDrafts, setOptionDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initial.fields.map((field) => [field.id, serializeOptions(field)])))
  const [pending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeContentEditor = useCallback(() => {
    const area = textareaRef.current
    if (!area) return
    const minHeight = 320
    const maxHeight = Math.max(minHeight, Math.min(900, Math.floor(window.innerHeight * 0.72)))
    area.style.height = "auto"
    const contentHeight = area.scrollHeight
    area.style.height = `${Math.min(Math.max(contentHeight, minHeight), maxHeight)}px`
    area.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden"
  }, [])

  useLayoutEffect(resizeContentEditor, [resizeContentEditor, template.content])
  useEffect(() => {
    window.addEventListener("resize", resizeContentEditor)
    return () => window.removeEventListener("resize", resizeContentEditor)
  }, [resizeContentEditor])

  const sortedFields = useMemo(() => [...template.fields].sort((a, b) => a.sortOrder - b.sortOrder), [template.fields])
  const insertableFields = useMemo(() => sortedFields.filter((field) => field.includeInPrompt), [sortedFields])
  const insertField = insertableFields.find((field) => field.id === insertFieldId) ?? insertableFields[0]
  const updateField = (id: string, patch: Partial<PromptField>) => setTemplate((current) => ({ ...current, fields: current.fields.map((field) => field.id === id ? { ...field, ...patch } : field) }))
  const updateFieldOptions = (field: PromptField, value: string) => {
    setOptionDrafts((current) => ({ ...current, [field.id]: value }))
    updateField(field.id, { options: parseOptions(value) })
  }
  const updateFieldKey = (field: PromptField, key: string) => setTemplate((current) => ({
    ...current,
    fields: current.fields.map((item) => {
      if (item.id === field.id) return { ...item, key }
      if (item.mapping?.sourceFieldKey === field.key) return { ...item, mapping: { ...item.mapping, sourceFieldKey: key } }
      return item
    }),
  }))
  const changeFieldType = (field: PromptField, type: PromptField["type"]) => {
    if (type !== "mapping") return updateField(field.id, {
      type,
      mapping: undefined,
      required: field.type === "mapping" ? false : field.required,
      storeInHistory: field.type === "mapping" ? true : field.storeInHistory,
    })
    const source = sortedFields.find((item) => item.id !== field.id && ["text", "select", "radio"].includes(item.type))
    updateField(field.id, {
      type,
      required: true,
      width: "full",
      includeInPrompt: true,
      storeInHistory: false,
      sensitive: false,
      mapping: { sourceFieldKey: source?.key ?? "", rules: [{ sourceValues: [""], output: "" }] },
    })
  }
  const addField = () => {
    const field = newField(template.fields.length)
    setTemplate((current) => ({ ...current, fields: [...current.fields, field] }))
    setExpanded(field.id)
  }
  const addMappingField = () => {
    const source = sortedFields.find((field) => ["text", "select", "radio"].includes(field.type))
    const field: PromptField = {
      ...newField(template.fields.length),
      label: "自动映射",
      key: `mappedField${template.fields.length + 1}`,
      type: "mapping",
      required: true,
      storeInHistory: false,
      mapping: { sourceFieldKey: source?.key ?? "", rules: [{ sourceValues: [""], output: "" }] },
    }
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
          <div><label className="field-label" htmlFor="category">模板分类</label><AdaptiveSelect id="category" options={categories.map((category) => ({ value: category.id, label: category.name }))} value={template.categoryId ?? ""} onValueChange={(value) => setTemplate({ ...template, categoryId: value || null })} placeholder="未分类" searchPlaceholder="搜索模板分类" ariaLabel="模板分类" /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="description">模板说明</label><textarea id="description" className="control min-h-20" value={template.description} onChange={(e) => setTemplate({ ...template, description: e.target.value })} placeholder="说明这个模板适合解决什么问题" /></div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={template.enabled} onChange={(e) => setTemplate({ ...template, enabled: e.target.checked })} className="size-4 accent-[var(--accent)]" /><span><strong className="font-semibold">启用模板</strong><span className="ml-2 text-[var(--foreground-muted)]">停用后不会出现在生成页</span></span></label>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><h2 className="section-title">动态字段</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">普通字段由用户填写，自动映射字段由系统计算。</p></div><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="secondary" onClick={addField}><Plus className="size-3.5" />添加输入字段</Button><Button size="sm" variant="secondary" onClick={addMappingField}><ArrowRight className="size-3.5" />添加自动映射</Button></div></div>
        {sortedFields.length ? <div className="divide-y divide-[var(--border)]">{sortedFields.map((field, index) => {
          const open = expanded === field.id
          const mapping = field.mapping ?? { sourceFieldKey: "", rules: [{ sourceValues: [""], output: "" }] }
          const mappingSources = sortedFields.filter((item) => item.id !== field.id && ["text", "select", "radio"].includes(item.type))
          const mappingSource = mappingSources.find((item) => item.key === mapping.sourceFieldKey)
          const mappingSourceOptions = ["select", "radio"].includes(mappingSource?.type ?? "") ? mappingSource?.options ?? [] : []
          return <div key={field.id}>
            <div className="flex min-h-16 items-center gap-2 px-3 py-3 sm:px-5">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setExpanded(open ? null : field.id)} aria-expanded={open}>
                {open ? <ChevronDown className="size-4 shrink-0 text-[var(--foreground-muted)]" /> : <ChevronRight className="size-4 shrink-0 text-[var(--foreground-muted)]" />}
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{field.label}</span><span className="mono mt-0.5 block truncate text-[11px] text-[var(--foreground-muted)]">{field.key}</span></span>
              </button>
              <Badge>{fieldTypeLabels[field.type]}</Badge>{field.required && field.type !== "mapping" && <Badge tone="accent">必填</Badge>}
              <div className="hidden items-center sm:flex">
                <button className="grid size-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" onClick={() => moveField(field.id, -1)} disabled={index === 0} aria-label={`上移${field.label}`}><ArrowUp className="size-3.5" /></button>
                <button className="grid size-8 place-items-center rounded-lg text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" onClick={() => moveField(field.id, 1)} disabled={index === sortedFields.length - 1} aria-label={`下移${field.label}`}><ArrowDown className="size-3.5" /></button>
              </div>
            </div>
            {open && <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-5 sm:px-11">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="field-label">字段名称</label><input aria-label={`${field.label}的字段名称`} className="control" value={field.label} onChange={(e) => updateField(field.id, { label: e.target.value })} /></div>
                <div><label className="field-label">字段 Key</label><input aria-label={`${field.label}的字段 Key`} className="control mono" value={field.key} onChange={(e) => updateFieldKey(field, e.target.value)} /></div>
                <div><label className="field-label">字段类型</label><select aria-label={`${field.label}的字段类型`} className="control" value={field.type} onChange={(e) => changeFieldType(field, e.target.value as PromptField["type"])}>{fieldTypes.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}</select></div>
                {field.type !== "mapping" && <>
                  <div><label className="field-label">字段宽度</label><select aria-label={`${field.label}的字段宽度`} className="control" value={field.width} onChange={(e) => updateField(field.id, { width: e.target.value as "full" | "half" })}><option value="full">整行</option><option value="half">半行</option></select></div>
                  <div><label className="field-label">分组</label><input aria-label={`${field.label}的分组`} className="control" value={field.group ?? ""} onChange={(e) => updateField(field.id, { group: e.target.value })} placeholder="例如：项目信息" /></div>
                  <div><label className="field-label">占位提示</label><input aria-label={`${field.label}的占位提示`} className="control" value={field.placeholder ?? ""} onChange={(e) => updateField(field.id, { placeholder: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className="field-label">字段说明</label><input aria-label={`${field.label}的字段说明`} className="control" value={field.description ?? ""} onChange={(e) => updateField(field.id, { description: e.target.value })} /></div>
                </>}
                {["select", "radio", "multi-select"].includes(field.type) && <div className="sm:col-span-2"><label className="field-label">选项（每行使用“名称=值”）</label><textarea aria-label={`${field.label}的选项`} className="control mono min-h-24" value={optionDrafts[field.id] ?? serializeOptions(field)} onChange={(e) => updateFieldOptions(field, e.target.value)} /></div>}
                {field.type === "mapping" && <div className="space-y-4 sm:col-span-2">
                  <div className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-xs leading-5 text-[var(--foreground-secondary)]"><strong className="text-[var(--foreground)]">这个字段由系统自动生成</strong><br />生成页面不会要求用户填写，只需配置下面的对应关系。</div>
                  <div>
                    <label className="field-label">根据哪个输入字段判断</label>
                    <AdaptiveSelect options={mappingSources.map((source) => ({ value: source.key, label: source.label, meta: source.key }))} value={mapping.sourceFieldKey} onValueChange={(value) => updateField(field.id, { mapping: { ...mapping, sourceFieldKey: value } })} placeholder="请选择来源字段" searchPlaceholder="搜索来源字段" ariaLabel={`${field.label}的来源字段`} />
                    {!mappingSources.length && <p className="field-help">请先添加一个单行文本、下拉选择或单选字段。</p>}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3"><label className="field-label mb-0">输入与输出的对应关系</label><Button size="sm" variant="secondary" onClick={() => updateField(field.id, { mapping: { ...mapping, rules: [...mapping.rules, { sourceValues: [""], output: "" }] } })}><Plus className="size-3.5" />添加一行</Button></div>
                    <div className="space-y-2">{mapping.rules.map((rule, ruleIndex) => <div key={ruleIndex} className="grid items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
                      {mappingSourceOptions.length ? <MappingSourceValuePicker
                        label={`第 ${ruleIndex + 1} 行需要匹配的内容`}
                        options={mappingSourceOptions}
                        values={rule.sourceValues}
                        onChange={(sourceValues) => updateField(field.id, { mapping: { ...mapping, rules: mapping.rules.map((item, index) => index === ruleIndex ? { ...item, sourceValues } : item) } })}
                      /> : <input className="control" aria-label={`第 ${ruleIndex + 1} 行需要匹配的内容`} value={rule.sourceValues.join(",")} onChange={(event) => updateField(field.id, { mapping: { ...mapping, rules: mapping.rules.map((item, index) => index === ruleIndex ? { ...item, sourceValues: event.target.value.split(/[,，]/) } : item) } })} placeholder="例如：nine, poppay" />}
                      <ArrowRight className="mx-auto mt-3 size-4 text-[var(--foreground-muted)]" />
                      <textarea className="control min-h-20" rows={3} aria-label={`第 ${ruleIndex + 1} 行自动输出的内容`} value={rule.output} onChange={(event) => updateField(field.id, { mapping: { ...mapping, rules: mapping.rules.map((item, index) => index === ruleIndex ? { ...item, output: event.target.value } : item) } })} placeholder="例如：uat，或多行服务专属内容" />
                      <Button size="icon" variant="ghost" disabled={mapping.rules.length === 1} onClick={() => updateField(field.id, { mapping: { ...mapping, rules: mapping.rules.filter((_, index) => index !== ruleIndex) } })} aria-label={`删除第 ${ruleIndex + 1} 行映射`}><Trash2 className="size-4" /></Button>
                    </div>)}</div>
                    <p className="field-help">多个输入得到同一个结果时，用逗号隔开；输出支持多行内容；匹配时忽略大小写和首尾空格。</p>
                  </div>
                  <div><label className="field-label">没有匹配时使用（可选）</label><input className="control" value={mapping.fallback ?? ""} onChange={(event) => updateField(field.id, { mapping: { ...mapping, fallback: event.target.value } })} placeholder="建议留空：生成时直接提示缺少映射" /><p className="field-help">留空最安全，可以防止系统使用错误结果。</p></div>
                </div>}
              </div>
              {field.type !== "mapping" && <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--foreground-secondary)]">
                {[["required", "必填"], ["includeInPrompt", "可用于模板"], ["storeInHistory", "写入历史"], ["sensitive", "敏感信息"]].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--accent)]" checked={Boolean(field[key as keyof PromptField])} onChange={(e) => updateField(field.id, { [key]: e.target.checked })} />{label}</label>)}
              </div>}
              <div className="mt-4 flex items-center justify-between"><div className="flex gap-1 sm:hidden"><Button size="sm" variant="ghost" onClick={() => moveField(field.id, -1)} disabled={index === 0}><ArrowUp className="size-3.5" />上移</Button><Button size="sm" variant="ghost" onClick={() => moveField(field.id, 1)} disabled={index === sortedFields.length - 1}><ArrowDown className="size-3.5" />下移</Button></div><div className="ml-auto flex gap-1"><Button size="sm" variant="ghost" onClick={() => duplicateField(field)} aria-label={`复制${field.label}`}><Copy className="size-3.5" />复制</Button><ConfirmDialog title={`删除字段“${field.label}”？`} description="保存模板时会检查提示词内容和自动映射引用，仍被使用的字段无法删除。" onConfirm={() => removeField(field)} trigger={<Button size="sm" variant="ghost" className="hover:text-[var(--danger)]" aria-label={`删除${field.label}`}><Trash2 className="size-3.5" />删除</Button>} /></div></div>
            </div>}
          </div>
        })}</div> : <div className="px-6 py-10 text-center text-sm text-[var(--foreground-muted)]">当前模板没有字段，仍可直接生成固定提示词。</div>}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6"><h2 className="section-title">提示词内容</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">填写动态字段后，将使用此模板生成最终提示词。</p></div>
        <div className="p-5 sm:p-6">
          <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-60 flex-1">
                <label className="field-label" htmlFor="insert-template-field">插入动态字段</label>
                <AdaptiveSelect id="insert-template-field" className="mono" options={insertableFields.map((field) => ({ value: field.id, label: field.label, meta: `{{${field.key}}}`, keywords: field.key }))} value={insertField?.id ?? ""} onValueChange={setInsertFieldId} disabled={!insertField} clearable={false} placeholder="暂无可用变量" searchPlaceholder="搜索字段名称或 Key" ariaLabel="插入动态字段" />
              </div>
              <Button size="sm" variant="secondary" onClick={() => insertField && insertVariable(insertField.key)} disabled={!insertField}><Variable className="size-3.5" />插入变量</Button>
              <Button size="sm" variant="secondary" onClick={() => insertField && insertVariable(insertField.key, true)} disabled={!insertField}><Braces className="size-3.5" />插入条件块</Button>
            </div>
            <p className="mb-0 mt-2 text-xs text-[var(--foreground-muted)]">插入到下方输入框的当前光标位置；条件块仅在字段有值时输出内容。</p>
          </div>
          <textarea ref={textareaRef} aria-label="提示词内容" className="control mono leading-6" style={{ resize: "none" }} value={template.content} onChange={(e) => setTemplate({ ...template, content: e.target.value })} placeholder="输入提示词内容，并使用上方工具栏插入动态字段…" />
        </div>
      </section>
    </div>

    <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
      <section className="panel overflow-hidden"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="section-title">内容预览</h2></div><pre className="mono m-0 max-h-60 overflow-auto whitespace-pre-wrap break-words bg-[var(--surface-subtle)] p-5 text-[11px] leading-5 text-[var(--foreground-secondary)]">{template.content || "通用提示词内容会显示在这里。"}</pre></section>
      <section className="panel p-5"><h2 className="section-title mb-3">保存检查</h2><ul className="m-0 space-y-2 pl-0 text-xs leading-5 text-[var(--foreground-secondary)]">{["字段 Key 在模板内唯一", "字段配置符合类型要求", "自动映射没有遗漏或重复", "模板变量全部可解析"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" />{item}</li>)}</ul>{error && <div role="alert" className="mt-4 flex gap-2 rounded-xl bg-[var(--danger-soft)] p-3 text-xs leading-5 text-[var(--danger)]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{error}</div>}<div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => router.push("/templates")}><ArrowLeft className="size-4" />取消</Button><Button onClick={save} loading={pending}>{saved ? <Check className="size-4" /> : <Save className="size-4" />}{saved ? "已保存" : "保存"}</Button></div></section>
    </aside>
  </div>
}
