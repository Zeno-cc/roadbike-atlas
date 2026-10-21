/**
 * 公路车车型归类
 *
 * 依据主流品牌（Trek 崔克 / Specialized 闪电 / Canyon / 迪卡侬 Van Rysel / 喜德盛 XDS）
 * 的在售车系划分：按"设计取向"分为五类，标注每类的设计特征与代表车型。
 * 本站 3D 模型即按其中「气动全能」这一代的设计语言建模（压缩几何、下沉后上叉、
 * Kamm-tail 气动管型、45mm 中深圈、D 形气动座管）。
 */

export interface BikeTypeModel {
  brand: string
  models: string[]
}

export interface BikeType {
  id: string
  nameZh: string
  nameEn: string
  tagline: string
  traits: string[]
  models: BikeTypeModel[]
  color: string
}

export const bikeTypes: BikeType[] = [
  {
    id: 'aero',
    nameZh: '气动竞速',
    nameEn: 'Aero Race',
    tagline: '为平路速度而生：把风阻压到极致',
    traits: [
      '深截面 Kamm-tail 气动管型（下管/立管前后深、左右窄）',
      '下沉后上叉 + 全隐藏走线 + 一体式把组',
      '50mm 以上深圈、气动座管（D 形或刀形）',
      '车重 7.5-8.5kg，几何激进、堆高偏低',
    ],
    models: [
      { brand: 'Trek 崔克', models: ['Madone Gen 8'] },
      { brand: 'Specialized 闪电', models: ['Tarmac SL8 / SL9（准气动全能）', 'Venge'] },
      { brand: 'Canyon', models: ['Aeroad'] },
      { brand: '喜德盛 XDS', models: ['AD 系列'] },
    ],
    color: '#38bdf8',
  },
  {
    id: 'allround',
    nameZh: '全能爬坡',
    nameEn: 'All-Rounder / Climbing',
    tagline: '轻量爬坡为主、兼顾气动的"一车走天下"',
    traits: [
      '管型更细，补强集中在五通与头管',
      '车重 6.8-7.5kg（顶级碳架整车）',
      '35-45mm 中框轮组，兼顾加速与巡航',
      '经典爬坡几何，兼顾稳定与灵敏',
    ],
    models: [
      { brand: 'Trek 崔克', models: ['Émonda'] },
      { brand: 'Specialized 闪电', models: ['Aethos 2'] },
      { brand: 'Canyon', models: ['Ultimate'] },
      { brand: '迪卡侬 Van Rysel', models: ['RCR'] },
    ],
    color: '#a78bfa',
  },
  {
    id: 'endurance',
    nameZh: '耐力舒适',
    nameEn: 'Endurance',
    tagline: '长途与烂路友好：直立几何 + 减震设计',
    traits: [
      '头管更高、后三角更长，骑行姿势直立',
      '减震结构（IsoSpeed / Future Shock / 弹性后叉等）',
      '可装 32-35c 宽胎，标配碟刹',
      '几何以稳定与舒适优先',
    ],
    models: [
      { brand: 'Trek 崔克', models: ['Domane'] },
      { brand: 'Specialized 闪电', models: ['Roubaix'] },
      { brand: 'Canyon', models: ['Endurace'] },
      { brand: '迪卡侬', models: ['Triban RC520'] },
    ],
    color: '#34d399',
  },
  {
    id: 'gravel',
    nameZh: '砾石全地形',
    nameEn: 'Gravel',
    tagline: '公路与土路通吃：宽胎 + 挂载孔位',
    traits: [
      '40-50c 宽胎余量，胎齿与通过性优先',
      '货架 / 挡泥板 / 多水壶挂载孔位',
      '几何更稳，1× 单盘配置常见',
      '桶轴 + 碟刹标配，部分带减震把立',
    ],
    models: [
      { brand: 'Trek 崔克', models: ['Checkpoint', 'Checkmate'] },
      { brand: 'Specialized 闪电', models: ['Diverge', 'Crux'] },
      { brand: 'Canyon', models: ['Grail'] },
      { brand: '迪卡侬 Van Rysel', models: ['GRVL'] },
    ],
    color: '#fbbf24',
  },
  {
    id: 'entry',
    nameZh: '入门通勤',
    nameEn: 'Entry / Fitness',
    tagline: '第一辆公路车：铝架 + 可靠套件',
    traits: [
      '铝合金车架 + 碳纤维前叉',
      '8-10 速入门套件（Shimano Claris / Sora 等）',
      '碟刹普及、28-32c 胎，几何偏舒适',
      '价格带 2000-6000 元，维护成本低',
    ],
    models: [
      { brand: '迪卡侬', models: ['Triban RC100 / RC120'] },
      { brand: '喜德盛 XDS', models: ['RC200 / RC300'] },
      { brand: 'Trek 崔克', models: ['Domane AL'] },
      { brand: 'Specialized 闪电', models: ['Allez'] },
    ],
    color: '#f472b6',
  },
]
