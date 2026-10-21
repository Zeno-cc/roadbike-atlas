/**
 * 公路车零部件图鉴 —— 内容数据模型
 *
 * 所有内容文件（content/parts/*.ts、glossary.ts、assembly.ts）都遵循这里的类型。
 * 修改内容只需编辑对应数据文件，无需改动任何组件代码。
 */

/** 六大系统 */
export type SystemId =
  | 'frame' // 车架系统
  | 'wheels' // 轮组系统
  | 'drivetrain' // 传动系统
  | 'brakes' // 刹车系统
  | 'cockpit' // 操控系统
  | 'seating' // 座舱系统

/** 规格参数表的一行 */
export interface SpecItem {
  label: string
  value: string
  note?: string
}

/** 安装步骤（每步都尽量带上工具、扭矩与警告） */
export interface InstallStep {
  title: string
  detail: string
  tools?: string[]
  torque?: string
  warning?: string
}

/** 调校项目 */
export interface TuningItem {
  title: string
  detail: string
}

/** 保养周期条目 */
export interface MaintenanceItem {
  interval: string
  task: string
}

/** 故障排查条目：症状 → 原因 → 解决 */
export interface TroubleshootItem {
  symptom: string
  cause: string
  fix: string
}

/** 零件 */
export interface Part {
  id: string
  nameZh: string
  nameEn: string
  /** 常用缩写，如 BB / FD / RD */
  abbr?: string
  system: SystemId
  /** 一句话功能（卡片与摘要用） */
  summary: string
  /** 结构说明：由哪些子部件组成、各起什么作用 */
  structure: string[]
  /** 工作原理 */
  principle: string[]
  /** 关键规格参数 */
  specs: SpecItem[]
  /** 安装所需工具 */
  tools: string[]
  /** 推荐扭矩范围 */
  torque?: string
  /** 兼容性要点 */
  compatibility?: string[]
  /** 安装步骤（从零件到装上车） */
  installSteps: InstallStep[]
  /** 拆卸要点（顺序、注意事项） */
  disassembly: string[]
  /** 调校方法（选填） */
  tuning?: TuningItem[]
  /** 常见错误 */
  commonMistakes: string[]
  /** 保养周期 */
  maintenance: MaintenanceItem[]
  /** 故障排查 */
  troubleshooting: TroubleshootItem[]
  /** 关联零件 id */
  related: string[]
}

/** 系统 */
export interface BikeSystem {
  id: SystemId
  nameZh: string
  nameEn: string
  /** 主题色（3D 高亮与 UI 标签共用） */
  color: string
  summary: string
  /** 系统层面的工作原理（如变速系统如何工作） */
  principle: string[]
}

/** 术语条目（中英对照） */
export interface GlossaryEntry {
  term: string
  en: string
  abbr?: string
  desc: string
  system: SystemId | 'general'
}

/** 整车组装流程的一个步骤 */
export interface AssemblyStep {
  order: number
  title: string
  detail: string
  /** 本步骤涉及的零件 id */
  partIds: string[]
  tools: string[]
  torque?: string
  tips?: string
}
