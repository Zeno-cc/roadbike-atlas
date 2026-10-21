/**
 * 座舱系统零件模型：座管 Seatpost、坐垫 Saddle、座管夹 SeatpostClamp
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把该零件摆成
 * 以原点为中心、适合单独展示的形态。
 *
 * 渲染精度：圆柱 32-40 段；曲线管 48 段（径向 20）；放样件手工建索引后
 * computeVertexNormals。座管为 D 形气动管：前缘半圆 + 后缘平背，沿管轴
 * 20 个站位 × 24 点截面放样（下端沿轴向斜切）；顶端夹头为两片垂直管轴的
 * 椭圆夹块 + D 形颈套 + 两颗六角螺栓；座管夹为楔块式环体（D 形外轮廓 +
 * D 形内孔挤出，顶面斜切成前低后高的楔面，后壁水平打入一颗六角螺栓）。
 * 碳纤维件（座管管身、夹头夹块与颈套）用 matP.carbonGloss；
 * 金属件用 mat.aluBlack / mat.steel；管背字标用 decals.small。
 */
import { useMemo } from 'react'
import {
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Path,
  Quaternion,
  Shape,
  Vector3,
} from 'three'
import { B, deg, type Vec3 } from '../bikeConfig'
import { decals, mat, matP } from '../materials'

/** 立管轴线倾角（座管与座管夹都随立管向 -X 倾斜） */
const seatTilt = deg(90 - B.seatAngleDeg) // 16.5°

/** 立管轴线上高度 y 处的位置（座管轴与立管共线） */
function onSeatAxis(y: number): Vec3 {
  const [x0, y0] = B.seatTop
  return [x0 - (y - y0) * Math.tan(seatTilt), y, 0]
}

/** 坐垫中心 x（俯视轮廓的中心） */
const SADDLE_CX = -0.183
/** 坐垫总成预览中心（unit 模式取负居中） */
const SADDLE_CENTER: Vec3 = [SADDLE_CX, 0.978, 0]

/** 坐垫两轨的中心高度（座管夹头咬住轨道处，坐垫与座管共用的对位基准） */
const RAIL_Y = 0.9685
/** 两轨在 Z 方向各 ±0.022（轨距 0.044） */
const RAIL_Z = 0.022

/** 座管总成预览中心（unit 模式取负居中） */
const SEATPOST_CENTER: Vec3 = [-0.188, 0.865, 0]

/* ================================================================== */
/* D 形气动座管截面                                                     */
/* ================================================================== */

/** 前缘半圆半径（= 座管宽 w 的一半）与总深 d（前后方向） */
const POST_R = B.seatpost.w / 2 // 0.013
const POST_DEPTH = B.seatpost.d // 0.038
/** 截面前后居中于管轴：前缘最前点 +d/2、后缘平背 −d/2 */
const POST_FRONT = POST_DEPTH / 2 // +0.019
const POST_BACK = -POST_DEPTH / 2 // −0.019
/** 前缘半圆圆心（比管轴靠前 d/2 − w/2，整体于是前后居中于管轴） */
const POST_ARC_CX = POST_FRONT - POST_R // +0.006
/** 截面采样：前缘半圆 20 点（密）+ 平背 4 点（含两角点）= 24 点/截面 */
const POST_ARC_SEGS = 20
const POST_BACK_SEGS = 4

/**
 * D 形截面轮廓（局部坐标：x = 车头方向、y = 车宽方向）：
 * 前缘半圆（自 +90° 扫到 −90°）→ 直边收到后缘平背（3~4 点）。
 * 绕行为顺时针（(x, y) 平面内负向），配合"环沿 +Y 叠放"的三角形绕序得到朝外法线。
 */
function dProfile(arcR: number, arcCx: number, backX: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < POST_ARC_SEGS; i++) {
    const th = (Math.PI / 2) * (1 - (2 * i) / (POST_ARC_SEGS - 1))
    pts.push([arcCx + arcR * Math.cos(th), arcR * Math.sin(th)])
  }
  for (let j = 0; j < POST_BACK_SEGS; j++) {
    pts.push([backX, -arcR + (2 * arcR * (j + 1)) / (POST_BACK_SEGS + 1)])
  }
  return pts
}

/**
 * 沿局部 +Y 轴放样 D 形截面成实体（含两端封口）：
 * yList 为各站位的轴向坐标；axialOffset 可给某站位顶点叠加轴向偏移（下端斜切口）。
 */
function loftDProfile(
  profile: [number, number][],
  yList: number[],
  axialOffset?: (station: number, fz: number) => number,
): BufferGeometry {
  const segs = profile.length
  const n = yList.length
  const positions: number[] = []
  const indices: number[] = []

  for (let j = 0; j < n; j++) {
    for (const [fx, fz] of profile) {
      positions.push(fx, yList[j] + (axialOffset ? axialOffset(j, fz) : 0), fz)
    }
  }
  // 侧面：相邻两环对应点两两相连
  for (let j = 0; j < n - 1; j++) {
    const r0 = j * segs
    const r1 = r0 + segs
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % segs
      indices.push(r0 + k, r0 + k2, r1 + k2)
      indices.push(r0 + k, r1 + k2, r1 + k)
    }
  }
  // 端面：复制端环（保留硬边）+ 面心，扇形封口
  const cap = (ring: number, top: boolean) => {
    const base = ring * segs
    let cx = 0
    let cy = 0
    let cz = 0
    for (let k = 0; k < segs; k++) {
      cx += positions[(base + k) * 3]
      cy += positions[(base + k) * 3 + 1]
      cz += positions[(base + k) * 3 + 2]
    }
    const start = positions.length / 3
    for (let k = 0; k < segs; k++) {
      positions.push(
        positions[(base + k) * 3],
        positions[(base + k) * 3 + 1],
        positions[(base + k) * 3 + 2],
      )
    }
    positions.push(cx / segs, cy / segs, cz / segs)
    const center = start + segs
    for (let k = 0; k < segs; k++) {
      const k2 = (k + 1) % segs
      if (top) indices.push(start + k2, start + k, center)
      else indices.push(start + k, start + k2, center)
    }
  }
  cap(0, false) // 下端（法线朝 −Y）
  cap(n - 1, true) // 上端（法线朝 +Y）

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/* ================================================================== */
/* 座管                                                                */
/* ================================================================== */

/** 管身下端（插在立管内的插入段末端）与管身顶端（夹头座） */
const POST_LOW = onSeatAxis(0.70)
const POST_TOP = onSeatAxis(0.985)
/** 放样站位数（沿管轴 20 个截面）与下端斜切角（度） */
const POST_STATIONS = 20
const POST_CUT_DEG = 20

/** 座管管身：D 形气动管放样（20 站位 × 24 点），下端沿轴向斜切 */
function makeSeatpostShaft(): { geo: BufferGeometry; pos: Vector3; quat: Quaternion } {
  const a = new Vector3(...POST_LOW)
  const b = new Vector3(...POST_TOP)
  const dir = b.clone().sub(a)
  const len = dir.length()
  const pos = a.clone().add(b).multiplyScalar(0.5)
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize())
  const yList = Array.from(
    { length: POST_STATIONS },
    (_, j) => (j / (POST_STATIONS - 1) - 0.5) * len,
  )
  // 下端斜切口：底部一圈顶点沿轴向按车宽坐标线性偏移 → 端面成一斜面
  const cut = Math.tan(deg(POST_CUT_DEG))
  const geo = loftDProfile(dProfile(POST_R, POST_ARC_CX, POST_BACK), yList, (j, fz) =>
    j === 0 ? fz * cut : 0,
  )
  return { geo, pos, quat }
}

/* -------- 顶端夹头（在"座管局部坐标"里建模：原点 = 管顶，+Y = 管轴） -------- */

/** 轨道穿过夹头的轴向位置（管顶往下 16.5mm 的竖直距离） */
const HEAD_RAIL_LOCAL = -(POST_TOP[1] - RAIL_Y) / Math.cos(seatTilt) // ≈ −0.0172
/** 上下夹块中心：轨道上下各偏 12.5mm（两片之间留出 7mm 轨槽） */
const HEAD_CAP_LOCAL = HEAD_RAIL_LOCAL + 0.0125
const HEAD_CRADLE_LOCAL = HEAD_RAIL_LOCAL - 0.0125
/** 夹块：垂直管轴的椭圆盘（前后 42mm × 车宽 52mm，厚 18mm）——包住 D 形管顶 */
const HEAD_BLOCK_R = 0.021
const HEAD_BLOCK_W = 0.026
const HEAD_BLOCK_H = 0.018
/** 夹紧螺栓：前后各一，沿管轴穿过两片夹块 */
const HEAD_BOLT_X = 0.02
const HEAD_BOLT_R = 0.0028
/** 颈套（D 形短套，截面比管身大 1.2mm）：下端嵌进下夹块，包住管顶 */
const HEAD_NECK = dProfile(POST_R + 0.0012, POST_ARC_CX, POST_BACK - 0.0012)
const HEAD_NECK_LOW = -0.046
const HEAD_NECK_TOP = -0.034

export function SeatpostModel({ unit = false }: { unit?: boolean }) {
  const shaft = useMemo(() => makeSeatpostShaft(), [])
  const neck = useMemo(
    () => loftDProfile(HEAD_NECK, [HEAD_NECK_LOW, HEAD_NECK_TOP]),
    [],
  )

  const offset: Vec3 = unit ? [-SEATPOST_CENTER[0], -SEATPOST_CENTER[1], -SEATPOST_CENTER[2]] : [0, 0, 0]

  return (
    <group position={offset}>
      {/* 管身：D 形气动管（前缘半圆 + 后缘平背），下端 20° 斜切口 */}
      <group position={shaft.pos} quaternion={shaft.quat}>
        <mesh geometry={shaft.geo} castShadow>
          <meshPhysicalMaterial {...matP.carbonGloss} />
        </mesh>
        {/* 管背小字标：贴在平背面上（朝 −X 侧），沿管轴竖排阅读 */}
        <mesh position={[POST_BACK - 0.0002, 0.02, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.024, 0.0045]} />
          <meshStandardMaterial map={decals.small} alphaTest={0.4} metalness={0.1} roughness={0.5} />
        </mesh>
      </group>

      {/* 顶端夹头：颈套 + 上下夹块 + 两颗六角螺栓（局部 +X = 车头方向、+Y = 管轴） */}
      <group position={POST_TOP} quaternion={shaft.quat}>
        {/* 颈套：D 形短套包住管顶，上端没入下夹块 */}
        <mesh geometry={neck} castShadow>
          <meshPhysicalMaterial {...matP.carbonGloss} />
        </mesh>

        {/* 上下夹块：两片垂直管轴的椭圆盘，坐垫两轨从中间 7mm 轨槽穿过 */}
        {[HEAD_CRADLE_LOCAL, HEAD_CAP_LOCAL].map((y) => (
          <mesh
            key={y}
            position={[0, y, 0]}
            scale={[1, 1, HEAD_BLOCK_W / HEAD_BLOCK_R]}
            castShadow
          >
            <cylinderGeometry args={[HEAD_BLOCK_R, HEAD_BLOCK_R, HEAD_BLOCK_H, 40]} />
            <meshPhysicalMaterial {...matP.carbonGloss} />
          </mesh>
        ))}

        {/* 两颗夹紧螺栓：前后各一，沿管轴穿过两片夹块（下端露垫片 + 六角头） */}
        {[1, -1].map((s) => (
          <group key={`bolt${s}`}>
            {/* 螺栓杆 */}
            <mesh position={[HEAD_BOLT_X * s, -0.023, 0]} castShadow>
              <cylinderGeometry args={[HEAD_BOLT_R, HEAD_BOLT_R, 0.054, 32]} />
              <meshStandardMaterial {...mat.steel} />
            </mesh>
            {/* 下垫片 */}
            <mesh position={[HEAD_BOLT_X * s, -0.0508, 0]}>
              <cylinderGeometry args={[0.0064, 0.0064, 0.0016, 32]} />
              <meshStandardMaterial {...mat.steel} />
            </mesh>
            {/* 六角螺栓头（窄端朝下外侧） */}
            <mesh position={[HEAD_BOLT_X * s, -0.0542, 0]} castShadow>
              <cylinderGeometry args={[0.0052, 0.0046, 0.006, 6]} />
              <meshStandardMaterial {...mat.steel} />
            </mesh>
            {/* 上垫片（压在上夹块顶面，藏在坐垫壳下方） */}
            <mesh position={[HEAD_BOLT_X * s, 0.005, 0]}>
              <cylinderGeometry args={[0.0064, 0.0064, 0.0016, 32]} />
              <meshStandardMaterial {...mat.steel} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

/* ================================================================== */
/* 坐垫                                                                */
/* ================================================================== */

/** 坐垫总长 0.27：鼻端 +0.135（+X 方向）、尾端 −0.135（均相对坐垫中心） */
const SADDLE_LEN = 0.27
const SADDLE_NOSE_X = SADDLE_CX + SADDLE_LEN / 2
const SADDLE_TAIL_X = SADDLE_CX - SADDLE_LEN / 2
/** 两端圆头段长度：鼻端收成小圆头（薄鼻）、尾端收成钝圆尾（厚尾） */
const SADDLE_NOSE_CAP = 0.025
const SADDLE_TAIL_CAP = 0.022
/** 放样精度：纵向 48 个截面、环向 32 点/截面 */
const SADDLE_RINGS = 48
/** 截面超椭圆指数（圆角矩形，不是纯椭圆，侧翼更挺） */
const SADDLE_SECTION_N = 2.6
/** 侧翼外扩：截面下半部最多比上半部宽 6%，最宽点留在腰线上（下宽上窄的包裹感） */
const SADDLE_FLARE = 0.06
/** 中央减压槽：顶面最大下压 0.004，横向 |u| < 0.35w 余弦衰减，纵向 t ∈ [0.12, 0.92] 平滑窗 */
const SADDLE_GROOVE_DEPTH = 0.004
const SADDLE_GROOVE_HALF = 0.35

/** 半宽 w(t)：t = 0 鼻端 → 1 尾端（两端近零宽度的尖端由圆头段收口） */
const SADDLE_WIDTH: [number, number][] = [
  [0, 0.006],
  [0.25, 0.018],
  [0.5, 0.038],
  [0.75, 0.058],
  [1, 0.066],
]
/**
 * 半高 h(t)：顶面恒在 B.saddleTopY（= 1.005，装配基准，中轴顶线不随 t 变化），
 * 底面 = 顶面 − 2h —— 鼻端 ≈ 0.982（薄鼻）、腰线 ≈ 0.972、尾端 ≈ 0.973（厚尾）。
 */
const SADDLE_HEIGHT: [number, number][] = [
  [0, 0.0115],
  [0.3, 0.0145],
  [0.6, 0.0165],
  [1, 0.016],
]

/** smoothstep：把 x 截到 [0,1] 后两端平滑 */
function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x))
  return t * t * (3 - 2 * t)
}

/** 非均匀 Catmull-Rom（有限差分切线 + 三次 Hermite）：控制点不等距也能平滑过点 */
function splineAt(pts: [number, number][], t: number): number {
  const n = pts.length
  if (t <= pts[0][0]) return pts[0][1]
  if (t >= pts[n - 1][0]) return pts[n - 1][1]
  let i = 0
  while (i < n - 2 && pts[i + 1][0] < t) i++
  const [t0, v0] = pts[i]
  const [t1, v1] = pts[i + 1]
  const dt = t1 - t0
  const m0 = i === 0 ? (v1 - v0) / dt : (v1 - pts[i - 1][1]) / (t1 - pts[i - 1][0])
  const m1 = i + 2 >= n ? (v1 - v0) / dt : (pts[i + 2][1] - v0) / (pts[i + 2][0] - t0)
  const u = (t - t0) / dt
  const u2 = u * u
  const u3 = u2 * u
  return (
    (2 * u3 - 3 * u2 + 1) * v0 +
    (u3 - 2 * u2 + u) * dt * m0 +
    (-2 * u3 + 3 * u2) * v1 +
    (u3 - u2) * dt * m1
  )
}

/** 超椭圆截面 |u|^n + |v|^n = 1：给定归一化横向坐标 u（|u| ≤ 1）求 |v| */
const sectionV = (u: number): number =>
  Math.pow(1 - Math.pow(Math.abs(u), SADDLE_SECTION_N), 1 / SADDLE_SECTION_N)

/**
 * 环向采样表：从最宽点（u = ±1）到中轴（u = 0）的 9 个归一化横向坐标。
 * 中轴附近用指数重分布加密 —— 中央减压槽的横向轮廓才有足够采样点。
 */
const SADDLE_HALF_U: number[] = Array.from({ length: 9 }, (_, i) =>
  i === 8
    ? 0
    : Math.pow(Math.cos((Math.PI / 2) * (1 - Math.pow(1 - i / 8, 1.5))), 2 / SADDLE_SECTION_N),
)

/** 一圈截面的 (u, v) 采样点：从右侧最宽点起逆时针绕一周，共 32 点 */
const SADDLE_SECTION: [number, number][] = (() => {
  const pts: [number, number][] = []
  // 上半：右最宽点 → 顶中轴 → 左最宽点
  for (let i = 0; i < SADDLE_HALF_U.length; i++) pts.push([SADDLE_HALF_U[i], sectionV(SADDLE_HALF_U[i])])
  for (let i = SADDLE_HALF_U.length - 2; i >= 0; i--) pts.push([-SADDLE_HALF_U[i], sectionV(SADDLE_HALF_U[i])])
  // 下半：左最宽点（不含）→ 底中轴 → 右最宽点（不含）
  for (let i = 1; i < SADDLE_HALF_U.length; i++) pts.push([-SADDLE_HALF_U[i], -sectionV(SADDLE_HALF_U[i])])
  for (let i = SADDLE_HALF_U.length - 2; i >= 1; i--) pts.push([SADDLE_HALF_U[i], -sectionV(SADDLE_HALF_U[i])])
  return pts
})()

/** 减压槽纵向窗口：t ∈ [0.12, 0.92]，两端各留 0.08 的 smoothstep 收口 */
function grooveWindow(t: number): number {
  return smoothstep01((t - 0.12) / 0.08) * (1 - smoothstep01((t - 0.84) / 0.08))
}

/**
 * 坐垫壳：沿 X 轴放样的实体壳体（BufferGeometry，手工建索引，最后 computeVertexNormals）。
 * 纵向：鼻端圆头（收成极点）→ 48 个主体截面 → 尾端圆头（收成钝圆尾面，扇形封口）。
 * 环向：超椭圆截面（下宽上窄），顶面中轴带按减压槽窗口下压。
 */
function makeSaddleShell(): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const segs = SADDLE_SECTION.length

  /** 压入一圈截面点（sz / sy：两端圆头段的横向、竖向收缩系数） */
  const pushRing = (x: number, w: number, h: number, t: number, sz: number, sy: number) => {
    const cy = B.saddleTopY - h
    const groove = grooveWindow(t)
    for (const [u, v] of SADDLE_SECTION) {
      // 侧翼外扩：下半截面略宽（下半部 |v| 越大越宽，最宽点仍在腰线上）
      const flare = 1 + SADDLE_FLARE * smoothstep01(-v)
      let y = cy + h * sy * v
      if (v > 0 && groove > 0) {
        const lat =
          Math.abs(u) < SADDLE_GROOVE_HALF
            ? Math.cos((Math.PI / 2) * (Math.abs(u) / SADDLE_GROOVE_HALF))
            : 0
        y -= SADDLE_GROOVE_DEPTH * lat * groove
      }
      positions.push(x, y, w * sz * u * flare)
    }
  }

  const w0 = splineAt(SADDLE_WIDTH, 0)
  const h0 = splineAt(SADDLE_HEIGHT, 0)
  const w1 = splineAt(SADDLE_WIDTH, 1)
  const h1 = splineAt(SADDLE_HEIGHT, 1)
  const bodyLen = SADDLE_LEN - SADDLE_NOSE_CAP - SADDLE_TAIL_CAP
  const noseX0 = SADDLE_NOSE_X - SADDLE_NOSE_CAP

  // 鼻端圆头：4 圈（越贴尖端收缩越快），椭圆式收口 → 极点
  for (let k = 4; k >= 1; k--) {
    const th = (Math.PI / 2) * (k / 5)
    pushRing(noseX0 + SADDLE_NOSE_CAP * Math.sin(th), w0, h0, 0, Math.cos(th), Math.cos(th))
  }
  // 主体：48 个截面（t：0 鼻端 → 1 尾端），顶面中轴带下压成减压槽
  for (let j = 0; j < SADDLE_RINGS; j++) {
    const t = j / (SADDLE_RINGS - 1)
    pushRing(noseX0 - t * bodyLen, splineAt(SADDLE_WIDTH, t), splineAt(SADDLE_HEIGHT, t), t, 1, 1)
  }
  // 尾端圆头：5 圈，尾面收到 0.78（横向）/ 0.38（竖向）—— 钝圆厚尾
  for (let k = 1; k <= 5; k++) {
    const zeta = k / 5
    const e = Math.pow(zeta, 1.6)
    pushRing(
      SADDLE_TAIL_X + SADDLE_TAIL_CAP * Math.cos((Math.PI / 2) * zeta),
      w1,
      h1,
      1,
      1 - 0.22 * e,
      1 - 0.62 * e,
    )
  }

  const ringCount = 4 + SADDLE_RINGS + 5
  const nosePole = ringCount * segs
  // 鼻端极点（鼻尖）：顶面/底面向一点收敛
  positions.push(SADDLE_NOSE_X, B.saddleTopY - h0, 0)
  for (let k = 0; k < segs; k++) {
    const a = k + 1 >= segs ? 0 : k + 1
    indices.push(nosePole, a, k)
  }
  // 侧面四边形（相邻两圈的对应点两两相连）
  for (let j = 0; j < ringCount - 1; j++) {
    const r0 = j * segs
    const r1 = r0 + segs
    for (let k = 0; k < segs; k++) {
      const a = k + 1 >= segs ? 0 : k + 1
      indices.push(r0 + k, r0 + a, r1 + a)
      indices.push(r0 + k, r1 + a, r1 + k)
    }
  }
  // 尾面：复制最后一圈（保留硬边）+ 面心，扇形封口
  const last = (ringCount - 1) * segs
  const tailBase = positions.length / 3
  for (let k = 0; k < segs; k++) {
    positions.push(positions[(last + k) * 3], positions[(last + k) * 3 + 1], positions[(last + k) * 3 + 2])
  }
  positions.push(SADDLE_TAIL_X, B.saddleTopY - h1, 0)
  const tailCenter = tailBase + segs
  for (let k = 0; k < segs; k++) {
    const a = k + 1 >= segs ? 0 : k + 1
    indices.push(tailBase + k, tailBase + a, tailCenter)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * 右坐轨（传 -1 镜像出左轨）：夹头咬住的水平段保持 RAIL_Y（与座管夹头装配不变），
 * 轨尾微微上抬、嵌入尾部壳底 1~2mm（不悬空）；前部向下弯、向中收拢入鼻端下方 → 前端小弯钩。
 */
function railCurve(s: number): CatmullRomCurve3 {
  const cx = SADDLE_CX
  return new CatmullRomCurve3([
    new Vector3(cx - 0.115, RAIL_Y + 0.003, RAIL_Z * s), // 轨尾：轨顶嵌入尾部壳底
    new Vector3(cx - 0.09, RAIL_Y + 0.0023, RAIL_Z * s),
    new Vector3(cx - 0.07, RAIL_Y + 0.0014, RAIL_Z * s),
    new Vector3(cx - 0.045, RAIL_Y + 0.0004, RAIL_Z * s),
    new Vector3(cx - 0.015, RAIL_Y, RAIL_Z * s), // 水平段：座管夹头咬住区（严格 y = RAIL_Y）
    new Vector3(cx + 0.02, RAIL_Y, RAIL_Z * s),
    new Vector3(cx + 0.05, RAIL_Y + 0.0006, RAIL_Z * s), // 壳底抬升，轨顶贴上壳底
    new Vector3(cx + 0.065, RAIL_Y - 0.001, 0.0195 * s), // 开始下弯收拢
    new Vector3(cx + 0.09, RAIL_Y - 0.004, 0.0155 * s),
    new Vector3(cx + 0.112, RAIL_Y - 0.009, 0.0115 * s),
    new Vector3(cx + 0.128, RAIL_Y - 0.015, 0.0095 * s),
    new Vector3(cx + 0.135, RAIL_Y - 0.0185, 0.0085 * s), // 没入鼻端下方
    new Vector3(cx + 0.1395, RAIL_Y - 0.0215, 0.0078 * s), // 前端弯钩：继续前伸下探
    new Vector3(cx + 0.1405, RAIL_Y - 0.0255, 0.0072 * s), // 钩底
    new Vector3(cx + 0.1355, RAIL_Y - 0.0272, 0.0068 * s), // 钩尖回勾
  ])
}

export function SaddleModel({ unit = false }: { unit?: boolean }) {
  // 坐垫壳：沿长度方向放样的实体（含中央减压槽与两端圆头），几何直接建在整车坐标里
  const shellGeo = useMemo(() => makeSaddleShell(), [])

  const rails = useMemo(() => [1, -1].map((s) => railCurve(s)), [])
  const offset: Vec3 = unit ? [-SADDLE_CENTER[0], -SADDLE_CENTER[1], -SADDLE_CENTER[2]] : [0, 0, 0]

  return (
    <group position={offset}>
      {/* 坐垫本体（放样实体）：顶面 y = B.saddleTopY = 1.005，顶面中轴带下压 4mm 成减压槽 */}
      <mesh geometry={shellGeo} castShadow>
        <meshStandardMaterial {...mat.saddle} />
      </mesh>

      {/* 两根坐轨（钛）：夹头咬住的水平段 + 前部向下弯入鼻端 + 前端弯钩 */}
      {rails.map((curve, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[curve, 48, 0.0035, 20, false]} />
          <meshStandardMaterial {...mat.ti} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 座管夹（楔块式：前低后高的楔形环 + 后侧水平螺栓）                     */
/* ================================================================== */

/** 环体尺寸：内孔抱住 D 形座管（前缘圆 + 后缘平直，留 ~0.6mm 间隙），壁厚 6.8mm */
const CLAMP_ARC_R_IN = 0.0136
const CLAMP_ARC_R_OUT = CLAMP_ARC_R_IN + 0.0068
const CLAMP_BACK_IN = -0.0206
const CLAMP_BACK_OUT = -0.0315 // 后壁加厚（容纳水平锁紧螺栓的螺纹孔）
/** 环体沿管轴的高度、楔面抬升量（前 0 → 后 +14mm）与倒角 */
const CLAMP_H = 0.032
const CLAMP_WEDGE = 0.014
const CLAMP_BEVEL = 0.0008
/** 楔面过渡带：顶部 10mm 内按高度加权抬升（侧壁平滑收进楔面，不出现折角） */
const CLAMP_BAND = 0.010
/** 环心高度：环体跨 y ≈ 0.714~0.757，套住立管顶端（0.72）与座管露出段起点 */
const CLAMP_Y = 0.729
/** 后壁螺栓孔（沿 −X 打入的水平螺栓）与螺栓尺寸 */
const CLAMP_BOLT_HOLE = { x: -0.0258, r: 0.0034 }
const CLAMP_BOLT_Y = 0.011 // 螺栓在后壁上的轴向高度（局部 +Y 为管轴）

/**
 * 楔形环体几何：D 形外轮廓（前缘圆 + 平背）带 D 形内孔与后壁螺栓孔，
 * 沿挤出轴挤出后把顶面顶点按前缘→后缘线性抬升 —— 顶面于是成为
 * "前低后高"的楔面（现代气动车的隐藏夹），最后转成"挤出轴 = +Y"。
 */
function clampRingGeometry(): BufferGeometry {
  const outer = dProfile(CLAMP_ARC_R_OUT, POST_ARC_CX, CLAMP_BACK_OUT)
  const inner = dProfile(CLAMP_ARC_R_IN, POST_ARC_CX, CLAMP_BACK_IN)

  const shape = new Shape()
  outer.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)))
  shape.closePath()
  // 内孔：D 形抱管孔
  const bore = new Path()
  inner.forEach(([x, y], i) => (i === 0 ? bore.moveTo(x, y) : bore.lineTo(x, y)))
  bore.closePath()
  shape.holes.push(bore)
  // 后壁螺纹孔：水平锁紧螺栓从后侧穿入
  const hole = new Path()
  hole.absarc(CLAMP_BOLT_HOLE.x, 0, CLAMP_BOLT_HOLE.r, 0, Math.PI * 2, false)
  shape.holes.push(hole)

  const geo = new ExtrudeGeometry(shape, {
    depth: CLAMP_H,
    bevelEnabled: true,
    bevelThickness: CLAMP_BEVEL,
    bevelSize: CLAMP_BEVEL,
    bevelSegments: 2,
    curveSegments: 16,
  })
  geo.translate(0, 0, -CLAMP_H / 2) // 沿挤出轴居中

  // 楔面：顶部顶点沿挤出轴抬升，抬升量自前缘向后缘线性增加（前低后高）
  const p = geo.attributes.position
  const xFront = POST_ARC_CX + CLAMP_ARC_R_OUT
  const span = xFront - CLAMP_BACK_OUT
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i)
    const w = Math.min(1, Math.max(0, (z - (CLAMP_H / 2 - CLAMP_BAND)) / CLAMP_BAND))
    if (w > 0) p.setZ(i, z + w * CLAMP_WEDGE * ((xFront - p.getX(i)) / span))
  }
  p.needsUpdate = true

  geo.rotateX(-Math.PI / 2) // 挤出轴 → +Y（局部 +X 为车头方向）
  geo.computeVertexNormals()
  return geo
}

export function SeatpostClampModel({ unit = false }: { unit?: boolean }) {
  // 环心：套在立管顶端（环体跨 y ≈ 0.714~0.757），随立管倾斜
  const groupPos: Vec3 = unit ? [0, 0, 0] : onSeatAxis(CLAMP_Y)
  const groupRot: Vec3 = unit ? [0, 0, 0] : [0, 0, seatTilt]

  const ring = useMemo(() => clampRingGeometry(), [])

  return (
    <group position={groupPos} rotation={groupRot}>
      {/* 楔形环体：D 形外轮廓 + D 形抱管内孔，顶面斜切成楔面 */}
      <mesh geometry={ring} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>

      {/* 锁紧螺栓：从后侧沿 −X 方向水平打入（局部 +X 为车头方向） */}
      <group position={[0, CLAMP_BOLT_Y, 0]}>
        {/* 螺栓杆（穿过后壁螺纹孔） */}
        <mesh position={[-0.026, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.003, 0.003, 0.0132, 32]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
        {/* 垫片（贴在后壁外面） */}
        <mesh position={[-0.0323, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0064, 0.0064, 0.0016, 32]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
        {/* 六角螺栓头（窄端朝后外侧） */}
        <mesh position={[-0.0357, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0046, 0.0052, 0.006, 6]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
      </group>
    </group>
  )
}
