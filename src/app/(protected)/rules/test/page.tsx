import { RuleTester } from "@/components/rules/rule-tester"
import { listTemplates } from "@/domain/prompts/template-service"

export const metadata = { title: "规则测试" }
export const dynamic = "force-dynamic"

export default function RuleTestPage() {
  const templates = listTemplates({ enabledOnly: true }).map(({ id, name, fields }) => ({ id, name, fields }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">规则测试</h1><p className="page-description">使用真实字段输入检查标准化结果、全部规则判断与最终提示词。</p></div></header><RuleTester templates={templates} /></div>
}
