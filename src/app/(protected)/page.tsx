import { GeneratorWorkspace } from "@/components/generator/generator-workspace"
import { listTemplates } from "@/domain/prompts/template-service"

export const metadata = { title: "生成提示词" }
export const dynamic = "force-dynamic"

export default function GeneratorPage() {
  const templates = listTemplates({ enabledOnly: true }).map(({ id, name, description, fields }) => ({ id, name, description, fields }))
  return <div className="page-wrap">
    <header className="page-header">
      <div><h1 className="page-title">生成提示词</h1><p className="page-description">选择模板，填写当前任务信息。Magicbook 会自动匹配最合适的定制规则。</p></div>
    </header>
    <GeneratorWorkspace templates={templates} />
  </div>
}
