import { requireSession } from "@/lib/auth/session"

export default async function GlobalParametersLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
