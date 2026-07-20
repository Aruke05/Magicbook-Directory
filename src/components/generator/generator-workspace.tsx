"use client"

import { useMemo, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, Check, Clipboard, FileText, RotateCcw, Sparkles } from "lucide-react"
import { generatePromptAction } from "@/actions/generation"
import type { PromptField, PromptGenerationResult } from "@/domain/prompts/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

type TemplateOption = {
  id: string
  name: string
  description: string
  fields: PromptField[]
}

function defaults(fields: PromptField[]) {
  return Object.fromEntries(fields.map((field) => {
    if (field.defaultValue !== undefined) return [field.key, field.defaultValue]
    if (field.type === "checkbox" || field.type === "switch") return [field.key, false]
    if (field.type === "multi-select") return [field.key, []]
    return [field.key, ""]
  }))
}

function DynamicField({ field, register, error }: { field: PromptField; register: ReturnType<typeof useForm<Record<string, unknown>>>["register"]; error?: string }) {
  const common = { id: field.key, ...register(field.key, { required: field.required ? `${field.label}不能为空` : false }) }
  const describedBy = error ? `${field.key}-error` : field.description ? `${field.key}-help` : undefined

  if (field.type === "checkbox" || field.type === "switch") {
    return <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl bg-[var(--surface-subtle)] px-3.5 py-2.5">
      <div><label htmlFor={field.key} className="block text-sm font-semibold">{field.label}</label>{field.description && <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)]">{field.description}</p>}</div>
      <input {...common} type="checkbox" className="size-5 accent-[var(--accent)]" aria-describedby={describedBy} />
    </div>
  }

  const className = `control ${field.type === "code" ? "mono" : ""}`
  let control: React.ReactNode
  if (["textarea", "code", "markdown", "json"].includes(field.type)) {
    control = <textarea {...common} className={className} placeholder={field.placeholder} rows={field.type === "code" ? 8 : 4} aria-describedby={describedBy} />
  } else if (["select", "radio"].includes(field.type)) {
    control = <select {...common} className={className} aria-describedby={describedBy}>
      <option value="">请选择</option>
      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  } else if (field.type === "multi-select") {
    control = <select {...common} className={className} multiple size={Math.min(4, Math.max(2, field.options?.length ?? 2))} aria-describedby={describedBy}>
      {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  } else {
    control = <input {...common} type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"} className={className} placeholder={field.placeholder} aria-describedby={describedBy} />
  }

  return <div>
    <label htmlFor={field.key} className="field-label">{field.label}{field.required && <span className="text-[var(--danger)]" aria-label="必填">*</span>}</label>
    {control}
    {error ? <p id={`${field.key}-error`} className="field-error"><AlertCircle className="size-3.5" />{error}</p>
      : field.description && <p id={`${field.key}-help`} className="field-help">{field.description}</p>}
  </div>
}

export function GeneratorWorkspace({ templates }: { templates: TemplateOption[] }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const template = templates.find((item) => item.id === templateId) ?? templates[0]
  const form = useForm<Record<string, unknown>>({ defaultValues: defaults(template?.fields ?? []) })
  const [result, setResult] = useState<PromptGenerationResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const groups = useMemo(() => {
    const map = new Map<string, PromptField[]>()
    for (const field of template?.fields ?? []) {
      const key = field.group || "填写信息"
      map.set(key, [...(map.get(key) ?? []), field])
    }
    return [...map.entries()]
  }, [template])

  const changeTemplate = (id: string) => {
    const next = templates.find((item) => item.id === id)
    setTemplateId(id)
    form.reset(defaults(next?.fields ?? []))
    setResult(null)
    setMessage(null)
    setServerErrors({})
  }

  const submit = form.handleSubmit((values) => {
    if (!template) return
    setMessage(null)
    setServerErrors({})
    startTransition(async () => {
      const response = await generatePromptAction(template.id, values)
      if (response.ok) setResult(response.result)
      else {
        setResult(null)
        setMessage(response.error)
        const issues = (response.issues ?? {}) as Record<string, string[] | undefined>
        setServerErrors(Object.fromEntries(Object.entries(issues).map(([key, value]) => [key, value?.[0] ?? "内容不正确"])))
      }
    })
  })

  const reset = () => {
    form.reset(defaults(template?.fields ?? []))
    setResult(null)
    setMessage(null)
    setServerErrors({})
  }

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setMessage("复制失败，请选中内容后手动复制")
    }
  }

  if (!template) return <div className="panel"><EmptyState icon={FileText} title="还没有可用模板" description="先创建并启用一个提示词模板，之后就可以在这里生成内容。" /></div>

  return <div className="generator-grid">
    <section className="panel overflow-hidden">
      <div className="border-b border-[var(--border)] p-5 sm:p-6">
        <label htmlFor="template" className="field-label">提示词模板</label>
        <select id="template" className="control text-[15px] font-semibold" value={template.id} onChange={(event) => changeTemplate(event.target.value)}>
          {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <p className="mb-0 mt-3 text-sm leading-6 text-[var(--foreground-secondary)]">{template.description}</p>
        <div className="mt-3"><Badge>{template.fields.length} 个动态字段</Badge></div>
      </div>
      <form onSubmit={submit}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={template.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-7 p-5 sm:p-6">
            {groups.length ? groups.map(([name, fields]) => <fieldset key={name} className="m-0 border-0 p-0">
              <legend className="mb-4 text-[13px] font-bold tracking-wide text-[var(--foreground)]">{name}</legend>
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                {fields.map((field) => <div key={field.id} className={field.width === "full" ? "sm:col-span-2" : ""}>
                  <DynamicField field={field} register={form.register} error={(form.formState.errors[field.key]?.message as string | undefined) ?? serverErrors[field.key]} />
                </div>)}
              </div>
            </fieldset>) : <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-7 text-center text-sm text-[var(--foreground-muted)]">此模板无需填写字段，可直接生成。</div>}
            {message && <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--danger-soft)] px-3.5 py-3 text-sm text-[var(--danger)]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{message}</div>}
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="size-4" />重置</Button>
          <Button type="submit" loading={pending}><Sparkles className="size-4" />{pending ? "正在生成…" : "生成提示词"}</Button>
        </div>
      </form>
    </section>

    <section className="panel generator-result" aria-live="polite">
      <div className="flex min-h-[70px] items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div><h2 className="section-title">生成结果</h2>{result && <p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">{result.content.length.toLocaleString()} 个字符</p>}</div>
        <Button variant="secondary" size="sm" onClick={copy} disabled={!result}>{copied ? <Check className="size-3.5 text-[var(--success)]" /> : <Clipboard className="size-3.5" />}{copied ? "已复制" : "复制"}</Button>
      </div>
      {result ? <>
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-5 py-3">
          <Badge tone={result.source === "custom-rule" ? "accent" : "neutral"}>{result.source === "custom-rule" ? "定制规则" : "通用模板"}</Badge>
          {result.matchedRuleName && <span className="text-xs text-[var(--foreground-secondary)]">命中：{result.matchedRuleName}</span>}
        </div>
        <motion.pre initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prompt-output m-0 flex-1">{result.content}</motion.pre>
      </> : <EmptyState icon={Sparkles} title="结果会显示在这里" description="选择模板并填写必要信息，生成后可查看来源、命中规则并一键复制。" />}
    </section>
  </div>
}
