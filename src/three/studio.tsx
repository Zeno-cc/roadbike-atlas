/**
 * 影棚渲染组件：3D 场景的"产品照"基础设施，整车场景与单件预览共用。
 *
 * 风格基调：暖白影棚（ivory studio）—— 象牙白渐变背景、柔和接触阴影、
 * 大量漫反射柔光，产品（深色车架/轮组）在浅底上以剪影和金属高光出彩。
 *
 * - StudioBackdrop：暖白渐变背景球（顶部微深 → 地平线最亮 → 地面略暗），无地面几何
 * - StudioEnvironment：Lightformer 程序化影棚（白柔光箱为主），提供金属/清漆反射
 * - StudioLights：真实方向光（负责投影），静态阴影贴图 + 首帧预热
 * - StudioEffects：SSAO 体积感 + 克制的 Bloom + 极轻暗角
 *
 * 画质分级：detectQualityTier() 在低算力设备（小屏 / 少核心）自动降档。
 */
import { Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, SSAO, Vignette } from '@react-three/postprocessing'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { BackSide, type DirectionalLight } from 'three'
import { backdropGradientTexture } from './textures'

export type QualityTier = 'high' | 'low'

/** 依据屏幕尺寸与硬件条件判定画质档位（SSR/测试环境回落 high） */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'high'
  const smallScreen = window.innerWidth < 768
  const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMem = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4
  return smallScreen || lowCores || lowMem ? 'low' : 'high'
}

/**
 * 暖白影棚背景：一个渐变背景球（内表面），半径需小于相机远裁剪面，
 * 否则会被裁出空洞。不做地面几何 —— 接地感交给接触阴影。
 */
export function StudioBackdrop({ radius = 18 }: { radius?: number }) {
  const backdrop = backdropGradientTexture()
  return (
    <mesh renderOrder={-10}>
      <sphereGeometry args={[radius, 48, 32]} />
      <meshBasicMaterial map={backdrop} side={BackSide} toneMapped={false} />
    </mesh>
  )
}

export function StudioEnvironment({ tier = 'high' }: { tier?: QualityTier }) {
  return (
    <Environment resolution={tier === 'high' ? 256 : 128} frames={1} environmentIntensity={0.95}>
      {/* 主柔光箱（右前上方，大面积白光） */}
      <Lightformer
        form="rect"
        intensity={6.5}
        position={[3.5, 4, 2.5]}
        rotation={[-0.5, 0.7, 0]}
        scale={[7, 4.5, 1]}
        color="#ffffff"
      />
      {/* 冷色侧补光（左） */}
      <Lightformer
        form="rect"
        intensity={2.0}
        position={[-4.5, 2.5, 1.5]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={[6, 3.5, 1]}
        color="#eef4ff"
      />
      {/* 背景暖光（后方，模拟浅色影棚的墙面反光） */}
      <Lightformer
        form="rect"
        intensity={2.8}
        position={[-0.5, 2.8, -4.5]}
        rotation={[0, Math.PI, 0]}
        scale={[7, 3, 1]}
        color="#fff6e8"
      />
      {/* 顶部大柔光 */}
      <Lightformer
        form="rect"
        intensity={2.6}
        position={[0, 5.5, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[9, 9, 1]}
        color="#fdfcf8"
      />
      {/* 地面反弹（浅色影棚的强反弹） */}
      <Lightformer
        form="rect"
        intensity={1.3}
        position={[0, -2.5, 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[9, 7, 1]}
        color="#fff9ef"
      />
      {/* 细长条光：金属件上的拉丝高光条 */}
      <Lightformer
        form="rect"
        intensity={2.2}
        position={[2.5, 1.2, 3.5]}
        rotation={[0, 0.35, 0.35]}
        scale={[0.6, 5, 1]}
        color="#ffffff"
      />
    </Environment>
  )
}

/** 真实投影光：明亮影棚的高环境光 + 柔和主光；静态阴影贴图 + 首帧预热 */
export function StudioLights({
  shadowSize = 2048,
  shadowExtent = 1.1,
}: {
  shadowSize?: number
  shadowExtent?: number
}) {
  const lightRef = useRef<DirectionalLight>(null)
  const warmup = useRef(0)
  /* 静态阴影贴图必须至少渲染一次：否则深度图未初始化，整个场景会被判定为
     "全部处于阴影中"而渲染成黑色（零件预览页曾因此整屏空白）。 */
  useFrame(() => {
    if (warmup.current >= 4) return
    warmup.current += 1
    if (lightRef.current) lightRef.current.shadow.needsUpdate = true
  })
  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight
        ref={lightRef}
        name="key-light"
        castShadow
        shadow-autoUpdate={false}
        position={[2.6, 3.4, 2]}
        intensity={1.9}
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.4}
        shadow-camera-far={9}
        shadow-bias={-0.00035}
        shadow-normalBias={0.008}
      />
      <directionalLight position={[-3.2, 2.4, 1.4]} intensity={0.85} color="#eef4ff" />
      <directionalLight position={[0.5, 1.6, -3]} intensity={0.8} color="#fff0d8" />
      {/* 浅色影棚的轮廓光：只做很轻的边缘提亮，避免深色车架在浅底上糊成一团 */}
      <directionalLight position={[-1.6, 1.5, -2.6]} intensity={0.55} color="#f4f7ff" />
    </>
  )
}

/** 后期处理：SSAO（高档位）+ 克制的 Bloom + 极轻暗角 */
export function StudioEffects({
  bloom = 0.16,
  ssao = false,
}: {
  bloom?: number
  ssao?: boolean
}) {
  const bloomNode = (
    <Bloom
      intensity={bloom}
      luminanceThreshold={0.95}
      luminanceSmoothing={0.2}
      mipmapBlur
      radius={0.6}
    />
  )
  const vignetteNode = <Vignette eskil={false} offset={0.3} darkness={0.32} />

  if (ssao) {
    return (
      <EffectComposer multisampling={4}>
        <SSAO
          samples={16}
          radius={0.06}
          intensity={10}
          luminanceInfluence={0.5}
          color="#3a342a"
        />
        {bloomNode}
        {vignetteNode}
      </EffectComposer>
    )
  }
  return (
    <EffectComposer multisampling={4}>
      {bloomNode}
      {vignetteNode}
    </EffectComposer>
  )
}
