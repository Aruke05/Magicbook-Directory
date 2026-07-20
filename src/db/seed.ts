import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { eq } from "drizzle-orm"
import { promptCategories, promptRules, promptTemplates } from "./schema"
import type { PromptField, RuleConditionGroup } from "@/domain/prompts/types"

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/magicbook.db")
fs.mkdirSync(path.dirname(databasePath), { recursive: true })
const sqlite = new Database(databasePath)
sqlite.pragma("foreign_keys = ON")
const db = drizzle(sqlite)

const id = () => crypto.randomUUID()
const categoryId = "category-development"
const templateId = "template-upstream-integration"

const field = (key: string, label: string, type: PromptField["type"], sortOrder: number, extra: Partial<PromptField> = {}): PromptField => ({
  id: `field-${key}`,
  key,
  label,
  type,
  required: false,
  sortOrder,
  width: type === "textarea" || type === "code" || type === "markdown" ? "full" : "half",
  matchable: true,
  includeInPrompt: true,
  storeInHistory: true,
  sensitive: false,
  ...extra,
})

const fields: PromptField[] = [
  field("projectName", "项目名称", "text", 0, { required: true, placeholder: "例如 nexapay", group: "项目信息" }),
  field("projectDescription", "项目背景", "textarea", 1, { placeholder: "简要说明项目目标与现状", group: "项目信息" }),
  field("upstreamName", "上游名称", "text", 2, { required: true, placeholder: "例如 AcmePay", group: "上游服务" }),
  field("apiBaseUrl", "接口基础地址", "url", 3, { placeholder: "https://api.example.com", group: "上游服务" }),
  field("apiDocumentation", "接口文档", "url", 4, { placeholder: "https://docs.example.com", group: "上游服务" }),
  field("authenticationType", "认证方式", "select", 5, { group: "上游服务", options: [
    { label: "OAuth 2.0", value: "OAuth 2.0" },
    { label: "API Key", value: "API Key" },
    { label: "Basic Auth", value: "Basic Auth" },
    { label: "无认证", value: "None" },
  ] }),
  field("endpoints", "需要对接的接口", "textarea", 6, { group: "上游服务", placeholder: "每行一个接口或用途" }),
  field("techStack", "技术栈", "text", 7, { group: "当前项目", placeholder: "例如 Next.js + TypeScript" }),
  field("existingCode", "现有相关代码", "code", 8, { group: "当前项目", storeInHistory: false, sensitive: true }),
  field("requirements", "特殊要求", "markdown", 9, { group: "输出要求" }),
  field("outputFormat", "输出格式", "select", 10, { group: "输出要求", options: [
    { label: "实施计划", value: "结构化实施计划" },
    { label: "代码修改方案", value: "包含代码示例的修改方案" },
    { label: "检查清单", value: "可执行检查清单" },
  ] }),
]

const defaultContent = `你是一名资深软件工程师和系统集成专家。

请根据以下信息，完成上游服务对接分析与实施方案。

## 项目信息

项目名称：{{projectName}}

{{#if projectDescription}}项目背景：
{{projectDescription}}
{{/if}}

## 上游服务

上游名称：{{upstreamName}}

{{#if apiBaseUrl}}接口基础地址：{{apiBaseUrl}}
{{/if}}
{{#if apiDocumentation}}接口文档：{{apiDocumentation}}
{{/if}}
{{#if authenticationType}}认证方式：{{authenticationType}}
{{/if}}
{{#if endpoints}}需要对接的接口：
{{endpoints}}
{{/if}}

## 当前项目

{{#if techStack}}技术栈：{{techStack}}
{{/if}}
{{#if existingCode}}现有相关代码：
{{existingCode}}
{{/if}}
{{#if requirements}}特殊要求：
{{requirements}}
{{/if}}

## 工作要求

请先分析当前项目架构、已有实现和技术约束，并给出明确的修改计划。在得到确认前，不要修改代码。

得到确认后，请处理客户端边界、认证安全、类型定义、异常、超时重试、幂等性、日志脱敏、验证与界面检查。

{{#if outputFormat}}请按照以下格式输出：{{outputFormat}}
{{/if}}`

const basicTree: RuleConditionGroup = {
  id: id(), kind: "group", combinator: "all", children: [
    { id: id(), kind: "condition", fieldKey: "projectName", operator: "equals", value: "nexapay", caseSensitive: false },
  ],
}

const specificTree: RuleConditionGroup = {
  id: id(), kind: "group", combinator: "all", children: [
    { id: id(), kind: "condition", fieldKey: "projectName", operator: "equals", value: "nexapay", caseSensitive: false },
    { id: id(), kind: "condition", fieldKey: "authenticationType", operator: "equals", value: "OAuth 2.0", caseSensitive: false },
    { id: id(), kind: "condition", fieldKey: "techStack", operator: "contains", value: "TypeScript", caseSensitive: false },
  ],
}

db.insert(promptCategories).values({ id: categoryId, name: "开发与集成", slug: "development", description: "软件开发、系统集成与工程协作提示词", sortOrder: 0 }).onConflictDoNothing().run()

const existing = db.select().from(promptTemplates).where(eq(promptTemplates.id, templateId)).get()
if (!existing) {
  db.insert(promptTemplates).values({
    id: templateId,
    categoryId,
    name: "对接上游",
    slug: "upstream-integration",
    description: "根据项目与上游信息生成清晰、安全、可执行的系统集成提示词。",
    content: defaultContent,
    fieldSchema: JSON.stringify(fields),
    enabled: true,
  }).run()
  db.insert(promptRules).values([
    {
      id: "rule-nexapay-base",
      templateId,
      name: "NexaPay 对接专属规则",
      description: "适用于 NexaPay 项目的通用对接要求",
      conditionTree: JSON.stringify(basicTree),
      priority: 80,
      customContent: `${defaultContent}\n\n## NexaPay 专属要求\n\n请重点检查支付请求幂等键、签名验证和敏感字段脱敏。`,
      enabled: true,
    },
    {
      id: "rule-nexapay-oauth-typescript",
      templateId,
      name: "NexaPay OAuth TypeScript 专属规则",
      description: "针对 OAuth 2.0 与 TypeScript 技术栈的高优先级规则",
      conditionTree: JSON.stringify(specificTree),
      priority: 100,
      customContent: `${defaultContent}\n\n## NexaPay OAuth 2.0 + TypeScript 专属要求\n\n请设计强类型 OAuth Token 生命周期管理，处理并发刷新、失败重试与 Token 日志脱敏。`,
      enabled: true,
    },
  ]).run()
}

sqlite.close()
console.log("示例数据初始化完成")
