/**
 * 材质预设：整车的"配色方案"。
 * - `mat`：标准材质预设，供 `<meshStandardMaterial {...mat.xxx} />` 使用（大部分零件）
 * - `matP`：物理材质预设（清漆漆面 / 光泽碳纤），供 `<meshPhysicalMaterial {...matP.xxx} />` 使用
 * 每个 mesh 内联使用自己的材质实例，交互层才能逐个改 emissive/opacity 实现高亮与透视。
 * 纹理均为程序化生成（见 textures.ts），可安全在多个材质间共享。
 */
import { Vector2 } from 'three'
import {
  barTapeRibNormal,
  brushedMetalRoughness,
  carbonWeaveNormal,
  decalBadgeTexture,
  decalBrandTexture,
  decalSmallTexture,
  tireTreadNormal,
} from './textures'

const carbonWeave = carbonWeaveNormal()
const brushed = brushedMetalRoughness()
const tread = tireTreadNormal()
const tapeRib = barTapeRibNormal()
export const decals = {
  brand: decalBrandTexture(),
  badge: decalBadgeTexture(),
  small: decalSmallTexture(),
}

export const mat = {
  /** 车架漆面（深蓝竞赛色）—— 标准材质版（非物理） */
  paintBlue: { color: '#1e40af', metalness: 0.5, roughness: 0.26 },
  /** 车架漆面（副色/前叉） */
  paintBlueDark: { color: '#172554', metalness: 0.5, roughness: 0.28 },
  /** 碳纤维（轮圈/座管/车把）：斜纹法线 + 半光泽 */
  carbon: {
    color: '#24262c',
    metalness: 0.42,
    roughness: 0.36,
    normalMap: carbonWeave,
    normalScale: new Vector2(0.22, 0.22),
  },
  /** 未上漆的碳纤维表面（消光） */
  carbonRaw: {
    color: '#1b1d22',
    metalness: 0.32,
    roughness: 0.52,
    normalMap: carbonWeave,
    normalScale: new Vector2(0.3, 0.3),
  },
  /** 抛光铝合金：拉丝粗糙度变化 */
  alu: {
    color: '#cdd2d9',
    metalness: 1.0,
    roughness: 0.32,
    roughnessMap: brushed,
  },
  /** 阳极氧化黑铝 */
  aluBlack: { color: '#2b2e35', metalness: 0.9, roughness: 0.36 },
  /** 钢（快拆杆、螺丝） */
  steel: { color: '#a8b0b9', metalness: 1.0, roughness: 0.28 },
  /** 钛合金（坐垫轨） */
  ti: { color: '#bcbdc0', metalness: 0.92, roughness: 0.32 },
  /** 链条/飞轮传动金属 */
  drivetrain: { color: '#d3d8de', metalness: 1.0, roughness: 0.22 },
  /** 碟片 */
  disc: { color: '#b3b9c1', metalness: 1.0, roughness: 0.3, roughnessMap: brushed },
  /** 橡胶（轮胎/把带/来令片背）：胎纹法线 */
  rubber: {
    color: '#141518',
    metalness: 0.0,
    roughness: 0.94,
    normalMap: tread,
    normalScale: new Vector2(0.5, 0.5),
  },
  /** 软质黑色塑料（手变套、坐垫） */
  soft: { color: '#0e0f12', metalness: 0.0, roughness: 0.82 },
  /** 坐垫表面（细微皮纹质感用碳纹弱化版代替） */
  saddle: {
    color: '#101114',
    metalness: 0.0,
    roughness: 0.78,
    normalMap: carbonWeave,
    normalScale: new Vector2(0.08, 0.08),
  },
  /** 把带：螺旋棱纹法线 */
  tape: {
    color: '#232833',
    metalness: 0.0,
    roughness: 0.88,
    normalMap: tapeRib,
    normalScale: new Vector2(0.4, 0.4),
  },
  /** 内胎橡胶（略亮） */
  inner: { color: '#2a2c30', metalness: 0.0, roughness: 0.9 },
  /** 刹车油管/线管外壳 */
  housing: { color: '#17181c', metalness: 0.2, roughness: 0.6 },
  /** 来令片摩擦材料 */
  friction: { color: '#4b4f56', metalness: 0.3, roughness: 0.7 },
} as const

export type MaterialPreset = keyof typeof mat

/**
 * 物理材质预设（clearcoat 清漆）：用于需要"湿润反光"的高级表面。
 * 用法：`<meshPhysicalMaterial {...matP.paintBlue} />`
 */
export const matP = {
  /** 车架主漆面：深海军蓝金属漆（对标现代高端车漆的"Deep Marine"质感） */
  paintMarine: {
    color: '#123a86',
    metalness: 0.78,
    roughness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.3,
  },
  /** 前叉/副色漆面：更深一号的海军蓝 */
  paintMarineDark: {
    color: '#0c2a63',
    metalness: 0.78,
    roughness: 0.32,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.25,
  },
  /** 光泽碳纤维（轮圈/一体把）：清漆 + 斜纹 */
  carbonGloss: {
    color: '#22242a',
    metalness: 0.45,
    roughness: 0.38,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    normalMap: carbonWeave,
    normalScale: new Vector2(0.2, 0.2),
    envMapIntensity: 1.1,
  },
} as const
