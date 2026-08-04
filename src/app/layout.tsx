import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "OCR AutoReply", template: "%s · OCR AutoReply" },
  description: "管理 Telegram 文字与图片 OCR 自动回复规则。",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
