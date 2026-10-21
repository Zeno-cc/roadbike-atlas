import { Link } from 'react-router-dom'
import { assemblySteps } from '../../content/assembly'
import { partById } from '../../content/parts'
import { systemById } from '../../content/systems'
import { usePageTitle } from '../hooks/usePageTitle'

/** 组装指南：从空车架到整车的 18 步流程 */
export default function AssemblyGuide() {
  usePageTitle('组装指南')
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-xs text-ink-soft/70">
        <Link to="/" className="hover:text-ink-soft">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">组装指南</span>
      </nav>

      <header className="animate-fade-up mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-signal">
          Assembly Guide
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          从零件到整车
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-soft">
          下面是按真实装车顺序整理的 {assemblySteps.length} 步流程：从车架预处理开始，依次装碗组、前叉、
          中轴、传动与刹车，最后调校并试骑。每一步都标出涉及零件、所需工具、扭矩与进阶提示。
          建议先看一遍整体流程，再对照每个零件的详情页动手。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/explore"
            className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper shadow-lg shadow-ink/15 transition duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            ▶ 在 3D 中播放装配动画
          </Link>
          <Link
            to="/glossary"
            className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink-soft shadow-sm transition duration-200 hover:bg-ink/[0.03]"
          >
            查不认识的术语
          </Link>
        </div>
      </header>

      <ol className="mt-8 space-y-4">
        {assemblySteps.map((step) => (
          <li key={step.order} className="relative rounded-2xl border border-ink/10 bg-white p-5 pl-16 shadow-sm">
            <span className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sm font-bold text-paper">
              {String(step.order).padStart(2, '0')}
            </span>
            <h2 className="text-lg font-semibold text-ink">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-soft">{step.detail}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {step.partIds.map((pid) => {
                const part = partById[pid]
                if (!part) return null
                const sys = systemById[part.system]
                return (
                  <Link
                    key={pid}
                    to={`/parts/${pid}`}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95"
                    style={{ backgroundColor: sys.color + '1f', color: sys.color }}
                  >
                    {part.nameZh} →
                  </Link>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {step.tools.map((t, i) => (
                <span key={i} className="rounded bg-ink/[0.06] px-2 py-0.5 text-ink-soft">
                  🔧 {t}
                </span>
              ))}
              {step.torque && (
                <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                  ⚡ {step.torque}
                </span>
              )}
            </div>

            {step.tips && (
              <div className="mt-3 rounded-lg bg-ink/[0.04] px-3 py-2 text-xs leading-5 text-ink-soft">
                💡 {step.tips}
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl bg-ink p-6 text-center">
        <div className="text-lg font-semibold text-paper">装完了？去 3D 探索里对照检查</div>
        <p className="mt-1 text-sm text-ink-soft/70">
          用爆炸视图看每个零件的位置与配合关系，点零件即可跳转到它的安装详解。
        </p>
        <Link
          to="/explore"
          className="mt-4 inline-block rounded-xl bg-ink px-5 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
        >
          打开 3D 探索
        </Link>
      </div>
    </div>
  )
}
