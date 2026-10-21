import { lazy, Suspense, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ViewerSkeleton } from '../components/ViewerSkeleton'
import { usePageTitle } from '../hooks/usePageTitle'
import type { ViewerApi } from '../three/BikeViewer'

const BikeViewer = lazy(() =>
  import('../three/BikeViewer').then((m) => ({ default: m.BikeViewer })),
)

/** 3D 探索页：整屏交互式整车查看器，支持 ?part=xxx 深链选中零件 */
export default function Explore() {
  const [params] = useSearchParams()
  const initialPart = params.get('part')
  const apiRef = useRef<ViewerApi | null>(null)
  usePageTitle('3D 探索')

  return (
    <div className="stage-bg h-[calc(100vh-3.5rem)]">
      <Suspense fallback={<ViewerSkeleton />}>
        <BikeViewer mode="explore" initialPartId={initialPart} apiRef={apiRef} />
      </Suspense>
    </div>
  )
}
