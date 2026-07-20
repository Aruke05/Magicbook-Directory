import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Magicbook", template: "%s · Magicbook" },
  description: "管理、匹配并生成高质量 AI 提示词。",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
