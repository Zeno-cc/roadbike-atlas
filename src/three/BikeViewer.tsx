import { memo, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { Spherical, Vector3, type DirectionalLight } from 'three'
import { partById, parts } from '../../content/parts'
import { assemblySteps } from '../../content/assembly'
import { systems, systemById } from '../../content/systems'
import { BikeAssembly } from './BikeAssembly'
import { BikeController, SceneContext, type SceneContextValue } from './interaction'
import {
  detectQualityTier,
  StudioBackdrop,
  StudioEffects,
  StudioEnvironment,
  StudioLights,
  type QualityTier,
} from './studio'

/* ------------------------------------------------------------------ */
/* 对外 API（页面通过 ref 调用）                                        */
/* ------------------------------------------------------------------ */

export interface ViewerApi {
  /** 相机聚焦某个零件（zoom 越大越近） */
  focusPart: (id: string, zoom?: number) => void
  /** 回到整车视角 */
  resetView: () => void
  /** 选中某个零件（含相机聚焦） */
  selectPart: (id: string | null) => void
}

export interface BikeViewerProps {
  /** explore：完整功夫界面；hero：首页展示（自动旋转、点击零件回调） */
  mode?: 'explore' | 'hero'
  initialPartId?: string | null
  /** hero 模式点击零件时回调 */
  onPickPart?: (id: string) => void
  apiRef?: RefObject<ViewerApi | null>
  className?: string
}

/* ------------------------------------------------------------------ */
/* 场景根组件（Canvas 内部）                                            */
/* ------------------------------------------------------------------ */

interface SceneRootProps {
  controller: BikeController
  hovered: string | null
  selected: string | null
  setSelected: SceneContextValue['setSelected']
  explode: number
  playing: boolean
  mode: 'explore' | 'hero'
  onStep: (index: number) => void
  onPlayEnd: () => void
  onReady: () => void
  apiRef?: RefObject<ViewerApi | null>
  onPickPart?: (id: string) => void
}

const SceneRoot = memo(function SceneRoot({
  controller,
  hovered,
  selected,
  setSelected,
  explode,
  playing,
  mode,
  onStep,
  onPlayEnd,
  onReady,
  apiRef,
  onPickPart,
}: SceneRootProps) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const controls = useThree((s) => s.controls) as unknown as { target: Vector3 } | null

  /** 相机补间：围绕注视点的球面（弧线）插值，而不是直线平移 */
  interface CamTween {
    fromPos: Vector3
    fromLook: Vector3
    toPos: Vector3
    toLook: Vector3
    t: number
    duration: number
  }
  const tween = useRef<CamTween | null>(null)

  const startTween = (toPos: Vector3, toLook: Vector3, duration = 1.0) => {
    tween.current = {
      fromPos: camera.position.clone(),
      fromLook: (controls?.target ?? new Vector3()).clone(),
      toPos,
      toLook,
      t: 0,
      duration,
    }
  }

  /* 装配时间表：按内容层组装流程排定各零件的安装时刻 */
  useEffect(() => {
    controller.buildSchedule(assemblySteps.map((s) => s.partIds))
  }, [controller])

  /* 悬停 / 选中 → 高亮与透视 */
  useEffect(() => {
    controller.applyVisuals(hovered, mode === 'explore' ? selected : null)
  }, [hovered, selected, mode, controller])

  /* 爆炸系数 */
  useEffect(() => {
    controller.explodeFactor = explode
  }, [explode, controller])

  /* 装配动画 */
  useEffect(() => {
    controller.onStep = onStep
    return () => {
      controller.onStep = null
    }
  }, [controller, onStep])

  useEffect(() => {
    controller.onEnd = onPlayEnd
    return () => {
      controller.onEnd = null
    }
  }, [controller, onPlayEnd])

  useEffect(() => {
    if (playing) controller.play()
  }, [playing, controller])

  /* 用户开始拖拽时取消相机补间（同时标记用户已接管视角） */
  const userMoved = useRef(false)
  useEffect(() => {
    const el = gl.domElement
    const cancel = () => {
      tween.current = null
      userMoved.current = true
    }
    el.addEventListener('pointerdown', cancel)
    return () => el.removeEventListener('pointerdown', cancel)
  }, [gl])

  /* 窄屏自适应：竖屏/小屏把相机拉远，保证整车完整入画（用户操作过则不再干预） */
  const size = useThree((s) => s.size)
  useEffect(() => {
    if (userMoved.current) return
    const aspect = size.width / Math.max(1, size.height)
    const scale = aspect < 0.9 ? 1.6 : aspect < 1.25 ? 1.3 : 1
    camera.position.set(2.15 * scale, 1.1 * scale, 1.65 * scale)
  }, [size, camera])

  /* 相机 API */
  useEffect(() => {
    if (!apiRef) return
    apiRef.current = {
      focusPart: (id, zoom = 1.15) => {
        const box = controller.worldBox(id)
        if (!box) return
        const center = box.getCenter(new Vector3())
        const size = box.getSize(new Vector3())
        const dist = Math.max(size.length() * zoom, 0.5)
        const dir = camera.position
          .clone()
          .sub(controls?.target ?? new Vector3())
          .normalize()
        if (dir.lengthSq() < 0.001) dir.set(1, 0.6, 1).normalize()
        startTween(center.clone().add(dir.multiplyScalar(dist)), center)
      },
      resetView: () => {
        startTween(new Vector3(2.15, 1.1, 1.65), new Vector3(0.05, 0.47, 0))
      },
      selectPart: (id) => {
        setSelected(id)
        if (id) apiRef.current?.focusPart(id)
        else apiRef.current?.resetView()
      },
    }
  }, [apiRef, controller, camera, controls, setSelected])

  /* hero 模式：点击零件交给外部处理 */
  useEffect(() => {
    if (mode === 'hero' && selected) {
      onPickPart?.(selected)
      setSelected(null)
    }
  }, [mode, selected, onPickPart, setSelected])

  const readyFrames = useRef(0)
  const lastExplode = useRef(-1)
  const keyLight = useRef<DirectionalLight | null>(null)
  const scene = useThree((s) => s.scene)

  useFrame((_, dt) => {
    controller.update(dt)
    controller.applyTransforms()

    /* 静态阴影贴图：仅在零件运动时重算（相机旋转不影响阴影，空闲时省下一整遍场景渲染） */
    if (!keyLight.current) {
      keyLight.current = scene.getObjectByName('key-light') as DirectionalLight | null
    }
    const light = keyLight.current
    if (light) {
      const partsMoving = controller.playing || controller.explodeFactor !== lastExplode.current
      if (partsMoving || readyFrames.current < 6) {
        light.shadow.needsUpdate = true
        lastExplode.current = controller.explodeFactor
      }
    }

    const tw = tween.current
    if (tw) {
      tw.t = Math.min(1, tw.t + dt / tw.duration)
      // easeInOutCubic：起步与收尾都柔和
      const x = tw.t
      const k = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
      // 围绕注视点做球面插值 → 相机走弧线而不是直线
      const sph0 = new Spherical().setFromVector3(tw.fromPos.clone().sub(tw.fromLook))
      const sph1 = new Spherical().setFromVector3(tw.toPos.clone().sub(tw.toLook))
      let dTheta = sph1.theta - sph0.theta
      if (dTheta > Math.PI) dTheta -= Math.PI * 2
      if (dTheta < -Math.PI) dTheta += Math.PI * 2
      const sph = new Spherical(
        sph0.radius + (sph1.radius - sph0.radius) * k,
        sph0.phi + (sph1.phi - sph0.phi) * k,
        sph0.theta + dTheta * k,
      )
      const look = tw.fromLook.clone().lerp(tw.toLook, k)
      camera.position.copy(look).add(new Vector3().setFromSpherical(sph))
      if (controls) controls.target.copy(look)
      if (tw.t >= 1) {
        camera.position.copy(tw.toPos)
        if (controls) controls.target.copy(tw.toLook)
        tween.current = null
      }
    }
    if (readyFrames.current < 3) {
      readyFrames.current += 1
      if (readyFrames.current === 3) onReady()
    }
  })

  return null
})


const SceneContents = memo(function SceneContents({
  mode,
  tier,
  moving,
}: {
  mode: 'explore' | 'hero'
  tier: QualityTier
  /** 零件是否在运动（装配/爆炸）：静止时接触阴影只渲染一次，省下每帧的场景重绘 */
  moving: boolean
}) {
  return (
    <>
      <StudioBackdrop />
      <StudioEnvironment tier={tier} />
      <StudioLights
        shadowSize={tier === 'high' ? 2048 : 1024}
        shadowExtent={1.15}
      />
      <BikeAssembly />
      {/* 影棚地面：仅保留接触阴影（虚空舞台比可见地面更干净、更"产品照"） */}
      <ContactShadows
        key={moving ? 'moving' : 'idle'}
        frames={moving ? Infinity : 1}
        position={[0, 0.002, 0]}
        opacity={0.38}
        scale={3.4}
        blur={3}
        far={1.25}
        resolution={tier === 'high' ? 1024 : 256}
        color="#4a4438"
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.45}
        maxDistance={5.5}
        maxPolarAngle={Math.PI * 0.495}
        target={[0.05, 0.47, 0]}
        autoRotate={mode === 'hero'}
        autoRotateSpeed={0.9}
        enablePan={mode === 'explore'}
      />
      <StudioEffects bloom={tier === 'high' ? 0.2 : 0.12} ssao={tier === 'high'} />
    </>
  )
})

/* Canvas 内部根组件：React Context 必须放在 r3f 的渲染根内部才能被零件组件消费 */
function CanvasRoot({
  ctxValue,
  mode,
  tier,
  moving,
  sceneProps,
}: {
  ctxValue: SceneContextValue
  mode: 'explore' | 'hero'
  tier: QualityTier
  moving: boolean
  sceneProps: Omit<SceneRootProps, 'mode'>
}) {
  return (
    <SceneContext.Provider value={ctxValue}>
      <SceneRoot {...sceneProps} mode={mode} />
      <SceneContents mode={mode} tier={tier} moving={moving} />
    </SceneContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* 悬浮标签                                                            */
/* ------------------------------------------------------------------ */

function HoverTooltip({
  hovered,
  tooltipRef,
}: {
  hovered: string | null
  tooltipRef: RefObject<HTMLDivElement | null>
}) {
  const part = hovered ? partById[hovered] : null
  if (!part) return null
  const system = systemById[part.system]
  return (
    <div
      ref={tooltipRef}
      className="pointer-events-none fixed left-0 top-0 z-50 hidden -translate-y-full items-center gap-2 rounded-xl bg-paper/95 px-3 py-2 text-sm text-ink shadow-xl shadow-ink/10 ring-1 ring-ink/10 backdrop-blur-xl sm:flex"
    >
      <span className="font-medium tracking-tight">{part.nameZh}</span>
      <span className="text-xs text-ink-soft/70">{part.nameEn}</span>
      <span
        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: system.color + '26', color: system.color }}
      >
        {system.nameZh}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 主组件                                                              */
/* ------------------------------------------------------------------ */

const PRESETS: { label: string; partId?: string; zoom?: number }[] = [
  { label: '整车' },
  { label: '车架', partId: 'frame', zoom: 0.85 },
  { label: '轮组', partId: 'tire', zoom: 1.0 },
  { label: '传动', partId: 'crankset', zoom: 1.0 },
  { label: '刹车', partId: 'rotor', zoom: 1.1 },
  { label: '操控', partId: 'stem', zoom: 1.35 },
  { label: '座舱', partId: 'saddle', zoom: 1.3 },
]

export function BikeViewer({
  mode = 'explore',
  initialPartId = null,
  onPickPart,
  apiRef,
  className,
}: BikeViewerProps) {
  const controller = useMemo(() => new BikeController(), [])
  const [tier] = useState<QualityTier>(() => detectQualityTier())
  const [dpr, setDpr] = useState(() => (tier === 'high' ? 2 : 1.5))
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [explode, setExplode] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [captionStep, setCaptionStep] = useState<number | null>(null)
  const [ready, setReady] = useState(false)
  const [indexOpen, setIndexOpen] = useState(false)

  const tooltipRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0 })

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    posRef.current = { x: e.clientX, y: e.clientY }
    const el = tooltipRef.current
    if (el) el.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY - 10}px, 0)`
  }, [])

  /* 悬浮标签首次出现时定位到当前鼠标处 */
  useEffect(() => {
    if (hovered && tooltipRef.current) {
      tooltipRef.current.style.transform = `translate3d(${posRef.current.x + 14}px, ${posRef.current.y - 10}px, 0)`
    }
  }, [hovered])

  /* 首帧就绪后应用 initialPartId */
  useEffect(() => {
    if (ready && initialPartId && partById[initialPartId]) {
      setSelected(initialPartId)
      apiRef?.current?.focusPart(initialPartId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, initialPartId])

  const handleStep = useCallback((i: number) => setCaptionStep(i === -1 ? null : i), [])
  const handlePlayEnd = useCallback(() => setPlaying(false), [])
  const handleReady = useCallback(() => setReady(true), [])

  const selectedPart = selected ? partById[selected] : null

  /** 提供给 Canvas 内零件组件的稳定上下文（悬停/选中值通过 props 走 SceneRoot） */
  const ctxValue = useMemo<SceneContextValue>(
    () => ({ controller, setHovered, setSelected }),
    [controller],
  )

  const selectAndFocus = useCallback(
    (id: string) => {
      setSelected(id)
      setPlaying(false)
      controller.settle()
      apiRef?.current?.focusPart(id)
    },
    [apiRef, controller],
  )

  return (
    <div
      className={`relative h-full w-full overflow-hidden ${className ?? ''}`}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        shadows
        dpr={dpr}
        gl={{ toneMappingExposure: 1.02 }}
        camera={{ fov: 38, position: [2.15, 1.1, 1.65], near: 0.05, far: 30 }}
        onPointerMissed={() => mode === 'explore' && setSelected(null)}
      >
        {/* 帧率下滑时自动降 dpr，回升后逐步恢复 */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr((d) => Math.max(1, Math.round((d - 0.25) * 100) / 100))}
          onIncline={() =>
            setDpr((d) => Math.min(tier === 'high' ? 2 : 1.5, Math.round((d + 0.25) * 100) / 100))
          }
        />
        <CanvasRoot
          ctxValue={ctxValue}
          mode={mode}
          tier={tier}
          moving={playing || explode > 0}
          sceneProps={{
            controller,
            hovered,
            selected,
            setSelected,
            explode: mode === 'explore' ? explode : 0,
            playing: mode === 'explore' ? playing : false,
            onStep: handleStep,
            onPlayEnd: handlePlayEnd,
            onReady: handleReady,
            apiRef: mode === 'explore' ? apiRef : undefined,
            onPickPart,
          }}
        />
      </Canvas>

      <HoverTooltip hovered={mode === 'hero' ? null : hovered} tooltipRef={tooltipRef} />

      {mode === 'explore' && (
        <>
          {/* 顶栏：标题 + 相机预设 */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-4">
            <div className="glass pointer-events-auto px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <span className="text-sm font-semibold tracking-tight text-ink">3D 探索</span>
              </div>
              <div className="mt-1 text-[11px] leading-4 text-ink-soft/70">
                拖动旋转 · 滚轮缩放 · 点击零件看详情
              </div>
            </div>
            <div className="glass pointer-events-auto flex flex-wrap gap-0.5 p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() =>
                    p.partId ? selectAndFocus(p.partId) : apiRef?.current?.resetView()
                  }
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors duration-200 hover:bg-ink/[0.06] hover:text-ink"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 左侧零件索引 */}
          <button
            onClick={() => setIndexOpen((v) => !v)}
            className="glass absolute left-4 top-28 px-3 py-2 text-xs font-medium text-ink-soft lg:hidden"
          >
            {indexOpen ? '收起零件' : '零件列表'}
          </button>
          <div
            className={`glass thin-scroll absolute bottom-24 left-4 top-32 w-56 overflow-y-auto p-2 ${
              indexOpen ? '' : 'hidden lg:block'
            }`}
          >
            {systems.map((sys) => (
              <div key={sys.id} className="mb-1.5">
                <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-ink-soft/70">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: sys.color, boxShadow: `0 0 6px ${sys.color}99` }}
                  />
                  {sys.nameZh}
                </div>
                {parts
                  .filter((p) => p.system === sys.id)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectAndFocus(p.id)}
                      className={`block w-full rounded-lg px-2.5 py-[5px] text-left text-xs transition-colors duration-150 ${
                        selected === p.id
                          ? 'bg-ink font-medium text-paper'
                          : 'text-ink-soft/70 hover:bg-ink/[0.05] hover:text-ink'
                      }`}
                    >
                      {p.nameZh}
                    </button>
                  ))}
              </div>
            ))}
          </div>

          {/* 选中零件卡片 */}
          {selectedPart && (
            <div className="glass animate-fade-up absolute right-4 top-28 z-10 w-72 max-w-[calc(100%-2rem)] overflow-hidden text-ink">
              {/* 系统色顶边 */}
              <span
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, ${systemById[selectedPart.system].color}, transparent)`,
                }}
              />
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: systemById[selectedPart.system].color + '26',
                      color: systemById[selectedPart.system].color,
                    }}
                  >
                    {systemById[selectedPart.system].nameZh}
                  </span>
                  <button
                    onClick={() => setSelected(null)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft/70 transition hover:bg-ink/[0.06] hover:text-ink"
                    aria-label="取消选择"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="text-xl font-bold tracking-tight">
                  {selectedPart.nameZh}
                  {selectedPart.abbr && (
                    <span className="ml-2 rounded-md bg-ink/[0.06] px-1.5 py-0.5 align-middle text-[11px] font-medium text-ink-soft">
                      {selectedPart.abbr}
                    </span>
                  )}
                </h3>
                <div className="mt-0.5 text-xs text-ink-soft/70">{selectedPart.nameEn}</div>
                <p className="mt-3 text-[13px] leading-6 text-ink-soft">{selectedPart.summary}</p>
                <Link
                  to={`/parts/${selectedPart.id}`}
                  className="mt-4 flex items-center justify-center gap-1 rounded-xl bg-ink px-3 py-2 text-sm font-semibold text-paper shadow-lg shadow-ink/15 transition duration-200 hover:brightness-110 active:scale-[0.99]"
                >
                  查看详解与安装步骤 →
                </Link>
              </div>
            </div>
          )}

          {/* 底部控制栏 */}
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
            {captionStep !== null && (
              <div className="animate-fade-up glass flex flex-col gap-1.5 px-3.5 py-2">
                <div className="flex items-center gap-2 text-xs font-medium text-ink">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                  装配中 · 第 {captionStep + 1} 步：{assemblySteps[captionStep]?.title}
                </div>
                {/* 进度条：CSS 动画按装配总时长线性推进 */}
                <div className="h-0.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="animate-progress h-full origin-left bg-ink"
                    style={{ animationDuration: `${Math.max(1, controller.totalDuration)}s` }}
                  />
                </div>
              </div>
            )}
            <div className="glass flex flex-wrap items-center justify-center gap-3 px-4 py-3 text-ink">
              <button
                onClick={() => {
                  if (playing) {
                    setPlaying(false)
                    controller.settle()
                  } else {
                    setExplode(0)
                    setPlaying(true)
                  }
                }}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition duration-200 active:scale-[0.98] ${
                  playing
                    ? 'bg-signal text-paper shadow-lg shadow-signal/20 hover:bg-signal/90'
                    : 'bg-ink text-paper shadow-lg shadow-ink/15 hover:bg-ink/90'
                }`}
              >
                {playing ? '■ 停止装配' : '▶ 装配动画'}
              </button>
              <div className="flex items-center gap-2.5 text-xs text-ink-soft">
                <span className="tracking-wide">爆炸</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(explode * 100)}
                  onChange={(e) => {
                    setPlaying(false)
                    controller.settle()
                    setExplode(Number(e.target.value) / 100)
                  }}
                  className="stage-slider w-36"
                  style={{ ['--fill' as string]: `${Math.round(explode * 100)}%` }}
                  aria-label="爆炸视图"
                />
              </div>
              <span className="h-5 w-px bg-ink/10" />
              <button
                onClick={() => apiRef?.current?.resetView()}
                className="rounded-full bg-ink/[0.05] px-3.5 py-1.5 text-[13px] font-medium text-ink-soft ring-1 ring-ink/10 transition duration-200 hover:bg-ink/[0.1]"
              >
                重置视角
              </button>
            </div>
          </div>
        </>
      )}

      {mode === 'hero' && (
        <div className="glass pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap px-4 py-2 text-xs text-ink-soft">
          <span className="hidden items-center gap-1 sm:flex">
            <kbd className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-sans text-[10px] text-ink-soft">
              拖动
            </kbd>
            旋转
          </span>
          <span className="hidden h-3 w-px bg-ink/15 sm:block" />
          <span className="hidden items-center gap-1 sm:flex">
            <kbd className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-sans text-[10px] text-ink-soft">
              滚轮
            </kbd>
            缩放
          </span>
          <span className="hidden h-3 w-px bg-ink/15 sm:block" />
          <span>点击任意零件进入 3D 探索</span>
        </div>
      )}
    </div>
  )
}
