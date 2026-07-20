import type {
  ConditionEvaluation,
  RuleCondition,
  RuleConditionGroup,
  RuleEvaluation,
  RuleRecord,
} from "./types"

function exists(value: unknown) {
  if (value === undefined || value === null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function normalizeString(value: unknown, caseSensitive = false) {
  const normalized = String(value).trim().normalize("NFKC")
  return caseSensitive ? normalized : normalized.toLocaleLowerCase("zh-CN")
}

function normalizeComparable(value: unknown, caseSensitive = false): unknown {
  if (typeof value === "string") return normalizeString(value, caseSensitive)
  if (Array.isArray(value)) return value.map((item) => normalizeComparable(item, caseSensitive))
  return value
}

function equal(actual: unknown, expected: unknown, caseSensitive = false) {
  if (typeof actual === "number" || typeof expected === "number") {
    return typeof actual === "number" && typeof expected === "number" && Number.isFinite(actual) && actual === expected
  }
  if (typeof actual === "boolean" || typeof expected === "boolean") {
    return typeof actual === "boolean" && typeof expected === "boolean" && actual === expected
  }
  return normalizeString(actual, caseSensitive) === normalizeString(expected, caseSensitive)
}

function evaluateOperator(condition: RuleCondition, actual: unknown) {
  const expected = condition.value
  const caseSensitive = condition.caseSensitive ?? false
  if (condition.operator === "exists") return exists(actual)
  if (condition.operator === "notExists") return !exists(actual)
  if (!exists(actual)) return false

  switch (condition.operator) {
    case "equals":
      return equal(actual, expected, caseSensitive)
    case "notEquals":
      return !equal(actual, expected, caseSensitive)
    case "contains":
      if (Array.isArray(actual)) return actual.some((item) => equal(item, expected, caseSensitive))
      return normalizeString(actual, caseSensitive).includes(normalizeString(expected, caseSensitive))
    case "notContains":
      if (Array.isArray(actual)) return !actual.some((item) => equal(item, expected, caseSensitive))
      return !normalizeString(actual, caseSensitive).includes(normalizeString(expected, caseSensitive))
    case "startsWith":
      return normalizeString(actual, caseSensitive).startsWith(normalizeString(expected, caseSensitive))
    case "endsWith":
      return normalizeString(actual, caseSensitive).endsWith(normalizeString(expected, caseSensitive))
    case "in": {
      const expectedValues = Array.isArray(expected) ? expected : String(expected ?? "").split(",").map((item) => item.trim()).filter(Boolean)
      if (Array.isArray(actual)) {
        return actual.some((item) => expectedValues.some((candidate) => equal(item, candidate, caseSensitive)))
      }
      return expectedValues.some((candidate) => equal(actual, candidate, caseSensitive))
    }
    case "notIn": {
      const expectedValues = Array.isArray(expected) ? expected : String(expected ?? "").split(",").map((item) => item.trim()).filter(Boolean)
      if (Array.isArray(actual)) {
        return !actual.some((item) => expectedValues.some((candidate) => equal(item, candidate, caseSensitive)))
      }
      return !expectedValues.some((candidate) => equal(actual, candidate, caseSensitive))
    }
    case "greaterThan":
      return typeof actual === "number" && typeof expected === "number" && actual > expected
    case "greaterThanOrEqual":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected
    case "lessThan":
      return typeof actual === "number" && typeof expected === "number" && actual < expected
    case "lessThanOrEqual":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected
  }
}

function expectationText(value: unknown) {
  if (Array.isArray(value)) return value.join("、")
  if (value === undefined) return "未提供"
  return String(value)
}

function evaluateCondition(condition: RuleCondition, input: Record<string, unknown>): ConditionEvaluation {
  const actual = input[condition.fieldKey]
  const matched = Boolean(evaluateOperator(condition, actual))
  return {
    conditionId: condition.id,
    fieldKey: condition.fieldKey,
    operator: condition.operator,
    expectedValue: normalizeComparable(condition.value, condition.caseSensitive),
    actualValue: normalizeComparable(actual, condition.caseSensitive),
    matched,
    reason: matched
      ? `字段 ${condition.fieldKey} 满足条件`
      : `期望 ${expectationText(condition.value)}，实际为 ${exists(actual) ? expectationText(actual) : "未填写"}`,
  }
}

function evaluateGroup(group: RuleConditionGroup, input: Record<string, unknown>): { matched: boolean; results: ConditionEvaluation[] } {
  const children = group.children.map((node) => node.kind === "group"
    ? evaluateGroup(node, input)
    : { matched: Boolean(evaluateOperator(node, input[node.fieldKey])), results: [evaluateCondition(node, input)] })
  return {
    matched: group.combinator === "all" ? children.every((child) => child.matched) : children.some((child) => child.matched),
    results: children.flatMap((child) => child.results),
  }
}

function treeStats(tree: RuleConditionGroup) {
  const fieldKeys = new Set<string>()
  let leafCount = 0
  let depthScore = 0
  const visit = (group: RuleConditionGroup, depth: number) => {
    for (const node of group.children) {
      if (node.kind === "group") visit(node, depth + 1)
      else {
        fieldKeys.add(node.fieldKey)
        leafCount += 1
        depthScore += depth
      }
    }
  }
  visit(tree, 1)
  return { referencedFieldCount: fieldKeys.size, specificity: leafCount * 100 + depthScore }
}

export function evaluateRule(rule: RuleRecord, input: Record<string, unknown>): RuleEvaluation {
  const evaluation = evaluateGroup(rule.conditionTree, input)
  const stats = treeStats(rule.conditionTree)
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    matched: evaluation.matched,
    priority: rule.priority,
    referencedFieldCount: stats.referencedFieldCount,
    specificity: stats.specificity,
    conditionResults: evaluation.results,
  }
}

export function matchRules(rules: RuleRecord[], input: Record<string, unknown>) {
  const evaluations = rules.filter((rule) => rule.enabled).map((rule) => evaluateRule(rule, input))
  const evaluationMap = new Map(evaluations.map((item) => [item.ruleId, item]))
  const selected = rules
    .filter((rule) => evaluationMap.get(rule.id)?.matched)
    .sort((left, right) => {
      const a = evaluationMap.get(left.id)!
      const b = evaluationMap.get(right.id)!
      return b.priority - a.priority
        || b.referencedFieldCount - a.referencedFieldCount
        || b.specificity - a.specificity
        || right.updatedAt.getTime() - left.updatedAt.getTime()
        || left.id.localeCompare(right.id)
    })[0]
  return { selected, evaluations }
}
