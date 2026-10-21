import { Link, useParams } from 'react-router-dom'
import { partsOfSystem } from '../../content/parts'
import { systemById } from '../../content/systems'
import { PartCard, Prose, SectionCard } from '../components/ui'
import { usePageTitle } from '../hooks/usePageTitle'
import type { SystemId } from '../../content/schema'

/** 系统总览页：该系统的零件清单 + 系统工作原理 */
export default function SystemPage() {
  const { id } = useParams()
  const system = id && id in systemById ? systemById[id as SystemId] : undefined
  usePageTitle(system?.nameZh)

  if (!system) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-4 text-xl font-semibold text-ink">没有这个系统</h1>
        <Link to="/" className="mt-2 inline-block text-sm text-signal hover:underline">
          回首页 →
        </Link>
      </div>
    )
  }

  const systemParts = partsOfSystem(system.id)
  const others = Object.values(systemById).filter((s) => s.id !== system.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-ink-soft/70">
        <Link to="/" className="hover:text-ink-soft">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">{system.nameZh}</span>
      </nav>

      <header className="animate-fade-up mt-4">
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: system.color }}
        >
          {system.nameEn}
        </div>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {system.nameZh}
          </h1>
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-soft">{system.summary}</p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <SectionCard title="这个系统是怎么工作的" icon="⚙️" className="lg:col-span-2">
          <Prose paragraphs={system.principle} />
        </SectionCard>
        <SectionCard title="换个系统看看" icon="🧭">
          <div className="space-y-2">
            {others.map((s) => (
              <Link
                key={s.id}
                to={`/systems/${s.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink-soft transition hover:bg-ink/[0.03]"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.nameZh}
                <span className="ml-auto text-xs text-ink-soft">{s.nameEn}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-semibold text-ink">
          零件清单
          <span className="ml-2 text-sm font-normal text-ink-soft/70">
            {systemParts.length} 个零件
          </span>
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {systemParts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>
      </section>

      {/* 相关术语 */}
      <section className="mt-8 rounded-2xl bg-ink/[0.06] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ink-soft">
            想系统学习整车？从 <b>{partsOfSystem('frame')[0]?.nameZh ?? '车架'}</b> 开始，或者直接看
            18 步组装流程。
          </div>
          <div className="flex gap-2">
            <Link
              to="/assembly"
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-ink-soft shadow-sm transition hover:bg-ink/[0.03]"
            >
              组装指南
            </Link>
            <Link
              to="/glossary"
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-ink-soft shadow-sm transition hover:bg-ink/[0.03]"
            >
              术语表
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
