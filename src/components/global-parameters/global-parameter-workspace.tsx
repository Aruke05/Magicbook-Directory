"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Braces,
  Check,
  ChevronRight,
  CircleDot,
  Equal,
  ListChecks,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
} from "lucide-react"
import { deleteGlobalParameterAction, saveGlobalParameterAction } from "@/actions/global-parameters"
import type {
  GlobalParameterInput,
  GlobalParameterKind,
  GlobalParameterMappingRule,
  GlobalParameterOption,
  GlobalParameterValueType,
} from "@/domain/global-parameters/types"
import { cn } from "@/lib/utils"
import { AdaptiveSelect } from "@/components/ui/searchable-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"

type ParameterView = GlobalParameterInput & {
  id: string
  createdAt: string
  updatedAt: string
}

type ParameterDraft = GlobalParameterInput & { id?: string }

const kindMeta: Record<GlobalParameterKind, { label: string; description: string; icon: typeof Equal }> = {
  fixed: { label: "固定值", description: "在所有模板中使用同一个值", icon: Equal },
  select: { label: "选项", description: "生成时从预设选项中选择", icon: ListChecks },
  mapping: { label: "映射", description: "根据另一条选项参数自动取值", icon: Braces },
}

const valueTypeLabels: Record<GlobalParameterValueType, string> = {
  text: "单行文本",
  url: "网址",
  multiline: "多行文本",
}

function createDraft(sortOrder: number): ParameterDraft {
  return {
    key: "",
    label: "",
    description: "",
    kind: "fixed",
    valueType: "text",
    value: "",
    options: [],
    sourceParameterKey: null,
    mappingRules: [],
    fallback: "",
    enabled: true,
    sortOrder,
  }
}

const serializeOptions = (options: GlobalParameterOption[]) => options.map((option) => `${option.label}=${option.value}`).join("\n")

const parseOptions = (value: string) => value.split("\n").flatMap((line) => {
  if (!line.trim()) return []
  const [label, ...rest] = line.split("=")
  const trimmedLabel = label.trim()
  const optionValue = (rest.join("=") || trimmedLabel).trim()
  return trimmedLabel && optionValue ? [{ label: trimmedLabel, value: optionValue }] : []
})

function outputFor(rules: GlobalParameterMappingRule[], sourceValue: string) {
  return rules.find((rule) => rule.sourceValues.includes(sourceValue))?.output ?? ""
}

function ParameterStatus({ parameter, parameters }: { parameter: ParameterView; parameters: ParameterView[] }) {
  if (!parameter.enabled) return <Badge>已停用</Badge>
  if (parameter.kind === "select") return <Badge tone={parameter.options.length ? "success" : "danger"}>{parameter.options.length} 个选项</Badge>
  if (parameter.kind === "fixed") return <Badge tone={parameter.value.trim() ? "success" : "danger"}>{parameter.value.trim() ? "已配置" : "待配置"}</Badge>
  const source = parameters.find((item) => item.key === parameter.sourceParameterKey)
  const complete = source?.options.filter((option) => outputFor(parameter.mappingRules, option.value).trim()).length ?? 0
  const total = source?.options.length ?? 0
  return <Badge tone={total > 0 && complete === total ? "success" : "danger"}>{complete} / {total}</Badge>
}

export function GlobalParameterWorkspace({ parameters }: { parameters: ParameterView[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(parameters[0]?.id ?? null)
  const selected = parameters.find((parameter) => parameter.id === selectedId)
  const [draft, setDraft] = useState<ParameterDraft>(() => selected ?? createDraft(parameters.length))
  const [optionDraft, setOptionDraft] = useState(() => serializeOptions(selected?.options ?? []))
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return parameters.filter((parameter) => !query || `${parameter.label} ${parameter.key} ${parameter.description}`.toLocaleLowerCase().includes(query))
  }, [parameters, search])
  const selectableSources = parameters.filter((parameter) => parameter.kind === "select" && parameter.enabled && parameter.id !== draft.id)
  const mappingSource = selectableSources.find((parameter) => parameter.key === draft.sourceParameterKey)
  const configuredCount = mappingSource?.options.filter((option) => outputFor(draft.mappingRules, option.value).trim()).length ?? 0

  const choose = (parameter: ParameterView) => {
    setSelectedId(parameter.id)
    setDraft(parameter)
    setOptionDraft(serializeOptions(parameter.options))
    setError(null)
    setSaved(false)
  }

  const add = () => {
    setSelectedId(null)
    setDraft(createDraft(parameters.length))
    setOptionDraft("")
    setError(null)
    setSaved(false)
  }

  const changeKind = (kind: GlobalParameterKind) => setDraft((current) => ({
    ...current,
    kind,
    value: kind === "fixed" ? current.value : "",
    options: kind === "select" ? current.options : [],
    sourceParameterKey: kind === "mapping" ? current.sourceParameterKey : null,
    mappingRules: kind === "mapping" ? current.mappingRules : [],
    fallback: kind === "mapping" ? current.fallback : "",
  }))

  const changeOptions = (value: string) => {
    setOptionDraft(value)
    setDraft((current) => ({ ...current, options: parseOptions(value) }))
  }

  const changeMappingOutput = (sourceValue: string, output: string) => setDraft((current) => {
    const nextRules = current.mappingRules
      .map((rule) => ({ ...rule, sourceValues: rule.sourceValues.filter((value) => value !== sourceValue) }))
      .filter((rule) => rule.sourceValues.length)
    if (output) nextRules.push({ sourceValues: [sourceValue], output })
    return { ...current, mappingRules: nextRules }
  })

  const save = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const response = await saveGlobalParameterAction(draft)
      if (!response.ok) {
        setError(response.error)
        return
      }
      setSelectedId(response.id)
      setDraft((current) => ({ ...current, id: response.id }))
      setSaved(true)
      router.refresh()
      window.setTimeout(() => setSaved(false), 1800)
    })
  }

  const remove = async () => {
    if (!draft.id) return
    setError(null)
    const response = await deleteGlobalParameterAction(draft.id)
    if (!response.ok) {
      setError(response.error)
      return
    }
    const next = parameters.find((parameter) => parameter.id !== draft.id)
    setSelectedId(next?.id ?? null)
    if (next) {
      setDraft(next)
      setOptionDraft(serializeOptions(next.options))
    } else {
      setDraft(createDraft(0))
      setOptionDraft("")
    }
    router.refresh()
  }

  const editor = <section className="panel min-w-0 overflow-hidden">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-5 sm:px-6">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="m-0 truncate text-lg font-semibold tracking-[-0.02em]">{draft.label || "新建参数"}</h2>
          {draft.id && <Badge tone={draft.enabled ? "success" : "neutral"}>{draft.enabled ? "已启用" : "已停用"}</Badge>}
        </div>
        <p className="m-0 text-xs leading-5 text-[var(--foreground-muted)]">{draft.id ? "修改参数配置后，所有引用它的模板都会使用新值。" : "创建一条可供所有模板复用的参数。"}</p>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[var(--foreground-secondary)]">
        <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} />
        启用
      </label>
    </div>

    <div className="space-y-7 p-5 sm:p-6">
      <section>
        <h3 className="section-title mb-4">基本信息</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="global-parameter-label">参数名称 *</label>
            <input id="global-parameter-label" className="control" value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="例如：四方支付服务" />
          </div>
          <div>
            <label className="field-label" htmlFor="global-parameter-key">参数 Key *</label>
            <input id="global-parameter-key" className="control mono" value={draft.key} disabled={Boolean(draft.id)} onChange={(event) => setDraft({ ...draft, key: event.target.value })} placeholder="sourceService" />
            <p className="field-help">{draft.id ? "Key 已锁定，避免已有模板变量失效。" : "模板中使用 {{参数Key}} 引用。"}</p>
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="global-parameter-description">参数说明</label>
            <input id="global-parameter-description" className="control" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="说明参数用途，方便后续维护" />
          </div>
        </div>
      </section>

      <section>
        <h3 className="section-title mb-3">取值方式</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.entries(kindMeta) as Array<[GlobalParameterKind, (typeof kindMeta)[GlobalParameterKind]]>).map(([kind, meta]) => {
            const Icon = meta.icon
            const active = draft.kind === kind
            return <button key={kind} type="button" onClick={() => changeKind(kind)} className={cn(
              "rounded-xl border p-3.5 text-left transition",
              active ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_var(--accent)]" : "border-[var(--border)] bg-[var(--surface-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]",
            )}>
              <span className="flex items-center gap-2 text-sm font-semibold"><Icon className={cn("size-4", active ? "text-[var(--accent)]" : "text-[var(--foreground-muted)]")} />{meta.label}</span>
              <span className="mt-1.5 block text-xs leading-5 text-[var(--foreground-muted)]">{meta.description}</span>
            </button>
          })}
        </div>
      </section>

      {draft.kind === "fixed" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="section-title">参数值</h3><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">模板每次生成时都会读取这里的最新内容。</p></div>
          <div className="w-full sm:w-40"><label className="field-label">内容格式</label><AdaptiveSelect options={Object.entries(valueTypeLabels).map(([value, label]) => ({ value, label }))} value={draft.valueType} onValueChange={(value) => setDraft({ ...draft, valueType: value as GlobalParameterValueType })} clearable={false} ariaLabel="固定值内容格式" /></div>
        </div>
        {draft.valueType === "multiline"
          ? <textarea className="control min-h-36" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="输入全局参数内容" />
          : <input className="control" type={draft.valueType === "url" ? "url" : "text"} value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder={draft.valueType === "url" ? "https://example.com" : "输入全局参数值"} />}
      </section>}

      {draft.kind === "select" && <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="section-title">可选项</h3><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">生成时显示名称，映射关系使用选项值。</p></div>
          <Badge tone={draft.options.length ? "accent" : "danger"}>{draft.options.length} 个选项</Badge>
        </div>
        <textarea className="control mono min-h-56 leading-6" value={optionDraft} onChange={(event) => changeOptions(event.target.value)} placeholder={"nexapay=nexapay\nlakpay=lakpay"} />
        <p className="field-help">每行一个选项，格式为“显示名称=选项值”；两者相同时可只填写一个。</p>
      </section>}

      {draft.kind === "mapping" && <section className="space-y-4">
        <div className="grid items-end gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:p-5">
          <div>
            <label className="field-label">映射来源 *</label>
            <AdaptiveSelect
              options={selectableSources.map((parameter) => ({ value: parameter.key, label: parameter.label, meta: parameter.key }))}
              value={draft.sourceParameterKey ?? ""}
              onValueChange={(value) => setDraft({ ...draft, sourceParameterKey: value || null, mappingRules: [] })}
              placeholder="请选择选项参数"
              searchPlaceholder="搜索来源参数"
              ariaLabel="映射来源参数"
            />
            <p className="field-help">来源参数的选项会自动展开，不需要手动重复录入。</p>
          </div>
          <div>
            <label className="field-label">输出格式</label>
            <AdaptiveSelect options={Object.entries(valueTypeLabels).map(([value, label]) => ({ value, label }))} value={draft.valueType} onValueChange={(value) => setDraft({ ...draft, valueType: value as GlobalParameterValueType })} clearable={false} ariaLabel="映射输出格式" />
          </div>
        </div>

        {mappingSource ? <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3.5 sm:px-5">
            <div>
              <h3 className="section-title">对应关系</h3>
              <p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">{mappingSource.label} <ArrowRight className="mx-1 inline size-3" /> {draft.label || "当前参数"}</p>
            </div>
            <Badge tone={configuredCount === mappingSource.options.length ? "success" : "danger"}>已配置 {configuredCount} / {mappingSource.options.length}</Badge>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {mappingSource.options.map((option) => {
              const output = outputFor(draft.mappingRules, option.value)
              return <div key={option.value} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(150px,0.72fr)_24px_minmax(0,1.28fr)] sm:items-center sm:px-5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{option.label}</div>
                  <div className="mono mt-1 truncate text-[11px] text-[var(--foreground-muted)]">{option.value}</div>
                </div>
                <ArrowRight className="hidden size-4 text-[var(--foreground-muted)] sm:block" />
                {draft.valueType === "multiline"
                  ? <textarea className={cn("control min-h-20", !output.trim() && "border-[var(--warning)]")} rows={2} value={output} onChange={(event) => changeMappingOutput(option.value, event.target.value)} placeholder="待配置" aria-label={`${option.label}的映射结果`} />
                  : <input className={cn("control", !output.trim() && "border-[var(--warning)]")} type={draft.valueType === "url" ? "url" : "text"} value={output} onChange={(event) => changeMappingOutput(option.value, event.target.value)} placeholder="待配置" aria-label={`${option.label}的映射结果`} />}
              </div>
            })}
          </div>
        </div> : <div className="rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-10 text-center">
          <CircleDot className="mx-auto size-6 text-[var(--foreground-muted)]" />
          <p className="mb-0 mt-3 text-sm font-semibold">先选择映射来源</p>
          <p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">选择一条“选项”参数后，这里会自动生成对应关系。</p>
        </div>}

        <div>
          <label className="field-label" htmlFor="global-parameter-fallback">未匹配时使用（可选）</label>
          <input id="global-parameter-fallback" className="control" value={draft.fallback} onChange={(event) => setDraft({ ...draft, fallback: event.target.value })} placeholder="建议留空，便于发现缺失配置" />
        </div>
      </section>}

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--danger-soft)] px-3.5 py-3 text-sm leading-6 text-[var(--danger)]"><AlertCircle className="mt-1 size-4 shrink-0" />{error}</div>}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-4 sm:px-6">
      <div>{draft.id && <ConfirmDialog title={`删除“${draft.label}”？`} description="正在被模板或其他映射使用的参数无法删除。" onConfirm={remove} trigger={<Button variant="ghost" className="hover:text-[var(--danger)]"><Trash2 className="size-4" />删除参数</Button>} />}</div>
      <Button onClick={save} loading={pending}>{saved ? <Check className="size-4" /> : <Save className="size-4" />}{saved ? "已保存" : "保存参数"}</Button>
    </div>
  </section>

  return <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
    <aside className="panel overflow-hidden lg:sticky lg:top-6">
      <div className="border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="section-title">参数列表</h2><p className="mb-0 mt-1 text-xs text-[var(--foreground-muted)]">共 {parameters.length} 条</p></div>
          <Button size="sm" onClick={add}><Plus className="size-3.5" />新建</Button>
        </div>
        {parameters.length > 5 && <div className="relative mt-3"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[var(--foreground-muted)]" /><input className="control pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索参数" aria-label="搜索全局参数" /></div>}
      </div>
      {filtered.length ? <div className="max-h-[calc(100vh-230px)] divide-y divide-[var(--border)] overflow-y-auto">
        {filtered.map((parameter) => {
          const active = parameter.id === selectedId
          const Icon = kindMeta[parameter.kind].icon
          return <button key={parameter.id} type="button" onClick={() => choose(parameter)} className={cn(
            "flex w-full items-center gap-3 px-4 py-4 text-left transition",
            active ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-subtle)]",
          )}>
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", active ? "bg-white text-[var(--accent)] shadow-sm" : "bg-[var(--surface-hover)] text-[var(--foreground-muted)]")}><Icon className="size-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{parameter.label}</span>
              <span className="mono mt-0.5 block truncate text-[11px] text-[var(--foreground-muted)]">{parameter.key}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2"><ParameterStatus parameter={parameter} parameters={parameters} /><ChevronRight className={cn("size-4 text-[var(--foreground-muted)]", active && "text-[var(--accent)]")} /></span>
          </button>
        })}
      </div> : <EmptyState icon={Settings2} title="暂无参数" description={parameters.length ? "没有找到匹配的参数。" : "新建第一条全局参数，供模板统一引用。"} />}
    </aside>
    {editor}
  </div>
}
