import { describe, expect, it } from 'vitest'
import { parts, partById } from '../content/parts'
import { systems } from '../content/systems'
import { glossary } from '../content/glossary'
import { assemblySteps } from '../content/assembly'
import { bikeTypes } from '../content/bikeTypes'

/** 全部 27 个零件的预期 id（新增零件时同步更新） */
const EXPECTED_PART_IDS = [
  // 车架系统
  'frame',
  'fork',
  'headset',
  'bottom-bracket',
  // 轮组系统
  'hub',
  'rim',
  'spoke',
  'tire',
  'tube',
  'axle',
  // 传动系统
  'crankset',
  'pedal',
  'cassette',
  'chain',
  'front-derailleur',
  'rear-derailleur',
  'shifter',
  // 刹车系统
  'brake-caliper',
  'rotor',
  'brake-pads',
  'brake-lever',
  // 操控系统
  'handlebar',
  'stem',
  'bar-tape',
  // 座舱系统
  'seatpost',
  'saddle',
  'seatpost-clamp',
]

const systemIds = systems.map((s) => s.id)

describe('零件数据完整性', () => {
  it('包含全部 27 个预期零件，且 id 不重复', () => {
    const ids = parts.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of EXPECTED_PART_IDS) {
      expect(ids, `缺少零件: ${id}`).toContain(id)
    }
    expect(ids.length).toBe(EXPECTED_PART_IDS.length)
  })

  it('每个零件 system 都是已定义系统，且每个系统至少 3 个零件', () => {
    for (const p of parts) {
      expect(systemIds, `${p.id} 的 system 非法`).toContain(p.system)
    }
    for (const s of systems) {
      const count = parts.filter((p) => p.system === s.id).length
      expect(count, `系统 ${s.id} 零件数不足`).toBeGreaterThanOrEqual(3)
    }
  })

  it('每个零件必填字段非空且达到最低条目数', () => {
    for (const p of parts) {
      expect(p.nameZh.length, `${p.id} nameZh`).toBeGreaterThan(0)
      expect(p.nameEn.length, `${p.id} nameEn`).toBeGreaterThan(0)
      expect(p.summary.length, `${p.id} summary`).toBeGreaterThan(5)
      expect(p.structure.length, `${p.id} structure 段数`).toBeGreaterThanOrEqual(2)
      expect(p.principle.length, `${p.id} principle 段数`).toBeGreaterThanOrEqual(2)
      expect(p.specs.length, `${p.id} specs`).toBeGreaterThanOrEqual(3)
      expect(p.tools.length, `${p.id} tools`).toBeGreaterThanOrEqual(3)
      expect(p.installSteps.length, `${p.id} installSteps`).toBeGreaterThanOrEqual(3)
      expect(p.disassembly.length, `${p.id} disassembly`).toBeGreaterThanOrEqual(2)
      expect(p.commonMistakes.length, `${p.id} commonMistakes`).toBeGreaterThanOrEqual(3)
      expect(p.maintenance.length, `${p.id} maintenance`).toBeGreaterThanOrEqual(3)
      expect(p.troubleshooting.length, `${p.id} troubleshooting`).toBeGreaterThanOrEqual(3)
      expect(p.related.length, `${p.id} related`).toBeGreaterThanOrEqual(2)
    }
  })

  it('安装步骤每步有标题与详情', () => {
    for (const p of parts) {
      for (const step of p.installSteps) {
        expect(step.title.length, `${p.id} 步骤标题`).toBeGreaterThan(0)
        expect(step.detail.length, `${p.id} 步骤详情`).toBeGreaterThan(10)
      }
    }
  })

  it('specs 与 troubleshooting 每行字段完整', () => {
    for (const p of parts) {
      for (const s of p.specs) {
        expect(s.label.length, `${p.id} spec.label`).toBeGreaterThan(0)
        expect(s.value.length, `${p.id} spec.value`).toBeGreaterThan(0)
      }
      for (const t of p.troubleshooting) {
        expect(t.symptom.length, `${p.id} symptom`).toBeGreaterThan(0)
        expect(t.cause.length, `${p.id} cause`).toBeGreaterThan(0)
        expect(t.fix.length, `${p.id} fix`).toBeGreaterThan(0)
      }
    }
  })

  it('related 引用的 id 都存在，且不包含自身', () => {
    for (const p of parts) {
      for (const rel of p.related) {
        expect(partById[rel], `${p.id} 引用了不存在的零件 ${rel}`).toBeDefined()
        expect(rel, `${p.id} 不能关联自身`).not.toBe(p.id)
      }
    }
  })
})

describe('系统数据', () => {
  it('每个系统有颜色、摘要与至少 2 段原理', () => {
    for (const s of systems) {
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(s.summary.length).toBeGreaterThan(5)
      expect(s.principle.length).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('术语表', () => {
  it('术语非空、英文与描述完整', () => {
    expect(glossary.length).toBeGreaterThanOrEqual(60)
    for (const g of glossary) {
      expect(g.term.length, g.term).toBeGreaterThan(0)
      expect(g.en.length, g.term).toBeGreaterThan(0)
      expect(g.desc.length, g.term).toBeGreaterThan(5)
      const valid = ['general', ...systemIds]
      expect(valid, `${g.term} 的 system 非法`).toContain(g.system)
    }
  })

  it('术语条目不重复', () => {
    const keys = glossary.map((g) => `${g.term}|${g.en}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('组装流程', () => {
  it('order 从 1 连续递增', () => {
    const orders = assemblySteps.map((s) => s.order)
    expect(orders).toEqual(Array.from({ length: assemblySteps.length }, (_, i) => i + 1))
  })
  it('每步都有标题、详情、工具与合法 partIds', () => {
    for (const s of assemblySteps) {
      expect(s.title.length, `步骤 ${s.order} 标题`).toBeGreaterThan(0)
      expect(s.detail.length, `步骤 ${s.order} 详情`).toBeGreaterThan(10)
      expect(s.tools.length, `步骤 ${s.order} 工具`).toBeGreaterThanOrEqual(1)
      expect(s.partIds.length, `步骤 ${s.order} partIds`).toBeGreaterThanOrEqual(1)
      for (const id of s.partIds) {
        expect(partById[id], `步骤 ${s.order} 引用了不存在的零件 ${id}`).toBeDefined()
      }
    }
  })

  it('全部零件都在组装流程中被覆盖到', () => {
    const covered = new Set(assemblySteps.flatMap((s) => s.partIds))
    for (const id of EXPECTED_PART_IDS) {
      expect(covered, `组装流程未覆盖零件 ${id}`).toContain(id)
    }
  })
})

describe('车型分类', () => {
  it('五个类别、id 唯一、字段完整', () => {
    expect(bikeTypes.length).toBe(5)
    const ids = bikeTypes.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const t of bikeTypes) {
      expect(t.nameZh.length, t.id).toBeGreaterThan(0)
      expect(t.nameEn.length, t.id).toBeGreaterThan(0)
      expect(t.tagline.length, t.id).toBeGreaterThan(5)
      expect(t.traits.length, `${t.id} traits`).toBeGreaterThanOrEqual(3)
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i)
      expect(t.models.length, `${t.id} models`).toBeGreaterThanOrEqual(2)
      for (const m of t.models) {
        expect(m.brand.length, t.id).toBeGreaterThan(0)
        expect(m.models.length, t.id).toBeGreaterThan(0)
      }
    }
  })
})
