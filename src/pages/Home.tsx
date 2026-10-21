import { lazy, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ViewerSkeleton } from '../components/ViewerSkeleton'
import { usePageTitle } from '../hooks/usePageTitle'
import { parts } from '../../content/parts'
import { systems } from '../../content/systems'
import { glossary } from '../../content/glossary'
import { assemblySteps } from '../../content/assembly'
import { bikeTypes } from '../../content/bikeTypes'

const BikeViewer = lazy(() =>
  import('../three/BikeViewer').then((m) => ({ default: m.BikeViewer })),
)

const PATH_STEPS = [
  {
    step: '01',
    title: '认识零件',
    desc: '在 3D 探索里旋转整车、点击每个零件，看它长什么样、装在哪里、和谁配合。',
    to: '/explore',
    cta: '进入 3D 探索',
  },
  {
    step: '02',
    title: '学会安装',
    desc: '跟着 18 步组装流程从空车架装到整车，每一步都有工具、扭矩与警告提示。',
    to: '/assembly',
    cta: '打开组装指南',
  },
  {
    step: '03',
    title: '查漏补缺',
    desc: '用术语表中英对照看懂英文资料，遇到异响先查每个零件的故障排查表。',
    to: '/glossary',
    cta: '浏览术语表',
  },
]

function HeroCopy({ navigate }: { navigate: (to: string) => void }) {
  return (
    <div className="max-w-lg">
      <div className="animate-fade-up flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.32em] text-signal">
          Roadbike Atlas
        </span>
        <span className="h-px w-10 bg-ink/20" />
        <span className="editorial text-[13px] text-ink-soft/80">No. 01 — 27 parts</span>
      </div>
      <h1 className="animate-fade-up stagger-1 mt-4 text-[32px] font-bold leading-[1.15] tracking-tight text-ink sm:text-5xl">
        把公路车
        <span className="text-signal">拆开</span>
        给你看
      </h1>
      <div className="animate-fade-up stagger-2 editorial mt-2 text-lg text-ink-soft/80 sm:text-xl">
        A road bike, taken apart.
      </div>
      <p className="animate-fade-up stagger-2 mt-4 max-w-md text-sm leading-7 text-ink-soft sm:mt-5 sm:text-[15px]">
        {parts.length} 个零件的 3D 交互模型、结构原理、安装步骤与扭矩规格 ——
        从「这是啥」到「怎么装」，一次讲清。
      </p>
      <div className="animate-fade-up stagger-3 mt-6 flex flex-wrap gap-3 sm:mt-7">
        <button
          onClick={() => navigate('/explore')}
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper shadow-lg shadow-ink/20 transition duration-200 hover:bg-ink/90 active:scale-[0.98]"
        >
          开始 3D 探索
        </button>
        <button
          onClick={() => navigate('/assembly')}
          className="rounded-full bg-white/60 px-5 py-2.5 text-sm font-medium text-ink ring-1 ring-ink/15 backdrop-blur transition duration-200 hover:bg-white"
        >
          按组装流程学习
        </button>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  usePageTitle()

  return (
    <div>
      {/* Hero：3D 整车（移动端：文案在上、场景在下；桌面端：文案叠加在左侧） */}
      <section className="stage-bg relative">
        {/* 移动端文案（流式） */}
        <div className="px-5 pb-2 pt-9 sm:hidden">
          <HeroCopy navigate={navigate} />
        </div>

        <div className="h-[46vh] min-h-[330px] sm:h-[74vh] sm:min-h-[460px]">
          <Suspense fallback={<ViewerSkeleton label="正在装配 3D 整车…" />}>
            <BikeViewer mode="hero" onPickPart={(id) => navigate(`/explore?part=${id}`)} />
          </Suspense>
        </div>

        {/* 桌面端文案（叠加） */}
        <div className="pointer-events-none absolute inset-0 hidden items-center sm:flex">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <div className="pointer-events-auto">
              <HeroCopy navigate={navigate} />
            </div>
          </div>
        </div>

        {/* 底部渐隐，衔接下一区 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-paper/90 to-transparent" />
      </section>

      {/* 数据概览 */}
      <section className="relative border-b border-ink/10 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-ink/10 px-5 py-7 sm:grid-cols-4 sm:divide-x">
          {[
            { n: `${parts.length}`, label: '个零件' },
            { n: `${systems.length}`, label: '大系统' },
            { n: `${assemblySteps.length}`, label: '步组装流程' },
            { n: `${glossary.length}`, label: '条中英术语' },
          ].map((s, i) => (
            <div key={s.label} className={`animate-fade-up stagger-${i + 1} px-4 text-center`}>
              <div className="text-3xl font-bold tabular-nums tracking-tight text-ink">
                {s.n}
              </div>
              <div className="mt-1 text-xs tracking-wide text-ink-soft/70">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 六大系统 */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="animate-fade-up flex items-end justify-between gap-4">
          <div>
            <div className="editorial text-[13px] text-ink-soft/70">Six systems</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">按系统学习</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              公路车由六大系统组成，点进任意系统查看它的零件清单与工作原理。
            </p>
          </div>
          <Link
            to="/explore"
            className="hidden shrink-0 text-sm font-medium text-signal transition hover:text-signal sm:block"
          >
            在 3D 中浏览 →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systems.map((sys, i) => {
            const count = parts.filter((p) => p.system === sys.id).length
            return (
              <Link
                key={sys.id}
                to={`/systems/${sys.id}`}
                className={`animate-fade-up stagger-${(i % 6) + 1} group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10`}
              >
                {/* 系统色顶边 */}
                <span
                  className="absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, ${sys.color}, transparent)` }}
                />
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                    style={{ backgroundColor: sys.color }}
                  >
                    {sys.nameZh[0]}
                  </span>
                  <div>
                    <div className="font-semibold tracking-tight text-ink">{sys.nameZh}</div>
                    <div className="text-[11px] uppercase tracking-wider text-ink-soft/70">
                      {sys.nameEn}
                    </div>
                  </div>
                  <span className="ml-auto rounded-full bg-ink/[0.05] px-2.5 py-1 text-xs tabular-nums text-ink-soft">
                    {count} 个零件
                  </span>
                </div>
                <p className="mt-3.5 text-sm leading-6 text-ink-soft">{sys.summary}</p>
                <div className="mt-3 text-sm font-medium text-signal opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  查看零件 →
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 车型分类 */}
      <section className="border-t border-ink/10 py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="animate-fade-up">
            <div className="editorial text-[13px] text-ink-soft/70">Five families</div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">公路车分几类？</h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink-soft">
              按设计取向，主流品牌的公路车分为五类 —— 从气动竞速到入门通勤，每类的管型、几何与配置思路都不同。
              下表按崔克、闪电、Canyon、迪卡侬 Van Rysel、喜德盛的在售车系整理。
            </p>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {bikeTypes.map((t, i) => (
              <div
                key={t.id}
                className={`animate-fade-up stagger-${(i % 6) + 1} relative overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-b from-white to-slate-50/70 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/[0.08]`}
              >
                <span
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, ${t.color}, transparent)` }}
                />
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="text-lg font-bold tracking-tight text-ink">{t.nameZh}</span>
                  <span className="text-[11px] uppercase tracking-wider text-ink-soft/70">{t.nameEn}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{t.tagline}</p>
                <ul className="mt-3 space-y-1.5">
                  {t.traits.map((tr) => (
                    <li key={tr} className="flex gap-2 text-[13px] leading-6 text-ink-soft">
                      <span
                        className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {tr}
                    </li>
                  ))}
                </ul>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {t.models.map((m) => (
                    <span
                      key={m.brand}
                      className="rounded-lg bg-ink/[0.05] px-2.5 py-1 text-[11px] text-ink-soft"
                    >
                      <span className="font-medium text-ink">{m.brand}</span>
                      <span className="mx-1 text-ink-soft">·</span>
                      {m.models.join(' / ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="animate-fade-up mt-5 rounded-2xl bg-ink/[0.04] px-4 py-3 text-[13px] leading-6 text-ink-soft">
            💡 本站的 3D 整车按其中<b className="text-ink-soft">「气动全能」</b>
            这一代设计语言建模：压缩几何斜上管、下沉后上叉、Kamm-tail 气动管型、45mm 中深圈、D 形气动座管
            —— 也就是 Tarmac / Madone 这一类"既能爬坡又能巡航"的现代公路车的样子。
          </p>
        </div>
      </section>

      {/* 学习路径 */}
      <section className="border-t border-ink/10 bg-white py-14">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="animate-fade-up editorial text-[13px] text-ink-soft/70">Three steps</div>
          <h2 className="animate-fade-up mt-1 text-2xl font-bold tracking-tight text-ink">
            三步学会整车
          </h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {PATH_STEPS.map((s, i) => (
              <Link
                key={s.step}
                to={s.to}
                className={`animate-fade-up stagger-${i + 1} group flex flex-col rounded-2xl border border-ink/10 bg-gradient-to-b from-white to-paper-deep/50 p-6 transition duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-lg hover:shadow-ink/10`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold tabular-nums tracking-widest text-signal">
                    {s.step}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-ink/15 to-transparent" />
                </div>
                <div className="mt-4 text-lg font-semibold tracking-tight text-ink">
                  {s.title}
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-ink-soft">{s.desc}</p>
                <div className="mt-4 text-sm font-medium text-signal">
                  {s.cta}
                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                    {' '}
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
