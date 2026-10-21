import { lazy, Suspense } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'

const Home = lazy(() => import('./pages/Home'))
const Explore = lazy(() => import('./pages/Explore'))
const PartDetail = lazy(() => import('./pages/PartDetail'))
const SystemPage = lazy(() => import('./pages/SystemPage'))
const AssemblyGuide = lazy(() => import('./pages/AssemblyGuide'))
const Glossary = lazy(() => import('./pages/Glossary'))

const NAV = [
  { to: '/', label: '首页', end: true },
  { to: '/explore', label: '3D 探索' },
  { to: '/assembly', label: '组装指南' },
  { to: '/glossary', label: '术语表' },
]

function PageLoading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="skeleton h-3 w-40 rounded-full" />
      <div className="skeleton mt-4 h-9 w-64 rounded-xl" />
      <div className="skeleton mt-3 h-4 w-full max-w-2xl rounded-full" />
      <div className="skeleton mt-8 h-72 w-full rounded-3xl" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-44 rounded-2xl" />
        <div className="skeleton h-44 rounded-2xl" />
      </div>
    </div>
  )
}

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-5">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap font-semibold tracking-tight text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-ink text-[13px] font-bold text-paper shadow-sm shadow-ink/20 transition group-hover:shadow-md group-hover:shadow-ink/30">
            骑
          </span>
          <span className="hidden sm:inline">公路车零部件图鉴</span>
        </Link>
        <nav className="flex items-center gap-0.5 text-[13px] sm:gap-1 sm:text-sm">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative whitespace-nowrap rounded-full px-3 py-1.5 transition-colors duration-200 sm:px-3.5 ${
                  isActive
                    ? 'bg-ink font-medium text-paper shadow-sm'
                    : 'text-ink-soft hover:bg-ink/[0.06] hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <div className="flex items-center justify-center gap-2 font-semibold tracking-tight text-ink sm:justify-start">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-paper">
              骑
            </span>
            公路车零部件图鉴
          </div>
          <p className="mt-2 max-w-md text-xs leading-5 text-ink-soft/70">
            3D 模型为程序化示意建模，用于学习零件结构与装配关系；扭矩与规格数值为主流品牌通用参考，实际请以零件说明书为准。
          </p>
        </div>
        <nav className="flex gap-5 text-sm text-ink-soft">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-28 text-center">
      <div className="text-5xl">🚲</div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">页面不存在</h1>
      <p className="mt-2 text-sm text-ink-soft">
        你要找的页面可能已被移动。回
        <Link to="/" className="text-signal underline underline-offset-4">
          首页
        </Link>
        看看？
      </p>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const fullscreen = pathname === '/explore'
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1">
        <Suspense fallback={<PageLoading />}>
          <div key={pathname} className="animate-page">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/parts/:id" element={<PartDetail />} />
              <Route path="/systems/:id" element={<SystemPage />} />
              <Route path="/assembly" element={<AssemblyGuide />} />
              <Route path="/glossary" element={<Glossary />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </Suspense>
      </main>
      {!fullscreen && <Footer />}
    </div>
  )
}
