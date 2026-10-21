/**
 * 车架系统零件模型：车架 Frame、前叉 Fork、碗组 Headset、中轴 BottomBracket
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把零件摆成
 * 以原点为中心、适合单独展示或爆炸展示的形态。
 *
 * 车架 / 前叉按"现代气动公路车"重写（对标 Trek Madone Gen 8 / Specialized Tarmac SL8）：
 * - 主三角 + 后三角全部用本文件的 aeroTube 放样：Kamm-tail 截面（椭圆前缘 + 平尾），
 *   下管头端最深（50mm）向五通收细，头管前后深（58→48mm）、立管上段收细；
 * - 压缩几何：上管落在立管顶端（座管夹）下方 10mm，下沉后上叉接在立管中段；
 * - 细节沿用并适配：五通壳与端环、桶轴后勾爪 + 后拨吊耳、水壶架螺丝座、内走线入口、
 *   后刹车平装座、座管夹环，另加一体式座管夹楔块与三处贴花（下管字标 / 头管圆徽 / 立管小字标）。
 *
 * 渲染精度约定：放样管每截面 23 点 × 14~28 站位（约 700~1300 三角面/根）；
 * 旋转体 32-40 段。漆面用 matP（clearcoat 清漆），金属/橡胶件用 mat；每个 mesh
 * 内联自己的材质实例，交互层才能逐个改 emissive/opacity 实现高亮与透视。
 */
import { useMemo } from 'react'
import {
  BufferGeometry,
  CatmullRomCurve3,
  Float32BufferAttribute,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  Vector3,
  type Texture,
} from 'three'
import { RoundedBox } from '@react-three/drei'
import { B, deg, type Vec3 } from '../bikeConfig'
import { decals, mat, matP } from '../materials'
import { Tube, latheGeometry } from '../geometryHelpers'

/** 头管轴线倾角（绕 Z 轴旋转量） */
const headTilt = deg(90 - B.headAngleDeg)
/** 立管轴线倾角（座管夹/楔块随立管倾斜） */
const seatTilt = deg(90 - B.seatAngleDeg)

/* ------------------------------------------------------------------ */
/* 由锚点派生的轴线与交汇点（不改 bikeConfig 里的任何坐标）              */
/* ------------------------------------------------------------------ */

/** 头管轴线单位向量（下端 → 上端；与碗组 onHeadAxis 同一条轴线） */
const HEAD_DIR: Vec3 = [-Math.sin(headTilt), Math.cos(headTilt), 0]
/** 头管鼻缘方向（头管最深处朝车头一侧；叉肩正面/头管圆徽用它） */
const HEAD_DIR_NOSE: Vec3 = [Math.cos(headTilt), Math.sin(headTilt), 0]
/** 头管长度（下端 → 上端，≈130mm） */
const HEAD_LEN = Math.hypot(B.headTop[0] - B.headBottom[0], B.headTop[1] - B.headBottom[1])

/** 头管轴线上距下端 a（米）处的点 —— 头管/上管/下管交汇点与座圈定位都用它 */
function onHeadAxisA(a: number): Vec3 {
  const [hbx, hby] = B.headBottom
  return [hbx + HEAD_DIR[0] * a, hby + HEAD_DIR[1] * a, 0]
}

/** 头管轴线上某高度 y 处对应的 x（碗组零件继续沿用） */
function onHeadAxis(y: number) {
  const [x0, y0] = B.headTop
  return x0 + (y0 - y) * Math.tan(deg(90 - B.headAngleDeg))
}

/** 立管轴线上高度 y 处的点（立管顶/座管夹/楔块共用这条轴线） */
function onSeatAxisY(y: number): Vec3 {
  const [x0, y0] = B.seatTop
  return [x0 - (y - y0) * Math.tan(seatTilt), y, 0]
}

/* ------------------------------------------------------------------ */
/* 通用小工具                                                          */
/* ------------------------------------------------------------------ */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
/** smoothstep：两端平滑的 0→1 过渡（放样锥度、弯折贴花都用它） */
const smoothstep01 = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/** 闭合旋转体剖面：内径 → 外径 → 上端 → 内孔（首尾重合，法线朝外） */
function ringProfile(inner: number, outer: number, h: number): [number, number][] {
  return [
    [inner, -h / 2],
    [outer, -h / 2],
    [outer, h / 2],
    [inner, h / 2],
    [inner, -h / 2],
  ]
}

/** 带台阶的闭合剖面（轴承座/轴承杯）：外缘分两级，中段留出台阶面 */
function stepRingProfile(
  inner: number,
  outer: number,
  h: number,
  stepH = 0.4,
  stepD = 0.32,
): [number, number][] {
  const y0 = -h / 2
  const y1 = -h / 2 + h * stepH
  const midR = outer - (outer - inner) * stepD
  return [
    [inner, y0],
    [outer, y0],
    [outer, y1],
    [midR, y1],
    [midR, h / 2],
    [inner, h / 2],
    [inner, y0],
  ]
}

/**
 * 车架平面内管件"上侧/前侧"表面上的定位：轴向参数 t（0=起点）、沿法线外偏 off。
 * 返回表面点（含管件自身 z）与"把局部 +Y 转到该法线"所需的绕 Z 旋转角。
 */
function onTubeFace(a: Vec3, b: Vec3, t: number, off: number) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = dy / len
  const ny = -dx / len
  return {
    p: [a[0] + dx * t + nx * off, a[1] + dy * t + ny * off, a[2]] as Vec3,
    rotZ: Math.atan2(-nx, ny),
  }
}

/** 六角螺栓头（局部 +Y 为螺栓轴向，可选带垫圈） */
function HexBolt({
  position,
  rotation,
  r = 0.0042,
  h = 0.006,
  washer = false,
}: {
  position: Vec3
  rotation?: Vec3
  r?: number
  h?: number
  washer?: boolean
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, h, 6]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {washer && (
        <mesh position={[0, -h / 2 - 0.0012, 0]}>
          <cylinderGeometry args={[r * 1.5, r * 1.5, 0.0018, 20]} />
          <meshStandardMaterial {...mat.alu} />
        </mesh>
      )}
    </group>
  )
}

/** 水壶架螺丝座：外六角座 + 内凹垫圈 + 螺栓孔（局部 +Y 为管面法线） */
function BottleBoss({ p, rotZ }: { p: Vec3; rotZ: number }) {
  return (
    <group position={p} rotation={[0, 0, rotZ]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.0048, 0.0048, 0.007, 6]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      <mesh position={[0, 0.0036, 0]}>
        <cylinderGeometry args={[0.0034, 0.0034, 0.0022, 20]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      <mesh position={[0, 0.0032, 0]}>
        <cylinderGeometry args={[0.0021, 0.0021, 0.0034, 16]} />
        <meshStandardMaterial {...mat.soft} />
      </mesh>
    </group>
  )
}

/** 内走线入口：深色密封环 + 内孔（局部 +Y 为孔的法线方向） */
function CablePort({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={PORT_RING}>
        <meshStandardMaterial {...mat.housing} />
      </mesh>
      <mesh position={[0, -0.0003, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.0022, 16]} />
        <meshStandardMaterial {...mat.soft} />
      </mesh>
    </group>
  )
}

/**
 * 密封轴承：外圈（铝）+ 内圈（钢）+ 中间深色密封圈 —— 碗组/中轴共用。
 * 局部 +Y 为轴承轴向，position/rotation 直接摆到装配位置。
 */
function Bearing({
  outer,
  inner,
  h,
  position,
  rotation,
}: {
  outer: number
  inner: number
  h: number
  position?: Vec3
  rotation?: Vec3
}) {
  const geo = useMemo(() => {
    const mid = (outer + inner) / 2
    const gap = Math.min(0.0008, (outer - inner) * 0.13)
    return {
      outer: latheGeometry(ringProfile(mid + gap, outer, h), 40),
      inner: latheGeometry(ringProfile(inner, mid - gap, h), 40),
      seal: latheGeometry(ringProfile(mid - gap * 2.4, mid + gap * 2.4, h * 0.5), 32),
    }
  }, [outer, inner, h])

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo.outer} castShadow>
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      <mesh geometry={geo.inner} castShadow>
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      <mesh geometry={geo.seal}>
        <meshStandardMaterial {...mat.soft} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* 共用固定几何（模块级创建一次，多个 mesh 共享）                        */
/* ------------------------------------------------------------------ */

/** 内走线孔密封环剖面 */
const PORT_RING = latheGeometry(
  [
    [0.0032, -0.0016],
    [0.0048, -0.0016],
    [0.0048, 0.0004],
    [0.0042, 0.0016],
    [0.0032, 0.0016],
    [0.0032, -0.0016],
  ],
  32,
)

/* ================================================================== */
/* 气动管件放样器（aeroTube）                                           */
/* ================================================================== */

/** Kamm 平尾保留的弦长比例（1 = 完整椭圆尾，用于叉腿这类"扁椭圆"截面） */
const KAMM_TAIL_KEEP = 0.75
/** 平尾外凸量（归一化到半深度）：尾缘中点比切平面再外凸这么多，读作"圆背平尾" */
const KAMM_TAIL_BULGE = 0.1
/** 平尾最深处（归一化，= 0.5 + bulge）：贴面件（水壶架螺丝座/走线口）据此定位 */
const KAMM_TAIL_V = 0.5 + KAMM_TAIL_BULGE

/**
 * 归一化截面点表（u = 宽/2、v = 深/2，均在 [-1,1]）：
 * 前缘为整椭圆弧（半径 w/2 × d/2 的椭圆，占弦长前 ~75%），后缘切平并略微外凸。
 * 点序逆时针（从尾部右角经鼻尖回到尾部左角，再沿平尾回到起点），
 * 前缘密（φ 均匀 → 椭圆鼻部自然加密）、后缘疏。
 */
function kammSection(keep: number): [number, number][] {
  const pts: [number, number][] = []
  if (keep >= 0.999) {
    // 完整椭圆（叉腿等"扁椭圆"截面）：24 点，从尾缘起逆时针
    // （角度递减 → 与 Kamm 截面同为逆时针；若反向，放样侧面外法线朝内、叉腿会被
    //   背面剔除成"内翻壳"，故此处必须与 kammSection 的绕向一致）
    const n = 24
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (i / n) * Math.PI * 2
      pts.push([Math.sin(a), Math.cos(a)])
    }
    return pts
  }
  const vTail = 1 - 2 * keep // keep=0.75 → 尾部切平面在 v = -0.5
  const phiEnd = Math.acos(vTail) // 120°
  const uTail = Math.sin(phiEnd) // 0.866
  // 1) 前缘椭圆弧：φ 从 +φ_end 递减到 −φ_end（尾右角 → 鼻尖 → 尾左角）
  const noseN = 19
  for (let i = 0; i < noseN; i++) {
    const phi = phiEnd - (2 * phiEnd * i) / (noseN - 1)
    pts.push([Math.sin(phi), Math.cos(phi)])
  }
  // 2) 平尾：从左角沿平尾回到右角（只加内点，尾缘中点略微外凸）
  const tailN = 5
  for (let i = 1; i < tailN; i++) {
    const s = i / tailN
    const u = -uTail + 2 * uTail * s
    const v = vTail - KAMM_TAIL_BULGE * (1 - (u / uTail) ** 2)
    pts.push([u, v])
  }
  return pts
}

/** 放样管在轴向参数 t 处的截面尺寸（供水壶架螺丝座/走线口等贴面件定位复用） */
function aeroSizeAt(
  t: number,
  s1: [number, number],
  s2: [number, number],
  taper: [number, number] = [0, 1],
): [number, number] {
  const k = smoothstep01(taper[1] === taper[0] ? 1 : (t - taper[0]) / (taper[1] - taper[0]))
  return [s1[0] + (s2[0] - s1[0]) * k, s1[1] + (s2[1] - s1[1]) * k]
}

type AeroTubeOpts = {
  /** 起点端截面：w = 车宽方向（Z）、d = 前后方向深度 */
  w1: number
  d1: number
  /** 终点端截面（省略则与起点相同） */
  w2?: number
  d2?: number
  /** 沿长度采样站位数 */
  stations?: number
  /** 平尾保留弦长比例（1 = 完整椭圆） */
  tail?: number
  /** w/d 插值窗口 [t0,t1]：窗口外保持端点值（做"下段等粗、上段收细"的管型） */
  taper?: [number, number]
} & (
  | {
      from: Vec3
      to: Vec3
      curve?: undefined
    }
  | {
      /** 曲线中心线（叉腿这类弯管用；给定时 from/to 忽略） */
      curve: Vec3[]
      from?: undefined
      to?: undefined
    }
)

/**
 * 气动管放样：沿中心线采样 N 个站位，每站位放一圈 Kamm-tail 截面并手工建 BufferGeometry。
 * 每个站位的局部坐标架：e1 = 车宽方向（世界 Z 投影到与管轴垂直），
 * e2 = 前后方向（e1 × e2 = 管轴，右手系）；鼻锥统一朝车头方向（+X 分量），
 * e2 指向车尾时把截面镜像并反转点序（保持逆时针 → 外法线）。两端封口避免破面。
 */
function aeroTube(opts: AeroTubeOpts): BufferGeometry {
  const { w1, d1, stations = 24 } = opts
  const w2 = opts.w2 ?? w1
  const d2 = opts.d2 ?? d1
  const tail = opts.tail ?? KAMM_TAIL_KEEP
  const [ta, tb] = opts.taper ?? [0, 1]
  const ctrl = opts.curve
    ? opts.curve.map((p) => new Vector3(...p))
    : [new Vector3(...opts.from), new Vector3(...opts.to)]
  const path = new CatmullRomCurve3(ctrl)
  const base = kammSection(tail)
  const n = base.length
  const positions: number[] = []
  const indices: number[] = []
  const centers: Vector3[] = []

  for (let i = 0; i < stations; i++) {
    const t = stations === 1 ? 0 : i / (stations - 1)
    const center = path.getPoint(t)
    const tangent = path.getTangent(t).normalize()
    const e1 = new Vector3(0, 0, 1).addScaledVector(tangent, -tangent.z).normalize()
    const e2 = new Vector3().crossVectors(tangent, e1).normalize()
    const pts = e2.x < 0 ? base.map(([u, v]) => [u, -v] as [number, number]).reverse() : base
    const k = smoothstep01(tb === ta ? 1 : (t - ta) / (tb - ta))
    const hw = (w1 + (w2 - w1) * k) / 2
    const hd = (d1 + (d2 - d1) * k) / 2
    centers.push(center)
    for (const [pu, pv] of pts) {
      positions.push(
        center.x + e1.x * pu * hw + e2.x * pv * hd,
        center.y + e1.y * pu * hw + e2.y * pv * hd,
        center.z + e1.z * pu * hw + e2.z * pv * hd,
      )
    }
  }

  // 侧面四边形（A, A1, B1 / A, B1, B —— 逆时针点序下外法线朝外）
  for (let i = 0; i < stations - 1; i++) {
    const a = i * n
    const b = a + n
    for (let j = 0; j < n; j++) {
      const j2 = (j + 1) % n
      indices.push(a + j, a + j2, b + j2)
      indices.push(a + j, b + j2, b + j)
    }
  }
  // 两端封口（扇形端盖，顶端/底端都收在其它管件内部）
  const pushCenter = (p: Vector3) => {
    positions.push(p.x, p.y, p.z)
    return positions.length / 3 - 1
  }
  const capFrom = pushCenter(centers[0])
  for (let j = 0; j < n; j++) indices.push(capFrom, (j + 1) % n, j)
  const last = (stations - 1) * n
  const capTo = pushCenter(centers[stations - 1])
  for (let j = 0; j < n; j++) indices.push(capTo, last + j, last + ((j + 1) % n))

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/* ================================================================== */
/* 车架几何：主三角 + 后三角的交汇点与截面尺寸                          */
/* ================================================================== */

const TUBE = B.tube
const [BBX, BBY] = B.bb
const [RHX, RHY] = B.rearHub

/** 上管与立管交汇点：立管顶端（座管夹位置）下方 10mm —— 压缩几何的交汇点 */
const TT_SEAT: Vec3 = onSeatAxisY(0.71)
/** 上管与头管交汇点：头管轴线上距上端 30mm（上管下缘落在头管上端之下） */
const TT_HEAD: Vec3 = onHeadAxisA(HEAD_LEN - 0.03)
/** 下管与头管交汇点：头管轴线上距下端 35mm（下管下缘正好落在头管底部） */
const DT_HEAD: Vec3 = onHeadAxisA(0.035)
/** 后勾爪（桶轴座）中心平面 z：与后花鼓端面/桶轴端面配合 */
const DROPOUT_Z = 0.05
/** 后勾爪（桶轴座）块中心 */
const DROP_C: Vec3 = [RHX - 0.002, RHY + 0.001, 0]
/** 后下叉在勾爪处收进的端点（端面埋在勾爪块内部） */
const CS_END: Vec3 = [RHX + 0.014, RHY + 0.0055, 0]
/** 后上叉在勾爪处收进的端点 */
const SS_END: Vec3 = [RHX + 0.011, RHY + 0.007, 0]

/** 放样锥度窗口：两端留出饱满的交汇段，中段完成过渡 */
const DT_TAPER: [number, number] = [0.12, 0.9]
const TT_TAPER: [number, number] = [0.12, 0.88]
/** 立管：seatStayTop（t≈0.863）以上开始收细 */
const ST_TAPER: [number, number] = [0.86, 1]
const CS_TAPER: [number, number] = [0.16, 0.92]

/** 上下管的收细端尺寸（上管向头管略收，下管只收深度） */
const TT_HEAD_W = 0.027
const TT_HEAD_D = 0.024

/** 水壶架螺丝座：下管贴在 Kamm 平尾面（朝上后方）、立管贴在鼻缘（朝前上方） */
const DT_BOSS = [0.3, 0.44].map((t) => {
  const [, d] = aeroSizeAt(
    t,
    [TUBE.downTube.w, TUBE.downTube.dHead],
    [TUBE.downTube.w, TUBE.downTube.dBb],
    DT_TAPER,
  )
  return onTubeFace(DT_HEAD, B.bb, t, KAMM_TAIL_V * (d / 2) + 0.0015)
})
const ST_BOSS = [0.3, 0.435].map((t) => {
  const [, d] = aeroSizeAt(
    t,
    [TUBE.seatTube.w, TUBE.seatTube.d],
    [TUBE.seatTube.wTop, TUBE.seatTube.dTop],
    ST_TAPER,
  )
  return onTubeFace(B.bb, B.seatTop, t, d / 2 - 0.0012)
})

/** 内走线入口：头管两侧（碗组下方）+ 下管平尾面近头管端 */
const HEAD_PORTS: Vec3[] = [1, -1].map((s) => [onHeadAxis(0.775), 0.775, 0.0196 * s])
const DT_PORT = (() => {
  const t = 0.135
  const [, d] = aeroSizeAt(
    t,
    [TUBE.downTube.w, TUBE.downTube.dHead],
    [TUBE.downTube.w, TUBE.downTube.dBb],
    DT_TAPER,
  )
  return onTubeFace(DT_HEAD, B.bb, t, KAMM_TAIL_V * (d / 2) + 0.001)
})()

/* ------------------------------------------------------------------ */
/* 贴花面片（下管字标 / 头管圆徽 / 立管小字标）                          */
/* ------------------------------------------------------------------ */

/**
 * 贴花面片：给定面心、面法线（局部 +Z）与"字向上"方向（局部 +Y）建正交基，
 * 面片离管面 0.8mm 起见、并开 polygonOffset 防 z-fighting。
 * bend 给定时按椭圆鼻缘把面片弯折贴合（头管圆徽这种贴在深鼻面上的大面片用）。
 */
function Decal({
  center,
  normal,
  up,
  size,
  texture,
  bend,
}: {
  center: Vec3
  normal: Vec3
  up: Vec3
  size: [number, number]
  texture: Texture
  bend?: { w: number; d: number }
}) {
  const key = [...center, ...normal, ...up, ...size, bend ? bend.w + bend.d : 0].join(',')
  const { quat, geo } = useMemo(() => {
    const Z = new Vector3(...normal).normalize()
    const Y = new Vector3(...up).normalize()
    const X = new Vector3().crossVectors(Y, Z).normalize()
    Y.crossVectors(Z, X).normalize()
    const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(X, Y, Z))
    const seg = bend ? 12 : 1
    const g = new PlaneGeometry(size[0], size[1], seg, seg)
    if (bend) {
      // 按椭圆鼻缘把顶点沿局部 Z 收回：u = 横向归一化坐标，v = sqrt(1-u²)
      const pos = g.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const u = Math.min(1, Math.abs(pos.getX(i)) / (bend.w / 2))
        const v = Math.sqrt(Math.max(0.02, 1 - u * u))
        pos.setZ(i, (v - 1) * (bend.d / 2))
      }
      pos.needsUpdate = true
      g.computeVertexNormals()
    }
    return { quat: q, geo: g }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (
    <mesh position={center} quaternion={quat} geometry={geo} castShadow={false}>
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.35}
        metalness={0.1}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  )
}

/**
 * 侧贴花：贴在管件 ±Z 侧面（面片中心的 z = 管半宽，由调用方传"管面点"）。
 * 字向 = 管轴方向 × facing —— 两侧各自从自己那侧读作左→右（真实车贴的镜像做法）；
 * 字向上 = Z × 字向，即垂直管轴、指向管件"上方"，贴花随管件倾角一起倾斜。
 */
function SideDecal({
  facePoint,
  textDir,
  facing,
  size,
  texture,
}: {
  facePoint: Vec3
  textDir: Vec3
  facing: 1 | -1
  size: [number, number]
  texture: Texture
}) {
  const text = new Vector3(...textDir).multiplyScalar(facing)
  const up: Vec3 = [-text.y, text.x, 0]
  const normal: Vec3 = [0, 0, facing]
  return (
    <Decal
      center={[facePoint[0], facePoint[1], facePoint[2] + facing * 0.0008]}
      normal={normal}
      up={up}
      size={size}
      texture={texture}
    />
  )
}

/* ================================================================== */
/* 车架                                                                */
/* ================================================================== */

/** 五通壳体两端的轴承杯座台阶环（壳体外径 23 → 外缘 25.5） */
const BB_SEAT = latheGeometry(stepRingProfile(0.0232, 0.0255, 0.014), 40)

export function FrameModel({ unit = false }: { unit?: boolean }) {
  const g = useMemo(() => {
    // 头管上下端的碗组轴承座：短放样"台阶套"（比头管截面大 ~9mm，沿用端环思路、贴合气动截面）
    const headSeatTop = aeroTube({
      from: onHeadAxisA(HEAD_LEN - 0.014),
      to: onHeadAxisA(HEAD_LEN),
      w1: TUBE.headTube.w + 0.009,
      d1: TUBE.headTube.dTop + 0.0095,
      w2: TUBE.headTube.w + 0.008,
      d2: TUBE.headTube.dTop + 0.008,
      stations: 3,
    })
    const headSeatBottom = aeroTube({
      from: onHeadAxisA(-0.007),
      to: onHeadAxisA(0.01),
      w1: TUBE.headTube.w + 0.009,
      d1: TUBE.headTube.dBottom + 0.009,
      w2: TUBE.headTube.w + 0.009,
      d2: TUBE.headTube.dBottom + 0.0088,
      stations: 3,
    })
    return {
      // 上管（斜上管压缩几何）：立管交汇点 → 头管上端下方
      topTube: aeroTube({
        from: TT_SEAT,
        to: TT_HEAD,
        w1: TUBE.topTube.w,
        d1: TUBE.topTube.d,
        w2: TT_HEAD_W,
        d2: TT_HEAD_D,
        stations: 20,
        taper: TT_TAPER,
      }),
      // 下管：头管端最深（50mm）向五通收细（38mm）
      downTube: aeroTube({
        from: DT_HEAD,
        to: B.bb,
        w1: TUBE.downTube.w,
        d1: TUBE.downTube.dHead,
        w2: TUBE.downTube.w,
        d2: TUBE.downTube.dBb,
        stations: 28,
        taper: DT_TAPER,
      }),
      // 立管：下段等粗（42mm 深），seatStayTop 以上收细到 26×36
      seatTube: aeroTube({
        from: B.bb,
        to: B.seatTop,
        w1: TUBE.seatTube.w,
        d1: TUBE.seatTube.d,
        w2: TUBE.seatTube.wTop,
        d2: TUBE.seatTube.dTop,
        stations: 26,
        taper: ST_TAPER,
      }),
      // 头管：前后深（下端 58 → 上端 48），车宽方向 38
      headTube: aeroTube({
        from: onHeadAxisA(0),
        to: onHeadAxisA(HEAD_LEN),
        w1: TUBE.headTube.w,
        d1: TUBE.headTube.dBottom,
        w2: TUBE.headTube.w,
        d2: TUBE.headTube.dTop,
        stations: 22,
      }),
      headSeatTop,
      headSeatBottom,
      // 后下叉（一对）：从五通壳两侧伸向后勾爪，扁平气动截面
      chainStays: [1, -1].map((s) =>
        aeroTube({
          from: [BBX, BBY, 0.022 * s],
          to: [CS_END[0], CS_END[1], DROPOUT_Z * s],
          w1: TUBE.chainStay.w,
          d1: TUBE.chainStay.d,
          w2: 0.013,
          d2: 0.02,
          stations: 16,
          taper: CS_TAPER,
        }),
      ),
      // 下沉后上叉（一对）：从立管中段（seatStayTop）连到后勾爪
      seatStays: [1, -1].map((s) =>
        aeroTube({
          from: [B.seatStayTop[0], B.seatStayTop[1], 0.008 * s],
          to: [SS_END[0], SS_END[1], DROPOUT_Z * s],
          w1: TUBE.seatStay.w,
          d1: TUBE.seatStay.d,
          stations: 14,
        }),
      ),
    }
  }, [])

  /* 贴花定位 —— 下管两侧字标：贴面中心取管中段，字向 = 五通 → 头管（沿管轴向上） */
  const dtTextDir: Vec3 = (() => {
    const dx = DT_HEAD[0] - BBX
    const dy = DT_HEAD[1] - BBY
    const l = Math.hypot(dx, dy)
    return [dx / l, dy / l, 0]
  })()
  const dtDecalP: Vec3 = [
    (DT_HEAD[0] + BBX) / 2,
    (DT_HEAD[1] + BBY) / 2,
    aeroSizeAt(0.5, [TUBE.downTube.w, 0], [TUBE.downTube.w, 0])[0] / 2,
  ]
  /* 立管上段小字标：贴面中心在轴向 t = 0.92 处，字向 = 五通 → 立管顶 */
  const stTextDir: Vec3 = (() => {
    const dx = B.seatTop[0] - BBX
    const dy = B.seatTop[1] - BBY
    const l = Math.hypot(dx, dy)
    return [dx / l, dy / l, 0]
  })()
  const stT = 0.92
  const stDecalP: Vec3 = [
    BBX + (B.seatTop[0] - BBX) * stT,
    BBY + (B.seatTop[1] - BBY) * stT,
    aeroSizeAt(
      stT,
      [TUBE.seatTube.w, 0],
      [TUBE.seatTube.wTop, 0],
      ST_TAPER,
    )[0] / 2,
  ]
  /* 头管正面圆徽：贴在上、下管交汇点之间的鼻缘上（面片按鼻缘椭圆弯折贴合） */
  const badgeA = 0.07
  const badgeHeadD = (() => {
    // 头管截面深度沿轴线由下端的 dBottom 线性（smoothstep）收到顶端的 dTop
    const k = smoothstep01(badgeA / HEAD_LEN)
    return TUBE.headTube.dBottom + (TUBE.headTube.dTop - TUBE.headTube.dBottom) * k
  })()
  const badgeCenter: Vec3 = (() => {
    const P = onHeadAxisA(badgeA)
    const off = badgeHeadD / 2 + 0.0008
    return [P[0] + HEAD_DIR_NOSE[0] * off, P[1] + HEAD_DIR_NOSE[1] * off, 0]
  })()
  /* 座管夹环 / 一体式楔块定位（都在立管轴线上，随立管倾角摆放） */
  const collarC: Vec3 = onSeatAxisY(0.7285)
  const wedgeP: Vec3 = (() => {
    const y = 0.704
    const P = onSeatAxisY(y)
    const k = smoothstep01(((y - BBY) / (B.seatTop[1] - BBY) - ST_TAPER[0]) / (ST_TAPER[1] - ST_TAPER[0]))
    const d = TUBE.seatTube.d + (TUBE.seatTube.dTop - TUBE.seatTube.d) * k
    // 立管平尾面外法线（朝后下方）；楔块中心再往外偏 2mm 咬住管面
    const off = KAMM_TAIL_V * (d / 2) + 0.002
    return [P[0] - Math.cos(seatTilt) * off, P[1] - Math.sin(seatTilt) * off, 0]
  })()

  return (
    <group>
      {/* 主三角 */}
      {/* 上管：斜上管压缩几何，从立管交汇点升向头管上端 */}
      <mesh geometry={g.topTube} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      {/* 下管：头端最深、向五通收细的气动管 */}
      <mesh geometry={g.downTube} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      {/* 立管：下段等粗、上段收细（压缩几何 + 气动截面） */}
      <mesh geometry={g.seatTube} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      {/* 头管：深截面（前后 58→48） */}
      <mesh geometry={g.headTube} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      {/* 头管上下端的碗组轴承座套（贴合气动截面的台阶套） */}
      <mesh geometry={g.headSeatTop} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      <mesh geometry={g.headSeatBottom} castShadow>
        <meshPhysicalMaterial {...matP.paintMarine} />
      </mesh>
      {/* 五通壳体 + 两端轴承杯座台阶环 */}
      <mesh position={[BBX, BBY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[B.bbShell.r, B.bbShell.r, B.bbShell.w, 40, 1, true]} />
        <meshPhysicalMaterial {...matP.paintMarine} side={2} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh
          key={`bbs${s}`}
          geometry={BB_SEAT}
          position={[BBX, BBY, 0.027 * s]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <meshStandardMaterial {...mat.alu} />
        </mesh>
      ))}
      {/* 后下叉（一对）：五通壳两侧 → 后勾爪 */}
      {g.chainStays.map((geo, i) => (
        <mesh key={`cs${i}`} geometry={geo} castShadow>
          <meshPhysicalMaterial {...matP.paintMarine} />
        </mesh>
      ))}
      {/* 下沉后上叉（一对）：立管中段 → 后勾爪 */}
      {g.seatStays.map((geo, i) => (
        <mesh key={`ss${i}`} geometry={geo} castShadow>
          <meshPhysicalMaterial {...matP.paintMarine} />
        </mesh>
      ))}
      {/* 后勾爪（桶轴座）：加工块 + 桶轴螺纹套 + 深色轴孔 */}
      {[1, -1].map((s) => (
        <group key={`do${s}`}>
          <RoundedBox
            args={[0.048, 0.034, 0.014]}
            radius={0.0025}
            smoothness={4}
            position={[DROP_C[0], DROP_C[1], DROPOUT_Z * s]}
            castShadow
          >
            <meshStandardMaterial {...mat.aluBlack} />
          </RoundedBox>
          <group
            position={[RHX, RHY, DROPOUT_Z * s]}
            rotation={[(Math.PI / 2) * s, 0, 0]}
          >
            <mesh castShadow>
              <cylinderGeometry args={[0.0098, 0.0098, 0.02, 32]} />
              <meshStandardMaterial {...mat.alu} />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.0054, 0.0054, 0.021, 24]} />
              <meshStandardMaterial {...mat.soft} />
            </mesh>
          </group>
        </group>
      ))}
      {/* 后拨吊耳（传动侧，与后拨上挂架螺栓相接） */}
      <RoundedBox
        args={[0.024, 0.038, 0.019]}
        radius={0.002}
        smoothness={4}
        position={[-0.427, 0.318, 0.036]}
        rotation={[0, 0, deg(-10)]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 水壶架螺丝座：下管平尾面一对 + 立管鼻缘一对 */}
      {[...DT_BOSS, ...ST_BOSS].map((b, i) => (
        <BottleBoss key={`bb${i}`} p={b.p} rotZ={b.rotZ} />
      ))}
      {/* 内走线入口：头管两侧 + 下管平尾面近头管端 */}
      {HEAD_PORTS.map((p, i) => (
        <CablePort key={`hp${i}`} position={p} rotation={[(Math.PI / 2) * (i === 0 ? 1 : -1), 0, 0]} />
      ))}
      <CablePort position={DT_PORT.p} rotation={[0, 0, DT_PORT.rotZ]} />
      {/* 座管夹环（环 + 开缝 + 夹耳 + 横向锁紧螺栓），环套在座管上、盖住立管顶端 */}
      <group position={collarC} rotation={[0, 0, seatTilt]}>
        <mesh rotation={[0, 0, 0]} scale={[0.0215, 1, 0.0175]} castShadow>
          <cylinderGeometry args={[1, 1, 0.02, 44, 1, true]} />
          <meshPhysicalMaterial {...matP.paintMarine} side={2} />
        </mesh>
        {/* 后侧开缝 */}
        <mesh position={[-0.0195, 0, 0]}>
          <boxGeometry args={[0.008, 0.024, 0.0022]} />
          <meshStandardMaterial {...mat.soft} />
        </mesh>
        {/* 开缝两侧夹耳 */}
        {[1, -1].map((s) => (
          <RoundedBox
            key={`ear${s}`}
            args={[0.007, 0.022, 0.006]}
            radius={0.0012}
            smoothness={4}
            position={[-0.0205, 0, 0.0055 * s]}
            castShadow
          >
            <meshStandardMaterial {...mat.aluBlack} />
          </RoundedBox>
        ))}
        {/* 横向锁紧螺栓（六角头 + 螺母） */}
        <mesh position={[-0.0205, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0028, 0.036, 16]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
        {[1, -1].map((s) => (
          <mesh
            key={`hex${s}`}
            position={[-0.0205, 0, 0.0205 * s]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={s > 0 ? [0.0048, 0.0048, 0.006, 6] : [0.0055, 0.0055, 0.005, 6]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
        ))}
      </group>
      {/* 一体式座管夹楔块（seatTop 后侧的小楔块 + 隐藏螺栓感） */}
      <group position={wedgeP} rotation={[0, 0, seatTilt]}>
        <RoundedBox args={[0.014, 0.019, 0.024]} radius={0.0018} smoothness={4} castShadow>
          <meshPhysicalMaterial {...matP.paintMarine} />
        </RoundedBox>
        {/* 楔块后端的隐藏螺栓头（内六角感，微凸 1.5mm） */}
        <mesh position={[-0.006, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0042, 0.0042, 0.005, 6]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
      </group>
      {/* 贴花：下管两侧字标 / 头管正面圆徽 / 立管小字标 */}
      {[1, -1].map((s) => (
        <SideDecal
          key={`dtDecal${s}`}
          facePoint={dtDecalP}
          textDir={dtTextDir}
          facing={s > 0 ? 1 : -1}
          size={[0.092, 0.023]}
          texture={decals.brand}
        />
      ))}
      <Decal
        center={badgeCenter}
        normal={HEAD_DIR_NOSE}
        up={HEAD_DIR}
        size={[0.03, 0.03]}
        texture={decals.badge}
        bend={{ w: TUBE.headTube.w, d: badgeHeadD * 0.9 }}
      />
      {[1, -1].map((s) => (
        <SideDecal
          key={`stDecal${s}`}
          facePoint={stDecalP}
          textDir={stTextDir}
          facing={s > 0 ? 1 : -1}
          size={[0.048, 0.009]}
          texture={decals.small}
        />
      ))}
      {!unit && (
        <>
          {/* 后刹车平装座（后上叉内侧）：倒角盒 + 两颗六角螺栓头 */}
          <group position={[-0.2675, 0.53, -0.014]} rotation={[0, 0, deg(35)]}>
            <RoundedBox args={[0.03, 0.042, 0.007]} radius={0.002} smoothness={4} castShadow>
              <meshPhysicalMaterial {...matP.paintMarine} />
            </RoundedBox>
            {[1, -1].map((s) => (
              <mesh
                key={s}
                position={[0.0135 * s, 0, -0.006]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.0042, 0.0042, 0.005, 6]} />
                <meshStandardMaterial {...mat.steel} />
              </mesh>
            ))}
          </group>
        </>
      )}
    </group>
  )
}

/* ================================================================== */
/* 前叉                                                                */
/* ================================================================== */

/** 叉肩下段：加大的旋转体（最宽处半径 34mm，绕车宽方向压扁成"宽而不厚"的气动叉肩） */
const CROWN_LOWER = latheGeometry(
  [
    [0.016, -0.032],
    [0.0225, -0.032],
    [0.0305, -0.0305],
    [0.034, -0.022],
    [0.0335, -0.012],
    [0.03, -0.002],
    [0.0258, 0.007],
    [0.0204, 0.009],
    [0.016, 0.009],
    [0.016, -0.032],
  ],
  40,
)
/** 叉肩上段：从叉肩顶面收向碗组下座圈（保持回转面，才能和下座圈贴合） */
const CROWN_UPPER = latheGeometry(
  [
    [0.0148, 0.004],
    [0.0178, 0.015],
    [0.0205, 0.026],
    [0.0205, 0.029],
    [0.0148, 0.029],
    [0.0148, 0.004],
  ],
  40,
)
/** 下座圈（碗组下轴承的配合圈，视觉上归前叉） */
const FORK_RACE = latheGeometry(stepRingProfile(0.0143, 0.0218, 0.0085, 0.45, 0.3), 40)

/** 叉腿（左右各一条镜像曲线：先向外、再向前下弯到前轴，不用负缩放） */
const bladeCurve = (s: number): Vec3[] => {
  const [cx, cy] = B.fork.crown
  const [fx, fy] = B.frontHub
  return [
    [cx + 0.004, cy - 0.018, 0.026 * s],
    [cx + 0.026, cy - 0.135, 0.036 * s],
    [cx + 0.088, cy - 0.268, 0.045 * s],
    [fx, fy + 0.004, 0.05 * s],
  ]
}

export function ForkModel({ unit = false }: { unit?: boolean }) {
  const crown = B.fork.crown
  const [fx, fy] = B.frontHub

  /** 两条叉腿：扁椭圆截面的气动放样（宽度 12.5→10mm、深度 19→14mm） */
  const blades = useMemo(
    () =>
      [1, -1].map((s) =>
        aeroTube({
          curve: bladeCurve(s),
          w1: B.fork.bladeW,
          d1: B.fork.bladeD,
          w2: 0.01,
          d2: 0.014,
          stations: 18,
          tail: 1,
          taper: [0.08, 0.95],
        }),
      ),
    [],
  )

  return (
    <group>
      {/* 舵管（穿过头管，上端超出碗组供把立夹持） */}
      <Tube
        from={[onHeadAxis(0.655), 0.655, 0]}
        to={[onHeadAxis(0.868), 0.868, 0]}
        r1={B.fork.steererR}
        r2={B.fork.steererR}
        segments={40}
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </Tube>
      {/* 叉肩（下段气动叉肩 + 上段收向座圈的锥体） */}
      <mesh
        geometry={CROWN_LOWER}
        position={[crown[0], crown[1], 0]}
        rotation={[0, 0, headTilt]}
        scale={[0.79, 1, 1]}
        castShadow
      >
        <meshPhysicalMaterial {...matP.paintMarineDark} />
      </mesh>
      <mesh geometry={CROWN_UPPER} position={[crown[0], crown[1], 0]} rotation={[0, 0, headTilt]} castShadow>
        <meshPhysicalMaterial {...matP.paintMarineDark} />
      </mesh>
      {/* 下座圈（碗组的一部分，视觉上归前叉） */}
      <mesh
        geometry={FORK_RACE}
        position={[onHeadAxis(0.688), 0.688, 0]}
        rotation={[0, 0, headTilt]}
        castShadow
      >
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 两条叉腿（扁椭圆气动截面，左右镜像曲线） */}
      {blades.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshPhysicalMaterial {...matP.paintMarineDark} />
        </mesh>
      ))}
      {/* 左右勾爪 + 桶轴孔（外圈铝套 + 深色内孔/螺纹套） */}
      {[1, -1].map((s) => (
        <group key={`d${s}`} position={[fx, fy, 0.05 * s]} rotation={[(Math.PI / 2) * s, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.0115, 0.0115, 0.014, 32]} />
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
          <mesh position={[0, 0.0015, 0]}>
            <cylinderGeometry args={[0.0072, 0.0072, 0.012, 28]} />
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          <mesh position={[0, 0.002, 0]}>
            <cylinderGeometry args={[0.0062, 0.0062, 0.0095, 24]} />
            <meshStandardMaterial {...mat.soft} />
          </mesh>
        </group>
      ))}
      {/* 平装刹车座（左侧）：倒角盒 + 两颗六角螺栓头（±13.5mm 标准间距） */}
      <group position={[fx - 0.045, fy + 0.13, -0.052]} rotation={[0, 0, deg(20)]}>
        <RoundedBox args={[0.034, 0.05, 0.008]} radius={0.002} smoothness={4} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </RoundedBox>
        {[1, -1].map((s) => (
          <mesh key={s} position={[0.0135 * s, 0, -0.0055]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.0042, 0.0042, 0.005, 6]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
        ))}
      </group>
      {unit && (
        <mesh position={[fx, fy, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0055, 0.0055, 0.14, 20]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
      )}
    </group>
  )
}

/* ================================================================== */
/* 碗组（单独预览时爆炸为一个垂直序列）                                 */
/* ================================================================== */

/** 防尘盖：带倒角的薄环 */
const HS_COVER = latheGeometry(
  [
    [0.017, -0.003],
    [0.031, -0.003],
    [0.031, 0.001],
    [0.0275, 0.003],
    [0.017, 0.003],
    [0.017, -0.003],
  ],
  40,
)
/** 垫圈（垫片组）：车削台阶环 */
const HS_SPACER = latheGeometry(stepRingProfile(0.0165, 0.019, 0.02, 0.18, 0.3), 40)
/** 压顶盖：带倒角的盘盖 */
const HS_CAP = latheGeometry(
  [
    [0.0165, -0.0045],
    [0.021, -0.0045],
    [0.021, -0.001],
    [0.019, 0.0025],
    [0.0165, 0.0045],
    [0.0165, -0.0045],
  ],
  40,
)

export function HeadsetModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：从下到上的爆炸序列（y 间距沿用原布局）
    return (
      <group>
        <Bearing outer={0.028} inner={0.019} h={0.011} position={[0, -0.12, 0]} />
        <Bearing outer={0.029} inner={0.02} h={0.012} position={[0, -0.06, 0]} />
        <mesh geometry={HS_COVER} position={[0, 0, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        <mesh geometry={HS_SPACER} position={[0, 0.06, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        <mesh geometry={HS_CAP} position={[0, 0.12, 0]} castShadow>
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        {/* 吊心（星形螺母） */}
        <mesh position={[0, 0.19, 0]} castShadow>
          <cylinderGeometry args={[0.0115, 0.0115, 0.028, 24]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
        {/* 压顶盖螺丝（六角头 + 垫圈） */}
        <HexBolt position={[0, 0.24, 0]} r={0.0055} h={0.008} washer />
      </group>
    )
  }

  // 整车位置：上轴承组在头管上端、下轴承组在头管下端
  const topY = B.headTop[1] - 0.008
  const botY = B.headBottom[1] + 0.012
  return (
    <group>
      <group position={[onHeadAxis(topY), topY, 0]} rotation={[0, 0, headTilt]}>
        <mesh geometry={HS_COVER} position={[0, 0.016, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        <mesh geometry={HS_SPACER} position={[0, 0.038, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        <mesh geometry={HS_CAP} position={[0, 0.062, 0]} castShadow>
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        {/* 压顶盖螺丝（六角头 + 垫圈） */}
        <HexBolt position={[0, 0.0715, 0]} r={0.0055} h={0.007} washer />
        <Bearing outer={0.028} inner={0.019} h={0.011} position={[0, -0.004, 0]} />
      </group>
      <group position={[onHeadAxis(botY), botY, 0]} rotation={[0, 0, headTilt]}>
        <Bearing outer={0.029} inner={0.02} h={0.012} />
      </group>
      {/* 吊心（舵管内部） */}
      <mesh position={[onHeadAxis(0.85), 0.85, 0]} rotation={[0, 0, headTilt]} castShadow>
        <cylinderGeometry args={[0.0118, 0.0118, 0.026, 24]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
    </group>
  )
}

/* ================================================================== */
/* 中轴                                                                */
/* ================================================================== */

/** 轴承杯：多点剖面（杯口倒角 + 中段台阶） */
const BB_CUP = latheGeometry(
  [
    [0.0122, -0.005],
    [0.0196, -0.005],
    [0.0215, -0.0038],
    [0.0215, -0.0006],
    [0.0208, 0.0006],
    [0.0208, 0.0032],
    [0.0196, 0.005],
    [0.0122, 0.005],
    [0.0122, -0.005],
  ],
  40,
)

/** 轴心（含两端面六角孔）—— 局部 +Y 为轴心轴向 */
function Spindle({ length = 0.11 }: { length?: number }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.012, 0.012, length, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 端面六角孔（内六角工具口） */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, (length / 2 - 0.0015) * s, 0]}>
          <cylinderGeometry args={[0.0052, 0.0052, 0.006, 6]} />
          <meshStandardMaterial {...mat.soft} />
        </mesh>
      ))}
    </group>
  )
}

export function BottomBracketModel({ unit = false }: { unit?: boolean }) {
  const [bx, by] = B.bb

  if (unit) {
    // 单独预览：沿轴心方向爆炸（左侧杯、左轴承、垫圈、轴心、右轴承、右侧杯）
    return (
      <group rotation={[0, 0, 0]}>
        <mesh geometry={BB_CUP} position={[0, 0, -0.055]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        <Bearing
          outer={0.0185}
          inner={0.0122}
          h={0.013}
          position={[0, 0, -0.085]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <mesh position={[0, 0, -0.115]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.0185, 0.0185, 0.02, 32]} />
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        {/* 轴心 */}
        <Spindle />
        <Bearing
          outer={0.0185}
          inner={0.0122}
          h={0.013}
          position={[0, 0, 0.085]}
          rotation={[Math.PI / 2, 0, 0]}
        />
        <mesh geometry={BB_CUP} position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
      </group>
    )
  }

  return (
    <group position={[bx, by, 0]}>
      {/* 左右轴承杯与轴承 */}
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, 0.026 * s]} rotation={[0, 0, 0]}>
          <mesh geometry={BB_CUP} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005 * s]} castShadow>
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
          <Bearing
            outer={0.0185}
            inner={0.0122}
            h={0.013}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0, -0.004 * s]}
          />
        </group>
      ))}
      {/* 轴心 */}
      <Spindle />
    </group>
  )
}
