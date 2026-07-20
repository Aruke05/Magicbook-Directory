import { getSession } from "@/lib/auth/session"
import { AppShell } from "@/components/layout/app-shell"

export const runtime = "nodejs"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return <AppShell isAuthenticated={Boolean(session)}>{children}</AppShell>
}
