import { requireSession } from "@/lib/auth/session"
import { AppShell } from "@/components/layout/app-shell"

export const runtime = "nodejs"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return <AppShell>{children}</AppShell>
}
