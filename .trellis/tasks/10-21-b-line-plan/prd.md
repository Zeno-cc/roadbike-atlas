# B 线工作拆解与开发评估（父任务）

> **来源需求**：`docs/ARCHITECTURE_BASELINE.md` v1.0.1 —— §7.2 角色分工（B = 传动/操控/刹车模型 + 材质和灯光）与 §11 第一阶段实施计划（工作项 2、4 属 B；工作项 0、5、6 双方共同）。
> **本任务职责**（Trellis 父任务约定）：持有源需求与范围、子任务地图与职责边界、跨子任务验收标准；不直接承载交付物。

## 子任务地图

| 子任务 | 覆盖的基线条目 | 职责边界 | 依赖 A？ |
| --- | --- | --- | --- |
| `10-21-visual-baseline` | §11 工作项 2 + 工作项 0 的截图/环境记录份额 | 可复现的 B0 基准（五视角 + 性能 + 元数据 + 对比方法） | **否**（§11 明确工作项 1、2 可并行） |
| `10-21-materials-lighting` | §7.2 材质和灯光（B 主开发）+ §6.1/§6.2 | 材质口径、正交新增约定、灯光规范、色彩链路、一致性验证 | 部分（D1/D4 需 A 配合） |
| `10-21-component-refine` | §7.2 传动/操控/刹车模型（B 主开发）+ §5.4 | 14 个零件的精度定级、量化目标与容差、精修顺序、几何断言 | 部分（D1–D6 需 A 裁决） |
| `10-21-high-precision-pilot` | §11 工作项 4 | 一个零件做到 L2/L3 + 接入准备 | **是**：接入被 §11 硬门槛阻塞（`:542`） |

**子任务间的真实依赖（写在此处，不靠树结构暗示）**：

- `visual-baseline` → 其余三个：基准脚本与元数据 schema 是它们"改造前后对比"的共同输入
- `component-refine` → `high-precision-pilot`：前者的定级表决定试点零件的目标级别
- `materials-lighting` 与 `component-refine` **并行时不得同时改同一共享文件**（§7.3 规则 2）；两者都触及 `bikeConfig.ts`，需排期错开
- `high-precision-pilot` 的步骤 5 依赖 A 的工作项 1

## 跨子任务验收标准（四个子任务共同适用）

| # | 标准 | 判定 |
| --- | --- | --- |
| P1 | 质量与证据规则一致 | 四个子任务均遵循 `research/agent-rules.md`（中文、结论可执行、非显然论断带 `路径:行号`） |
| P2 | 一手材料优先 | 本地 `node_modules/three` / `@react-three/fiber` 源码为 API 行为仲裁；厂家资料不可达时标 `[未获取]` 并给获取路径，**禁止编造零件号与尺寸** |
| P3 | 量化 | 每条验收标准可判定（阈值/断言/检查表），不出现"看起来像/差不多" |
| P4 | 独立验证 | 每个子任务给出不依赖自身判断的验证方式（断言、复采零像素差、第三方工具读数、A 复核） |
| P5 | 边界干净 | 四个子任务**均未设计 A 的契约**（Catalog/Instance/Asset ID、`PartInstance`/`PartAsset`/`ExplodeRule`）；对 A 的诉求一律以"需求输入清单"形式提出 |
| P6 | 不做大 | 每个文件遵守 `agent-rules.md` 的行数区间；无填充段落 |

## 汇总：需要 A 或用户裁决的事项

**给 A 的需求输入（不设计其契约）**：

- 采集钩子 `window.__atlas`（`visual-baseline` D1，改 `BikeViewer.tsx`）
- 材质字段所有权清单（`materials-lighting` D1）与 `BikeViewer` 配合窗口（D4）
- 锚点表、子零件 Instance ID 规则、`bikeConfig` 权威值裁决、CenterLock 碟片座、塔基归属、`tests/` 组织约定（`component-refine` D1–D6）
- 资产契约的 7 项接入诉求（`high-precision-pilot` N1–N7）

**需用户裁决（子任务只登记、不擅自扩范围）**：

1. **座舱（`seatingModels.tsx`，3 个零件）的归属**：基线 §7.2 六行分工中无"座舱"行（`:338-350`），而 `CONTRIBUTING.md:112` 把它归 B → 冲突无法自动消解
2. **手变与刹把的模型所有权**：两者在 z=±0.185 处重叠建模（`drivetrainModels.tsx:999-1008` vs `brakeModels.tsx:518-524`），违反 §4.4「同一物理零件只允许一个装配组件生成其几何」→ 需二选一
3. **单件预览额外两盏光（0.9+0.6）是有意还是遗留**（决定 `materials-lighting` 步骤 3 是"对齐"还是"声明差异"）

## 已发现的硬缺陷（跨任务汇总，均已带出处）

| # | 缺陷 | 出处 | 归属子任务 |
| --- | --- | --- | --- |
| 1 | 后拨导轮节圆半径硬编码 0.0095，应为 0.02223（偏差 2.34×） | `drivetrainModels.tsx:898` vs `:70` | `component-refine` / `high-precision-pilot` |
| 2 | 卡钳碟片缝中心与碟片平面错位 19mm / 9mm | `brakeModels.tsx:67-68` vs `bikeConfig.ts:102` | `component-refine` |
| 3 | 车把夹持口径四处不一致（23 / 23.6 / 31 / 31.8mm） | `cockpitModels.tsx:92,333-343`、`drivetrainModels.tsx:1039`、`bikeConfig.ts:76` | `component-refine` |
| 4 | 塔基被 `wheelModels` 与 `drivetrainModels` 各建一份 | `wheelModels.tsx:56-57` vs `drivetrainModels.tsx:603` | 需裁决后修 |
| 5 | `matP.*` 的 `envMapIntensity` 在 `scene.environment` 路径下全部失效 | `WebGLRenderer.js:2738` | `materials-lighting` |
| 6 | 几何断言在 Node 下无法运行（`textures.ts` 用 `document`） | `vite.config.ts:9` + `textures.ts:20` | `component-refine` §5.1 |

## 不做什么

- 不替 A 设计契约，不评估 A 的模块（车架/轮组几何、交互控制）
- 不在本任务内做实际几何/材质改动（各子任务的 `implement.md` 才是执行清单）
- 不创建 Git Tag、不改 CI 配置
