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
  "mapping",
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

export type PromptFieldMappingRule = {
  sourceValues: string[]
  output: string
}

export type PromptFieldMapping = {
  sourceFieldKey: string
  rules: PromptFieldMappingRule[]
  fallback?: string
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
  mapping?: PromptFieldMapping
  sortOrder: number
  width: "full" | "half"
  includeInPrompt: boolean
  storeInHistory: boolean
  sensitive: boolean
  group?: string
  advanced?: boolean
}

export type PromptGenerationResult = {
  content: string
  templateId: string
  templateName: string
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
