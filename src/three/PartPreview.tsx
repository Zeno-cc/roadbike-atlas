import { memo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, ContactShadows, OrbitControls } from '@react-three/drei'
import { MODEL_BY_PART } from './modelRegistry'
import {
  detectQualityTier,
  StudioBackdrop,
  StudioEffects,
  StudioEnvironment,
  StudioLights,
  type QualityTier,
} from './studio'

/**
 * 零件单独预览：以 unit 模式渲染该零件模型，自动取景 + 自动旋转。
 * 与整车场景共用同一套影棚环境、光照与后期处理，保证质感一致。
 */
export const PartPreview = memo(function PartPreview({ partId }: { partId: string }) {
  const Model = MODEL_BY_PART[partId]
  const [tier] = useState<QualityTier>(() => detectQualityTier())
  if (!Model) return null

  return (
    <div className="h-full w-full">
      <Canvas
        key={partId}
        shadows
        dpr={tier === 'high' ? 2 : 1.5}
        gl={{ toneMappingExposure: 1.08 }}
        camera={{ fov: 40, position: [0.9, 0.55, 0.9], near: 0.02, far: 20 }}
      >
        <StudioBackdrop radius={7} />
        <StudioEnvironment tier={tier} />
        <StudioLights shadowSize={tier === 'high' ? 1024 : 512} shadowExtent={0.65} />
        {/* 单件展示补光：正面柔光（让朝相机的一面有细节）+ 低位侧补（勾出下缘） */}
        <directionalLight position={[1.6, 2.2, 3]} intensity={0.9} color="#ffffff" />
        <directionalLight position={[-2.4, 0.9, 2.2]} intensity={0.6} color="#e6eeff" />
        <Bounds fit clip observe margin={1.25}>
          <group>
            <Model unit />
          </group>
        </Bounds>
        <ContactShadows
          position={[0, -0.001, 0]}
          opacity={0.32}
          scale={2.4}
          blur={2.6}
          far={1.4}
          resolution={tier === 'high' ? 512 : 128}
          color="#4a4438"
        />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.09}
          autoRotate
          autoRotateSpeed={1.1}
          enablePan={false}
        />
        <StudioEffects bloom={0.18} ssao={tier === 'high'} />
      </Canvas>
    </div>
  )
})
