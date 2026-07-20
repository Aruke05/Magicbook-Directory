import { requireSession } from "@/lib/auth/session"

export default async function TemplatesLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
