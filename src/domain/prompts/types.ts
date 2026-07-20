export const fieldTypes = [
  "text",
  "textarea",
  "number",
  "select",
  "radio",
  "checkbox",
  "multi-select",
  "switch",
  "code",
  "url",
  "json",
  "markdown",
] as const

export type PromptFieldType = (typeof fieldTypes)[number]

export type PromptFieldOption = {
  label: string
  value: string
}

export type PromptFieldValidation = {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
}

export type PromptField = {
  id: string
  key: string
  label: string
  description?: string
  placeholder?: string
  type: PromptFieldType
  required: boolean
  defaultValue?: unknown
  options?: PromptFieldOption[]
  validation?: PromptFieldValidation
  sortOrder: number
  width: "full" | "half"
  matchable: boolean
  includeInPrompt: boolean
  storeInHistory: boolean
  sensitive: boolean
  group?: string
  advanced?: boolean
}

export const ruleOperators = [
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "in",
  "notIn",
  "exists",
  "notExists",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
] as const

export type RuleOperator = (typeof ruleOperators)[number]

export type RuleCondition = {
  id: string
  kind: "condition"
  fieldKey: string
  operator: RuleOperator
  value?: unknown
  caseSensitive?: boolean
}

export type RuleConditionGroup = {
  id: string
  kind: "group"
  combinator: "all" | "any"
  children: Array<RuleCondition | RuleConditionGroup>
}

export type ConditionEvaluation = {
  conditionId: string
  fieldKey: string
  operator: RuleOperator
  expectedValue?: unknown
  actualValue?: unknown
  matched: boolean
  reason: string
}

export type RuleEvaluation = {
  ruleId: string
  ruleName: string
  matched: boolean
  priority: number
  referencedFieldCount: number
  specificity: number
  conditionResults: ConditionEvaluation[]
}

export type PromptGenerationResult = {
  content: string
  templateId: string
  templateName: string
  source: "custom-rule" | "default-template"
  matchedRuleId?: string
  matchedRuleName?: string
  ruleEvaluations: RuleEvaluation[]
}

export type TemplateRecord = {
  id: string
  categoryId: string | null
  name: string
  slug: string
  description: string
  content: string
  fields: PromptField[]
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

export type RuleRecord = {
  id: string
  templateId: string
  name: string
  description: string
  conditionTree: RuleConditionGroup
  priority: number
  customContent: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}
