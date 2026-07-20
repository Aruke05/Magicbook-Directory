import type { LucideIcon } from "lucide-react"

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 grid size-11 place-items-center rounded-2xl bg-[var(--surface-hover)] text-[var(--foreground-muted)]"><Icon className="size-5" /></div>
    <h3 className="m-0 text-[15px] font-semibold">{title}</h3>
    <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--foreground-muted)]">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
}
