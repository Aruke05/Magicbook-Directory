export const globalParameterKinds = ["fixed", "select", "mapping"] as const
export const globalParameterValueTypes = ["text", "url", "multiline"] as const

export type GlobalParameterKind = (typeof globalParameterKinds)[number]
export type GlobalParameterValueType = (typeof globalParameterValueTypes)[number]

export type GlobalParameterOption = {
  label: string
  value: string
}

export type GlobalParameterMappingRule = {
  sourceValues: string[]
  output: string
}

export type GlobalParameter = {
  id: string
  key: string
  label: string
  description: string
  kind: GlobalParameterKind
  valueType: GlobalParameterValueType
  value: string
  options: GlobalParameterOption[]
  sourceParameterKey: string | null
  mappingRules: GlobalParameterMappingRule[]
  fallback: string
  enabled: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export type GlobalParameterInput = Omit<GlobalParameter, "id" | "createdAt" | "updatedAt">
