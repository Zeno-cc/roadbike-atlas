/**
 * 轮组系统零件模型：花鼓 Hub、轮圈 Rim、辐条 Spoke、外胎 Tire、内胎 Tube、桶轴 Axle
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 轮组的旋转轴沿 Z，轮心取 B.frontHub / B.rearHub；每个零件以轮心为局部原点，
 * 前后轮成对渲染（法兰盘等左右成对的子件用 [1, -1].map 镜像）。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把该零件摆成
 * 以原点为中心、适合单独展示的形态。
 *
 * 造型对标现代气动轮组：45mm 深碳圈（外缘 28mm / 中部最宽 30mm / 内缘 24mm 钝圆尾端，
 * 圈面贴白色字标）+ 刀片辐条（中段扁平刀片 2.3 × 0.85mm，宽面平行轮面、薄边迎切向气流）。
 *
 * 渲染精度：环件环向 96-128 / 管向 20-24 段，lathe 剖面 48-64 段，圆柱 32-48 段；
 * 轮圈用清漆碳纤物理材质（matP.carbonGloss），其余细节材质一律取 mat.xxx 预设，
 * 每个 mesh 独立材质实例（交互层才能逐个高亮/透视）。
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { ExtrudeGeometry, Matrix4, Shape, Vector3, type BufferGeometry, type InstancedMesh } from 'three'
import { B, rimDepth, rimR, type Vec3 } from '../bikeConfig'
import { decals, mat, matP } from '../materials'
import { Instances, latheGeometry, makeGearGeometry, strutMatrix, trsMatrix } from '../geometryHelpers'

/* ------------------------------------------------------------------ */
/* 共用尺寸（单位：米）                                                 */
/* ------------------------------------------------------------------ */

/** 花鼓壳半径；壳体长度：前 90mm / 后 100mm */
const HUB_R = 0.016
const HUB_LEN_FRONT = 0.09
const HUB_LEN_REAR = 0.1
/** 法兰盘：半径 21mm、厚 3mm、位于 z=±32mm；法兰盘辐条孔（每侧 12 个） */
const FLANGE_R = 0.021
const FLANGE_T = 0.003
const FLANGE_Z = 0.032
const FLANGE_HOLE_R = 0.0198
const FLANGE_HOLE_SIZE = 0.0013
const FLANGE_HOLE_DEPTH = 0.0025
/** 辐条起止圆：法兰盘 r=19mm，轮圈端 r=295mm（交替 ±10mm；圈端埋在 45mm 深框体内部，
 *  辐条实际在 r≈0.269 处没入圈体，条帽/条孔座落在内缘 r=0.266 的胎床上） */
const SPOKE_HUB_R = 0.019
const SPOKE_RIM_R = 0.295
const SPOKE_RIM_Z = 0.01
/** 辐条（刀片辐条）：中段扁平刀片（占全长 80%）+ 两端圆杆加粗段 1.3mm（各 10%）；条帽 2.2mm × 8mm
 *  刀片宽 2.3mm 沿切向（落在轮面内、沿行进方向），厚 0.85mm 沿轮轴 Z ——
 *  宽面平行于轮面、薄边迎着切向气流（真实气动辐条 CX-Ray / DT Aerolite 的取向） */
const SPOKE_BLADE_W = 0.0023
const SPOKE_BLADE_T = 0.00085
const SPOKE_BLADE_R = 0.0002
const SPOKE_BUTT_R = 0.0013
const SPOKE_BUTT_T = 0.1
const NIPPLE_R = 0.0022
const NIPPLE_LEN = 0.008
/** 条帽露出胎床的长度（其余埋在轮圈里） */
const NIPPLE_OUT = 0.004
/** 塔基（后花鼓 +Z 侧）：半径 16.5mm、长 36mm；棘轮齿环 36 细齿 */
const FREEHUB_R = 0.0165
const FREEHUB_LEN = 0.036
const RATCHET_TEETH = 36
/** 轮圈（45mm 深气动框）：外缘 r=0.311（= rimR，胎唇座）→ 内缘 r=0.266（= rimR - rimDepth，钝圆尾端）；
 *  剖面宽度：外缘 28mm / 中部最宽 30mm / 内缘 24.2mm */
const RIM_OUTER_R = rimR
const RIM_INNER_R = rimR - rimDepth
/** 中部最宽处的竖直平直侧壁带（圈面字标贴这一带） */
const RIM_MID_LO = 0.2845
const RIM_MID_HI = 0.2935
const RIM_MID_HALF_W = 0.015
/** 圈面字标：贴在两侧平直侧壁带上（r=0.288），朝向 ±Z，离面 0.8mm */
const DECAL_R = 0.288
const DECAL_W = 0.03
const DECAL_H = 0.0056
const DECAL_GAP = 0.0008
/** 胎床衬圈（内缘平面上一圈浅色铝环，露出胎床）：随深框移到内缘 r=0.266 处 */
const BED_RING_R_IN = 0.2652
const BED_RING_R_OUT = 0.2672
const BED_RING_HALF_W = 0.0118
/** 胎床条孔座（深色小圆柱，与辐条一一对应，衬在条帽根部） */
const RIM_HOLE_R = 0.0028
/** 外胎：环心半径 325mm、管径 15mm（外缘 340mm = wheelR）；胎唇线细环在胎侧内缘 */
const TIRE_R = 0.325
const TIRE_TUBE_R = 0.015
const TIRE_HOOP_SEG = 120
const TIRE_TUBE_SEG = 24
const BEAD_RING_R = 0.3135
const BEAD_RING_TUBE_R = 0.003
const BEAD_RING_Z = 0.0096
const BEAD_RING_SEG = [20, 96] as const
/** 内胎：环心半径 318mm、管径 8mm */
const TUBE_R = 0.318
const TUBE_TUBE_R = 0.008
const TUBE_HOOP_SEG = 96
const TUBE_TUBE_SEG = 20
/** 桶轴：杆身半径 6mm；头部半径 9mm、长 12mm（位于 -Z 左侧端）；螺纹段 12 圈薄环 */
const AXLE_R = 0.006
const AXLE_HEAD_R = 0.009
const AXLE_HEAD_LEN = 0.012
const AXLE_LEN_FRONT = 0.11
const AXLE_LEN_REAR = 0.13
const AXLE_THREAD_R = 0.0066
const AXLE_THREAD_H = 0.0007
const AXLE_THREAD_COUNT = 12
const AXLE_THREAD_PITCH = 0.0016
const AXLE_SOCKET_R = 0.0033
const AXLE_SOCKET_LEN = 0.006

/** 前后轮心（沿用整车锚点）；ORIGIN 供 unit 预览（单件居中） */
const wheelCenters: Vec3[] = [B.frontHub, B.rearHub]
const ORIGIN: Vec3 = [0, 0, 0]

/* ------------------------------------------------------------------ */
/* 几何小工具                                                          */
/* ------------------------------------------------------------------ */

const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * 辐条（线段 a→b）上"相对轮心 center 的 XY 平面半径恰为 r"的点：
 * 解 |(a_xy - center_xy) + t·d_xy|² = r²，用来把条帽 / 条孔座准准地落在
 * 轮圈胎床上（辐条圈端 r=295mm 埋在圈体内）。
 * 注意必须传轮心：整车模式下花鼓点带有 ±0.4m 的车架偏移，按原点解会算飞。
 */
function pointAtRadius(a: Vec3, b: Vec3, r: number, center: Vec3): Vec3 {
  const ax = a[0] - center[0]
  const ay = a[1] - center[1]
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const A = dx * dx + dy * dy
  const Bc = 2 * (ax * dx + ay * dy)
  const C = ax * ax + ay * ay - r * r
  const t = (-Bc + Math.sqrt(Math.max(0, Bc * Bc - 4 * A * C))) / (2 * A)
  return lerp3(a, b, t)
}

/**
 * 预构建几何的实例化批量渲染（刀片中段是自建的圆角矩形截面几何，需以对象传入）。
 * 与 geometryHelpers.Instances 同语义，只是几何以对象形式传入而不是 JSX 构造器。
 */
function InstancedGeometry({
  geometry,
  matrices,
  children,
}: {
  geometry: BufferGeometry
  matrices: Matrix4[]
  children: ReactNode
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [matrices, geometry])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, matrices.length]} castShadow>
      {children}
    </instancedMesh>
  )
}

/* ================================================================== */
/* 花鼓                                                                */
/* ================================================================== */

/** 法兰盘剖面：带倒角的圆盘（绕 Y 旋转后轴线为 Z；剖面从轴心起，端面完整封闭） */
function useFlangeGeometry() {
  return useMemo(() => {
    const h = FLANGE_T / 2
    const profile: [number, number][] = [
      [0, -h],
      [FLANGE_R - 0.0018, -h],
      [FLANGE_R, -h + 0.0011],
      [FLANGE_R, h - 0.0011],
      [FLANGE_R - 0.0018, h],
      [0, h],
      [0, -h], // 闭合
    ]
    return latheGeometry(profile, 48)
  }, [])
}

/** 轴承端盖剖面：两端倒角的小台阶盖（端面从轴心封闭） */
function useHubCapGeometry() {
  return useMemo(() => {
    const profile: [number, number][] = [
      [0, -0.003],
      [0.0104, -0.003],
      [0.0115, -0.0019],
      [0.0115, 0.0017],
      [0.0098, 0.003],
      [0, 0.003],
      [0, -0.003], // 闭合
    ]
    return latheGeometry(profile, 48)
  }, [])
}

/** 塔基端盖剖面：带倒角的外端封盖（端面从轴心封闭） */
function useFreehubCapGeometry() {
  return useMemo(() => {
    const profile: [number, number][] = [
      [0, -0.0025],
      [0.0113, -0.0025],
      [0.013, -0.0012],
      [0.013, 0.0012],
      [0.0113, 0.0025],
      [0, 0.0025],
      [0, -0.0025], // 闭合
    ]
    return latheGeometry(profile, 48)
  }, [])
}

/** 法兰盘上的辐条孔实例：每侧 12 个，角度与辐条法兰端一致（深色小圆柱 → 读作孔） */
function flangeHoleMatrices(): Matrix4[] {
  const ms: Matrix4[] = []
  const face = FLANGE_Z + FLANGE_T / 2 // 法兰盘外侧面
  for (const s of [1, -1]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ms.push(
        trsMatrix([
          FLANGE_HOLE_R * Math.cos(a),
          FLANGE_HOLE_R * Math.sin(a),
          s * (face + 0.0005 - FLANGE_HOLE_DEPTH / 2),
        ]),
      )
    }
  }
  return ms
}

const flangeHoles = flangeHoleMatrices()

/** 单只花鼓（轴线沿 Z，局部原点在轮心）：壳体 + 两端法兰盘 / 轴承端盖 + 贯穿轴心；后花鼓带塔基 */
function Hub({ length, freehub }: { length: number; freehub: boolean }) {
  const flangeGeo = useFlangeGeometry()
  const capGeo = useHubCapGeometry()
  const endCapGeo = useFreehubCapGeometry()
  const ratchetGeo = useMemo(() => makeGearGeometry(RATCHET_TEETH, 0.0186, 0.0028, 0.0012), [])
  return (
    <group>
      {/* 花鼓壳（阳极氧化铝筒） */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[HUB_R, HUB_R, length, 48]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      {/* 法兰盘（带倒角）+ 轴承端盖（带倒角）+ 深色轴承密封圈（左右成对镜像） */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh
            geometry={flangeGeo}
            position={[0, 0, FLANGE_Z * s]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          <mesh
            geometry={capGeo}
            position={[0, 0, (length / 2 - 0.002) * s]}
            rotation={[(Math.PI / 2) * s, 0, 0]}
            castShadow
          >
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          <mesh position={[0, 0, (length / 2 + 0.0009) * s]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0086, 0.0086, 0.0008, 32]} />
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
        </group>
      ))}
      {/* 法兰盘辐条孔（每侧 12 个，深色小圆柱，与辐条同角度） */}
      <Instances matrices={flangeHoles}>
        <cylinderGeometry args={[FLANGE_HOLE_SIZE, FLANGE_HOLE_SIZE, FLANGE_HOLE_DEPTH, 32]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </Instances>
      {/* 贯穿轴心（两端略探出壳体）+ 端面六角孔（6 段圆柱内凹） */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[AXLE_R, AXLE_R, length + 0.016, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0, (length / 2 + 0.0059) * s]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[AXLE_SOCKET_R, AXLE_SOCKET_R, 0.005, 6]} />
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
      ))}
      {freehub && (
        <>
          {/* 棘轮齿环（36 细齿盘，套在棘轮体根部，齿尖略高于棘轮体） */}
          <mesh geometry={ratchetGeo} position={[0, 0, FLANGE_Z + 0.002]} castShadow>
            <meshStandardMaterial {...mat.steel} />
          </mesh>
          {/* 棘轮体（塔基本体根部，比塔基筒略粗） */}
          <mesh position={[0, 0, FLANGE_Z + 0.002]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0185, 0.0185, 0.005, 32]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
          {/* 棘轮区域细缝（薄环，深色，卡在花鼓壳与棘轮体接缝处） */}
          <mesh position={[0, 0, FLANGE_Z - 0.0011]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0164, 0.0164, 0.0012, 32]} />
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
          {/* 塔基筒（+Z 侧，飞轮装在其上） */}
          <mesh position={[0, 0, FLANGE_Z + FREEHUB_LEN / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[FREEHUB_R, FREEHUB_R, FREEHUB_LEN, 48]} />
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          {/* 塔基端盖（带倒角的外端封盖） */}
          <mesh
            geometry={endCapGeo}
            position={[0, 0, FLANGE_Z + FREEHUB_LEN + 0.001]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
        </>
      )}
    </group>
  )
}

export function HubModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：后花鼓（含塔基）居中
    return <Hub length={HUB_LEN_REAR} freehub />
  }
  return (
    <group>
      <group position={B.frontHub}>
        <Hub length={HUB_LEN_FRONT} freehub={false} />
      </group>
      <group position={B.rearHub}>
        <Hub length={HUB_LEN_REAR} freehub />
      </group>
    </group>
  )
}

/* ================================================================== */
/* 轮圈                                                                */
/* ================================================================== */

/**
 * 轮圈剖面（[半径, 轴向]；先走 -Z 侧内缘 → 外缘，再走 +Z 侧外缘 → 内缘，顺序保证法线朝外）：
 * 45mm 深气动框（18 点剖面 + 闭合点），现代深圈的剖面特征 ——
 * · 内缘 r=0.266：平帽 19.2mm + 两段圆弧收拢到 24.2mm 全宽 → 钝圆尾端（不出现尖角）；
 * · 框体自内缘向中部渐宽到最宽 30mm，r 0.2845→0.2935 是一段竖直平直侧壁带（圈面字标贴此带）；
 * · 再向外的外缘收窄到约 28mm，用两段圆弧（0.3020 / 0.3082）圆润过渡到胎唇钩肩，不是直角；
 * · 外缘保留现有做法：胎唇座（r=0.311，24mm 带）、胎唇钩肩台阶与中央胎唇卡槽（0.3105 浅槽）。
 */
function useRimGeometry() {
  return useMemo(() => {
    const profile: [number, number][] = [
      [RIM_INNER_R, -0.0096], // 内缘尾端平帽边缘（-Z 侧）
      [0.2676, -0.0117], // 钝圆尾端：圆弧收拢段
      [0.2696, -0.0121], // 钝圆尾端：肩部（内缘全宽 24.2mm）
      [RIM_MID_LO, -RIM_MID_HALF_W], // 框体侧壁上行：尾端 → 中部最宽处（30mm）
      [RIM_MID_HI, -RIM_MID_HALF_W], // 中部最宽竖直侧壁带上沿（圈面字标区）
      [0.3020, -0.0145], // 外缘圆弧过渡（外宽向 28mm 收窄）
      [0.3082, -0.0137], // 圆弧过渡收尾（转入胎唇钩肩）
      [RIM_OUTER_R, -0.012], // 胎唇座（外缘最大半径 0.311）
      [0.3105, -0.0022], // 胎唇卡槽 / 中央浅槽（-Z 侧）
      [0.3105, 0.0022], // 胎唇卡槽 / 中央浅槽（+Z 侧）
      [RIM_OUTER_R, 0.012], // 胎唇座（+Z 侧）
      [0.3082, 0.0137], // 圆弧过渡（+Z 侧）
      [0.3020, 0.0145],
      [RIM_MID_HI, RIM_MID_HALF_W],
      [RIM_MID_LO, RIM_MID_HALF_W],
      [0.2696, 0.0121],
      [0.2676, 0.0117],
      [RIM_INNER_R, 0.0096], // 内缘尾端平帽边缘（+Z 侧）
      [RIM_INNER_R, -0.0096], // 闭合剖面（内缘平面 = 平环面）
    ]
    // 旋转体默认绕 Y 轴，随后用 rotation=[π/2,0,0] 把轴线转到 Z（轮圈平面 = XY 平面）
    return latheGeometry(profile, 64)
  }, [])
}

/** 胎床衬圈剖面：略小的第二个 lathe 环（内缘平面上一圈浅色铝环，露出胎床感） */
function useBedRingGeometry() {
  return useMemo(() => {
    const profile: [number, number][] = [
      [BED_RING_R_IN, -BED_RING_HALF_W],
      [BED_RING_R_OUT, -BED_RING_HALF_W],
      [BED_RING_R_OUT, BED_RING_HALF_W],
      [BED_RING_R_IN, BED_RING_HALF_W],
      [BED_RING_R_IN, -BED_RING_HALF_W], // 闭合
    ]
    return latheGeometry(profile, 64)
  }, [])
}

/** 胎床条孔座实例：与 24 根辐条圈端一一对应（深色小圆柱，套在条帽根部） */
function rimHoleMatrices(center: Vec3): Matrix4[] {
  return spokeLinks(center).map(({ hub, rim }) =>
    strutMatrix(
      pointAtRadius(hub, rim, BED_RING_R_IN + 0.0005, center),
      pointAtRadius(hub, rim, BED_RING_R_IN - 0.0015, center),
    ),
  )
}

/**
 * 圈面字标：两侧平直侧壁带（r=0.288，恰在 RIM_MID_LO→RIM_MID_HI 竖直带上）各贴一枚
 * 白色小字标（decals.small），位于轮的顶部区域、法线朝 ±Z、离圈面 0.8mm。
 * 侧壁带在该半径处是竖直平面，平面小片无需弯曲即可贴合（-Z 侧绕 Y 转 180°，字不镜像）。
 */
function RimDecals() {
  const z = RIM_MID_HALF_W + DECAL_GAP // 圈面 15mm + 离面 0.8mm
  return (
    <>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, DECAL_R, z * s]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[DECAL_W, DECAL_H]} />
          <meshStandardMaterial
            map={decals.small}
            transparent
            depthWrite={false}
            roughness={0.45}
            metalness={0}
          />
        </mesh>
      ))}
    </>
  )
}

export function RimModel({ unit = false }: { unit?: boolean }) {
  const rimGeo = useRimGeometry()
  const bedGeo = useBedRingGeometry()
  /* 条孔座矩阵一律用轮心局部坐标：它们渲染在已定位到轮心的 group 里，
     若传绝对坐标会被平移两次（曾导致 48 个小圆柱漂浮在车轮之外）。 */
  const single = useMemo(() => rimHoleMatrices(ORIGIN), [])
  if (unit) {
    // 单独预览：单只轮圈居中（轮平面即 XY 平面）
    return (
      <group>
        <mesh geometry={rimGeo} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <meshPhysicalMaterial {...matP.carbonGloss} />
        </mesh>
        <mesh geometry={bedGeo} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        <Instances matrices={single}>
          <cylinderGeometry args={[RIM_HOLE_R, RIM_HOLE_R, 1, 32]} />
          <meshStandardMaterial {...mat.aluBlack} />
        </Instances>
        <RimDecals />
      </group>
    )
  }
  return (
    <group>
      {wheelCenters.map((c) => (
        <group key={`${c[0]},${c[1]}`} position={c}>
          <mesh geometry={rimGeo} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <meshPhysicalMaterial {...matP.carbonGloss} />
          </mesh>
          <mesh geometry={bedGeo} rotation={[Math.PI / 2, 0, 0]}>
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          <Instances matrices={single}>
            <cylinderGeometry args={[RIM_HOLE_R, RIM_HOLE_R, 1, 32]} />
            <meshStandardMaterial {...mat.aluBlack} />
          </Instances>
          <RimDecals />
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 辐条                                                                */
/* ================================================================== */

type SpokeLink = { hub: Vec3; rim: Vec3 }

/**
 * 单轮 24 根辐条的端点：每侧 12 根，法兰端（r=19mm，z=±32mm）连到
 * 轮圈端（r=295mm，z=±10mm 交替；圈端埋在 45mm 深框体内部）；圈端相对法兰端错开 1/4 圈，
 * 且左右两侧错开方向相反，形成交叉（3-cross）编法观感。
 */
function spokeLinks(center: Vec3): SpokeLink[] {
  const [cx, cy, cz] = center
  const links: SpokeLink[] = []
  const perSide = 12
  for (const s of [1, -1]) {
    for (let i = 0; i < perSide; i++) {
      const hubAngle = (i / perSide) * Math.PI * 2
      const rimAngle = hubAngle + s * (Math.PI / 2) // 约 1/4 圈切向偏移
      links.push({
        hub: [cx + SPOKE_HUB_R * Math.cos(hubAngle), cy + SPOKE_HUB_R * Math.sin(hubAngle), cz + FLANGE_Z * s],
        rim: [
          cx + SPOKE_RIM_R * Math.cos(rimAngle),
          cy + SPOKE_RIM_R * Math.sin(rimAngle),
          cz + SPOKE_RIM_Z * (i % 2 === 0 ? 1 : -1),
        ],
      })
    }
  }
  return links
}

/**
 * 刀片截面几何：圆角矩形（宽 2.3mm × 厚 0.85mm，四角圆角 0.2mm —— 避免镜面锐角闪边），
 * 沿 Y 拉伸 1 个单位长度（实例矩阵再按辐条长度缩放 Y）。
 * 截面朝向约定：局部 X = 厚（薄边，实例矩阵把它对准轮轴方向）、局部 Y = 长度、
 * 局部 Z = 宽（宽面方向，实例矩阵把它对准轮面内的切向）。
 */
function useBladeGeometry() {
  return useMemo(() => {
    const ht = SPOKE_BLADE_T / 2
    const hw = SPOKE_BLADE_W / 2
    const r = SPOKE_BLADE_R
    const shape = new Shape()
    shape.moveTo(ht, -hw + r) // 从 (+厚, -宽) 起逆时针一圈
    shape.lineTo(ht, hw - r)
    shape.absarc(ht - r, hw - r, r, 0, Math.PI / 2, false)
    shape.lineTo(-ht + r, hw)
    shape.absarc(-ht + r, hw - r, r, Math.PI / 2, Math.PI, false)
    shape.lineTo(-ht, -hw + r)
    shape.absarc(-ht + r, -hw + r, r, Math.PI, Math.PI * 1.5, false)
    shape.lineTo(ht - r, -hw)
    shape.absarc(ht - r, -hw + r, r, Math.PI * 1.5, Math.PI * 2, false)
    const geo = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 3 })
    geo.rotateX(-Math.PI / 2) // 拉伸方向 +Z → +Y：截面 XY 转到 XZ（X=厚、Z=宽）
    geo.translate(0, -0.5, 0) // 沿长度方向居中，与 strutMatrix 的居中约定一致
    return geo
  }, [])
}

const V3_AXLE = new Vector3(0, 0, 1)

/**
 * 刀片辐条实例矩阵：与 strutMatrix 一样是 "a→b 的杆件"，但额外绕辐条轴自转一个角度，
 * 把刀片放进轮面内、对齐切向（宽面平行于轮面）：
 * · 薄方向（几何局部 X）= 轮轴方向（世界 Z）去掉沿辐条轴分量后的投影：垂直于辐条轴、指向轮轴；
 * · 宽方向（几何局部 Z）= 薄方向 × 辐条轴：恰好落在轮平面内、沿切向（轮顶部即行进方向）；
 * 于是刀片 0.85mm 的薄边迎着切向扫掠气流、2.3mm 宽面平行于轮面 —— 与真实气动刀片辐条
 * （CX-Ray / DT Aerolite：气流先劈薄边、再沿宽面滑过）取向一致，风阻最低；
 * 侧视（沿轮轴看）能直接看到 2.3mm 宽的平面刀片。
 * 用 makeBasis 显式构造正交基，避免 strutMatrix 的 setFromUnitVectors 给出绕轴任意自转的朝向。
 */
function bladeMatrix(a: Vec3, b: Vec3): Matrix4 {
  const A = new Vector3(...a)
  const Bv = new Vector3(...b)
  const dir = Bv.clone().sub(A)
  const len = dir.length()
  const yAxis = dir.clone().normalize() // 局部 Y = 辐条轴
  const xAxis = V3_AXLE.clone().addScaledVector(yAxis, -V3_AXLE.dot(yAxis)).normalize() // 局部 X = 刀片薄方向（轮轴方向）
  const zAxis = new Vector3().crossVectors(xAxis, yAxis) // 局部 Z = 刀片宽方向（轮面内、沿切向）
  const m = new Matrix4().makeBasis(xAxis, yAxis, zAxis)
  m.setPosition(A.clone().add(Bv).multiplyScalar(0.5))
  return m.scale(new Vector3(1, len, 1)) // 长度按 a→b 缩放（刀片截面尺寸建在几何里，不再缩放）
}

/**
 * 辐条三层几何实例矩阵：中段扁平刀片（全长 80%）+ 两端圆杆加粗段（各 10%，与中段微重叠避免接缝）
 * + 条帽（铝色小圆柱，沿辐条方向，露出胎床 4mm）。中段用 bladeMatrix 保证刀片宽面朝向。
 */
function spokeMatrices(center: Vec3) {
  const blades: Matrix4[] = []
  const butts: Matrix4[] = []
  const nipples: Matrix4[] = []
  for (const { hub, rim } of spokeLinks(center)) {
    blades.push(bladeMatrix(lerp3(hub, rim, SPOKE_BUTT_T), lerp3(hub, rim, 1 - SPOKE_BUTT_T)))
    butts.push(strutMatrix(hub, lerp3(hub, rim, SPOKE_BUTT_T + 0.005)))
    butts.push(strutMatrix(lerp3(hub, rim, 1 - SPOKE_BUTT_T - 0.005), rim))
    nipples.push(
      strutMatrix(
        pointAtRadius(hub, rim, BED_RING_R_IN - NIPPLE_OUT, center),
        pointAtRadius(hub, rim, BED_RING_R_IN - NIPPLE_OUT + NIPPLE_LEN, center),
      ),
    )
  }
  return { blades, butts, nipples }
}

/** 一组辐条（中段刀片 / 两端加粗段 / 条帽三层实例） */
function SpokeSet({ parts }: { parts: ReturnType<typeof spokeMatrices> }) {
  const bladeGeo = useBladeGeometry()
  return (
    <>
      <InstancedGeometry geometry={bladeGeo} matrices={parts.blades}>
        <meshStandardMaterial {...mat.steel} />
      </InstancedGeometry>
      <Instances matrices={parts.butts}>
        <cylinderGeometry args={[SPOKE_BUTT_R, SPOKE_BUTT_R, 1, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </Instances>
      <Instances matrices={parts.nipples}>
        <cylinderGeometry args={[NIPPLE_R, NIPPLE_R, 1, 32]} />
        <meshStandardMaterial {...mat.alu} />
      </Instances>
    </>
  )
}

export function SpokeModel({ unit = false }: { unit?: boolean }) {
  const front = useMemo(() => spokeMatrices(B.frontHub), [])
  const rear = useMemo(() => spokeMatrices(B.rearHub), [])
  const single = useMemo(() => spokeMatrices(ORIGIN), [])
  if (unit) {
    // 单独预览：单只车轮的辐条（按轮心居中）
    return <SpokeSet parts={single} />
  }
  return (
    <group>
      <SpokeSet parts={front} />
      <SpokeSet parts={rear} />
    </group>
  )
}

/* ================================================================== */
/* 外胎                                                                */
/* ================================================================== */

/** 外胎本体（环向 120 段 / 管向 24 段）+ 两侧胎唇线细环（贴在内缘两侧胎侧上） */
function TireBody() {
  return (
    <>
      <mesh castShadow>
        <torusGeometry args={[TIRE_R, TIRE_TUBE_R, TIRE_TUBE_SEG, TIRE_HOOP_SEG]} />
        <meshStandardMaterial {...mat.rubber} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, 0, BEAD_RING_Z * s]}>
          <torusGeometry args={[BEAD_RING_R, BEAD_RING_TUBE_R, BEAD_RING_SEG[0], BEAD_RING_SEG[1]]} />
          <meshStandardMaterial {...mat.soft} />
        </mesh>
      ))}
    </>
  )
}

export function TireModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：单只外胎居中
    return <TireBody />
  }
  return (
    <group>
      {wheelCenters.map((c) => (
        <group key={`${c[0]},${c[1]}`} position={c}>
          <TireBody />
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 内胎（含法嘴）                                                      */
/* ================================================================== */

/**
 * 法嘴（相对轮心坐标）：位于轮顶 12 点方向。
 * 45mm 深框的内缘在 r=0.266（比原 284mm 深了 18mm），气嘴杆相应加长到 48mm：
 * 杆身从胎腔穿出轮圈内缘、朝轴心一侧探出（真实轮组的朝向），露出内缘面的长度与
 * 胎床衬圈/条帽的相对关系保持原样；配防松螺母（顶住轮圈内缘，六角）与气嘴帽。
 */
function ValveStem() {
  return (
    <group>
      {/* 气嘴杆（穿过 45mm 深框，从胎床内侧伸到 r=0.250，朝轴心一侧伸出） */}
      <mesh position={[0, 0.274, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.048, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 防松螺母（六角，压在轮圈内缘上，露出内缘面 6mm） */}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.0062, 0.0062, 0.008, 6]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 气嘴帽（拧在杆身末端的小圆柱） */}
      <mesh position={[0, 0.246, 0]}>
        <cylinderGeometry args={[0.0045, 0.0045, 0.01, 32]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      {/* 气嘴帽顶部小圆盘（帽顶端头） */}
      <mesh position={[0, 0.2405, 0]}>
        <cylinderGeometry args={[0.0038, 0.0038, 0.0026, 32]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
    </group>
  )
}

/** 内胎环体（藏在外胎腔体内）+ 法嘴 */
function InnerTubeBody() {
  return (
    <>
      <mesh castShadow>
        <torusGeometry args={[TUBE_R, TUBE_TUBE_R, TUBE_TUBE_SEG, TUBE_HOOP_SEG]} />
        <meshStandardMaterial {...mat.inner} />
      </mesh>
      <ValveStem />
    </>
  )
}

export function TubeModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：单只内胎居中（法嘴在轮顶）
    return <InnerTubeBody />
  }
  return (
    <group>
      {wheelCenters.map((c) => (
        <group key={`${c[0]},${c[1]}`} position={c}>
          <InnerTubeBody />
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 桶轴                                                                */
/* ================================================================== */

/** 桶轴头部剖面：两端倒角的旋钮头（半径 9mm、长 12mm；端面从轴心封闭） */
function useAxleHeadGeometry() {
  return useMemo(() => {
    const h = AXLE_HEAD_LEN / 2
    const profile: [number, number][] = [
      [0, -h],
      [AXLE_HEAD_R - 0.0008, -h],
      [AXLE_HEAD_R, -h + 0.0008],
      [AXLE_HEAD_R, h - 0.0008],
      [AXLE_HEAD_R - 0.0008, h],
      [0, h],
      [0, -h], // 闭合
    ]
    return latheGeometry(profile, 48)
  }, [])
}

/** 单根桶轴（轴线沿 Z，局部原点在轮心）：杆身 + -Z 端加大头部；带内六角的一端供工具插入 */
function Axle({ length, hex }: { length: number; hex: boolean }) {
  const headGeo = useAxleHeadGeometry()
  const half = length / 2
  const faceZ = -half - AXLE_HEAD_LEN // 头部外端面（朝骑手左侧）
  // 螺纹段：头部附近沿轴排开的 12 圈薄环（半径略大于轴杆，模拟螺纹）
  const threads = useMemo(
    () =>
      Array.from({ length: AXLE_THREAD_COUNT }, (_, i) =>
        trsMatrix([0, 0, -half + 0.003 + i * AXLE_THREAD_PITCH], [Math.PI / 2, 0, 0]),
      ),
    [half],
  )
  return (
    <group>
      {/* 轴杆 */}
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[AXLE_R, AXLE_R, length, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 螺纹段（头部附近 12 圈薄环） */}
      <Instances matrices={threads}>
        <cylinderGeometry args={[AXLE_THREAD_R, AXLE_THREAD_R, AXLE_THREAD_H, 32]} />
        <meshStandardMaterial {...mat.steel} />
      </Instances>
      {/* -Z 端（左侧）加大头部（带倒角的旋钮端） */}
      <mesh geometry={headGeo} position={[0, 0, -half - AXLE_HEAD_LEN / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 内六角凹口：六棱柱深色内衬（微凸出端面 → 读作凹孔）；仅前端桶轴带 */}
      {hex && (
        <mesh position={[0, 0, faceZ - 0.0004 + AXLE_SOCKET_LEN / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[AXLE_SOCKET_R, AXLE_SOCKET_R, AXLE_SOCKET_LEN, 6]} />
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
      )}
    </group>
  )
}

export function AxleModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：后桶轴居中
    return <Axle length={AXLE_LEN_REAR} hex={false} />
  }
  return (
    <group>
      <group position={B.frontHub}>
        <Axle length={AXLE_LEN_FRONT} hex />
      </group>
      <group position={B.rearHub}>
        <Axle length={AXLE_LEN_REAR} hex={false} />
      </group>
    </group>
  )
}
