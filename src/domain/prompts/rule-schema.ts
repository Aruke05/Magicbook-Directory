import { z } from "zod"
import { ruleOperators, type PromptField, type RuleConditionGroup } from "./types"

const conditionSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("condition"),
  fieldKey: z.string().min(1),
  operator: z.enum(ruleOperators),
  value: z.unknown().optional(),
  caseSensitive: z.boolean().optional(),
})

type NodeInput = z.infer<typeof conditionSchema> | {
  id: string
  kind: "group"
  combinator: "all" | "any"
  children: NodeInput[]
}

const nodeSchema: z.ZodType<NodeInput> = z.lazy(() => z.union([
  conditionSchema,
  z.object({
    id: z.string().min(1),
    kind: z.literal("group"),
    combinator: z.enum(["all", "any"]),
    children: z.array(nodeSchema).min(1, "条件组不能为空"),
  }),
]))

export const conditionTreeSchema = z.object({
  id: z.string().min(1),
  kind: z.literal("group"),
  combinator: z.enum(["all", "any"]),
  children: z.array(nodeSchema).min(1, "至少需要一个条件"),
})

export const operatorsByType: Record<PromptField["type"], readonly string[]> = {
  text: ["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "in", "notIn", "exists", "notExists"],
  textarea: ["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "in", "notIn", "exists", "notExists"],
  code: ["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "exists", "notExists"],
  url: ["equals", "notEquals", "contains", "startsWith", "endsWith", "exists", "notExists"],
  json: ["equals", "notEquals", "contains", "notContains", "exists", "notExists"],
  markdown: ["equals", "notEquals", "contains", "notContains", "startsWith", "endsWith", "exists", "notExists"],
  number: ["equals", "notEquals", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "in", "notIn", "exists", "notExists"],
  select: ["equals", "notEquals", "in", "notIn", "exists", "notExists"],
  radio: ["equals", "notEquals", "in", "notIn", "exists", "notExists"],
  checkbox: ["equals", "notEquals", "exists", "notExists"],
  switch: ["equals", "notEquals", "exists", "notExists"],
  "multi-select": ["contains", "notContains", "in", "notIn", "exists", "notExists"],
}

export function validateConditionTree(tree: RuleConditionGroup, fields: PromptField[]) {
  conditionTreeSchema.parse(tree)
  const fieldMap = new Map(fields.map((field) => [field.key, field]))
  const visit = (node: RuleConditionGroup["children"][number], depth: number) => {
    if (depth > 2) throw new Error("第一版规则最多支持一层嵌套条件组")
    if (node.kind === "group") {
      node.children.forEach((child) => visit(child, depth + 1))
      return
    }
    const field = fieldMap.get(node.fieldKey)
    if (!field) throw new Error(`规则引用了不存在的字段：${node.fieldKey}`)
    if (!field.matchable) throw new Error(`字段“${field.label}”不允许用于规则匹配`)
    if (!operatorsByType[field.type].includes(node.operator)) {
      throw new Error(`字段“${field.label}”不能使用当前运算符`)
    }
  }
  tree.children.forEach((child) => visit(child, 1))
  return tree
}

export function parseConditionTree(value: string): RuleConditionGroup {
  return conditionTreeSchema.parse(JSON.parse(value)) as RuleConditionGroup
}
