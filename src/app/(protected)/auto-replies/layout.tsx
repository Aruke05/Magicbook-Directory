import { requireSession } from "@/lib/auth/session"

export default async function AutoRepliesLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
