import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Part, SpecItem, InstallStep, MaintenanceItem, TroubleshootItem, TuningItem } from '../../content/schema'
import { systemById } from '../../content/systems'

/* ------------------------------------------------------------------ */
/* 通用容器                                                            */
/* ------------------------------------------------------------------ */

export function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`animate-fade-up rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_1px_2px_rgba(2,6,23,0.04),0_12px_32px_-16px_rgba(2,6,23,0.10)] sm:p-6 ${className ?? ''}`}
    >
      <h2 className="mb-4 flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-ink">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/[0.05] text-[14px]">
            {icon}
          </span>
        )}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-3.5 text-[15px] leading-[1.85] text-ink-soft">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 系统标签                                                            */
/* ------------------------------------------------------------------ */

export function SystemBadge({ systemId }: { systemId: Part['system'] }) {
  const sys = systemById[systemId]
  return (
    <Link
      to={`/systems/${systemId}`}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition duration-200 hover:brightness-95"
      style={{ backgroundColor: sys.color + '1a', color: sys.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sys.color }} />
      {sys.nameZh}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/* 规格参数                                                            */
/* ------------------------------------------------------------------ */

export function SpecTable({ specs }: { specs: SpecItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10">
      <table className="w-full text-sm">
        <tbody>
          {specs.map((s, i) => (
            <tr
              key={i}
              className={`transition-colors hover:bg-signal/[0.07]/40 ${i % 2 ? 'bg-ink/[0.03]' : 'bg-white'}`}
            >
              <td className="w-32 px-4 py-3 align-top text-[13px] font-medium text-ink-soft sm:w-36">
                {s.label}
              </td>
              <td className="px-4 py-3 text-[13.5px] leading-6 text-ink">
                {s.value}
                {s.note && <div className="mt-1 text-xs text-ink-soft/70">{s.note}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ToolChips({ tools }: { tools: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tools.map((t, i) => (
        <span
          key={i}
          className="rounded-lg border border-ink/10 bg-ink/[0.03] px-2.5 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink/10 hover:bg-ink/[0.06]"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 安装步骤（时间线）                                                  */
/* ------------------------------------------------------------------ */

export function StepList({ steps }: { steps: InstallStep[] }) {
  return (
    <ol className="relative space-y-3">
      {/* 连接线 */}
      <span className="absolute bottom-6 left-[26px] top-6 w-px bg-gradient-to-b from-ink/15 via-ink/10 to-transparent" />
      {steps.map((step, i) => (
        <li
          key={i}
          className="animate-fade-up relative rounded-xl border border-ink/10 bg-white p-4 pl-16 transition-shadow duration-300 hover:shadow-[0_8px_24px_-12px_rgba(2,6,23,0.12)]"
          style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}
        >
          <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-paper shadow-sm shadow-ink/20">
            {i + 1}
          </span>
          <h3 className="font-semibold tracking-tight text-ink">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.detail}</p>
          {(step.tools || step.torque) && (
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs">
              {step.tools?.map((t, j) => (
                <span key={j} className="rounded-md bg-ink/[0.06] px-2 py-1 text-ink-soft">
                  🔧 {t}
                </span>
              ))}
              {step.torque && (
                <span className="rounded-md bg-amber-50 px-2 py-1 font-medium text-amber-700">
                  ⚡ {step.torque}
                </span>
              )}
            </div>
          )}
          {step.warning && (
            <div className="mt-2.5 rounded-lg border border-rose-100 bg-rose-50/80 px-3 py-2 text-xs leading-5 text-rose-700">
              ⚠️ {step.warning}
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm leading-6 text-ink-soft">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function TuningList({ items }: { items: TuningItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((t, i) => (
        <div
          key={i}
          className="rounded-xl border border-signal/15 bg-signal/[0.05] p-3.5"
        >
          <div className="text-sm font-semibold tracking-tight text-sky-900">{t.title}</div>
          <p className="mt-1 text-sm leading-6 text-sky-950/75">{t.detail}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 保养与故障排查                                                      */
/* ------------------------------------------------------------------ */

export function MaintenanceTable({ items }: { items: MaintenanceItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ink/10">
      <table className="w-full text-sm">
        <tbody>
          {items.map((m, i) => (
            <tr
              key={i}
              className={`transition-colors hover:bg-ink/[0.03] ${i % 2 ? 'bg-ink/[0.03]' : 'bg-white'}`}
            >
              <td className="w-36 px-4 py-3 align-top text-[13px] font-medium text-ink sm:w-40">
                {m.interval}
              </td>
              <td className="px-4 py-3 text-[13.5px] leading-6 text-ink-soft">{m.task}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TroubleshootTable({ items }: { items: TroubleshootItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink/10">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-ink/[0.03] text-left text-xs font-semibold tracking-wide text-ink-soft">
            <th className="px-4 py-3">症状</th>
            <th className="px-4 py-3">可能原因</th>
            <th className="px-4 py-3">解决方法</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t, i) => (
            <tr
              key={i}
              className={`border-t border-slate-900/[0.04] transition-colors hover:bg-ink/[0.03] ${i % 2 ? 'bg-ink/[0.02]' : 'bg-white'}`}
            >
              <td className="px-4 py-3 align-top text-[13.5px] font-medium text-ink">
                {t.symptom}
              </td>
              <td className="px-4 py-3 align-top text-[13px] leading-6 text-ink-soft">{t.cause}</td>
              <td className="px-4 py-3 align-top text-[13px] leading-6 text-ink-soft">{t.fix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 零件卡片                                                            */
/* ------------------------------------------------------------------ */

export function PartCard({ part }: { part: Part }) {
  const sys = systemById[part.system]
  return (
    <Link
      to={`/parts/${part.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10"
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${sys.color}, transparent)` }}
      />
      <div className="mb-2 flex items-center justify-between">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: sys.color }}
        >
          {part.nameZh[0]}
        </span>
        {part.abbr && (
          <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-ink-soft">
            {part.abbr}
          </span>
        )}
      </div>
      <div className="font-semibold tracking-tight text-ink transition-colors group-hover:text-signal">
        {part.nameZh}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-ink-soft/70">{part.nameEn}</div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">{part.summary}</p>
      <div className="mt-3 text-xs font-medium text-signal opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        查看详解 →
      </div>
    </Link>
  )
}
