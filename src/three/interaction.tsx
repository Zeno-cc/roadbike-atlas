import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Box3, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { partById } from '../../content/parts'
import { systemById } from '../../content/systems'
import type { Vec3 } from './bikeConfig'

/* ------------------------------------------------------------------ */
/* 爆炸视图向量：每个零件在"炸开"时相对整车的位移（米）                 */
/* 车轮零件向 +Z（传动侧）飞出，碟片向 -Z（左侧）飞出，                */
/* 操控/座舱零件向上飞出，传动零件向侧下方飞出。                        */
/* ------------------------------------------------------------------ */
export const EXPLODE: Record<string, Vec3> = {
  // 车架系统
  frame: [0, 0, 0],
  fork: [0.16, -0.12, -0.34],
  headset: [0, 0.3, -0.12],
  'bottom-bracket': [0, -0.12, 0.42],
  // 轮组系统
  hub: [0, 0, 0.28],
  rim: [0, 0, 0.58],
  spoke: [0, -0.1, 0.42],
  tire: [0, -0.04, 0.88],
  tube: [0, 0.12, 0.74],
  axle: [0, 0, 0.48],
  // 传动系统
  crankset: [0, -0.04, 0.46],
  pedal: [0.12, -0.3, 0],
  cassette: [0, 0, 0.78],
  chain: [0.08, -0.18, 0.36],
  'front-derailleur': [0.16, -0.22, -0.3],
  'rear-derailleur': [-0.26, -0.28, 0.36],
  shifter: [0.22, 0.14, 0],
  // 刹车系统
  'brake-caliper': [0.06, -0.04, -0.5],
  rotor: [0, -0.08, -0.86],
  'brake-pads': [-0.08, -0.14, -0.66],
  'brake-lever': [0.36, 0.12, 0.06],
  // 操控系统
  handlebar: [0.08, 0.38, 0],
  stem: [0.42, 0.16, 0],
  'bar-tape': [0.18, 0.48, 0.02],
  // 座舱系统
  seatpost: [-0.05, 0.3, 0],
  saddle: [0, 0.52, 0],
  'seatpost-clamp': [0.02, 0.2, -0.32],
}

/* ------------------------------------------------------------------ */
/* 场景控制器：装配动画、爆炸、高亮/透视                                */
/* ------------------------------------------------------------------ */

interface PartEntry {
  group: Group
  base: Vec3
  explode: Vec3
  /** 该零件的安装开始时刻（秒） */
  installAt: number
}

export class BikeController {
  groups = new Map<string, PartEntry>()
  /** 爆炸系数 0..1（滑杆） */
  explodeFactor = 0
  /** 装配动画状态 */
  playing = false
  t = 0
  installDuration = 0.55
  private perStep = 0.75
  private stepCount = 0
  private stepPartIds: string[][] = []
  totalDuration = 0
  /** 装配步骤回调（当前进行到第几步；-1 表示未播放） */
  onStep: ((stepIndex: number) => void) | null = null
  /** 装配动画自然播完时回调 */
  onEnd: (() => void) | null = null
  private lastStep = -1

  /** 每个零件当前"已安装程度" 0..1（1 = 完全就位） */
  progressOf(id: string): number {
    if (!this.playing) return 1
    const entry = this.groups.get(id)
    const t0 = entry?.installAt ?? 0
    return Math.min(1, Math.max(0, (this.t - t0) / this.installDuration))
  }

  /**
   * 登记装配流程（内容层组装步骤的零件顺序）。
   * 注意：真正的时间表在 play() 时才计算 —— 零件组的注册发生在子组件挂载时，
   * 早于此处调用无法保证 groups 已就绪。
   */
  buildSchedule(stepPartIds: string[][], perStep = 0.75) {
    this.stepPartIds = stepPartIds
    this.perStep = perStep
    this.stepCount = stepPartIds.length
    const lastStepStart = Math.max(0, this.stepCount - 1) * perStep
    this.totalDuration = lastStepStart + 0.22 * 3 + this.installDuration + 0.5
  }

  /** 依据已注册的零件计算各零件安装时刻 */
  private applySchedule() {
    const assigned = new Set<string>()
    this.stepPartIds.forEach((ids, stepIdx) => {
      ids.forEach((id, i) => {
        if (assigned.has(id)) return
        const entry = this.groups.get(id)
        if (entry) {
          entry.installAt = stepIdx * this.perStep + i * 0.22
          assigned.add(id)
        }
      })
    })
    // 未被流程覆盖的零件放到最后
    this.groups.forEach((entry, id) => {
      if (!assigned.has(id)) entry.installAt = this.stepCount * this.perStep
    })
  }

  play() {
    this.applySchedule()
    this.t = 0
    this.playing = true
    this.lastStep = -1
  }

  /** 结束装配动画（爆炸滑杆介入时调用），所有零件立即视为已安装 */
  settle() {
    if (!this.playing) return
    this.playing = false
    this.t = 0
    this.lastStep = -1
    this.onStep?.(-1)
  }

  /** 每帧推进装配动画 */
  update(dt: number) {
    if (!this.playing) return
    this.t += dt
    const step = Math.min(this.stepCount - 1, Math.floor(this.t / this.perStep))
    if (step !== this.lastStep) {
      this.lastStep = step
      this.onStep?.(step)
    }
    if (this.t >= this.totalDuration) {
      this.playing = false
      this.t = 0
      this.onStep?.(-1)
      this.onEnd?.()
    }
  }

  /** 每帧根据爆炸系数与安装进度摆放所有零件 */
  applyTransforms() {
    const f = this.explodeFactor
    for (const [id, entry] of this.groups) {
      const p = this.progressOf(id)
      // 安装阶段用 easeOutBack：略微越过就位点再回弹，模拟"咔哒入位"
      const eased = this.playing ? easeOutBack(p) : p
      const sep = Math.max(f, 1 - eased)
      // 飞行过程中带一点上抛弧线，观感更自然
      const arc = p < 1 ? Math.sin(Math.PI * (1 - p)) * 0.05 : 0
      entry.group.position.set(
        entry.base[0] + entry.explode[0] * sep,
        entry.base[1] + entry.explode[1] * sep + arc,
        entry.base[2] + entry.explode[2] * sep,
      )
    }
  }

  /* ---------------------- 高亮 / 透视 ---------------------- */

  applyVisuals(hovered: string | null, selected: string | null) {
    for (const [id, entry] of this.groups) {
      const part = partById[id]
      const color = part ? systemById[part.system].color : '#64748b'
      const isHovered = id === hovered
      const isSelected = id === selected
      const dim = selected !== null && !isSelected
      entry.group.traverse((obj) => {
        const mesh = obj as Mesh
        if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
        const material = mesh.material as MeshStandardMaterial
        if (!material || !('emissive' in material)) return
        const intensity = isSelected ? 0.5 : isHovered ? 0.33 : 0
        material.emissive.set(intensity > 0 ? color : '#000000')
        material.emissiveIntensity = intensity
        const targetOpacity = dim ? 0.16 : 1
        if (material.opacity !== targetOpacity) {
          material.transparent = targetOpacity < 1
          material.opacity = targetOpacity
          material.depthWrite = targetOpacity >= 1
          material.needsUpdate = true
        }
      })
    }
  }

  /** 零件当前的世界包围盒（相机聚焦用）——手动处理 InstancedMesh（链条/辐条） */
  worldBox(id: string): Box3 | null {
    const entry = this.groups.get(id)
    if (!entry) return null
    entry.group.updateWorldMatrix(true, true)
    const box = new Box3()
    entry.group.traverse((obj) => {
      const mesh = obj as Mesh & {
        isInstancedMesh?: boolean
        boundingBox?: Box3 | null
        computeBoundingBox?: () => void
      }
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
      if (mesh.isInstancedMesh && mesh.computeBoundingBox) {
        mesh.computeBoundingBox()
        if (mesh.boundingBox) box.union(mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld))
      } else {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
        if (mesh.geometry.boundingBox) {
          box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld))
        }
      }
    })
    return box.isEmpty() ? null : box
  }
}

/* ------------------------------------------------------------------ */
/* 装配动画控制器                                                      */
/* ------------------------------------------------------------------ */

/** 缓出回弹（overshoot）：零件"咔哒入位"的微过冲手感 */
const BACK_C1 = 1.70158
const BACK_C3 = BACK_C1 + 1
function easeOutBack(x: number): number {
  const t = x - 1
  return 1 + BACK_C3 * t * t * t + BACK_C1 * t * t
}

export interface SceneContextValue {
  controller: BikeController
  setHovered: Dispatch<SetStateAction<string | null>>
  setSelected: Dispatch<SetStateAction<string | null>>
}

export const SceneContext = createContext<SceneContextValue | null>(null)

export function useScene() {
  const ctx = useContext(SceneContext)
  if (!ctx) throw new Error('useScene 必须在 BikeScene 内使用')
  return ctx
}

/** 可交互零件组：包住零件的全部网格，处理注册、悬停、点击 */
export function PartGroup({ id, children }: { id: string; children: ReactNode }) {
  const { controller, setHovered, setSelected } = useScene()
  const ref = useRef<Group>(null)

  useEffect(() => {
    const group = ref.current
    if (!group) return
    controller.groups.set(id, {
      group,
      base: [group.position.x, group.position.y, group.position.z],
      explode: EXPLODE[id] ?? [0, 0, 0],
      installAt: 0,
    })
    controller.applyVisuals(null, null)
    return () => {
      controller.groups.delete(id)
    }
  }, [id, controller])

  return (
    <group
      ref={ref}
      userData={{ partId: id }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered((cur) => (cur === id ? null : cur))
      }}
      onClick={(e) => {
        e.stopPropagation()
        setSelected(id)
      }}
    >
      {children}
    </group>
  )
}
