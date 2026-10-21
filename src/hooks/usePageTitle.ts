import { useEffect } from 'react'

const BASE_TITLE = '公路车零部件图鉴 · Roadbike Atlas'

/** 设置页面标题（离开页面时恢复站点默认标题） */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · 公路车零部件图鉴` : BASE_TITLE
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
