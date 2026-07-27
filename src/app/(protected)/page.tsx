import { GeneratorWorkspace } from "@/components/generator/generator-workspace"
import { globalParameterInputFields } from "@/domain/global-parameters/service"
import { listTemplates } from "@/domain/prompts/template-service"

export const metadata = { title: "生成提示词" }
export const dynamic = "force-dynamic"

export default function GeneratorPage() {
  const templates = listTemplates({ enabledOnly: true }).map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    fields: template.fields,
    globalFields: globalParameterInputFields(template),
  }))
  return <div className="page-wrap">
    <header className="page-header">
      <div><h1 className="page-title">生成提示词</h1><p className="page-description">选择模板并填写当前任务信息，生成完整提示词。</p></div>
    </header>
    <GeneratorWorkspace templates={templates} />
  </div>
}
