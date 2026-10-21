# 传动 / 操控 / 刹车模型精修（B 主开发）

> 归属：`docs/ARCHITECTURE_BASELINE.md` §7.2「传动、操控、刹车模型 = B 主开发（A 协助验证）」。
> 覆盖 14 个零件：`drivetrainModels.tsx`（7）、`brakeModels.tsx`（4）、`cockpitModels.tsx`（3）。
> 本任务产出**评估 + 规范 + 可执行检查**；几何改动本身拆成独立小 PR（见 `implement.md`）。
> 证据口径：结论带 `路径:行号`；厂家规格一律标 `[未获取]` 或 `[待查手册]`，**禁止编造零件号与尺寸数字**。

## Goal

把「零件精度」从形容词变成**可断言的几何量**：逐零件对照 §5.4 的 L0–L3 定级，给出缺失子零件清单、
量化目标与容差、精修顺序、与 A 的边界分界线，以及能进 `npm test` 的几何断言。

## 现状硬结论（详细表与出处见 `design.md` §1–§2，每条均带行号）

1. **存在零件间装配关系错误**：前卡钳碟片缝中心 z=-0.052、后 -0.024（`src/three/models/brakeModels.tsx:67-68`），
   而碟片平面 z=-0.033（`src/three/bikeConfig.ts:102`）→ 错位 19mm / 9mm，碟片不在卡钳缝内。
2. **后拨导轮尺度与链条不自洽**：导轮节圆半径硬编码 0.0095（`drivetrainModels.tsx:898`）→ 齿距 5.43mm，
   而链条节距 12.7mm（`bikeConfig.ts:99`）；11T 的真实节圆半径应为 22.23mm（按 12.7mm 节距推算）。
3. **车把口径三处不一致**：把管 Ø23mm（`cockpitModels.tsx:92` ← `bikeConfig.ts:71`）、把立夹环 Ø23.6mm
   （`cockpitModels.tsx:333-343`）、手变夹环 Ø31mm（`drivetrainModels.tsx:1039`）；内容层标准为 31.8mm
   （`content/parts/cockpit.ts:21`），而 `B.stem.clampR=0.0159`（=31.8mm，`bikeConfig.ts:76`）从未被引用。
4. **同一物理实体被两个模块各建一份**：塔基同时出现在 `wheelModels.tsx:56-57`（r16.5×36mm，A）与
   `drivetrainModels.tsx:603`（r15.5×48mm，B）——违反 §4.4「同一物理零件只允许一个装配组件生成其几何」。
5. **配置层存在死字段**：`B.stem.*`、`B.crank.qFactorHalf`、`B.crank.armW`、`B.caliper.flatMountZ`、
   `B.derailleur.rdBody`、`B.rotor.r/thickness`、`B.cassette.width`、`B.bar.tubeR/reach/drop`、
   `B.chain.inner/outer` 均**零引用**，对应尺寸在模型文件里被重新硬编码 → 直接违反 §5.2「禁止为同一个
   尺寸在多个模块中分别编写相互独立的魔法常量」。
6. **测试基建缺位**：`tests/content.test.ts` 只覆盖内容层（13 个 `it()`，无一处 import `src/three/`）；
   `vite.config.ts:9` 为 `environment: 'node'`，而模型文件经 `../materials` → `textures.ts:20` 使用
   `document.createElement('canvas')`，实测在 Node 下 import 直接抛 `ReferenceError: document is not defined`
   → **几何断言必须先做纯模块抽取**（详见 `design.md` §5.1）。

## Requirements

- **R1 逐零件定级**：14 个零件各给出现有子零件、缺失子零件、当前级别（L0–L3）、建议目标级别，全部带行号。
- **R2 量化目标与容差**：关键尺寸清单只写**有出处**的数字（内容层 spec / 配置 / 由配置推导），其余标
  `[待实测]` 或 `[待查手册]`；给出统一容差口径（`design.md` §4）。
- **R3 精修顺序**：按 §5.4 三原则（查看频率、结构复杂度、教学价值）排序，每个原则用**可复算的代理指标**
  （爆炸位移模长、字面 JSX 节点数、内容层字数）而非主观判断。
- **R4 可执行验证**：给出能进 `npm test` 的几何断言清单（含容差与前置抽取工作），以及爆炸视图与截图的回归方法。
- **R5 边界与分界**：明确共享契约文件、与 A 的局部空间/锚点迁移（§5.2）冲突点，并给出「现在可独立做 vs
  必须等 A」的分界线。
- **R6 一手材料**：每个零件应依据的厂家资料类型 + 当前获取状态 + 获取路径建议（禁止编造型号与零件号）。
- **R7 不擅自扩范围**：座舱（`seatingModels.tsx`）归属未定，仅登记待裁决，本任务**不做其评估**。

## 归属待确认（需用户裁决，不在本任务范围）

- 基线 §7.2 的六行分工中**没有「座舱」行**（全文未出现座舱/坐垫/座管归属，`docs/ARCHITECTURE_BASELINE.md:338-350`）；
  而 `CONTRIBUTING.md:112` 把 `seatingModels.tsx` 归 B。`CONTRIBUTING.md:107` 自述「冲突时以架构基线为准并同步修正本表」，
  但基线没有可对齐的条目 → **冲突无法自动消解，需用户裁决**。
- 本任务仅登记该事项；在裁决前不评估、不改动 `seatingModels.tsx`（3 个零件：seatpost / saddle / seatpost-clamp）。
- 同类待裁决：手变与刹把的**模型所有权**（`ShifterModel` 与 `BrakeLeverModel` 在 z=±0.185 处重叠建模，
  `drivetrainModels.tsx:999-1008` vs `brakeModels.tsx:518-524`），§4.4 要求二选一。

## 依赖（需 A 提供，以「需求输入清单」形式列出，非本任务设计）

- **D1**：`mountAnchorId` 锚点表（§4.2）—— B 零件在局部空间建模后由谁定位、锚点在哪。当前 B 全为世界坐标（`drivetrainModels.tsx:5-7`）。
- **D2**：子零件级 Instance ID 规则 —— 卡钳两片夹体/来令片/活塞、后拨导轮/导板、飞轮 12 片是否各自可选中。
  没有它，「子件级爆炸/隔离」无法落地（`interaction.tsx:259-298` 目前只按 Catalog ID 注册）。
- **D3**：`bikeConfig.ts` 的**权威值裁决**：碟片平面（-0.033）、平装座 z（前 -0.052 / 后 -0.014，相差 38mm，
  `frameModels.tsx:1060` vs `:911`）、车把夹持口径（23 / 23.6 / 31 / 31.8 四选一）。这三项横跨 A/B 双方文件。
- **D4**：`hub` 的 CenterLock 碟片座 —— 当前 `wheelModels.tsx` 全文无碟片座/花键（grep 无 `rotor`/`centerlock`），
  碟片悬空安装；属 A 的文件。
- **D5**：塔基归属裁决（现状双份，见硬结论 4）—— 保留 A 的 hub 塔基（B 删飞轮侧）还是反之。
- **D6**：`tests/` 组织约定（是否允许新增 `tests/geometry.*.test.ts`）与 `bikeConfig.ts` 新增字段的窗口期。

## 量化验收标准

| # | 验收项 | 判定方式 | 阈值 |
| --- | --- | --- | --- |
| AC1 | 14 个零件定级表完整 | `design.md` §1.1 表行数 | 14/14，每行含 4 类信息 + 行号 |
| AC2 | 关键尺寸清单出处齐备 | `design.md` §4 表 | 每条标注 official/measured/estimated/`[待查手册]` |
| AC3 | 无编造：型号与零件号 | 全文检索厂家型号字符串 | 0 处未标注来源的型号/零件号 |
| AC4 | 几何断言可执行 | `npm test` 新增用例 | 断言通过；失败项对应未修缺陷而非断言错误 |
| AC5 | 卡钳-碟片对位 | 断言 `caliperSlotZ === rotorPlaneZ` | 前后各 ≤ 0.05mm |
| AC6 | 导轮齿距 = 链距 | 断言 `2πr/teeth === 0.0127` | ≤ 0.02mm |
| AC7 | 车把夹持口径 | 断言夹持区截面 | 31.8 ± 0.2mm（待 D3 裁决后生效） |
| AC8 | Q 值与链条中心线 | 断言区间 | Q∈[145,155]mm；链线 ∈[44.0,45.0]mm |
| AC9 | 爆炸视图回归 | EXPLODE 键集合 = MODEL_BY_PART 键集合；五视角截图 | 键集合差集 0；视角 3/4/5 截图齐备 |
| AC10 | CI 与性能不退化 | `npm test && npm run build`；同机同分辨率记录 | 全绿；帧率下降 ≤10%，三角面增量在 PR 中记录 |

## 不做什么

- 不设计 A 的核心契约（Catalog/Instance/Asset ID、`PartInstance`/`PartAsset`/`ExplodeRule`）。
- 不改 `frameModels.tsx` / `wheelModels.tsx` / `BikeViewer.tsx` / `interaction.tsx` 的结构。
- 不改材质与灯光参数（归 `10-21-materials-lighting`）；不改 `content/schema.ts`。
- 不引入 GLB/贴图/新依赖；不重排 `EXPLODE`、`MODEL_BY_PART`、`@theme` 令牌（只追加，`CONTRIBUTING.md:122`）。
- 不做 `seatingModels.tsx`（归属待裁决）与 A 的车架/轮组几何。
