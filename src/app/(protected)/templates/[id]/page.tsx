import { notFound } from "next/navigation"
import { TemplateEditor } from "@/components/templates/template-editor"
import { listGlobalParameters } from "@/domain/global-parameters/service"
import { getTemplate, listCategories } from "@/domain/prompts/template-service"

export const metadata = { title: "编辑模板" }
export const dynamic = "force-dynamic"

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const template = getTemplate(id)
  if (!template) notFound()
  const categories = listCategories().map(({ id: categoryId, name }) => ({ id: categoryId, name }))
  const globalParameters = listGlobalParameters({ enabledOnly: true }).map(({ key, label, description, kind, options }) => ({ key, label, description, kind, options }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">编辑模板</h1><p className="page-description">集中调整动态字段、全局参数和提示词内容。</p></div></header><TemplateEditor categories={categories} globalParameters={globalParameters} initial={{ id: template.id, categoryId: template.categoryId, name: template.name, slug: template.slug, description: template.description, content: template.content, enabled: template.enabled, fields: template.fields }} /></div>
}
