import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TemplateList } from "@/components/templates/template-list"
import { listCategories, listTemplates } from "@/domain/prompts/template-service"
import { formatDate } from "@/lib/utils"

export const metadata = { title: "模板" }
export const dynamic = "force-dynamic"

export default function TemplatesPage() {
  const categories = listCategories().map(({ id, name }) => ({ id, name }))
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const templates = listTemplates().map((item) => ({
    id: item.id, name: item.name, slug: item.slug, description: item.description, enabled: item.enabled,
    fieldCount: item.fields.length, updatedAt: formatDate(item.updatedAt), categoryId: item.categoryId, categoryName: item.categoryId ? categoryNames.get(item.categoryId) ?? "未分类" : "未分类",
  }))
  return <div className="page-wrap">
    <header className="page-header"><div><h1 className="page-title">模板</h1><p className="page-description">集中管理字段结构、通用提示词内容和启用状态。</p></div><Button asChild><Link href="/templates/new"><Plus className="size-4" />新建模板</Link></Button></header>
    <TemplateList templates={templates} categories={categories} />
  </div>
}
