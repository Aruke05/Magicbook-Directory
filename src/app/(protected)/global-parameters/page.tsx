import { GlobalParameterWorkspace } from "@/components/global-parameters/global-parameter-workspace"
import { listGlobalParameters } from "@/domain/global-parameters/service"

export const metadata = { title: "全局参数" }
export const dynamic = "force-dynamic"

export default function GlobalParametersPage() {
  const parameters = listGlobalParameters().map(({ createdAt, updatedAt, ...parameter }) => ({
    ...parameter,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  }))
  return <div className="page-wrap">
    <header className="page-header">
      <div>
        <h1 className="page-title">全局参数</h1>
        <p className="page-description">集中维护可跨模板复用的固定值、选项和映射关系。</p>
      </div>
    </header>
    <GlobalParameterWorkspace parameters={parameters} />
  </div>
}
