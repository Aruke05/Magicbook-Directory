import { redirect } from "next/navigation"
import Link from "next/link"
import { BookOpenText, LockKeyhole, Sparkles } from "lucide-react"
import { getSession } from "@/lib/auth/session"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = { title: "登录" }
export const runtime = "nodejs"

export default async function LoginPage() {
  if (await getSession()) redirect("/")
  return <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
    <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(23,105,210,0.09),transparent_64%)]" />
    <section className="relative w-full max-w-[410px]">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 grid size-12 place-items-center rounded-2xl bg-[var(--foreground)] text-white shadow-lg shadow-black/10"><BookOpenText className="size-6" /></div>
        <h1 className="m-0 text-[28px] font-bold tracking-[-0.04em]">欢迎回来</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground-secondary)]">登录 Magicbook，继续整理与生成 AI 提示词。</p>
      </div>
      <div className="panel p-6 sm:p-7"><LoginForm /></div>
      <div className="mt-5 flex flex-col items-center gap-3">
        <Link href="/" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-soft)]"><Sparkles className="size-3.5" />无需登录，直接生成提示词</Link>
        <p className="m-0 flex items-center justify-center gap-1.5 text-xs text-[var(--foreground-muted)]"><LockKeyhole className="size-3.5" />凭据只在服务端验证，此设备将保持登录</p>
      </div>
    </section>
  </main>
}
