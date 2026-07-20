import { TemplateEditor } from "@/components/templates/template-editor"
import { listCategories } from "@/domain/prompts/template-service"

export const metadata = { title: "新建模板" }

export default function NewTemplatePage() {
  const categories = listCategories().map(({ id, name }) => ({ id, name }))
  return <div className="page-wrap"><header className="page-header"><div><h1 className="page-title">新建模板</h1><p className="page-description">定义动态字段、字段校验和提示词内容。</p></div></header><TemplateEditor categories={categories} initial={{ categoryId: categories[0]?.id ?? null, name: "", slug: "", description: "", content: "", enabled: true, fields: [] }} /></div>
}
