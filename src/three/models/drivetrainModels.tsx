/**
 * 传动系统零件模型：牙盘曲柄 Crankset、脚踏 Pedal、飞轮 Cassette、链条 Chain、
 * 前拨 FrontDerailleur、后拨 RearDerailleur、手变头 Shifter
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把该零件摆成
 * 以原点为中心、适合单独展示的形态。
 *
 * 渲染精度约定（本次升级）：
 * - 齿片用本地 gearGeometry：每齿 10 点精细齿形（圆齿根 + 斜齿腹 + 平齿顶），
 *   挤出 curveSegments 40（减重孔更圆）；飞轮齿片用 6 点简化齿形控制面数。
 * - 曲柄臂为 S 形锻造轮廓 + 倒角挤出，材质 matP.carbonGloss（清漆碳纤）。
 * - 方盒类零件（导板/连杆/踏板本体/手变本体等）用 drei RoundedBox；
 *   厚度不足 2×0.0015 的薄板（导板、拨杆）半径取厚度一半的 0.93 倍以保证几何成立。
 * - 螺栓头一律 6 段圆柱（flatShading 出六角面）；圆柱 32-48 段；曲线 48-64 段。
 * - 坐标锚点、装配位置、朝向/相位逻辑与 unit 偏移全部保持原值。
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  CatmullRomCurve3,
  CylinderGeometry,
  ExtrudeGeometry,
  Path,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Matrix4,
} from 'three'
import { RoundedBox } from '@react-three/drei'
import { B, deg, type Vec3 } from '../bikeConfig'
import { mat, matP } from '../materials'
import { Tube, latheGeometry, trsMatrix } from '../geometryHelpers'

/** 两点之间的斜向细方杆（后拨平行四边形连杆用）：方杆长度沿局部 X 轴 */
function barTransform(from: Vec3, to: Vec3) {
  const a = new Vector3(...from)
  const b = new Vector3(...to)
  const dir = b.clone().sub(a)
  const len = dir.length()
  return {
    len,
    pos: a.clone().add(b).multiplyScalar(0.5),
    quat: new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir.normalize()),
  }
}

/** 圆环几何（飞轮锁紧环 / 间隔环 / 轴心加粗段）：轴向沿 Y，使用时绕 X 轴转 90° 对到 Z 轴 */
function ringGeometry(innerR: number, outerR: number, h: number, segments = 36) {
  return latheGeometry(
    [
      [innerR, -h / 2],
      [outerR, -h / 2],
      [outerR, h / 2],
      [innerR, h / 2],
      [innerR, -h / 2],
    ],
    segments,
  )
}

/** 以 (cx, cy) 为圆心、半径 r、极角 a（度）取点 */
const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [
  cx + Math.cos(deg(a)) * r,
  cy + Math.sin(deg(a)) * r,
]

/** 齿片/飞轮节圆半径 = 齿数 × 链距 / 2π */
const pitchRadius = (teeth: number) => (teeth * B.chain.pitch) / (Math.PI * 2)

/* ================================================================== */
/* 共用几何工具                                                        */
/* ================================================================== */

/**
 * 单齿轮廓：分数位置（0=齿谷 → 1=下一个齿谷）→ 齿高占 toothDepth 的比例。
 * 精细版每齿 10 点：齿根圆角 → 斜齿腹 → 齿肩 → 平齿顶 → 对称下行；
 * 简化版每齿 6 点（飞轮 12 片齿片，用简化齿形控制总面数）。
 */
const TOOTH_FINE: readonly [number, number][] = [
  [0, 0],
  [0.07, 0.04],
  [0.17, 0.32],
  [0.28, 0.84],
  [0.35, 1],
  [0.5, 1],
  [0.65, 1],
  [0.72, 0.84],
  [0.83, 0.32],
  [0.93, 0.04],
]
const TOOTH_COARSE: readonly [number, number][] = [
  [0, 0],
  [0.13, 0.42],
  [0.27, 1],
  [0.5, 1],
  [0.73, 1],
  [0.87, 0.42],
]

/**
 * 精密齿盘片（牙盘齿片 / 飞轮齿片 / 导轮）：
 * 相比 geometryHelpers.makeGearGeometry 的 4 点梯形齿，齿形更接近真实盘片
 * 的"圆齿根 + 斜齿腹 + 平齿顶"，挤出 curveSegments 提到 40（减重孔更圆）。
 */
function gearGeometry(
  teeth: number,
  pitchR: number,
  thickness: number,
  toothDepth: number,
  holes?: { x: number; y: number; r: number }[],
  fine = true,
): BufferGeometry {
  const shape = new Shape()
  const step = (Math.PI * 2) / teeth
  const profile = fine ? TOOTH_FINE : TOOTH_COARSE
  for (let i = 0; i < teeth; i++) {
    for (const [f, k] of profile) {
      const a = (i + f) * step
      const r = pitchR + toothDepth * k
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0 && f === 0) shape.moveTo(x, y)
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
  const geo = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 40 })
  geo.translate(0, 0, -thickness / 2)
  return geo
}

/** 圆角矩形轮廓（链板 / 拨杆薄片），以原点为中心 */
function roundedRectShape(w: number, h: number, r: number) {
  const shape = new Shape()
  const x = w / 2 - r
  const y = h / 2 - r
  shape.absarc(x, y, r, 0, Math.PI / 2, false)
  shape.absarc(-x, y, r, Math.PI / 2, Math.PI, false)
  shape.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false)
  shape.absarc(x, -y, r, Math.PI * 1.5, Math.PI * 2, false)
  return shape
}

/** 圆角矩形薄板：沿 Z 挤出、几何居中（链条链板 / 快扣片 / 拨杆） */
function plateGeometry(w: number, h: number, r: number, thickness: number) {
  const geo = new ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 5,
  })
  geo.translate(0, 0, -thickness / 2)
  return geo
}

/**
 * 楔形小板（脚踏前后锁扣）：底面沿 X 从 0 到 len，外端高 hOuter、内端 hInner，
 * 顶面是一条斜面；沿 Z 挤出（居中），边缘留小倒角。
 */
function wedgeGeometry(len: number, hInner: number, hOuter: number, depth: number) {
  const bevel = 0.0005
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(len, 0)
  shape.lineTo(len, hOuter)
  shape.lineTo(0.006, hInner)
  shape.closePath()
  const geo = new ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  })
  geo.translate(0, 0, -(depth - bevel * 2) / 2)
  return geo
}

/** 曲柄臂 Z 向厚度与倒角尺寸（保持原 0.006，倒角让棱边有高光） */
const ARM_T = 0.006
const ARM_BEVEL = 0.0011

/**
 * 曲柄臂几何：侧视 S 形锻造轮廓 —— 中心线正弦弯曲（两端回到 y=0，脚踏孔不偏），
 * 半宽由粗端 0.034 平滑收细到细端 0.022，末段过渡成脚踏孔眼凸台（Ø0.0252），
 * 边缘带倒角挤出；s=+1 为右侧（+X 伸出），s=-1 为左侧（镜像轮廓）。
 */
function crankArmGeometry(s: number): BufferGeometry {
  const L = B.crank.armLength
  const wBig = 0.034 / 2 - ARM_BEVEL
  const wSmall = 0.022 / 2 - ARM_BEVEL
  const eyeR = 0.0126 - ARM_BEVEL
  const bow = 0.0042
  const N = 18
  const smooth = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    return c * c * (3 - 2 * c)
  }
  /** 中心线：两端 y=0，中段一上一下形成 S 形 */
  const centerline = (u: number) => bow * Math.sin(Math.PI * 2 * u)
  /** 半宽：锥度 + 脚踏孔眼凸台 */
  const halfW = (u: number) =>
    wBig + (wSmall - wBig) * smooth((u - 0.04) / 0.84) + (eyeR - wSmall) * smooth((u - 0.78) / 0.22)

  const pts: [number, number][] = []
  // ① 上缘：轴心端 → 脚踏端
  for (let i = 0; i <= N; i++) {
    const u = i / N
    pts.push([s * u * L, centerline(u) + halfW(u)])
  }
  // ② 脚踏端孔眼（半圆，从 +Y 绕 +X 到 -Y）
  const tipY = centerline(1)
  const tipR = halfW(1)
  for (let i = 1; i < 9; i++) {
    const a = Math.PI / 2 - (Math.PI * i) / 9
    pts.push([s * (L + Math.cos(a) * tipR), tipY + Math.sin(a) * tipR])
  }
  // ③ 下缘：脚踏端 → 轴心端
  for (let i = N; i >= 0; i--) {
    const u = i / N
    pts.push([s * u * L, centerline(u) - halfW(u)])
  }
  // ④ 轴心端（半圆，隐没在中心毂 Ø40 内）
  const r0 = halfW(0)
  for (let i = 1; i < 9; i++) {
    const a = -Math.PI / 2 - (Math.PI * i) / 9
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0])
  }

  const shape = new Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.closePath()

  const depth = ARM_T - ARM_BEVEL * 2
  const geo = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: ARM_BEVEL,
    bevelThickness: ARM_BEVEL,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geo.translate(0, 0, -depth / 2)
  return geo
}

/**
 * 预构建几何的实例化批量渲染（链条链板/销轴/锁紧环内齿等自定义几何）。
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
/* 牙盘曲柄                                                            */
/* ================================================================== */

/**
 * 直装式（Direct Mount）4 臂盘爪：臂与盘钉同方位（对角 45°/135°/225°/315°），
 * 避开水平方向的曲柄臂；减重孔落在臂间（0°/90°/180°/270°）。
 * 相比经典 5 臂，这是现代公路车（Shimano 4 臂 / SRAM 直装盘）的典型造型。
 */
const ARM_ANGLES = [45, 135, 225, 315].map((d) => deg(d))
const BOLT_ANGLES = ARM_ANGLES
const HOLE_ANGLES = [0, 90, 180, 270].map((d) => deg(d))

/** 齿片减重孔：落在盘爪之间的 4 个方位 */
const ringHoles = (radius: number, holeR: number) =>
  HOLE_ANGLES.map((a) => ({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, r: holeR }))

/**
 * 单条曲柄臂：碳纤维 S 形臂身 + 脚踏孔眼铝合金镶件 + 脚踏螺纹孔（内凹暗色小圆柱）。
 * s=+1 右、s=-1 左；z 为该臂所在平面（±0.062）。
 */
function crankArm(s: number, z: number, geo: BufferGeometry, eye: BufferGeometry) {
  const L = B.crank.armLength
  return (
    <group key={s} position={[0, 0, z]}>
      {/* 臂身：锻造 S 轮廓 + 边缘倒角（倒角即"端部倒角"） */}
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial {...matP.carbonGloss} />
      </mesh>
      {/* 脚踏孔眼镶件（铝合金，两端 0.6mm 倒角） */}
      <mesh geometry={eye} position={[s * L, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 脚踏螺纹孔：朝车架一侧内凹的暗色小圆柱（露出孔口 0.7mm） */}
      <mesh position={[s * L, 0, -s * 0.00235]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0052, 0.0052, 0.0027, 20]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
    </group>
  )
}

export function CranksetModel({ unit = false }: { unit?: boolean }) {
  const [bx, by] = B.bb
  const armLen = B.crank.armLength

  const geo = useMemo(
    () => ({
      /** 大盘 50T：减重孔加大到 r 0.017（比原来 Ø21 大一倍多，仍让开盘钉六角头 0.0598） */
      ringBig: gearGeometry(50, B.crank.ring50R, 0.002, 0.0035, ringHoles(0.079, 0.017)),
      /** 小盘 34T */
      ringSmall: gearGeometry(34, B.crank.ring34R, 0.002, 0.0035, ringHoles(0.045, 0.0095)),
      /** 左右曲柄臂（S 形锻造轮廓，互为镜像） */
      armR: crankArmGeometry(1),
      armL: crankArmGeometry(-1),
      /** 脚踏孔眼镶件：内径 0.0105（让开脚踏轴 r 0.0095）、外径 0.0126、端面倒角 */
      eye: latheGeometry(
        [
          [0.0105, -0.0035],
          [0.0126, -0.0029],
          [0.0126, 0.0029],
          [0.0105, 0.0035],
        ],
        32,
      ),
    }),
    [],
  )

  return (
    <group position={unit ? [0, 0, 0] : [bx, by, 0]}>
      {/* 大盘 50T（z=+0.052，5 个 Ø34 减重孔，齿形 10 点/齿） */}
      <mesh geometry={geo.ringBig} position={[0, 0, 0.052]} castShadow>
        <meshStandardMaterial {...mat.drivetrain} />
      </mesh>
      {/* 小盘 34T（z=+0.045） */}
      <mesh geometry={geo.ringSmall} position={[0, 0, 0.045]} castShadow>
        <meshStandardMaterial {...mat.drivetrain} />
      </mesh>
      {/* 4 臂直装盘爪（锻造扁臂：宽 16mm × 厚 9.5mm，倒角圆润） */}
      {ARM_ANGLES.map((a, i) => (
        <RoundedBox
          key={`arm${i}`}
          args={[0.064, 0.016, 0.0095]}
          radius={0.004}
          smoothness={4}
          position={[Math.cos(a) * 0.047, Math.sin(a) * 0.047, 0.0485]}
          rotation={[0, 0, a]}
          castShadow
        >
          <meshStandardMaterial {...mat.aluBlack} />
        </RoundedBox>
      ))}
      {/* 直装盘基座：盘爪与曲柄臂之间的锻造过渡盘（现代直装盘的特征造型） */}
      <mesh position={[0, 0, 0.0475]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.034, 0.006, 40]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      {/* 中心毂 */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.026, 36]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      {/* 5 颗盘钉（钢：贯轴 + 内侧六角螺母 + 外侧六角头） */}
      {BOLT_ANGLES.map((a, i) => {
        const x = Math.cos(a) * 0.055
        const y = Math.sin(a) * 0.055
        return (
          <group key={`bolt${i}`}>
            <Tube from={[x, y, 0.0415]} to={[x, y, 0.056]} r1={0.0035} segments={16}>
              <meshStandardMaterial {...mat.steel} />
            </Tube>
            <mesh position={[x, y, 0.0425]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0045, 0.0045, 0.0022, 6]} />
              <meshStandardMaterial {...mat.steel} flatShading />
            </mesh>
            <mesh position={[x, y, 0.0555]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.0048, 0.0048, 0.0038, 6]} />
              <meshStandardMaterial {...mat.steel} flatShading />
            </mesh>
          </group>
        )
      })}
      {/* 左右曲柄臂（相位相差 180°，均保持水平：右朝前、左朝后） */}
      {crankArm(1, 0.062, geo.armR, geo.eye)}
      {crankArm(-1, -0.062, geo.armL, geo.eye)}
      {/* 左右曲柄臂末端的脚踏安装座（嵌在臂内、外凸一小段，左右对称） */}
      {[1, -1].map((s) => (
        <Tube key={`pedalBoss${s}`} from={[armLen, 0, 0.062 * s]} to={[armLen, 0, 0.071 * s]} r1={0.0095} segments={32}>
          <meshStandardMaterial {...mat.alu} />
        </Tube>
      ))}
      {/* 轴心（与右曲柄一体的整段；半径略小于中轴内轴承孔径） */}
      <Tube from={[0, 0, -0.06]} to={[0, 0, 0.062]} r1={0.0118} segments={40}>
        <meshStandardMaterial {...mat.steel} />
      </Tube>
      {/* 左曲柄臂中央的轴心锁紧盖（端面带六角工具孔） */}
      <Tube from={[0, 0, -0.055]} to={[0, 0, -0.073]} r1={0.0105} segments={32}>
        <meshStandardMaterial {...mat.aluBlack} />
      </Tube>
      <mesh position={[0, 0, -0.0731]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.0045, 0.0045, 0.0016, 6]} />
        <meshStandardMaterial {...mat.steel} flatShading />
      </mesh>
    </group>
  )
}

/* ================================================================== */
/* 脚踏                                                                */
/* ================================================================== */

/**
 * 踏板本体中心到车架中线的距离。
 * 本体宽 0.06（沿 Z），曲柄臂外表面在 z=±0.065，
 * 因此本体整体外移，只留轴心小圆柱在两者之间（Q 值参考 B.crank.qFactorHalf）。
 */
const PEDAL_BODY_Z = 0.097

export function PedalModel({ unit = false }: { unit?: boolean }) {
  const [bx, by] = B.bb
  const armLen = B.crank.armLength

  const geo = useMemo(
    () => ({
      /** 前后锁扣：内端低（0.0045）、外端翘起（0.0112）的斜面楔形小板 */
      binding: wedgeGeometry(0.018, 0.0045, 0.0112, 0.05),
      /** 轴心加粗段（轴承座套）：外径 0.0088（让开曲柄脚踏座 r0.0095），端面倒角 */
      collar: latheGeometry(
        [
          [0.0046, -0.005],
          [0.0082, -0.005],
          [0.0088, -0.0044],
          [0.0088, 0.0044],
          [0.0082, 0.005],
          [0.0046, 0.005],
          [0.0046, -0.005],
        ],
        32,
      ),
    }),
    [],
  )

  return (
    <group>
      {[1, -1].map((s) => {
        // unit 模式：一对脚踏并排居中展示；整车模式：装在左右曲柄臂末端
        const px = unit ? 0 : bx + armLen * s
        const py = unit ? 0 : by
        const pz = (unit ? 0.058 : PEDAL_BODY_Z) * s // 踏板本体中心
        const zIn = (unit ? 0.012 : 0.06) * s // 轴心内端（指向曲柄/原点）
        const zOut = (unit ? 0.05 : 0.074) * s // 轴心外端（插入本体）
        return (
          <group key={s}>
            {/* 踏板本体（锁踏平台：长 0.085 沿 X、宽 0.06 沿 Z、厚 0.012，四棱圆润） */}
            <RoundedBox
              args={[0.085, 0.012, 0.06]}
              radius={0.003}
              smoothness={4}
              position={[px, py, pz]}
              castShadow
            >
              <meshStandardMaterial {...mat.alu} />
            </RoundedBox>
            {/* 前后锁扣机构（带斜面的小板：外端翘起，锁片由此滑入） */}
            {[1, -1].map((d) => (
              <mesh
                key={d}
                geometry={geo.binding}
                position={[px + d * 0.0265, py + 0.0048, pz]}
                rotation={d > 0 ? [0, 0, 0] : [0, Math.PI, 0]}
                castShadow
              >
                <meshStandardMaterial {...mat.aluBlack} />
              </mesh>
            ))}
            {/* 轴心（伸向曲柄的细圆柱，车削铝合金感） */}
            <Tube from={[px, py, zIn]} to={[px, py, zOut]} r1={0.0075} segments={32}>
              <meshStandardMaterial {...mat.steel} />
            </Tube>
            {/* 轴心加粗段（轴承座套，套在轴心靠端部一段） */}
            <mesh
              geometry={geo.collar}
              position={[px, py, zIn + s * 0.0055]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
            >
              <meshStandardMaterial {...mat.alu} />
            </mesh>
            {/* 端部六角孔（8mm 内六角工具口：暗色六段圆柱，凸出轴端 1.5mm 形成孔口） */}
            <mesh position={[px, py, zIn - s * 0.0005]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0045, 0.0045, 0.0035, 6]} />
              <meshStandardMaterial {...mat.aluBlack} flatShading />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/* ================================================================== */
/* 飞轮                                                                */
/* ================================================================== */

/** 飞轮齿片沿 Z 的排布：34T 在内（0.021）、11T 在外（0.062） */
const CASSETTE_Z_IN = 0.021
const CASSETTE_Z_OUT = 0.062

/** 锁紧环中心（与内齿、齿片堆的收尾位置一致） */
const LOCKRING_Z = 0.0675

export function CassetteModel({ unit = false }: { unit?: boolean }) {
  const [rx, ry] = B.rearHub
  const teeth = B.cassette.teeth

  const build = useMemo(() => {
    const n = teeth.length
    const gap = (CASSETTE_Z_OUT - CASSETTE_Z_IN) / (n - 1)
    const sprockets: { key: number; geo: BufferGeometry; z: number }[] = []
    const spacers: { geo: BufferGeometry; z: number }[] = []
    teeth.forEach((t, i) => {
      const z = CASSETTE_Z_IN + gap * i
      const r = pitchRadius(t)
      // 最大两片（34T/30T）加 5 个减重孔：孔心在 0.66R、孔径 0.125R
      const holes =
        i < 2
          ? [0, 1, 2, 3, 4].map((k) => ({
              x: Math.cos(deg(k * 72 + 18)) * r * 0.66,
              y: Math.sin(deg(k * 72 + 18)) * r * 0.66,
              r: r * 0.125,
            }))
          : undefined
      sprockets.push({ key: t, geo: gearGeometry(t, r, 0.0016, 0.0035, holes, false), z })
      // 齿片之间夹一片深色间隔环（外径略小于相邻小齿片的齿谷半径）
      if (i < n - 1) {
        spacers.push({
          geo: ringGeometry(B.cassette.bodyR - 0.0006, pitchRadius(teeth[i + 1]) - 0.0012, gap - 0.0024, 36),
          z: z + gap / 2,
        })
      }
    })
    return { sprockets, spacers }
  }, [teeth])

  const lockring = useMemo(() => ringGeometry(0.0135, 0.019, 0.006, 40), [])
  /** 锁紧环内齿几何（12 个沿内壁的小方柱：径向 0.0024 / 切向 0.0016 / 轴向 0.0052） */
  const lockTooth = useMemo(() => {
    const g = new ExtrudeGeometry(roundedRectShape(0.0024, 0.0016, 0.0004), {
      depth: 0.0052,
      bevelEnabled: false,
      curveSegments: 4,
    })
    g.translate(0, 0, -0.0026)
    return g
  }, [])
  /** 12 内齿的实例矩阵（绕 Z 均布，径向朝外） */
  const lockTeeth = useMemo(() => {
    const list: Matrix4[] = []
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12
      list.push(trsMatrix([Math.cos(a) * 0.0138, Math.sin(a) * 0.0138, LOCKRING_Z], [0, 0, a]))
    }
    return list
  }, [])

  // unit 模式：把整叠齿片居中（齿片堆中心 z≈0.0415 移到原点）
  const groupPos: Vec3 = unit ? [0, 0, -(CASSETTE_Z_IN + CASSETTE_Z_OUT) / 2] : [rx, ry, 0]

  return (
    <group position={groupPos}>
      {/* 塔基锥体（花鼓壳过渡到塔基） */}
      <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.017, 0.028, 0.024, 40]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 塔基本体（12 片齿片套在其上） */}
      <Tube from={[0, 0, 0.016]} to={[0, 0, 0.064]} r1={B.cassette.bodyR - 0.0005} segments={36}>
        <meshStandardMaterial {...mat.steel} />
      </Tube>
      {/* 12 片齿片（34T → 11T，沿 Z 均匀排列；最大两片带减重孔） */}
      {build.sprockets.map((sp) => (
        <mesh key={sp.key} geometry={sp.geo} position={[0, 0, sp.z]} castShadow>
          <meshStandardMaterial {...mat.drivetrain} />
        </mesh>
      ))}
      {/* 11 片深色间隔环（夹在相邻齿片之间） */}
      {build.spacers.map((sp, i) => (
        <mesh key={`spacer${i}`} geometry={sp.geo} position={[0, 0, sp.z]} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
      ))}
      {/* 锁紧环（压住最小齿片）+ 12 内齿 */}
      <mesh geometry={lockring} position={[0, 0, LOCKRING_Z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      <InstancedGeometry geometry={lockTooth} matrices={lockTeeth}>
        <meshStandardMaterial {...mat.steel} />
      </InstancedGeometry>
    </group>
  )
}

/* ================================================================== */
/* 链条                                                                */
/* ================================================================== */

/** 链条所在平面（对齐大盘中线略内） */
const CHAIN_Z = 0.049

/** 后拨上/下导轮中心（同时是链条路径的折点） */
const RD_PULLEY_UP: Vec3 = [-0.452, 0.263, 0.05]
const RD_PULLEY_LO: Vec3 = [-0.472, 0.215, 0.05]

const [BBX, BBY] = B.bb
const [RHX, RHY] = B.rearHub
/** 大盘 / 最大飞轮（34T）的节圆半径 */
const R_RING = B.crank.ring50R
const R_TOP = pitchRadius(B.cassette.teeth[0])

/** 同一圆周上按极角序列取控制点（圆弧段每 22.5° 一点，保证曲线贴住节圆） */
const arc = (cx: number, cy: number, r: number, angles: number[]): [number, number][] =>
  angles.map((a) => polar(cx, cy, r, a))

/**
 * 链条闭合路径控制点（XY 平面）：
 * 大盘顶 → 上直线段 → 飞轮顶 → 绕飞轮后缘（281.4° 为脱离飞轮的切点）
 * → 上导轮 → 下导轮 → 下直线段 → 大盘下缘切点（264.4°）→ 绕大盘前半圈回到顶点
 */
const CHAIN_PATH: [number, number][] = [
  ...arc(BBX, BBY, R_RING, [90]), // 大盘顶点（上直线段起点）
  ...arc(RHX, RHY, R_TOP, [90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 281.4]),
  [RD_PULLEY_UP[0], RD_PULLEY_UP[1]], // 后拨上导轮
  [RD_PULLEY_LO[0], RD_PULLEY_LO[1]], // 后拨下导轮
  ...arc(BBX, BBY, R_RING, [264.4, 292.5, 315, 337.5, 0, 22.5, 45, 67.5]), // 大盘下缘 → 前缘 → 上前
]

/** unit 模式：把链条包围盒中心移到原点 */
const CHAIN_UNIT_OFFSET: Vec3 = (() => {
  const xs = CHAIN_PATH.map(([x]) => x)
  const ys = CHAIN_PATH.map(([, y]) => y)
  return [
    -(Math.min(...xs) + Math.max(...xs)) / 2,
    -(Math.min(...ys) + Math.max(...ys)) / 2,
    -CHAIN_Z,
  ]
})()

export function ChainModel({ unit = false }: { unit?: boolean }) {
  const curve = useMemo(
    () => new CatmullRomCurve3(CHAIN_PATH.map(([x, y]) => new Vector3(x, y, CHAIN_Z)), true),
    [],
  )

  /** 内/外链板几何（快扣片单独一份，略亮金属） */
  const geo = useMemo(
    () => ({
      /** 内链板：略窄略薄 */
      inner: plateGeometry(0.0112, 0.0056, 0.0012, 0.0034),
      /** 外链板：更宽更厚，把销轴端头盖住 */
      outer: plateGeometry(0.0124, 0.0068, 0.0014, 0.006),
      /** 快扣片：略长的两片亮金属 */
      quick: plateGeometry(0.0126, 0.0074, 0.0014, 0.0018),
      /** 销轴：r 0.0015 × 0.0072 小圆柱（实例矩阵里绕 X 转 90° 对到 Z 向横穿） */
      pin: new CylinderGeometry(0.0015, 0.0015, 0.0072, 10),
    }),
    [],
  )

  /**
   * 沿曲线按链距 0.0127 布置链节：内/外链板交替（两种造型），
   * 销轴按半个链距错开布置在链节关节处（轴线沿 Z 横穿），
   * 顶部直段上取一点放快扣（两片略亮的金属片）。
   */
  const chain = useMemo(() => {
    const count = Math.max(8, Math.round(curve.getLength() / B.chain.pitch))
    const inner: Matrix4[] = []
    const outer: Matrix4[] = []
    const pins: Matrix4[] = []
    for (let i = 0; i < count; i++) {
      const t = i / count
      const p = curve.getPointAt(t)
      const dir = curve.getTangentAt(t)
      const rot: Vec3 = [0, 0, Math.atan2(dir.y, dir.x)]
      const m = trsMatrix([p.x, p.y, p.z], rot)
      if (i % 2 === 0) inner.push(m)
      else outer.push(m)
      // 销轴：位于相邻两节之间（关节），轴线沿 Z（圆柱默认 Y 轴，绕 X 转 90°）
      const tp = (i + 0.5) / count
      const pp = curve.getPointAt(tp)
      pins.push(trsMatrix([pp.x, pp.y, pp.z], [Math.PI / 2, 0, 0]))
    }
    // 快扣：链条顶部直段中段（x 在 [-0.17, -0.03] 之间取最高点）的两片亮金属片
    const quick: Matrix4[] = []
    let bestY = -Infinity
    let best: { x: number; y: number; rot: Vec3 } | null = null
    for (let i = 0; i < 400; i++) {
      const t = i / 400
      const p = curve.getPointAt(t)
      if (p.x > -0.17 && p.x < -0.03 && p.y > bestY) {
        bestY = p.y
        const dir = curve.getTangentAt(t)
        best = { x: p.x, y: p.y, rot: [0, 0, Math.atan2(dir.y, dir.x)] }
      }
    }
    if (best) {
      quick.push(trsMatrix([best.x, best.y, CHAIN_Z + 0.0033], best.rot))
      quick.push(trsMatrix([best.x, best.y, CHAIN_Z - 0.0033], best.rot))
    }
    return { inner, outer, pins, quick }
  }, [curve])

  return (
    <group position={unit ? CHAIN_UNIT_OFFSET : [0, 0, 0]}>
      {/* 内链板（窄薄，交替布置） */}
      <InstancedGeometry geometry={geo.inner} matrices={chain.inner}>
        <meshStandardMaterial {...mat.drivetrain} />
      </InstancedGeometry>
      {/* 外链板（宽厚，覆盖销轴端头） */}
      <InstancedGeometry geometry={geo.outer} matrices={chain.outer}>
        <meshStandardMaterial {...mat.drivetrain} />
      </InstancedGeometry>
      {/* 销轴（r 0.0015 小圆柱横穿） */}
      <InstancedGeometry geometry={geo.pin} matrices={chain.pins}>
        <meshStandardMaterial {...mat.drivetrain} />
      </InstancedGeometry>
      {/* 快扣（两片略亮的金属片，mat.steel） */}
      <InstancedGeometry geometry={geo.quick} matrices={chain.quick}>
        <meshStandardMaterial {...mat.steel} />
      </InstancedGeometry>
    </group>
  )
}

/* ================================================================== */
/* 前拨                                                                */
/* ================================================================== */

/** 立管倾角（绕 Z 轴旋转量） */
const seatTilt = deg(90 - B.seatAngleDeg)

/** 立管轴线上的点（t=0 五通、t=1 座管夹） */
function onSeatAxis(t: number): [number, number] {
  const [x0, y0] = B.bb
  const [x1, y1] = B.seatTop
  return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
}

/** B.fdClamp 在立管轴线上的垂足 —— 夹环实际安装位置（≈ [-0.078, 0.533]） */
const fdClampT = (() => {
  const [x0, y0] = B.bb
  const [x1, y1] = B.seatTop
  const dx = x1 - x0
  const dy = y1 - y0
  const [px, py] = B.derailleur.fdClamp
  return ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)
})()
const fdClamp = onSeatAxis(fdClampT)

/** 夹环锁紧螺栓位置（夹环局部 -X 方向 0.024，绕立管倾角换算到整车坐标） */
const fdBolt = [
  fdClamp[0] - 0.024 * Math.cos(seatTilt),
  fdClamp[1] - 0.024 * Math.sin(seatTilt),
]

/** unit 模式：把前拨包围盒中心移到原点（含夹环 z=±0.023 与导板 z=0.06） */
const FD_UNIT_OFFSET: Vec3 = [0.031, -0.467, -0.019]

export function FrontDerailleurModel({ unit = false }: { unit?: boolean }) {
  return (
    <group position={unit ? FD_UNIT_OFFSET : [0, 0, 0]}>
      {/* 夹环（环绕立管，随立管 73.5° 倾斜） */}
      <mesh position={[fdClamp[0], fdClamp[1], 0]} rotation={[0, 0, seatTilt]} castShadow>
        <cylinderGeometry args={[0.023, 0.023, 0.025, 40, 1, true]} />
        <meshStandardMaterial {...mat.aluBlack} side={2} />
      </mesh>
      {/* 夹环锁紧螺栓（钢）+ 外侧六角头 + 内侧小螺母 */}
      <Tube from={[fdBolt[0], fdBolt[1], 0.008]} to={[fdBolt[0], fdBolt[1], 0.036]} r1={0.0035} segments={20}>
        <meshStandardMaterial {...mat.steel} />
      </Tube>
      <mesh position={[fdBolt[0], fdBolt[1], 0.0375]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.0046, 0.0046, 0.005, 6]} />
        <meshStandardMaterial {...mat.steel} flatShading />
      </mesh>
      <mesh position={[fdBolt[0], fdBolt[1], 0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0044, 0.0044, 0.0035, 6]} />
        <meshStandardMaterial {...mat.steel} flatShading />
      </mesh>
      {/* 拨体（从夹环向下伸出的主体板） */}
      <RoundedBox
        args={[0.03, 0.075, 0.016]}
        radius={0.0025}
        smoothness={4}
        position={[-0.06, 0.487, 0.032]}
        rotation={[0, 0, seatTilt]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 平行连杆（上下两条，斜向伸向导板） */}
      <RoundedBox
        args={[0.072, 0.012, 0.009]}
        radius={0.0015}
        smoothness={4}
        position={[-0.047, 0.4595, 0.036]}
        rotation={[0, 0, deg(-65.2)]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      <RoundedBox
        args={[0.072, 0.012, 0.009]}
        radius={0.0015}
        smoothness={4}
        position={[-0.051, 0.4245, 0.04]}
        rotation={[0, 0, deg(-65.2)]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 导板顶桥（连接内外两片导板） */}
      <RoundedBox args={[0.045, 0.008, 0.024]} radius={0.0025} smoothness={4} position={[-0.022, 0.421, 0.048]} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 内导板（z≈0.038，链条内侧；薄板半径取厚度一半的 0.93 倍） */}
      <RoundedBox args={[0.085, 0.045, 0.0015]} radius={0.0007} smoothness={4} position={[0, 0.4, 0.038]} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 外导板（z≈0.058，链条外侧，下缘距大盘齿尖约 3mm） */}
      <RoundedBox args={[0.085, 0.045, 0.0015]} radius={0.0007} smoothness={4} position={[0, 0.4, 0.058]} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 导板内侧的浅色摩擦条（链条上大盘时的贴靠面，凸出导板内壁 1.1mm） */}
      <RoundedBox args={[0.06, 0.006, 0.0013]} radius={0.0006} smoothness={4} position={[0, 0.388, 0.0568]}>
        <meshStandardMaterial {...mat.alu} />
      </RoundedBox>
    </group>
  )
}

/* ================================================================== */
/* 后拨                                                                */
/* ================================================================== */

/** 上挂架螺栓（与后勾爪底部相接） */
const RD_MOUNT: Vec3 = [-0.425, 0.318, 0.032]
/** 平行四边形两条连杆（从固定挂架斜向伸向笼侧） */
const RD_LINK_UP = barTransform([-0.428, 0.302, 0.038], [-0.452, 0.272, 0.048])
const RD_LINK_LO = barTransform([-0.437, 0.284, 0.032], [-0.461, 0.254, 0.042])
/** 导板笼中心与朝向（沿上下导轮连线，长 0.07） */
const RD_CAGE_MID: Vec3 = [
  (RD_PULLEY_UP[0] + RD_PULLEY_LO[0]) / 2,
  (RD_PULLEY_UP[1] + RD_PULLEY_LO[1]) / 2,
  0.05,
]
const RD_CAGE_QUAT = new Quaternion().setFromUnitVectors(
  new Vector3(1, 0, 0),
  new Vector3(RD_PULLEY_LO[0] - RD_PULLEY_UP[0], RD_PULLEY_LO[1] - RD_PULLEY_UP[1], 0).normalize(),
)

/** unit 模式：把后拨包围盒中心移到原点（z 覆盖挂架 0.014 → 导板 0.057） */
const RD_UNIT_OFFSET: Vec3 = [0.45, -0.264, -0.036]

/** 导线管路径（从挂架向上弯向车架的一小段线管） */
const CABLE_GUIDE = new CatmullRomCurve3([
  new Vector3(-0.4405, 0.3045, 0.0425),
  new Vector3(-0.444, 0.3125, 0.0445),
  new Vector3(-0.4455, 0.3215, 0.0475),
])

export function RearDerailleurModel({ unit = false }: { unit?: boolean }) {
  /** 导轮齿缘（11T 导轮，精细齿形 + 深色轮芯） */
  const pulleys = useMemo(() => ({ teeth: gearGeometry(11, 0.0095, 0.0076, 0.0015) }), [])
  /** B 张力弹簧环（绕挂架螺栓轴的钢环，暗示 B 关节卷簧） */
  const springRing = useMemo(() => ringGeometry(0.0092, 0.0125, 0.006, 32), [])

  return (
    <group position={unit ? RD_UNIT_OFFSET : [0, 0, 0]}>
      {/* 上挂架螺栓（圆柱 r 0.008，与勾爪相接） */}
      <Tube from={[RD_MOUNT[0], RD_MOUNT[1], 0.014]} to={[RD_MOUNT[0], RD_MOUNT[1], 0.05]} r1={0.008} segments={32}>
        <meshStandardMaterial {...mat.steel} />
      </Tube>
      {/* B 张力弹簧环（与挂架螺栓同心，露出一圈卷簧） */}
      <mesh geometry={springRing} position={[RD_MOUNT[0], RD_MOUNT[1], 0.031]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 上挂架小盒（B 关节） */}
      <RoundedBox
        args={[0.028, 0.046, 0.02]}
        radius={0.0025}
        smoothness={4}
        position={[-0.432, 0.297, 0.038]}
        rotation={[0, 0, deg(15)]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* B 张力螺丝（小圆柱，斜向顶住勾爪挡块） */}
      <Tube from={[-0.4335, 0.3065, 0.037]} to={[-0.4285, 0.3165, 0.039]} r1={0.0022} segments={16}>
        <meshStandardMaterial {...mat.steel} />
      </Tube>
      {/* 平行四边形四连杆（上/下两条薄方盒，斜向） */}
      <RoundedBox args={[RD_LINK_UP.len, 0.014, 0.007]} radius={0.0015} smoothness={4} position={RD_LINK_UP.pos} quaternion={RD_LINK_UP.quat} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      <RoundedBox args={[RD_LINK_LO.len, 0.014, 0.007]} radius={0.0015} smoothness={4} position={RD_LINK_LO.pos} quaternion={RD_LINK_LO.quat} castShadow>
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 微调旋钮（8 段圆柱 + flatShading 出棱纹，斜向上后方） */}
      <Tube from={[-0.4375, 0.3015, 0.042]} to={[-0.4465, 0.3105, 0.042]} r1={0.0034} segments={8}>
        <meshStandardMaterial {...mat.aluBlack} flatShading />
      </Tube>
      {/* 微调旋钮根部六角锁母（与旋钮同轴：绕 Z 转 45°） */}
      <mesh position={[-0.4385, 0.3025, 0.042]} rotation={[0, 0, deg(45)]}>
        <cylinderGeometry args={[0.0042, 0.0042, 0.0032, 6]} />
        <meshStandardMaterial {...mat.alu} flatShading />
      </mesh>
      {/* 导线管（从挂架向上弯的小 Tube） */}
      <mesh castShadow>
        <tubeGeometry args={[CABLE_GUIDE, 48, 0.0026, 10, false]} />
        <meshStandardMaterial {...mat.housing} />
      </mesh>
      {/* 笼侧关节（P 关节，导板笼的挂点） */}
      <RoundedBox
        args={[0.022, 0.032, 0.018]}
        radius={0.0025}
        smoothness={4}
        position={[-0.457, 0.264, 0.048]}
        rotation={[0, 0, deg(40)]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 导板笼：两片长板（夹住链条，位于导轮两侧） */}
      {[0.044, 0.056].map((z, i) => (
        <RoundedBox
          key={`cage${i}`}
          args={[0.07, 0.016, 0.0022]}
          radius={0.001}
          smoothness={4}
          position={[RD_CAGE_MID[0], RD_CAGE_MID[1], z]}
          quaternion={RD_CAGE_QUAT}
          castShadow
        >
          <meshStandardMaterial {...mat.aluBlack} />
        </RoundedBox>
      ))}
      {/* 上导轮（导向轮）与下导轮（张力轮） */}
      {[RD_PULLEY_UP, RD_PULLEY_LO].map((p, i) => (
        <group key={`pulley${i}`}>
          {/* 银色齿缘（11 齿真实齿形） */}
          <mesh geometry={pulleys.teeth} position={p} castShadow>
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          {/* 深色塑料轮芯 */}
          <mesh position={p} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.0076, 0.0076, 0.008, 32]} />
            <meshStandardMaterial {...mat.soft} />
          </mesh>
          {/* 中心螺栓（钢，轴线沿 Z） */}
          <Tube from={[p[0], p[1], p[2] - 0.007]} to={[p[0], p[1], p[2] + 0.007]} r1={0.0028} segments={16}>
            <meshStandardMaterial {...mat.steel} />
          </Tube>
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 手变头                                                              */
/* ================================================================== */

/** 手变在车把上的横向位置（整车）/ 预览时一对的间距（unit） */
const SHIFTER_Z = 0.185
const SHIFTER_UNIT_Z = 0.055
/** 车把夹持区轴线（手变夹环抱在把上） */
const SHIFTER_BAR: [number, number] = [B.bar.center[0], B.bar.center[1]]
/** 本体中心（略低于把轴、略下倾） */
const SHIFTER_BODY: [number, number] = [0.565, 0.828]

/** unit 模式：把一对（左右）手变包围盒中心移到原点 */
const SHIFTER_UNIT_OFFSET: Vec3 = [-0.563, -0.785, 0]

export function ShifterModel({ unit = false }: { unit?: boolean }) {
  const zPos = unit ? SHIFTER_UNIT_Z : SHIFTER_Z

  /** 刹车手柄片的弯曲路径（左右各一条，z 随侧别） */
  const leverCurves = useMemo(
    () =>
      [1, -1].map(
        (s) =>
          new CatmullRomCurve3([
            new Vector3(0.622, 0.822, zPos * s),
            new Vector3(0.634, 0.775, zPos * s),
            new Vector3(0.608, 0.716, zPos * s),
          ]),
      ),
    [zPos],
  )

  return (
    <group position={unit ? SHIFTER_UNIT_OFFSET : [0, 0, 0]}>
      {[1, -1].map((s, i) => {
        const z = zPos * s
        /** 变速拨杆挂在体内侧（向车架中线偏 12mm），避开刹车手柄片 */
        const zPaddle = z - 0.012 * s
        return (
          <group key={s}>
            {/* 车把夹环（抱在把横上） */}
            <Tube
              from={[SHIFTER_BAR[0] + 0.002, SHIFTER_BAR[1], z - 0.019]}
              to={[SHIFTER_BAR[0] + 0.002, SHIFTER_BAR[1], z + 0.019]}
              r1={0.0155}
              segments={36}
            >
              <meshStandardMaterial {...mat.aluBlack} />
            </Tube>
            {/* 本体（泪滴状简化为圆角长盒，沿 X 略下倾） */}
            <RoundedBox
              args={[0.13, 0.036, 0.045]}
              radius={0.0028}
              smoothness={4}
              position={[SHIFTER_BODY[0], SHIFTER_BODY[1], z]}
              rotation={[0, 0, deg(-8)]}
              castShadow
            >
              <meshStandardMaterial {...mat.aluBlack} />
            </RoundedBox>
            {/* 橡胶护套（软质，只包住本体上半部：略大的圆角盒扣在上面） */}
            <RoundedBox
              args={[0.126, 0.024, 0.052]}
              radius={0.003}
              smoothness={4}
              position={[SHIFTER_BODY[0] + 0.002, SHIFTER_BODY[1] + 0.009, z]}
              rotation={[0, 0, deg(-8)]}
              castShadow
            >
              <meshStandardMaterial {...mat.soft} />
            </RoundedBox>
            {/* 手柄转轴（钢） */}
            <Tube from={[0.618, 0.826, z - 0.024]} to={[0.618, 0.826, z + 0.024]} r1={0.0075} segments={32}>
              <meshStandardMaterial {...mat.steel} />
            </Tube>
            {/* 刹车手柄片（从本体前下方弯下的弧板） */}
            <mesh castShadow>
              <tubeGeometry args={[leverCurves[i], 48, 0.006, 16, false]} />
              <meshStandardMaterial {...mat.alu} />
            </mesh>
            {/* 刹车线出口（本体前上方的出线口 + 一小段线管） */}
            <Tube from={[0.6215, 0.8385, z]} to={[0.63, 0.8455, z]} r1={0.0038} segments={20}>
              <meshStandardMaterial {...mat.aluBlack} />
            </Tube>
            <Tube from={[0.629, 0.8445, z]} to={[0.6385, 0.8515, z]} r1={0.0026} segments={16}>
              <meshStandardMaterial {...mat.housing} />
            </Tube>
            {/* 变速拨杆（本体前下方的薄片，圆角矩形板） */}
            <RoundedBox
              args={[0.034, 0.01, 0.0045]}
              radius={0.0015}
              smoothness={4}
              position={[0.606, 0.7955, zPaddle]}
              rotation={[0, 0, deg(-42)]}
              castShadow
            >
              <meshStandardMaterial {...mat.alu} />
            </RoundedBox>
          </group>
        )
      })}
    </group>
  )
}
