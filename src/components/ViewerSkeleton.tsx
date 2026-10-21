/** 3D 场景加载骨架屏：深色舞台 + 呼吸提示 + 工具栏/索引占位 */
export function ViewerSkeleton({ label = '正在装配 3D 整车…' }: { label?: string }) {
  return (
    <div className="stage-bg relative flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-sky-400" />
        <div className="text-xs tracking-wide text-ink-soft/70">{label}</div>
        <div className="skeleton h-1 w-36 rounded-full" />
      </div>
      {/* 悬浮层占位 */}
      <div className="skeleton absolute left-4 top-4 h-14 w-44 rounded-2xl opacity-50" />
      <div className="skeleton absolute right-4 top-4 h-10 w-72 rounded-2xl opacity-40" />
      <div className="skeleton absolute bottom-5 left-1/2 h-12 w-80 -translate-x-1/2 rounded-2xl opacity-50" />
    </div>
  )
}
