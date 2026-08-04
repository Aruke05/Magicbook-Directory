export const replySources = ["text", "image", "both"] as const
export const matchTypes = ["contains", "exact", "regex"] as const
export const keywordModes = ["any", "all"] as const

export type ReplySource = typeof replySources[number]
export type MatchType = typeof matchTypes[number]
export type KeywordMode = typeof keywordModes[number]

export type AutoReplyRuleInput = {
  id?: string
  name: string
  source: ReplySource
  matchType: MatchType
  keywordMode: KeywordMode
  keywords: string[]
  replyText: string
  ignoreCase: boolean
  ignoreWhitespace: boolean
  ignorePunctuation: boolean
  minOcrConfidence: number
  priority: number
  cooldownSeconds: number
  allowedChatIds: string
  stopOnMatch: boolean
  enabled: boolean
}

export type AutoReplyRule = AutoReplyRuleInput & {
  id: string
  createdAt: Date
  updatedAt: Date
}
