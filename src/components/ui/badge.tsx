import { cn } from "@/lib/utils"

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-[var(--surface-hover)] text-[var(--foreground-secondary)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  }
  return <span className={cn("inline-flex min-h-6 items-center rounded-full px-2.5 text-[11px] font-semibold leading-5", tones[tone], className)}>{children}</span>
}
