/**
 * 刹车系统零件模型：刹车夹器与卡钳 Caliper、刹车碟片 Rotor、来令片与刹车皮 BrakePads、
 * 刹把（油压手柄）BrakeLever
 *
 * 建模约定：几何直接建在"整车坐标"里（+X 车头方向、+Y 向上、+Z 传动侧）。
 * 碟刹零件全部装在左侧（-Z）：碟片平面在 B.rotor.offsetZ，卡钳挂在前叉 / 后上叉的平装座上，
 * 一副来令片夹在卡钳中间那条 6mm 的碟片缝里。
 * 每个零件组件都支持 unit 模式（零件单独预览页用）：把该零件摆成
 * 以原点为中心、适合单独展示或爆炸展示的形态。
 *
 * 渲染精度：圆柱 32-40 段、曲线管 40-56 段（径向 20）、挤出件 curveSegments 32；
 * 方盒类改用 RoundedBox；螺栓头一律 6 段圆柱（六角感）。
 * （碟片连接臂这类小短臂按比例降段：32 段 / 径向 14。）
 */
import { useMemo } from 'react'
// 类型副作用导入：激活 @react-three/fiber 对 React JSX 内置元素（mesh / boxGeometry …）的类型扩展，
// 工程其它文件同样依赖它（缺了它三个模型文件都会报 JSX.IntrinsicElements 噪音）
import type {} from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  Path,
  Shape,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Matrix4,
} from 'three'
import { B, deg, type Vec3 } from '../bikeConfig'
import { mat } from '../materials'
import { Instances, latheGeometry, trsMatrix } from '../geometryHelpers'

/* ================================================================== */
/* 通用：曲线与弯曲油管                                                 */
/* ================================================================== */

/** 控制点数组 → CatmullRom 曲线（弯曲的油管与刹把手柄片都用它） */
const curveOf = (points: Vec3[]) => new CatmullRomCurve3(points.map((p) => new Vector3(...p)))

/** 弯曲油管：圆管沿曲线走（刹车油管是柔性弯管，直筒 Tube 画不了） */
function Hose({
  curve,
  r,
  segments = 48,
  radial = 20,
}: {
  curve: CatmullRomCurve3
  r: number
  segments?: number
  radial?: number
}) {
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, segments, r, radial, false]} />
      <meshStandardMaterial {...mat.housing} />
    </mesh>
  )
}

/* ================================================================== */
/* 刹车夹器与卡钳                                                       */
/* ================================================================== */

/** 前后卡钳的安装锚点（都在左侧 -Z）与随平装座倾斜的角度 */
const CALIPERS: { key: string; pos: Vec3; tilt: number }[] = [
  { key: 'front', pos: [0.535, 0.47, -0.052], tilt: deg(20) }, // 前叉平装座
  { key: 'rear', pos: [-0.27, 0.53, -0.024], tilt: deg(35) }, // 后上叉平装座
]
/** 来令片装在前卡钳缝里 */
const FRONT_CALIPER = CALIPERS[0]

/** 卡钳油管：从顶部接头向上弯出约 0.06（前后卡钳共用同一段局部曲线） */
const CALIPER_HOSE = curveOf([
  [0, 0.038, -0.01],
  [0.004, 0.057, -0.011],
  [0.009, 0.076, -0.014],
  [0.012, 0.092, -0.019],
])

/**
 * 油管接头的"香蕉头"：从夹体顶部的六角螺母弯出一小段再汇入油管起点，
 * 走向与 CALIPER_HOSE 的起点咬合（末端落在 [0, 0.039, -0.0106] 附近）。
 */
const CALIPER_BANJO = curveOf([
  [0, 0.0315, -0.01],
  [0.0038, 0.0328, -0.0092],
  [0.0062, 0.0352, -0.0095],
  [0.0044, 0.0376, -0.0104],
  [0, 0.0392, -0.0106],
])

/**
 * 单只卡钳的局部几何：局部原点取"碟片缝"中心，局部 Z 轴垂直于碟片平面，
 * 装配时整组挂到平装座锚点上（前后卡钳形状相同，只是位置与倾角不同）。
 */
function CaliperBody() {
  return (
    <group>
      {/* 内侧夹体（靠车轮一侧）：圆角方盒 */}
      <RoundedBox
        args={[0.04, 0.055, 0.014]}
        radius={0.003}
        smoothness={4}
        position={[0, 0, 0.01]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>
      {/* 外侧夹体（靠安装座一侧），两片之间留 0.006 的碟片缝 */}
      <RoundedBox
        args={[0.04, 0.055, 0.014]}
        radius={0.003}
        smoothness={4}
        position={[0, 0, -0.01]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>

      {/* 夹体外侧面各嵌一条浅色散热槽（薄片，两侧夹体的外表面各一条） */}
      {[1, -1].map((s) => (
        <mesh key={`vent${s}`} position={[0, 0, 0.0172 * s]}>
          <boxGeometry args={[0.0092, 0.042, 0.0012]} />
          <meshStandardMaterial {...mat.alu} />
        </mesh>
      ))}

      {/* 活塞（两侧各一枚，藏在夹体内侧、正对来令片背板）：外圈铝 + 内盘阳极黑（分色） */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh position={[0, 0, 0.0065 * s]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.0095, 0.0095, 0.007, 32]} />
            <meshStandardMaterial {...mat.alu} />
          </mesh>
          <mesh position={[0, 0, 0.0037 * s]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0068, 0.0068, 0.0008, 32]} />
            <meshStandardMaterial {...mat.aluBlack} />
          </mesh>
        </group>
      ))}

      {/* 固定螺栓（两枚，沿 Z 穿过两片夹体拧进平装座，螺栓头朝碟片外侧） */}
      {[1, -1].map((s) => (
        <group key={s}>
          {/* 螺栓杆 */}
          <mesh position={[0.0135 * s, 0, -0.003]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.0035, 0.0035, 0.042, 32]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
          {/* 垫片（压在螺栓头下） */}
          <mesh position={[0.0135 * s, 0, -0.0243]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0066, 0.0066, 0.0016, 32]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
          {/* 六角螺栓头（窄端朝碟片外侧 -Z） */}
          <mesh position={[0.0135 * s, 0, -0.0265]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0058, 0.0052, 0.005, 6]} />
            <meshStandardMaterial {...mat.steel} />
          </mesh>
        </group>
      ))}

      {/* 油管接头：六角螺母（旋进夹体顶部出油口） */}
      <mesh position={[0, 0.028, -0.01]} castShadow>
        <cylinderGeometry args={[0.0056, 0.0056, 0.008, 6]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 香蕉头弯管（六角螺母 → 油管起点） */}
      <mesh castShadow>
        <tubeGeometry args={[CALIPER_BANJO, 40, 0.0034, 20, false]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      {/* 油管（从接头向上弯出，最终沿前叉 / 后上叉走向车把） */}
      <Hose curve={CALIPER_HOSE} r={0.0042} />
    </group>
  )
}

export function CaliperModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：只取一只居中（局部原点下移，把向上翘的油管一并收进取景）
    return (
      <group position={[0, -0.03, 0]}>
        <CaliperBody />
      </group>
    )
  }

  return (
    <group>
      {/* 前后各一只 */}
      {CALIPERS.map((c) => (
        <group key={c.key} position={c.pos} rotation={[0, 0, c.tilt]}>
          <CaliperBody />
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 刹车碟片                                                             */
/* ================================================================== */

/** 碟片几何参数（160mm 碟片：外半径 0.08） */
const ROTOR = {
  teeth: 24, // 外缘波浪齿数
  pitchR: 0.078, // 节圆半径（齿顶 = 节圆 + 齿高）
  toothDepth: 0.0035, // 波浪齿高（齿顶 ≈ 0.0815，波浪外缘更明显）
  thickness: 0.0018, // 钢盘厚度
  spiderR: 0.028, // 中央铝星形支架半径
  spiderT: 0.0022, // 支架厚度
  spiderZ: 0.0018, // 支架与连接臂贴在钢盘靠车轮里侧的一面
  armCount: 6, // 连接臂数量
  armRootR: 0.0255, // 连接臂根部半径（压在支架外缘上）
  armMidR: 0.037, // 连接臂中段半径
  armTipR: 0.0455, // 连接臂尖端半径（伸进摩擦环内缘）
  armTubeR: 0.0026, // 连接臂管径（沿 Z 压扁成扁臂）
  lockZ: -0.0035, // 中心锁环压在钢盘外侧（-Z）
}

/** 摩擦环上的孔：两圈散热孔 —— 8 个大镂空（出辐条感）+ 16 个小散热孔 */
const ROTOR_HOLES = [
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI * 2) / 8
    return { x: Math.cos(a) * 0.0505, y: Math.sin(a) * 0.0505, r: 0.0135 }
  }),
  ...Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI * 2) / 16 + Math.PI / 16
    return { x: Math.cos(a) * 0.0725, y: Math.sin(a) * 0.0725, r: 0.0048 }
  }),
]

/**
 * 摩擦环几何：24 齿波浪外缘 + 两圈挤出孔。
 * 与通用 makeGearGeometry 的区别：开启 bevel（孔边与齿边都有倒角感）、curveSegments 提到 32。
 */
function makeRotorBand(
  teeth: number,
  pitchR: number,
  thickness: number,
  toothDepth: number,
  holes: { x: number; y: number; r: number }[],
): BufferGeometry {
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
  for (const h of holes) {
    const path = new Path()
    path.absarc(h.x, h.y, h.r, 0, Math.PI * 2, false)
    shape.holes.push(path)
  }
  // 倒角吃掉的厚度：总厚仍为 thickness，孔边形成一圈 0.4mm 的斜面（单段斜面 = 倒角）
  const bevel = thickness * 0.22
  const geo = new ExtrudeGeometry(shape, {
    depth: thickness - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 32,
  })
  geo.translate(0, 0, -thickness / 2)
  return geo
}

/** 连接臂曲线（第 i 根，局部盘面 XY 平面内、z=0）：从支架边缘带弧度地甩到摩擦环内缘 */
function rotorArmCurve(i: number): CatmullRomCurve3 {
  const a = (i * Math.PI * 2) / ROTOR.armCount
  const at = (ang: number, r: number) =>
    new Vector3(Math.cos(ang) * r, Math.sin(ang) * r, 0)
  return new CatmullRomCurve3([
    at(a - 0.22, ROTOR.armRootR), // 根部（压在支架外缘上）
    at(a - 0.06, ROTOR.armMidR), // 中段（微微带弧度）
    at(a + 0.09, ROTOR.armTipR), // 尖端（伸进摩擦环内缘）
  ])
}

/** 中心锁环环体剖面（环 + 内花键齿圈） */
const LOCKRING_PROFILE: [number, number][] = [
  [0.0115, -0.0022],
  [0.0155, -0.0022],
  [0.0165, -0.0012],
  [0.0165, 0.0022],
  [0.0115, 0.0022],
  [0.0115, -0.0022],
]

/** 前后轮的碟片安装位置：都装在花鼓左侧的碟片座平面上 */
const ROTOR_POSITIONS: Vec3[] = [
  [B.frontHub[0], B.frontHub[1], B.rotor.offsetZ],
  [B.rearHub[0], B.rearHub[1], B.rotor.offsetZ],
]

/** 单片碟片（局部原点在盘心，盘面即 XY 平面、轴线沿 Z；几何由父组件建好共用） */
function RotorPiece({
  band,
  lockring,
  splines,
  arms,
}: {
  band: BufferGeometry
  lockring: BufferGeometry
  splines: Matrix4[]
  arms: BufferGeometry[]
}) {
  return (
    <group>
      {/* 摩擦环：外缘 24 个波浪齿 + 盘面两圈镂空孔（孔边带倒角） */}
      <mesh geometry={band} castShadow>
        <meshStandardMaterial {...mat.disc} />
      </mesh>
      {/* 中央铝星形支架（碟片中心） */}
      <mesh position={[0, 0, ROTOR.spiderZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[ROTOR.spiderR, ROTOR.spiderR, ROTOR.spiderT, 40]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 连接臂：6 根带弧度的扁臂（Tube 沿小曲线，沿 Z 压扁） */}
      {arms.map((geo, i) => (
        <mesh key={i} geometry={geo} castShadow>
          <meshStandardMaterial {...mat.alu} />
        </mesh>
      ))}
      {/* 中心锁环（环体压住碟片） */}
      <mesh geometry={lockring} position={[0, 0, ROTOR.lockZ]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 中心锁环的内齿（12 个内花键，锁环工具咬合处） */}
      <Instances matrices={splines}>
        <boxGeometry args={[0.003, 0.0026, 0.0048]} />
        <meshStandardMaterial {...mat.steel} />
      </Instances>
    </group>
  )
}

export function RotorModel({ unit = false }: { unit?: boolean }) {
  /** 两片碟片共用同一套几何（钢盘 / 锁环 / 内齿矩阵 / 连接臂） */
  const parts = useMemo(() => {
    const band = makeRotorBand(
      ROTOR.teeth,
      ROTOR.pitchR,
      ROTOR.thickness,
      ROTOR.toothDepth,
      ROTOR_HOLES,
    )
    const lockring = latheGeometry(LOCKRING_PROFILE, 40)
    const splines = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI * 2) / 12
      return trsMatrix([Math.cos(a) * 0.0102, Math.sin(a) * 0.0102, ROTOR.lockZ], [0, 0, a])
    })
    const arms = Array.from({ length: ROTOR.armCount }, (_, i) => {
      // 短臂按比例降段（32×14）：6 根 × 2 片的实例数下，再往上加段数只增面数不增观感
      const geo = new TubeGeometry(rotorArmCurve(i), 32, ROTOR.armTubeR, 14, false)
      geo.scale(1, 1, 0.62) // 压扁成扁臂
      geo.translate(0, 0, ROTOR.spiderZ)
      return geo
    })
    return { band, lockring, splines, arms }
  }, [])

  if (unit) {
    // 单独预览：单片居中，轴线沿 Z
    return (
      <group>
        <RotorPiece {...parts} />
      </group>
    )
  }

  return (
    <group>
      {/* 前后轮各一片 */}
      {ROTOR_POSITIONS.map((pos, i) => (
        <group key={i} position={pos}>
          <RotorPiece {...parts} />
        </group>
      ))}
    </group>
  )
}

/* ================================================================== */
/* 来令片与刹车皮                                                       */
/* ================================================================== */

/** 来令片几何参数（局部坐标系与卡钳一致：原点在碟片缝中心） */
const PAD = {
  backT: 0.0016, // 金属背板厚度
  frictionT: 0.003, // 摩擦材料层厚度
  // 整车安装：整片（背板 + 摩擦层，共 0.0046 厚）中心到碟片平面的距离 = 卡钳缝中心 ±0.0035，
  // 于是摩擦面落在 ±0.0012，给 0.0018 厚的碟片两侧各留 0.3mm 间隙
  sep: 0.0035,
  sepUnit: 0.0065, // 单独预览：刻意分开一点，露出中间的弹簧片
  finT: 0.0016, // 散热鳍片厚度
  finY: [-0.0105, -0.0035, 0.0035, 0.0105], // 4 片鳍片的高度位置
}

/** 一片来令片：金属背板 + 散热鳍片 + 摩擦材料层（dir 为朝向 +Z / -Z，z0 为整片中心到碟片平面的距离） */
function Pad({ dir, z0 }: { dir: number; z0: number }) {
  const backZ = (z0 + PAD.frictionT / 2) * dir // 背板中心
  const frictionZ = (z0 - PAD.backT / 2) * dir // 摩擦层中心
  const frictionFace = z0 - PAD.backT / 2 - PAD.frictionT / 2 // 摩擦面到碟片平面的距离
  return (
    <group>
      {/* 金属背板（背面，被活塞顶住） */}
      <mesh position={[0, 0, backZ]} castShadow>
        <boxGeometry args={[0.028, 0.032, PAD.backT]} />
        <meshStandardMaterial {...mat.steel} />
      </mesh>
      {/* 散热鳍片：4 片薄圆角板层叠贴在背板外侧 */}
      {PAD.finY.map((y) => (
        <RoundedBox
          key={y}
          args={[0.026, 0.0022, PAD.finT]}
          radius={0.0006}
          smoothness={3}
          position={[0, y, backZ + (PAD.backT / 2 + PAD.finT / 2) * dir]}
          castShadow
        >
          <meshStandardMaterial {...mat.steel} />
        </RoundedBox>
      ))}
      {/* 摩擦材料层（贴在背板内侧、面向碟片，与碟片留 0.3mm 间隙） */}
      <mesh position={[0, 0, frictionZ]} castShadow>
        <boxGeometry args={[0.03, 0.026, PAD.frictionT]} />
        <meshStandardMaterial {...mat.friction} />
      </mesh>
      {/* 摩擦面上的 2 条浅沟槽（薄片嵌入，深色，露出 0.5mm 的槽口） */}
      {[1, -1].map((s) => (
        <mesh key={s} position={[0.007 * s, 0, (frictionFace + 0.0003) * dir]}>
          <boxGeometry args={[0.0016, 0.021, 0.0004]} />
          <meshStandardMaterial {...mat.soft} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * 弹簧片（细钢丝双弓形）：两段细管在 YZ 平面内各弯成一道弓，
 * 两端小钩压住两侧来令片背板、中段收在碟片缝中间。
 */
function PadSpring({ bow }: { bow: number }) {
  const bows = useMemo(
    () =>
      [1, -1].map((sx) =>
        curveOf([
          [-0.0115 * sx, -0.0145, -bow * 0.2], // 下端小钩
          [-0.0115 * sx, -0.0105, -bow * 0.5], // 压住 -Z 侧来令片
          [-0.0115 * sx, -0.0055, -bow * 0.18],
          [-0.0115 * sx, 0.0055, bow * 0.18],
          [-0.0115 * sx, 0.0105, bow * 0.5], // 压住 +Z 侧来令片
          [-0.0115 * sx, 0.0145, bow * 0.2], // 上端小钩
        ]),
      ),
    [bow],
  )
  return (
    <group>
      {bows.map((curve, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[curve, 48, 0.0008, 20, false]} />
          <meshStandardMaterial {...mat.steel} />
        </mesh>
      ))}
    </group>
  )
}

export function BrakePadsModel({ unit = false }: { unit?: boolean }) {
  if (unit) {
    // 单独预览：一副来令片 + 弹簧摆在原点，稍微分开（拆开感）
    return (
      <group>
        {[1, -1].map((s) => (
          <Pad key={s} dir={s} z0={PAD.sepUnit} />
        ))}
        <PadSpring bow={PAD.sepUnit * 0.8} />
      </group>
    )
  }

  // 整车位置：装在前卡钳的碟片缝里（z ≈ -0.052 ± 0.0035），基本被卡钳遮住
  return (
    <group position={FRONT_CALIPER.pos} rotation={[0, 0, FRONT_CALIPER.tilt]}>
      {[1, -1].map((s) => (
        <Pad key={s} dir={s} z0={PAD.sep} />
      ))}
      <PadSpring bow={PAD.sep * 0.8} />
    </group>
  )
}

/* ================================================================== */
/* 刹把（油压手柄）                                                     */
/* ================================================================== */

/**
 * 刹把安装锚点（车把右侧手变位置）。
 * 下面的局部坐标一律按"世界坐标 - LEVER_POS"给出：unit 模式整组平移到原点居中。
 */
const LEVER_POS: Vec3 = [0.585, 0.815, 0.185]
/** unit 模式整体平移量（把主缸 + 手柄 + 短油管的构图挪到原点） */
const LEVER_UNIT_SHIFT: Vec3 = [0.015, 0.05, 0]

/** 刹车手柄片：从主缸前端向前下方弯出的曲线（末端收到 [0.598, 0.705, 0.185]） */
const LEVER_BLADE = curveOf([
  [0.035, -0.01, 0],
  [0.05, -0.038, 0],
  [0.049, -0.07, 0],
  [0.032, -0.097, 0],
  [0.013, -0.11, 0],
])

/** 油管：从主缸后端向 -X 沿车把走约 0.15，再向下弯约 0.1 */
const LEVER_HOSE = curveOf([
  [-0.034, 0.004, 0],
  [-0.07, 0.011, -0.006],
  [-0.105, 0.012, -0.018],
  [-0.135, 0.007, -0.032],
  [-0.15, -0.022, -0.046],
  [-0.155, -0.058, -0.056],
  [-0.148, -0.093, -0.062],
])

/** 单独预览用的短油管（只留出油口附近一小段） */
const LEVER_HOSE_SHORT = curveOf([
  [-0.034, 0.004, 0],
  [-0.055, 0.009, -0.004],
  [-0.072, 0.004, -0.012],
  [-0.082, -0.013, -0.018],
])

export function BrakeLeverModel({ unit = false }: { unit?: boolean }) {
  return (
    <group position={unit ? LEVER_UNIT_SHIFT : LEVER_POS}>
      {/* 主缸本体（圆柱沿 X、略下倾 8°）+ 后端的储油舱 */}
      <group rotation={[0, 0, -deg(8)]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, 0.045, 40]} />
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        {/* 主缸前端机加工环（露出在枢轴座上方的一小圈） */}
        <mesh position={[0.0205, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0115, 0.0115, 0.0022, 40]} />
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        {/* 储油舱（旅行箱式，藏在手变头内部上方） */}
        <mesh position={[-0.0245, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0125, 0.0125, 0.02, 36]} />
          <meshStandardMaterial {...mat.aluBlack} />
        </mesh>
        {/* 主缸端盖（压在储油舱尾端）+ 端盖中心的六角孔 */}
        <mesh position={[-0.0355, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0134, 0.0134, 0.0034, 40]} />
          <meshStandardMaterial {...mat.alu} />
        </mesh>
        <mesh position={[-0.0362, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.0038, 0.0038, 0.0022, 6]} />
          <meshStandardMaterial {...mat.soft} />
        </mesh>
      </group>

      {/* 手柄枢轴座（主缸前端，手柄就挂在这里）：圆角方盒 */}
      <RoundedBox
        args={[0.024, 0.03, 0.018]}
        radius={0.002}
        smoothness={4}
        position={[0.026, -0.007, 0]}
        castShadow
      >
        <meshStandardMaterial {...mat.aluBlack} />
      </RoundedBox>

      {/* Reach 调节旋钮：底座 + 8 段棱纹旋钮（坐在枢轴座顶面） */}
      <mesh position={[0.031, 0.0086, 0]} castShadow>
        <cylinderGeometry args={[0.0048, 0.0048, 0.0016, 32]} />
        <meshStandardMaterial {...mat.aluBlack} />
      </mesh>
      <mesh position={[0.031, 0.0118, 0]} castShadow>
        <cylinderGeometry args={[0.0036, 0.0036, 0.005, 8]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>

      {/* 刹车手柄片（沿曲线弯下的圆管，段数提到 48） */}
      <mesh castShadow>
        <tubeGeometry args={[LEVER_BLADE, 48, 0.0055, 20, false]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 手柄根部圆头（把开口的管端收进主缸前端） */}
      <mesh position={[0.035, -0.01, 0]}>
        <sphereGeometry args={[0.0055, 24, 16]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 手柄末端圆头 */}
      <mesh position={[0.013, -0.11, 0]} castShadow>
        <sphereGeometry args={[0.0055, 24, 16]} />
        <meshStandardMaterial {...mat.alu} />
      </mesh>
      {/* 油管 */}
      <Hose
        curve={unit ? LEVER_HOSE_SHORT : LEVER_HOSE}
        r={0.0045}
        segments={unit ? 48 : 56}
        radial={20}
      />
    </group>
  )
}
