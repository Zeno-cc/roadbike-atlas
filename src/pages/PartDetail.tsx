import { lazy, Suspense } from 'react'
import { Link, useParams } from 'react-router-dom'
import { partById } from '../../content/parts'
import { systemById } from '../../content/systems'
import { usePageTitle } from '../hooks/usePageTitle'
import {
  CheckList,
  MaintenanceTable,
  Prose,
  SectionCard,
  SpecTable,
  StepList,
  SystemBadge,
  ToolChips,
  TroubleshootTable,
  TuningList,
  PartCard,
} from '../components/ui'

const PartPreview = lazy(() =>
  import('../three/PartPreview').then((m) => ({ default: m.PartPreview })),
)

/** 零件详情页：3D 单件预览 + 结构/原理/规格/工具/安装/拆卸/调校/错误/保养/排查 */
export default function PartDetail() {
  const { id } = useParams()
  const part = id ? partById[id] : undefined
  usePageTitle(part ? `${part.nameZh} ${part.nameEn}` : undefined)

  if (!part) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-4 text-xl font-semibold text-ink">没有这个零件</h1>
        <Link to="/explore" className="mt-2 inline-block text-sm text-signal hover:underline">
          去 3D 探索里找找 →
        </Link>
      </div>
    )
  }

  const sys = systemById[part.system]
  const related = part.related.map((rid) => partById[rid]).filter(Boolean)

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      {/* 面包屑 */}
      <nav className="text-xs text-ink-soft/70">
        <Link to="/" className="transition-colors hover:text-ink-soft">
          首页
        </Link>
        <span className="mx-1.5 text-ink-soft">/</span>
        <Link to={`/systems/${sys.id}`} className="transition-colors hover:text-ink-soft">
          {sys.nameZh}
        </Link>
        <span className="mx-1.5 text-ink-soft">/</span>
        <span className="text-ink-soft">{part.nameZh}</span>
      </nav>

      {/* 标题区 */}
      <header className="animate-fade-up mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: sys.color }}>
          {sys.nameEn}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {part.nameZh}
          </h1>
          {part.abbr && (
            <span className="rounded-lg bg-ink px-2 py-1 text-xs font-bold tracking-wide text-paper">
              {part.abbr}
            </span>
          )}
          <SystemBadge systemId={part.system} />
        </div>
        <div className="mt-1 text-sm text-ink-soft/70">{part.nameEn}</div>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-soft">{part.summary}</p>
        <div className="mt-4">
          <Link
            to={`/explore?part=${part.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-ink/[0.05] px-3.5 py-1.5 text-[13px] font-medium text-ink-soft transition duration-200 hover:bg-ink/[0.1]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ink" />
            在整车 3D 中查看这个零件
          </Link>
        </div>
      </header>

      {/* 3D 单件预览 */}
      <div className="stage-bg animate-fade-up stagger-1 relative mt-6 h-80 overflow-hidden rounded-3xl ring-1 ring-ink/10 sm:h-96">
        <Suspense
          fallback={
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-sky-400" />
              <div className="skeleton h-1 w-32 rounded-full" />
            </div>
          }
        >
          <PartPreview partId={part.id} />
        </Suspense>
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/85 px-3 py-1 text-[11px] text-ink-soft ring-1 ring-ink/10 backdrop-blur">
          拖动旋转 · 滚轮缩放 · 模型为程序化示意建模
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {/* 结构与原理 */}
        <SectionCard title="结构组成" icon="🧩" className="lg:col-span-2">
          <Prose paragraphs={part.structure} />
        </SectionCard>
        <SectionCard title="工作原理" icon="⚙️" className="lg:col-span-2">
          <Prose paragraphs={part.principle} />
        </SectionCard>

        {/* 规格 */}
        <SectionCard title="关键规格" icon="📐">
          <SpecTable specs={part.specs} />
        </SectionCard>

        {/* 工具与扭矩 */}
        <SectionCard title="工具与扭矩" icon="🧰">
          <ToolChips tools={part.tools} />
          {part.torque && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3.5">
              <div className="text-xs font-semibold text-amber-700">⚡ 推荐扭矩</div>
              <div className="mt-1 text-sm leading-6 text-amber-900">{part.torque}</div>
            </div>
          )}
          {part.compatibility && part.compatibility.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-ink-soft">兼容性要点</div>
              <CheckList items={part.compatibility} />
            </div>
          )}
        </SectionCard>

        {/* 安装 */}
        <SectionCard title="安装步骤" icon="🔧" className="lg:col-span-2">
          <StepList steps={part.installSteps} />
        </SectionCard>

        {/* 拆卸 */}
        <SectionCard title="拆卸要点" icon="🔩">
          <CheckList items={part.disassembly} />
        </SectionCard>

        {/* 调校 */}
        {part.tuning && part.tuning.length > 0 ? (
          <SectionCard title="调校方法" icon="🎯">
            <TuningList items={part.tuning} />
          </SectionCard>
        ) : (
          <SectionCard title="常见错误" icon="🚫">
            <CheckList items={part.commonMistakes} />
          </SectionCard>
        )}

        {part.tuning && part.tuning.length > 0 && (
          <SectionCard title="常见错误" icon="🚫" className="lg:col-span-2">
            <CheckList items={part.commonMistakes} />
          </SectionCard>
        )}

        {/* 保养 */}
        <SectionCard title="保养周期" icon="🧴" className="lg:col-span-2">
          <MaintenanceTable items={part.maintenance} />
        </SectionCard>

        {/* 故障排查 */}
        <SectionCard title="故障排查" icon="🩺" className="lg:col-span-2">
          <TroubleshootTable items={part.troubleshooting} />
        </SectionCard>

        {/* 关联零件 */}
        {related.length > 0 && (
          <SectionCard title="关联零件" icon="🔗" className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((r) => (
                <PartCard key={r.id} part={r} />
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  )
}
