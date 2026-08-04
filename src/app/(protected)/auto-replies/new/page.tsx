import { AutoReplyEditor } from "@/components/auto-replies/auto-reply-editor"

export const metadata = { title: "新建自动回复规则" }

export default function NewAutoReplyPage() {
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">新建自动回复规则</h1><p className="page-description">定义消息类型、关键词匹配方式和机器人的回复内容。</p></div></header><AutoReplyEditor initial={{ name: "", source: "both", matchType: "contains", keywordMode: "any", keywords: [], replyText: "", ignoreCase: true, ignoreWhitespace: false, ignorePunctuation: false, minOcrConfidence: 65, priority: 0, cooldownSeconds: 10, allowedChatIds: "", stopOnMatch: true, enabled: true }} /></div>
}
