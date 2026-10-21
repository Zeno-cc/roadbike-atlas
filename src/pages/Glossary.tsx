import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { glossary } from '../../content/glossary'
import { systems, systemById } from '../../content/systems'
import { usePageTitle } from '../hooks/usePageTitle'
import type { GlossaryEntry } from '../../content/schema'

/** 术语表：中英对照 + 缩写速查，可按系统筛选与搜索 */
export default function Glossary() {
  const [filter, setFilter] = useState<GlossaryEntry['system'] | 'all'>('all')
  const [query, setQuery] = useState('')
  usePageTitle('术语表')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return glossary.filter((g) => {
      if (filter !== 'all' && g.system !== filter) return false
      if (!q) return true
      return (
        g.term.toLowerCase().includes(q) ||
        g.en.toLowerCase().includes(q) ||
        (g.abbr ?? '').toLowerCase().includes(q) ||
        g.desc.toLowerCase().includes(q)
      )
    })
  }, [filter, query])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="text-xs text-ink-soft/70">
        <Link to="/" className="hover:text-ink-soft">
          首页
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">术语表</span>
      </nav>

      <header className="animate-fade-up mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-signal">
          Glossary
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">术语表</h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-ink-soft">
          {glossary.length} 条公路车常用术语的中英对照与一句话解释 ——
          看英文评测、说明书或选购配件时随时回来查。缩写（如 FD、RD、BB）可以直接在搜索框里查。
        </p>
      </header>

      {/* 筛选 */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            filter === 'all' ? 'bg-ink text-white' : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:bg-ink/[0.03]'
          }`}
        >
          全部
        </button>
        {systems.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === s.id ? 'text-white' : 'bg-white text-ink-soft ring-1 ring-ink/10 hover:bg-ink/[0.03]'
            }`}
            style={filter === s.id ? { backgroundColor: s.color } : undefined}
          >
            {s.nameZh}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索术语 / 英文 / 缩写…"
          className="ml-auto w-full max-w-xs rounded-full border border-ink/10 bg-white px-4 py-2 text-sm shadow-sm outline-none transition duration-200 placeholder:text-ink-soft/70 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
      </div>

      {/* 列表 */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10 bg-white">
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-soft/70">没有匹配的术语</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink/[0.03] text-left text-xs font-medium text-ink-soft">
                <th className="px-4 py-2.5">中文</th>
                <th className="px-4 py-2.5">English</th>
                <th className="hidden px-4 py-2.5 sm:table-cell">缩写</th>
                <th className="px-4 py-2.5">说明</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g, i) => (
                <tr key={i} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium text-ink">
                    {g.term}
                    {g.system !== 'general' && (
                      <span
                        className="ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                        style={{ backgroundColor: systemById[g.system].color }}
                        title={systemById[g.system].nameZh}
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{g.en}</td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 sm:table-cell">
                    {g.abbr && (
                      <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-xs font-medium text-ink-soft">
                        {g.abbr}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{g.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-soft/70">
        共 {list.length} 条 · 点右上角搜索或按系统筛选
      </p>
    </div>
  )
}
