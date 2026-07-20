"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SearchableOption = {
  value: string
  label: string
  description?: string
  meta?: string
  keywords?: string
}

type SharedProps = {
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  id?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaInvalid?: boolean
}

const normalize = (value: string) => value.trim().toLocaleLowerCase()

function useFilteredOptions(options: SearchableOption[], query: string) {
  return useMemo(() => {
    const keyword = normalize(query)
    if (!keyword) return options
    return options.filter((option) => normalize([
      option.label,
      option.value,
      option.description,
      option.meta,
      option.keywords,
    ].filter(Boolean).join(" ")).includes(keyword))
  }, [options, query])
}

function focusResult(content: HTMLDivElement | null, edge: "first" | "last") {
  const items = Array.from(content?.querySelectorAll<HTMLElement>("[data-picker-option]") ?? [])
  const item = edge === "first" ? items[0] : items[items.length - 1]
  item?.focus()
}

function SearchBox({
  value,
  onChange,
  placeholder,
  inputRef,
  contentRef,
  onClose,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  inputRef: React.RefObject<HTMLInputElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
  onClose: () => void
}) {
  return <div className="border-b border-[var(--border)] p-2">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            focusResult(contentRef.current, event.key === "ArrowDown" ? "first" : "last")
          }
          if (event.key === "Escape") onClose()
        }}
        className="h-10 w-full rounded-[9px] border border-transparent bg-[var(--surface-subtle)] pl-9 pr-9 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:shadow-[0_0_0_3px_var(--focus-ring)]"
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {value && <button type="button" onClick={() => onChange("")} className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]" aria-label="清空搜索"><X className="size-3.5" /></button>}
    </div>
  </div>
}

function OptionContent({ option }: { option: SearchableOption }) {
  return <span className="min-w-0 flex-1">
    <span className="flex items-baseline justify-between gap-3">
      <span className="truncate text-sm font-medium text-[var(--foreground)]">{option.label}</span>
      {option.meta && <span className="shrink-0 text-[11px] text-[var(--foreground-muted)]">{option.meta}</span>}
    </span>
    {option.description && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[var(--foreground-muted)]">{option.description}</span>}
  </span>
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "请选择",
  searchPlaceholder = "搜索选项",
  emptyText = "没有匹配的选项",
  clearable = false,
  disabled,
  className,
  id,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
}: SharedProps & {
  value: string
  onValueChange: (value: string) => void
  clearable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const filtered = useFilteredOptions(options, query)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery("")
  }

  return <DropdownMenu.Root open={open} onOpenChange={changeOpen} modal={false}>
    <DropdownMenu.Trigger asChild disabled={disabled}>
      <button
        id={id}
        type="button"
        className={cn("control flex min-w-0 items-center justify-between gap-3 text-left", ariaInvalid && "border-[var(--danger)]", className)}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        data-invalid={ariaInvalid || undefined}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-[var(--foreground-muted)]")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-[var(--foreground-muted)] transition-transform", open && "rotate-180")} />
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={contentRef}
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-floating)]"
      >
        <SearchBox value={query} onChange={setQuery} placeholder={searchPlaceholder} inputRef={inputRef} contentRef={contentRef} onClose={() => changeOpen(false)} />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length ? filtered.map((option) => <DropdownMenu.Item
            key={option.value}
            data-picker-option
            textValue={option.label}
            onSelect={() => onValueChange(option.value)}
            className="relative flex cursor-pointer select-none items-start gap-3 rounded-[10px] px-3 py-2.5 pl-9 outline-none data-[highlighted]:bg-[var(--surface-hover)]"
          >
            {option.value === value && <Check className="absolute left-3 top-3 size-4 text-[var(--accent)]" />}
            <OptionContent option={option} />
          </DropdownMenu.Item>) : <div className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">{emptyText}</div>}
        </div>
        <div className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--foreground-muted)]">
          <span>{query ? `${filtered.length} 个匹配结果` : `共 ${options.length} 个选项`}</span>
          {clearable && value && <DropdownMenu.Item onSelect={() => onValueChange("")} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] outline-none data-[highlighted]:bg-[var(--surface-hover)]">清除选择</DropdownMenu.Item>}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}

export function AdaptiveSelect({
  options,
  value,
  onValueChange,
  searchThreshold = 9,
  placeholder = "请选择",
  searchPlaceholder,
  emptyText,
  clearable = true,
  disabled,
  className,
  id,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
}: SharedProps & {
  value: string
  onValueChange: (value: string) => void
  searchThreshold?: number
  clearable?: boolean
}) {
  if (options.length >= searchThreshold) return <SearchableSelect
    options={options}
    value={value}
    onValueChange={onValueChange}
    placeholder={placeholder}
    searchPlaceholder={searchPlaceholder}
    emptyText={emptyText}
    clearable={clearable}
    disabled={disabled}
    className={className}
    id={id}
    ariaLabel={ariaLabel}
    ariaDescribedBy={ariaDescribedBy}
    ariaInvalid={ariaInvalid}
  />

  return <select
    id={id}
    className={cn("control", className)}
    value={value}
    onChange={(event) => onValueChange(event.target.value)}
    disabled={disabled}
    aria-label={ariaLabel}
    aria-describedby={ariaDescribedBy}
    aria-invalid={ariaInvalid || undefined}
  >
    <option value="">{placeholder}</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.meta ? `${option.label}（${option.meta}）` : option.label}</option>)}
  </select>
}

export function SearchableMultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = "请选择",
  searchPlaceholder = "搜索选项",
  emptyText = "没有匹配的选项",
  disabled,
  className,
  id,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
}: SharedProps & {
  values: string[]
  onValuesChange: (values: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const filtered = useFilteredOptions(options, query)
  const selected = new Set(values)
  const labels = values.map((value) => options.find((option) => option.value === value)?.label ?? value)
  const summary = labels.length > 2 ? `${labels.slice(0, 2).join("、")} 等 ${labels.length} 项` : labels.join("、")

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const changeOpen = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery("")
  }

  const toggle = (value: string, checked: boolean) => onValuesChange(checked
    ? [...values.filter((item) => item !== value), value]
    : values.filter((item) => item !== value))

  return <DropdownMenu.Root open={open} onOpenChange={changeOpen} modal={false}>
    <DropdownMenu.Trigger asChild disabled={disabled}>
      <button id={id} type="button" className={cn("control flex min-w-0 items-center justify-between gap-3 text-left", ariaInvalid && "border-[var(--danger)]", className)} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} data-invalid={ariaInvalid || undefined}>
        <span className={cn("min-w-0 flex-1 truncate", !summary && "text-[var(--foreground-muted)]")}>{summary || placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[var(--foreground-muted)]">{values.length > 0 && <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">{values.length}</span>}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></span>
      </button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content ref={contentRef} align="start" sideOffset={6} collisionPadding={12} className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] min-w-64 max-w-[calc(100vw-24px)] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-floating)]">
        <SearchBox value={query} onChange={setQuery} placeholder={searchPlaceholder} inputRef={inputRef} contentRef={contentRef} onClose={() => changeOpen(false)} />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length ? filtered.map((option) => <DropdownMenu.CheckboxItem
            key={option.value}
            data-picker-option
            textValue={option.label}
            checked={selected.has(option.value)}
            onCheckedChange={(checked) => toggle(option.value, checked === true)}
            onSelect={(event) => event.preventDefault()}
            className="relative flex cursor-pointer select-none items-start gap-3 rounded-[10px] px-3 py-2.5 pl-9 outline-none data-[highlighted]:bg-[var(--surface-hover)]"
          >
            <DropdownMenu.ItemIndicator className="absolute left-3 top-3"><Check className="size-4 text-[var(--accent)]" /></DropdownMenu.ItemIndicator>
            <OptionContent option={option} />
          </DropdownMenu.CheckboxItem>) : <div className="px-4 py-8 text-center text-sm text-[var(--foreground-muted)]">{emptyText}</div>}
        </div>
        <div className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--foreground-muted)]">
          <span>{query ? `${filtered.length} 个匹配结果` : `已选 ${values.length} / ${options.length}`}</span>
          {values.length > 0 && <DropdownMenu.Item onSelect={() => onValuesChange([])} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--foreground-secondary)] outline-none data-[highlighted]:bg-[var(--surface-hover)]">清空选择</DropdownMenu.Item>}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
}
