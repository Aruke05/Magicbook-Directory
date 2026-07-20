import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { eq } from "drizzle-orm"
import { promptCategories, promptTemplates } from "./schema"
import type { PromptField } from "@/domain/prompts/types"

const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "./data/magicbook.db")
fs.mkdirSync(path.dirname(databasePath), { recursive: true })
const sqlite = new Database(databasePath)
sqlite.pragma("foreign_keys = ON")
const db = drizzle(sqlite)

const categoryId = "category-development"
const templateId = "template-upstream-integration"
const strategyTemplateId = "template-payment-strategy-integration"

const standardStrategyRequirements = `1. df_place_order、df_notify代付下单一定要仔细查看成功和失败规则，并且一定要着重检查这两项的正确性；如果不确定就留空。
2. 如果有utr_query接口，请注意：成功代表存在并且可以补单，失败代表存在但不能补单，两者都不满足则表示不存在。
4. 对接信息如果没有商户号、密钥这样的信息，则创建sfzf_td时留空。
5. 制作后自己发送一笔代收订单，让自己能通过验签。
6. 只允许新增策略类和channelType，并且考虑性能优化。如果无法满足需求，请先说出来，让我判断。`

const prodPkrStrategyRequirements = `1. df_place_order、df_notify代付下单一定要仔细查看成功和失败规则，并且一定要着重检查这两项的正确性；如果不确定就留空。
3. prod-pkr分支下的服务，注意配置正确的交易类型；如果不确定就留空，并且输出你的疑惑点。
4. 对接信息如果没有商户号、密钥这样的信息，则创建sfzf_td时留空。
5. 制作后自己发送一笔代收订单，让自己能通过验签。
6. 只允许新增策略类和channelType，并且考虑性能优化。如果无法满足需求，请先说出来，让我判断。
7. 请详细判断是否有DS_SKT_PLACE接口，如果没有也要说出来。
8. 针对mcbpay服务的jazz和ep、mkpay服务的maya和gcash，虽然各自可以配置成一个通道，但这里硬性要求分开通道，名称上要有区别，参考其他上游。
9. 针对mcbpay服务，注意SKT，也就是收银台下单和直连下单两种代收下单接口；一定会有一个直连下单接口。`

const field = (key: string, label: string, type: PromptField["type"], sortOrder: number, extra: Partial<PromptField> = {}): PromptField => ({
  id: `field-${key}`,
  key,
  label,
  type,
  required: false,
  sortOrder,
  width: type === "textarea" || type === "code" || type === "markdown" ? "full" : "half",
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

const strategyFields: PromptField[] = [
  field("sourceService", "参考服务", "select", 0, { required: true, group: "对接任务", options: [
    "nexapay", "lakpay", "devapay", "nine", "poppay", "mcbpay", "6g", "tata", "vns", "nupa", "mkpay",
  ].map((value) => ({ label: value, value })) }),
  field("targetService", "目标服务", "text", 1, { required: true, group: "对接任务", placeholder: "例如 tikpay" }),
  field("branch", "目标分支", "mapping", 2, {
    required: true,
    width: "full",
    storeInHistory: false,
    mapping: {
      sourceFieldKey: "sourceService",
      rules: [
        { sourceValues: ["nexapay"], output: "nexapay" },
        { sourceValues: ["lakpay"], output: "lakpay" },
        { sourceValues: ["devapay"], output: "devapay" },
        { sourceValues: ["nine", "poppay"], output: "uat" },
        { sourceValues: ["mcbpay", "6g", "tata", "vns", "nupa", "mkpay"], output: "prod-pkr" },
      ],
    },
  }),
  field("serviceRequirements", "服务专属要求", "mapping", 3, {
    required: true,
    width: "full",
    storeInHistory: false,
    mapping: {
      sourceFieldKey: "sourceService",
      rules: [
        { sourceValues: ["nexapay", "lakpay", "devapay", "nine", "poppay"], output: standardStrategyRequirements },
        { sourceValues: ["mcbpay", "6g", "tata", "vns", "nupa", "mkpay"], output: prodPkrStrategyRequirements },
      ],
    },
  }),
  field("integrationInfo", "对接信息", "markdown", 4, {
    required: true,
    group: "对接资料",
    placeholder: "粘贴地区、接口地址、文档、商户号、密钥等对接信息",
    storeInHistory: false,
    sensitive: true,
  }),
]

const strategyContent = `在【{{branch}}】分支 【{{sourceService}}】服务 参考其他策略类 制作【{{targetService}}】的策略类
并且在数据库中直接插入sfzf_td，不要创建flysql文件，直接插入数据库

要求：
{{serviceRequirements}}

【{{targetService}}】对接信息：
{{integrationInfo}}`

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
}

const existingStrategyTemplate = db.select().from(promptTemplates).where(eq(promptTemplates.id, strategyTemplateId)).get()
if (!existingStrategyTemplate) {
  db.insert(promptTemplates).values({
    id: strategyTemplateId,
    categoryId,
    name: "支付服务策略类对接",
    slug: "payment-strategy-integration",
    description: "根据参考服务自动选择目标分支，生成支付服务策略类对接任务提示词。",
    content: strategyContent,
    fieldSchema: JSON.stringify(strategyFields),
    enabled: true,
  }).run()
} else {
  db.update(promptTemplates).set({
    name: "支付服务策略类对接",
    description: "根据参考服务自动选择目标分支和专属要求，生成支付服务策略类对接任务提示词。",
    content: strategyContent,
    fieldSchema: JSON.stringify(strategyFields),
    updatedAt: new Date(),
  }).where(eq(promptTemplates.id, strategyTemplateId)).run()
}

sqlite.close()
console.log("示例数据初始化完成")
