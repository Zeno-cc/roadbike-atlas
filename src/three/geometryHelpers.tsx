import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Matrix4,
  Object3D,
  Path,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three'
import type { Vec3 } from './bikeConfig'

/**
 * 两点之间的圆柱管件（车架/前叉/座管等一切"杆件"的通用积木）。
 * from/to 为端点坐标（米），r1 为 from 端半径，r2 为 to 端半径（不等即为锥形管）。
 */
export function Tube({
  from,
  to,
  r1,
  r2,
  segments = 28,
  children,
  ...meshProps
}: {
  from: Vec3
  to: Vec3
  r1: number
  r2?: number
  segments?: number
  children?: ReactNode
} & Omit<React.ComponentProps<'mesh'>, 'children'>) {
  const key = [...from, ...to, r1, r2, segments].join(',')
  const { pos, quat, len } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    const l = dir.length()
    const p = a.clone().add(b).multiplyScalar(0.5)
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
    return { pos: p, quat: q, len: l }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <mesh position={pos} quaternion={quat} {...meshProps}>
      <cylinderGeometry args={[r2 ?? r1, r1, len, segments]} />
      {children}
    </mesh>
  )
}

/** 带齿盘片（牙盘、飞轮齿片）：teeth 齿数、pitchR 节圆半径、toothDepth 齿高，holes 为减重孔 */
export function makeGearGeometry(teeth: number, pitchR: number, thickness: number, toothDepth: number, holes?: { x: number; y: number; r: number }[]): BufferGeometry {
  const shape = new Shape()
  const step = (Math.PI * 2) / teeth
  const rValley = pitchR
  const rTip = pitchR + toothDepth
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step
    // 每齿 4 点：齿谷 → 齿顶左 → 齿顶右 → 齿谷
    const pts: [number, number][] = [
      [rValley, a0],
      [rTip, a0 + step * 0.22],
      [rTip, a0 + step * 0.5],
      [rValley, a0 + step * 0.72],
    ]
    for (const [r, a] of pts) {
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0 && r === rValley) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
  }
  shape.closePath()
  if (holes) {
    for (const h of holes) {
      const path = new Path()
      path.absarc(h.x, h.y, h.r, 0, Math.PI * 2, false)
      shape.holes.push(path)
    }
  }
  const geo = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 24 })
  geo.translate(0, 0, -thickness / 2)
  return geo
}

/** 旋转体（花鼓壳、碟刹卡钳、碗组轴承等）—— 传入 [半径, 高度] 剖面点即可 */
export function latheGeometry(profile: [number, number][], segments = 40): BufferGeometry {
  const points = profile.map(([x, y]) => new Vector2(x, y))
  return new LatheGeometry(points, segments)
}

/**
 * 高效批量实例化（辐条、链节等几十上百个同类件）。
 * 传入每个实例的变换矩阵，children 内放一份几何。
 */
export function Instances({ matrices, children }: { matrices: Matrix4[]; children: ReactNode }) {
  const ref = useRef<import('three').InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, matrices.length]} castShadow>
      {children}
    </instancedMesh>
  )
}

const dummy = new Object3D()

/** 构造一个"从 a 指向 b 的细杆"实例矩阵（辐条/链节用） */
export function strutMatrix(a: Vec3, b: Vec3, thickness = 1): Matrix4 {
  const A = new Vector3(...a)
  const Bv = new Vector3(...b)
  const dir = Bv.clone().sub(A)
  const len = dir.length()
  dummy.position.copy(A.clone().add(Bv).multiplyScalar(0.5))
  dummy.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
  dummy.scale.set(thickness, len, thickness)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}

/** 构造一个带位置/朝向的实例矩阵 */
export function trsMatrix(
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  scale: Vec3 | number = 1,
): Matrix4 {
  dummy.position.set(...position)
  dummy.rotation.set(...rotation)
  if (typeof scale === 'number') dummy.scale.setScalar(scale)
  else dummy.scale.set(...scale)
  dummy.updateMatrix()
  return dummy.matrix.clone()
}

export { CylinderGeometry }
