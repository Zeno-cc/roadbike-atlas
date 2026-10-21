# 材质与灯光规范（B 主开发 / A 审查与验收）

> 归属：架构基线 §7.2「材质和灯光 = B 主开发（A 审查与验收）」；规范依据 §6.1 / §6.2。
> 本任务的产出是**规范 + 可执行检查**，不是一次性大改。视觉改动本身拆成独立小 PR（见 `implement.md`）。

## Goal

把「真实感」从形容词变成可检查的物理量口径，并为 `materials.ts` / `textures.ts` / `studio.tsx`
三个共享契约文件建立**正交新增**的协作约定与**可自动执行**的一致性验证。

## 现状事实（本次盘点的硬结论，明细见 `design.md` §1）

- 材质预设 20 个：`mat.*` 17 个 + `matP.*` 3 个；其中 4 个（`paintBlue`/`paintBlueDark`/`carbon`/`carbonRaw`）零引用。
- 程序化纹理 10 张：8 张在用，`floorGradientTexture` / `brandGlowTexture` 零引用且编码的是已废弃的深色影棚。
- 模型侧材质声明 212 处（standard 190 + physical 22），全部以 JSX 内联展开预设，**每处一个独立材质实例**（依据 `@react-three/fiber` 的 `createInstance`：`child.object = new target(...)`，见 `research/evidence.md`）。
- 整车视图与单件预览**并非同一套影棚参数**：曝光 1.02 vs 1.08，直接光强度代数和 5.05 vs 6.55（+29.7%），接触阴影 5 项参数不同（opacity/scale/blur/far/resolution）。
- `matP.*` 的 `envMapIntensity`（1.3 / 1.25 / 1.1）在当前 `scene.environment` 路径下**不生效**；有效环境强度只有 `scene.environmentIntensity = 0.95`。
- `roughnessMap` 与基础 `roughness` 是**乘算**：`brushed` 贴图值域 [0.28, 0.44]（`textures.ts:110` 的闭式表达式，可复算），故 `mat.alu` 有效粗糙度 = 0.32×(0.28–0.44) ≈ **0.09–0.14**、`mat.disc` = 0.30×(0.28–0.44) ≈ **0.08–0.13**，均低于注释所写的 0.32 / 0.3。

## Requirements

1. **口径**：为金属度、粗糙度、清漆、IOR、环境反射、Bloom、曝光给出可检查的数值区间与禁止项，
   把 §6.1「不以大幅增加金属度 / Bloom / 光照强度代替真实感」写成脚本或 PR 流程能拦下的规则。
2. **正交新增**：命名规则、纹理缓存 key 规则、`colorSpace` 显式声明、UV 与平铺口径、「新增不重排」的落地做法。
3. **灯光**：明确 key/fill/rim/环境反弹的角色分工与**改动影响面矩阵**；给出「改动已有光照数值 = 全局视觉变更」的执行流程。
4. **一致性**：把「整车与单件材质一致」从「看起来一样」变成**结构性约束 + 可量化比对**。
5. **可测边界**：明确哪些检查能进 vitest / 脚本，哪些只能人眼评审。
6. **协作**：三个共享文件的 PR 拆分与评审门（1–3 天粒度）。

## 范围边界

**做：** 规范文档、预设清单审计、检查脚本设计、参数口径、一致性验证方案、PR 拆分计划。

**不做（本任务内）：**

- 不改任何零件的几何、装配锚点、交互行为（属 A 的工作项）。
- 不新增真实车型、不引入 GLB、不引入贴图文件（零外部资源约束保持）。
- 不重写 `studio.tsx` 的影棚结构（只做参数抽取与对齐）。
- 不调整 `content/`、`tests/content.test.ts` 的现有断言。
- 不设计 A 的交互契约（`interaction.tsx` 的字段所有权由 A 给出，见下「依赖」）。

## 依赖（需要 A 提供，以「需求输入」形式列出，非本任务设计）

- **D1**：`interaction.tsx` 的**材质字段所有权清单** —— `applyVisuals`（`src/three/interaction.tsx:179-203`）会写
  `emissive` / `emissiveIntensity` / `opacity` / `transparent` / `depthWrite`。材质规范必须声明这些字段由交互层独占，
  但需要 A 确认清单是否完整（例如未来是否会加 `color` 覆写）。
- **D2**：固定相机参数（来自 `10-21-visual-baseline`）：五视角的相机位置、target、fov、视口尺寸、dpr、设备。
  一致性像素比对需要它作为输入。该工作项还负责产出 `docs/visual-baseline/scripts/capture-baseline.mjs` 与
  `docs/visual-baseline/perf.json`（**当前均不存在**）—— 本任务只消费，不创建；未到位前 AC9/AC11 的截图与性能记录用人工截图 + 本地记录代替（见 `implement.md`「依赖与阻塞」）。
- **D3**：`tests/` 的组织约定（文件命名、是否允许新增 `tests/materials.test.ts`）—— `tests/` 属共享契约，双方共同负责。
  AC5 的一致性测试依赖此项放行；测试实现不得 import 场景/模型文件（理由见 AC5 行）。
- **D4**：`BikeViewer.tsx` 侧的配合改动窗口：曝光对齐与去掉单件额外补光会影响整车/单件画面，A 拥有交互层，需协调同一窗口。
- **D5**：B1 引入 GLB 时，资产接口需预留「材质实例是否共享」的检查点（§6.2）。当前无 GLB，不阻塞本任务。

## 量化验收标准

| # | 验收项 | 判定方式 | 阈值 |
| --- | --- | --- | --- |
| AC1 | 零引用预设 / 纹理清零 | 扫描脚本 `scripts/materials-audit.mjs` | 报告 0 条 `unused-preset`、0 条 `unused-texture` |
| AC2 | 预设键与纹理 key 命名合规 | 同上脚本（正则） | 违规 0 条 |
| AC3 | `colorSpace` 显式声明正确 | 同上脚本 + 运行时抽查 | 颜色类贴图声明 `SRGBColorSpace`；法线/粗糙度类声明 `NoColorSpace`；违规 0 |
| AC4 | 参数区间合规（R1/R3/R5/R6） | 同上脚本（预设改为纯数据模块后可直接断言） | 违规 0，例外须在 PR 中登记 |
| AC5 | 整车 / 单件共享影棚参数一致 | `tests/materials.test.ts`：① import 纯数据模块 `src/three/studioPreset.ts` 断言共享字段；② 用 `node:fs` 读 `BikeViewer.tsx`/`PartPreview.tsx` 文本，断言二者消费同一常量（**禁止 import 场景/模型文件**：链路触达 `textures.ts:20` 的 `document`，Node 下抛 `ReferenceError`，同 `10-21-component-refine` §5.1 根因） | 共享字段差异 0 |
| AC6 | 直接光强度代数和差异 | 脚本计算 | ≤ 5%（当前 29.7%） |
| AC7 | 曝光一致 | 脚本 / 断言 | 默认两侧 `toneMappingExposure` 必须完全相等（当前 1.02 vs 1.08）；若 A 确认差异有意，须书面理由 + A approve，并降级为「已记录例外」（设计见 R6） |
| AC8 | 材质实例不跨零件共享 | 静态扫描禁止 `<primitive object={material}>` 与 `material={...}`；dev 运行时断言（需 A 配合） | 0 处跨 `partId` 共享 |
| AC9 | 视觉回归可对比 | 五视角截图（改造前 / 后）附于 PR | 5/5 视角齐备，固定参数一致 |
| AC10 | CI 不退化 | `npm test && npm run build` | 全绿 |
| AC11 | 性能不显著退化 | 同机同分辨率同机位记录帧率 / draw call / 三角面 | 帧率下降 ≤ 10%，超出须说明 |

## 交付物

- `design.md`：现状三张表（材质 / 光照 / 差距）、口径规范、新增约定、灯光规范、验证方案、自动化边界。
- `implement.md`：有序执行清单（每步含校验命令）、评审门、回滚点、工作量、PR 拆分。
- `research/evidence.md`：一手材料与出处（本地源码 `路径:行号`）、网络来源获取结果、`[未验证]` 清单。
