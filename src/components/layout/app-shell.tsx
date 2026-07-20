"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpenText, Clock3, FileText, LogOut, Menu, Plus, ScrollText, Sparkles, X } from "lucide-react"
import { logoutAction } from "@/actions/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const navigation = [
  { href: "/", label: "生成提示词", icon: Sparkles },
  { href: "/templates", label: "模板", icon: FileText },
  { href: "/rules", label: "定制规则", icon: ScrollText },
  { href: "/history", label: "生成历史", icon: Clock3 },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return <div className="app-shell">
    <header className="mobile-bar">
      <button className="grid size-10 place-items-center rounded-xl hover:bg-[var(--surface-hover)]" onClick={() => setOpen(true)} aria-label="打开导航"><Menu className="size-5" /></button>
      <div className="flex items-center gap-2 text-sm font-semibold"><BookOpenText className="size-4 text-[var(--accent)]" /> Magicbook</div>
      <div className="size-10" />
    </header>
    {open && <button className="fixed inset-0 z-20 bg-black/20 backdrop-blur-[1px] md:hidden" onClick={() => setOpen(false)} aria-label="关闭导航遮罩" />}
    <aside className="sidebar" data-open={open}>
      <div className="mb-8 flex h-10 items-center justify-between px-2">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-bold tracking-[-0.02em]" onClick={() => setOpen(false)}>
          <span className="grid size-8 place-items-center rounded-[10px] bg-[var(--foreground)] text-white"><BookOpenText className="size-4" /></span>
          Magicbook
        </Link>
        <button className="grid size-9 place-items-center rounded-xl hover:bg-[var(--surface-hover)] md:hidden" onClick={() => setOpen(false)} aria-label="关闭导航"><X className="size-4" /></button>
      </div>
      <nav className="space-y-1" aria-label="主导航">
        {navigation.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn(
            "flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors",
            active ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
          )}><item.icon className="size-[17px] stroke-[1.8]" />{item.label}</Link>
        })}
      </nav>
      <div className="mt-5 px-2">
        <Button asChild size="sm" className="w-full"><Link href="/templates/new"><Plus className="size-3.5" />新建模板</Link></Button>
      </div>
      <div className="mt-auto border-t border-[var(--border)] pt-4">
        <form action={logoutAction}>
          <button className="flex min-h-10 w-full items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]">
            <LogOut className="size-[17px]" />退出当前设备
          </button>
        </form>
      </div>
    </aside>
    <main className="app-main">{children}</main>
  </div>
}
