/**
 * 操控系统零件模型：车把 Handlebar、把立 Stem、把带 BarTape
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把该零件摆成
 * 以原点为中心、适合单独展示的形态。
 *
 * 渲染精度：车把曲线控制点加密到 13 点、TubeGeometry 64 段（径向 24）；
 * 走线管曲线 48 段（径向 16）；把立主体为沿轴线的手工放样（16 站位 × 24 点截面，
 * 上窄下宽的圆角梯形，顶面随把立角略带下倾）；方盒类用 RoundedBox；
 * 碳纤维件（车把）用 matP.carbonGloss；线管用 mat.housing；螺栓头一律 6 段圆柱。
 */
import { useMemo, type ReactNode } from 'react'
import { Box3, BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Quaternion, Vector3 } from 'three'
import { B, deg, type Vec3 } from '../bikeConfig'
import { mat, matP } from '../materials'
import { Tube, latheGeometry } from '../geometryHelpers'

/** 头管轴线倾角（把立舵管夹的倾斜与头管一致） */
const headTilt = deg(90 - B.headAngleDeg)

/** 头管轴线上某高度 y 处对应的 x（把立起点取在轴线上） */
function onHeadAxis(y: number) {
  const [x0, y0] = B.headTop
  return x0 + (y0 - y) * Math.tan(headTilt)
}

/** 把立起点：舵管顶端（头管轴线上、车架上端以上） */
const STEERER_TOP_Y = 0.855
const STEERER_TOP: Vec3 = [onHeadAxis(STEERER_TOP_Y), STEERER_TOP_Y, 0]

/** 把带起点：z = ±0.11（上把平段留裸露，不缠带） */
const TAPE_FROM_Z = 0.18

/**
 * 右半车把曲线控制点（传 -1 即镜像出左半把：z 取负）。
 * 轨迹：上把平段 → 上把位支撑区 → 弯折部 → 下弯 → 下把 → 把尾向后收。
 */
function halfBarPoints(s: number): Vector3[] {
  const [bx, by] = B.bar.center
  const edge = B.bar.width / 2 // 半把宽 0.2（把尾所在的 z）
  return [
    new Vector3(bx, by, 0), // 把立夹持中心（车把中点）
    new Vector3(bx, by, 0.1 * s), // 上把平段（裸把区）
    new Vector3(bx + 0.005, by - 0.003, 0.15 * s), // 上把位（Hoods）支撑区
    new Vector3(bx + 0.045, by - 0.015, 0.185 * s), // 弯折部入口
    new Vector3(bx + 0.078, by - 0.045, 0.195 * s), // 下弯起点
    new Vector3(bx + 0.088, by - 0.083, edge * s), // 前伸量最大处（reach ≈ 0.08）
    new Vector3(bx + 0.075, by - 0.12, edge * s), // 弯折部底部
    new Vector3(bx + 0.035, by - 0.128, edge * s), // 下把（drop ≈ 0.128）
    new Vector3(bx, by - 0.128, edge * s), // 把尾向后收
  ]
}

/**
 * 加密后的控制点：沿上面 9 点基础曲线按弧长等距取 13 点，
 * 控制多边形更密 → 弯折部过渡更顺（形状与原曲线一致，端点不变）。
 */
function denseBarPoints(s: number): Vector3[] {
  return new CatmullRomCurve3(halfBarPoints(s)).getSpacedPoints(12)
}

/* ================================================================== */
/* 车把                                                                */
/* ================================================================== */

/**
 * 内走线线管（左右各一根：右 = 刹车线、左 = 变速线视觉）。
 * 从车把下缘（手变位置 z = ±0.185 的下方、把带表面）引出，向下后方弯一小段
 * （≈ 0.12 长）再回抬，从把立旁的把管下缘收进管腔 —— 模拟内走线入口。
 */
function hoseCurve(s: number): CatmullRomCurve3 {
  return new CatmullRomCurve3([
    new Vector3(0.546, 0.826, 0.185 * s), // 起点：藏在把带内（线管从把带下缘"出线"）
    new Vector3(0.5445, 0.8125, 0.186 * s), // 露出把带下缘
    new Vector3(0.536, 0.7995, 0.183 * s), // 向下后方弯出
    new Vector3(0.5205, 0.7925, 0.171 * s),
    new Vector3(0.504, 0.7925, 0.141 * s), // 弯底：转向车尾方向
    new Vector3(0.4945, 0.8025, 0.106 * s), // 回抬
    new Vector3(0.4985, 0.8225, 0.078 * s),
    new Vector3(0.5, 0.8345, 0.064 * s), // 收进把管下缘（内走线入口）
    new Vector3(0.5, 0.845, 0.052 * s), // 终点：藏在把管腔里
  ])
}

/**
 * 上把翼型截面尺寸（半前后宽、半上下高，米）。
 * t=0 车把中点（圆管，适配把立夹环）→ 上把翼型（前后 34mm、上下 17mm）
 * → 手变处收回圆管 → 下把全圆。这是现代气动弯把的典型做法：上把压扁可搭手、减风阻。
 */
function barSectionAt(t: number): [number, number] {
  const round = B.bar.tubeBarR // 0.0115
  const wingIn = smoothstep(0.05, 0.16, t)
  const wingOut = 1 - smoothstep(0.32, 0.46, t)
  const k = Math.min(wingIn, wingOut)
  const w = round * 2 + (0.034 - round * 2) * k // 前后（翼弦）
  const h = round * 2 + (0.017 - round * 2) * k // 上下（翼厚）
  return [w / 2, h / 2]
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * 变截面车把放样：沿曲线等弧长采样，每个站位用"平行传输"标架（避免扭转/翻面），
 * 截面为超椭圆（指数 2.6，略方，读作翼型），尺寸由 barSectionAt 沿 t 渐变。
 * U = 上下、W = 前后、T = 切线，三者构成右手系（U × W = T）。
 */
function loftBar(curve: CatmullRomCurve3, stations = 96): BufferGeometry {
  const ring = 24
  const base: [number, number][] = []
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    // 超椭圆：|x|^n + |y|^n = 1（n = 2.6）
    base.push([
      Math.sign(cos) * Math.pow(Math.abs(cos), 2 / 2.6),
      Math.sign(sin) * Math.pow(Math.abs(sin), 2 / 2.6),
    ])
  }

  const positions: number[] = []
  const indices: number[] = []
  const up = new Vector3(0, 1, 0)
  let U = up.clone()

  for (let i = 0; i < stations; i++) {
    const t = i / (stations - 1)
    const p = curve.getPointAt(t)
    const T = curve.getTangentAt(t).normalize()
    // 平行传输：把上一站的"上"投影到新切线的垂直平面
    U.addScaledVector(T, -U.dot(T))
    if (U.lengthSq() < 1e-8) U.set(0, 1, 0)
    U.normalize()
    const W = new Vector3().crossVectors(T, U).normalize() // 前后
    const [hw, hh] = barSectionAt(t)
    for (const [px, py] of base) {
      positions.push(
        p.x + W.x * px * hw + U.x * py * hh,
        p.y + W.y * px * hw + U.y * py * hh,
        p.z + W.z * px * hw + U.z * py * hh,
      )
    }
  }

  for (let i = 0; i < stations - 1; i++) {
    const a = i * ring
    const b = a + ring
    for (let j = 0; j < ring; j++) {
      const j2 = (j + 1) % ring
      indices.push(a + j, a + j2, b + j2)
      indices.push(a + j, b + j2, b + j)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function HandlebarModel({ unit = false }: { unit?: boolean }) {
  // 左右半把各一条曲线（同一把管弯折成型）
  const curves = useMemo(() => [1, -1].map((s) => new CatmullRomCurve3(denseBarPoints(s))), [])
  // 变截面放样（上把翼型，弯把圆管）
  const barGeos = useMemo(() => curves.map((c) => loftBar(c)), [curves])
  // 左右各一根内走线线管
  const hoses = useMemo(() => [1, -1].map((s) => hoseCurve(s)), [])
  // unit 模式：整把居中（取负中心）
  const center = useMemo(
    () => new Box3().setFromPoints([1, -1].flatMap((s) => denseBarPoints(s))).getCenter(new Vector3()),
    [],
  )
  const offset: Vec3 = unit ? [-center.x, -center.y, -center.z] : [0, 0, 0]

  return (
    <group position={offset}>
      {/* 左右半把（镜像）：上把翼型 + 弯把圆管的变截面放样 */}
      {barGeos.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshPhysicalMaterial {...matP.carbonGloss} />
        </mesh>
      ))}
      {/* 内走线线管（左右各一）：从手变处把带下缘引出，绕一小段后收回把管 */}
      {hoses.map((curve, i) => (
        <mesh key={`hose${i}`} castShadow>
          <tubeGeometry args={[curve, 48, 0.0045, 16, false]} />
          <meshStandardMaterial {...mat.housing} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 把立                                                                */
/* ================================================================== */

/** 把立主体截面参数：舵管端 → 车把夹端逐渐收细（车宽 × 上下），顶面比底面窄（气动梯形） */
const STEM_BODY = {
  wSteer: 0.036,
  hSteer: 0.032,
  wBar: 0.028,
  hBar: 0.024,
  topRatio: 0.72,
  stations: 16,
  segs: 24,
  n: 3.4,
}
/** 主体前端与车把中心的间距（收在把立夹环里，不顶出夹环外径） */
const STEM_BAR_GAP = 0.012

/**
 * 手工放样：把每个站位的截面点沿局部 +Y 轴叠放成实体（相邻环对应点两两相连 + 两端封口）。
 * 截面点序为顺时针（在 (x, z) 平面内为负向）→ 侧面法线朝外。
 */
function loftSections(sections: [number, number][][], yList: number[]): BufferGeometry {
  const segs = sections[0].length
  const n = sections.length
  const positions: number[] = []
  const indices: number[] = []

  for (let j = 0; j < n; j++) {
    for (const [fx, fz] of sections[j]) positions.push(fx, yList[j], fz)
  }
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
  cap(0, false)
  cap(n - 1, true)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * 把立主体：沿局部 +Y 轴放样的"气动锥形盒"（16 站位 × 24 点截面）。
 * 截面为上窄下宽的圆角梯形（超椭圆参数化），自舵管端到车把夹端逐渐收细；
 * 顶面于是与轴线平行地略带下倾（把立角 −6°）。
 * 局部坐标：+Y = 把立轴；最小旋转下局部 +X 落在车架平面内、局部 +Z = 车宽。
 */
function makeStemBody(length: number): BufferGeometry {
  const { wSteer, hSteer, wBar, hBar, topRatio, stations, segs, n } = STEM_BODY
  const sections: [number, number][][] = []
  for (let j = 0; j < stations; j++) {
    const t = j / (stations - 1)
    const w = wSteer + (wBar - wSteer) * t
    const h = hSteer + (hBar - hSteer) * t
    const pts: [number, number][] = []
    for (let i = 0; i < segs; i++) {
      const phi = (-Math.PI * 2 * i) / segs // 反向绕行 → 侧面法线朝外
      const c = Math.cos(phi)
      const s = Math.sin(phi)
      const u = Math.sign(c) * Math.pow(Math.abs(c), 2 / n)
      const v = Math.sign(s) * Math.pow(Math.abs(s), 2 / n)
      // 顶面收窄：v = +1（顶）处宽 0.72w，v = −1（底）处全宽
      const wid = w * (topRatio + (1 - topRatio) * (1 - v) * 0.5)
      // 局部：+Y 为轴、局部 −X 朝上（局部 +Z 为车宽）→ 竖直坐标进 x、横向进 z
      pts.push([-v * (h * 0.5), u * wid])
    }
    sections.push(pts)
  }
  const yList = Array.from({ length: stations }, (_, j) => (j / (stations - 1) - 0.5) * length)
  return loftSections(sections, yList)
}

export function StemModel({ unit = false }: { unit?: boolean }) {
  const [bx, by] = B.bar.center
  // 舵管夹上下两个环（环心落在头管轴线上）
  const steererClampYs = [0.837, 0.815]

  /** 把立臂轴线（舵管顶 → 车把中心）的局部坐标系：位置 + 朝向（+Y 沿轴线）+ 长度 */
  const axis = useMemo(() => {
    const a = new Vector3(...STEERER_TOP)
    const b = new Vector3(bx, by, 0)
    const dir = b.clone().sub(a)
    const len = dir.length()
    dir.normalize()
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir)
    return { a, dir, len, quat }
  }, [bx, by])

  // 主体：气动锥形盒放样（前端收在把立夹环内）
  const bodyLen = axis.len - STEM_BAR_GAP
  const bodyGeo = useMemo(() => makeStemBody(bodyLen), [bodyLen])
  const bodyPos = useMemo(
    () => axis.a.clone().addScaledVector(axis.dir, bodyLen / 2),
    [axis, bodyLen],
  )

  // 车把夹环：短圆环，外径 0.019（盖住面板四螺栓），内外缘带倒角
  const barClampGeo = useMemo(
    () =>
      latheGeometry(
        [
          [0.0118, -0.014],
          [0.017, -0.014],
          [0.019, -0.0122],
          [0.019, 0.0122],
          [0.017, 0.014],
          [0.0118, 0.014],
          [0.0118, -0.014],
        ],
        40,
      ),
    [],
  )
  // 舵管夹环：内径略大于舵管（0.0142），上下缘倒角
  const steererClampGeo = useMemo(
    () =>
      latheGeometry(
        [
          [0.0152, -0.01],
          [0.0173, -0.01],
          [0.0195, -0.0082],
          [0.0195, 0.0082],
          [0.0173, 0.01],
          [0.0152, 0.01],
          [0.0152, -0.01],
        ],
        40,
      ),
    [],
  )

  // unit 模式：以主体两端中点为原点
  const offset: Vec3 = unit ? [-(STEERER_TOP[0] + bx) / 2, -(STEERER_TOP[1] + by) / 2, 0] : [0, 0, 0]

  return (
    <group position={offset}>
      {/* 主体：沿舵管顶→车把中心轴线的气动锥形盒（扁平、前后厚、顶面带下倾） */}
      <mesh geometry={bodyGeo} position={bodyPos} quaternion={axis.quat} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>

      {/* 车把夹环：环绕把管（轴线沿 Z） */}
      <mesh geometry={barClampGeo} position={[bx, by, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>

      {/* 四颗面板螺栓：细圆柱沿把管轴向穿过夹环四角，两端各带六角头 */}
      {[1, -1].map((sx) =>
        [1, -1].map((sy) => (
          <group key={`bolt${sx}${sy}`}>
            <mesh
              position={[bx + 0.0118 * sx, by + 0.0118 * sy, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.0025, 0.0025, 0.03, 32]} />
              <meshStandardMaterial {...mat.steel} />
            </mesh>
            {[1, -1].map((sz) => (
              <mesh
                key={`hex${sz}`}
                position={[bx + 0.0118 * sx, by + 0.0118 * sy, 0.0168 * sz]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={sz > 0 ? [0.0038, 0.0042, 0.005, 6] : [0.0042, 0.0038, 0.005, 6]} />
                <meshStandardMaterial {...mat.steel} />
              </mesh>
            ))}
          </group>
        )),
      )}

      {/* 舵管夹：上下两个圆环，轴线沿头管倾角 */}
      {steererClampYs.map((y) => (
        <mesh key={y} geometry={steererClampGeo} position={[onHeadAxis(y), y, 0]} rotation={[0, 0, headTilt]}>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 把带（单独预览时只取右半段）                                          */
/* ================================================================== */

/** 右半把上缠把带的曲线段：从 z = ±0.11 一直缠到把尾 */
function tapeCurve(s: number): CatmullRomCurve3 {
  const samples = new CatmullRomCurve3(denseBarPoints(s)).getPoints(64)
  const first = samples.findIndex((p) => Math.abs(p.z) >= TAPE_FROM_Z)
  return new CatmullRomCurve3(samples.slice(Math.max(0, first - 1)))
}

/** 把塞：沿把尾切向塞进把管开口（略突出把口 3mm） */
function barPlug(s: number): { from: Vec3; to: Vec3 } {
  const pts = halfBarPoints(s)
  const end = pts[pts.length - 1]
  const dir = end.clone().sub(pts[pts.length - 2]).normalize() // 指向把尾外侧
  const a = end.clone().addScaledVector(dir, 0.003)
  const b = end.clone().addScaledVector(dir, -0.012)
  return { from: [a.x, a.y, a.z], to: [b.x, b.y, b.z] }
}

/** 沿 from→to 轴向摆放的局部坐标组（+Y 为 from→to 方向、原点在两点中点） */
function Axial({ from, to, children }: { from: Vec3; to: Vec3; children: ReactNode }) {
  const { pos, quat } = useMemo(() => {
    const a = new Vector3(...from)
    const b = new Vector3(...to)
    const dir = b.clone().sub(a)
    const p = a.clone().add(b).multiplyScalar(0.5)
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())
    return { pos: p, quat: q }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]])
  return (
    <group position={pos} quaternion={quat}>
      {children}
    </group>
  )
}

/** 把塞剖面（局部 Y 轴沿把尾切向、-Y 端朝外）：外露端带倒角的短圆柱，
 * 里端略细、塞进把管内。 */
const PLUG_PROFILE: [number, number][] = [
  [0, -0.0075],
  [0.0096, -0.0075],
  [0.0122, -0.0056],
  [0.0122, 0.0035],
  [0.0116, 0.006],
  [0.0116, 0.0075],
  [0, 0.0075],
]
/** 把塞几何（左右把塞共用一份） */
const PLUG_GEO = latheGeometry(PLUG_PROFILE, 32)

/** 把塞：带倒角的塞体 + 中心六角螺丝（塞在把管口上） */
function BarPlug({ from, to }: { from: Vec3; to: Vec3 }) {
  return (
    <Axial from={from} to={to}>
      <mesh geometry={PLUG_GEO} castShadow>
        <meshStandardMaterial {...mat.soft} />
      </mesh>
      {/* 中心螺丝（六角，压在外端面上） */}
      <mesh position={[0, -0.0081, 0]}>
        <cylinderGeometry args={[0.0034, 0.0034, 0.0022, 6]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
    </Axial>
  )
}

export function BarTapeModel({ unit = false }: { unit?: boolean }) {
  const tapes = useMemo(() => [1, -1].map((s) => tapeCurve(s)), [])
  const plugs = useMemo(() => [1, -1].map((s) => barPlug(s)), [])
  /** 收尾胶带环：套在把带起点（靠把立一侧）的一圈窄环 */
  const collars = useMemo(
    () =>
      tapes.map((curve) => {
        const p = curve.getPointAt(0)
        const t = curve.getTangentAt(0).normalize()
        const a = p.clone().addScaledVector(t, -0.0035)
        const b = p.clone().addScaledVector(t, 0.0035)
        return { from: [a.x, a.y, a.z] as Vec3, to: [b.x, b.y, b.z] as Vec3 }
      }),
    [tapes],
  )

  // unit 模式：只取右半段（含把塞）居中
  const rightBox = new Box3().setFromPoints(tapes[0].getPoints(24))
  rightBox.expandByPoint(new Vector3(...plugs[0].from))
  rightBox.expandByPoint(new Vector3(...plugs[0].to))
  const center = rightBox.getCenter(new Vector3())
  const offset: Vec3 = unit ? [-center.x, -center.y, -center.z] : [0, 0, 0]

  return (
    <group position={offset}>
      {/* 把带（镜像一对）：包住把管、比把管粗 5mm（0.0165 vs 0.0115），螺旋棱纹法线可见 */}
      {(unit ? [0] : [0, 1]).map((i) => (
        <mesh key={`tape${i}`} castShadow>
          <tubeGeometry args={[tapes[i], 56, 0.0165, 20, false]} />
          <meshStandardMaterial {...mat.tape} />
        </mesh>
      ))}
      {/* 收尾胶带：把带起点处的一圈窄环（压在裸把上） */}
      {(unit ? [0] : [0, 1]).map((i) => (
        <Tube key={`collar${i}`} from={collars[i].from} to={collars[i].to} r1={0.0172} segments={32}>
          <meshStandardMaterial {...mat.soft} />
        </Tube>
      ))}
      {/* 把塞：压在带尾、堵住把管口（左右各一） */}
      {(unit ? [0] : [0, 1]).map((i) => (
        <BarPlug key={`plug${i}`} from={plugs[i].from} to={plugs[i].to} />
      ))}
    </group>
  )
}
