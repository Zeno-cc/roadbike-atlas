/**
 * 公路车几何配置（单位：米，1:1 全尺寸）
 *
 * 坐标系约定：
 *   +X = 车头方向（前进方向）
 *   +Y = 向上
 *   +Z = 骑手右侧（传动侧；碟片等非传动侧零件在 -Z）
 *
 * 基准：54 码「现代全能型公路车」（对标 Trek Madone Gen 8 / Specialized Tarmac SL8
 * 这一代的设计语言）：
 *   - 压缩几何：上管向后下方倾斜（slope ≈ 10°），立管顶降低、座管露出更长
 *   - 下沉后上叉（dropped seat stays）：后上叉接在立管中段而非上管交汇处
 *   - Kamm-tail 气动管型：下管/立管/头管前后深、左右窄
 *   - 45mm 深圈轮组、28c 轮胎、碟刹、桶轴
 * 轴距 990mm、五通下沉 70mm、立管角 73.5°、头管角 73°。
 */

export type Vec3 = [number, number, number]

export const wheelR = 0.34 // 外胎外半径（700c + 28c ≈ 678mm 直径）
export const rimR = 0.311 // 轮圈外半径（ISO 622 轮圈）
export const rimDepth = 0.045 // 圈深（45mm 中深气动圈）
export const tireWidth = 0.028

export const B = {
  /** 五通中心 */
  bb: [0, 0.27, 0] as Vec3,
  /** 后轮轴心 */
  rearHub: [-0.415, 0.34, 0] as Vec3,
  /** 前轮轴心 */
  frontHub: [0.575, 0.34, 0] as Vec3,
  /** 立管顶端（压缩几何：比上管交汇处高一点，是座管夹位置） */
  seatTop: [-0.133, 0.72, 0] as Vec3,
  /** 下沉后上叉在立管上的连接点（低于上管交汇处 ~65mm） */
  seatStayTop: [-0.126, 0.655, 0] as Vec3,
  /** 头管顶端 / 底端 */
  headTop: [0.4, 0.82, 0] as Vec3,
  headBottom: [0.438, 0.696, 0] as Vec3,
  /** 头管倾角（与水平面夹角，度） */
  headAngleDeg: 73,
  seatAngleDeg: 73.5,

  /** 气动管型截面：w = 车宽方向（Z）宽，d = 前后方向深（Kamm-tail 尾缘略平） */
  tube: {
    downTube: { w: 0.034, dHead: 0.05, dBb: 0.038 },
    topTube: { w: 0.031, d: 0.027 },
    seatTube: { w: 0.031, d: 0.042, wTop: 0.026, dTop: 0.036 },
    headTube: { w: 0.038, dTop: 0.048, dBottom: 0.058 },
    seatStay: { w: 0.013, d: 0.022 },
    chainStay: { w: 0.017, d: 0.028 },
  },
  /** 五通壳体 */
  bbShell: { r: 0.023, w: 0.068 }, // BSA 68mm

  /** 前叉（气动叉：叉腿扁截面、叉肩渐变） */
  fork: {
    crown: [0.452, 0.655, 0] as Vec3, // 叉肩中心
    steererR: 0.014,
    bladeW: 0.0125, // 叉腿截面宽（车宽方向）
    bladeD: 0.019, // 叉腿截面深（前后方向）
    axleR: 0.006,
  },

  /** 车把 / 把立 */
  bar: {
    center: [0.5, 0.845, 0] as Vec3, // 车把中心（把立前端）
    width: 0.4, // 400mm
    reach: 0.08,
    drop: 0.128,
    tubeR: 0.0119, // 31.8mm 把立夹持区
    tubeBarR: 0.0115,
  },
  stem: {
    length: 0.1,
    angleDeg: -6,
    clampR: 0.0159,
  },

  /** 座舱：压缩几何下车架更矮，座管露出更长 */
  saddleTopY: 1.005,
  seatpost: { w: 0.026, d: 0.038, setback: 0 }, // D 形气动座管（后缘略平）

  /** 传动 */
  crank: {
    armLength: 0.1725,
    ring50R: 0.101,
    ring34R: 0.069,
    qFactorHalf: 0.075,
    armW: 0.03,
  },
  cassette: {
    /** 12 速飞轮齿数（从大到小） */
    teeth: [34, 30, 27, 24, 21, 19, 17, 16, 15, 14, 13, 11],
    /** 齿片堆叠总宽（沿 Z） */
    width: 0.041,
    /** 塔基直径 */
    bodyR: 0.016,
  },
  chain: { pitch: 0.0127, inner: 0.0058, outer: 0.0068 },

  /** 刹车 */
  rotor: { r: 0.08, thickness: 0.0018, offsetZ: -0.033 }, // 160mm 碟片，装在左侧
  caliper: { flatMountZ: -0.042 },

  /** 变速 */
  derailleur: {
    rdBody: [-0.45, 0.33, 0.045] as Vec3,
    fdClamp: [-0.02, 0.55, 0] as Vec3,
  },
} as const

/** 常用角度换算 */
export const deg = (d: number) => (d * Math.PI) / 180
