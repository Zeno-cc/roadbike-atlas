# 执行清单（工作项 4：高精度零件试点）

> **阻塞声明**：§11 硬门槛——"高精度零件试点必须在核心资产接口确定后正式接入"。本清单只覆盖**建模 + 接入准备**；接入步骤（步骤 5）标记为阻塞，待 A 的工作项 1 完成后启动。
> 涉及 `bikeConfig.ts`、`geometryHelpers.tsx`、`interaction.tsx`、`tests/` 的改动属共享契约（§7.3，与 `prd.md` §依赖同一份清单）→ **必须 A 评审**。

## 步骤 0：启动（0.1 人日）

```bash
python3 ./.trellis/scripts/task.py start .trellis/tasks/10-21-high-precision-pilot
git switch main && git pull --ff-only && git switch -c model/rear-derailleur-l3
```

- 前置：用户确认选件（推荐后拨，见 `design.md` §1）；A 收到 N1–N7 需求输入
- 校验：`python3 ./.trellis/scripts/task.py current --source`

## 步骤 1：修导轮尺寸缺陷 + 链条路径绕导轮圆周（0.3 人日，PR-1）

动作：

1. 把 `drivetrainModels.tsx:898` 的硬编码 `0.0095` 改为 `pitchRadius(11)`（同文件 `:70` 已有该函数）；导轮厚度保持 0.0076 并加注释标注来源待查。
2. **链条路径改造**（不做则导轮放大后必穿模，方案见 `design.md` §3.1）：`drivetrainModels.tsx:658-659` 的折点由导轮圆心改为导轮圆周上的切点 + 圆周采样点（包角约 180°）；圆心距 0.052 m、半径 0.022234 m，两轮外缘净距 ≈ 0.0075 m。
3. 为可测性，把 `CHAIN_PATH`（或切点计算函数）从模块内**导出**（否则测试读不到路径）。

校验：

```bash
npm test && npm run build
# 新增断言（tests/geometry.test.ts，需 A 评审 —— tests/ 属共享契约）
# 断言 1：导轮节圆半径 === pitchRadius(11) === 0.02223 ± 0.0005
# 断言 2：链条路径到上/下导轮圆心的距离 === pitchRadius(11) ± 0.0001；包角 ∈ [170°, 190°]
npm run dev   # 目视确认：导轮与笼的比例、链条贴住齿根、无穿模
```

- 评审门：A 评审（`tests/` 与共享契约）；附传动视角截图（改造前后）——截图依赖工作项 2 的采集脚本，未交付前用手动截图并标 `captureMethod: manual`
- 回滚：`git revert <commit>`
- 风险：导轮放大 2.34× 后与笼板/链条的空间关系 → 由动作 2 的链条路径改造 + 截图确认（本步骤的主要不确定性）

## 步骤 2：尺寸入配置（0.3 人日，PR-2，需 A 评审）

动作：在 `bikeConfig.ts:106-109` 的 `derailleur` 段补齐本零件需要的常量（导轮齿数、节圆半径来源、笼长、四连杆轴距、B/P 轴位置），模型改为读取配置。

校验：

```bash
npm test && npm run build

# AC6 裸数字常量计数（固定口径：RearDerailleurModel 函数体内、含 0.x 字面量的行数；
# awk 提取函数体，不随行号漂移。N0 为基线，在 main、任何改动前实测并记入 PR-2）
N0=23   # 基线：2026-10-21 main 实测 23 行（出现 64 处，见下方附测）
N1=$(awk '/export function RearDerailleurModel/,/^}/' src/three/models/drivetrainModels.tsx | grep -cE '(^|[^0-9A-Za-z_.])0\.[0-9]+')
test "$N1" -le $((N0 / 2)) && echo "AC6 pass: $N1 <= $((N0 / 2))" || echo "AC6 fail: $N1 > $((N0 / 2))"

# 附测：出现次数（基线 64 处），与 N0 一并写入 PR-2 描述
awk '/export function RearDerailleurModel/,/^}/' src/three/models/drivetrainModels.tsx | grep -oE '(^|[^0-9A-Za-z_.])0\.[0-9]+' | wc -l
```

- 评审门：A 评审（`bikeConfig.ts` 是几何骨架）
- 回滚：`git revert`
- 附加校验（工作项 2 交付后）：纯重构不应改变渲染 → 同 commit 复采 AE = 0、改前改后 SSIM ≥ 0.995（命令见步骤 4）

## 步骤 3：L3 子零件建模（1.5–2.5 人日，PR-3 / PR-4）

动作（按优先级）：

1. **卷簧实体**：新增 `helixGeometry(pitch, turns, radius, wireR)` 到 `geometryHelpers.tsx`（**共享契约，需 A 评审**），替换 `:900/:909` 的"钢环"暗示
2. **H / L 限位螺丝 ×2**：用 `Tube` + 六角头，位置与止挡关系需与爆炸图核对（`[待查手册]`）
3. **枢轴销 / 衬套 ×4**：B 关节、P 关节、两连杆铰点
4. **导轮中心衬套**：替换现有中心螺栓（或并存）
5. **命名统一**：子零件改用 `rd.<part>` 命名，供契约引用

校验（建模部分，可立即执行）：

```bash
npm test && npm run build
```

校验（截图对比，**依赖工作项 2**，未交付前标阻塞）：

```bash
node docs/visual-baseline/scripts/capture-baseline.mjs --view 03   # 传动视角（脚本由工作项 2 交付，当前不存在）
magick compare -metric SSIM before.png after.png null:             # 记录变化幅度（不设阈值，本步骤为预期可见变化）
```

- 评审门：A 评审（`geometryHelpers.tsx`）；截图必须给"改造前后"对比
- 回滚：每个子零件一个 commit，可单独 revert
- 风险：卷簧的螺旋几何若匝数过多会显著增加三角面 → 按 §6.3 记录 perf 变化（依赖工作项 2 的 `perf.json` 口径）

## 步骤 4：验证与文档（0.5–1 人日，PR-5）

动作：

- 写 `tests/geometry.test.ts`：§3 表中**可断言**的每条尺寸——读 `bikeConfig` 步骤 2 新增的**导出常量**（模型不导出尺寸常量，不要在测试里读组件内部值）
- 填 `design.md` §6 的两张检查表（爆炸图对照、L2/L3 判据）；**爆炸图对照资料 `[未获取]` → 当前标阻塞**，待用户线下提供 PDF/实测尺寸后执行
- 采集改造前后对比图（复用工作项 2 的 03 视角 + `perf.json` 口径；工作项 2 未交付前此动作标阻塞）
- **AC8 爆炸视图截图**：`node docs/visual-baseline/scripts/capture-baseline.mjs --view 05`（工作项 2 交付后）；未交付前手动把爆炸滑杆拉满截图并标 `captureMethod: manual`，用于导轮/笼/链条的穿模检查

校验：

```bash
npm test && npm run build                                        # AC8：全绿

# AE = 0：同一 commit 连续两次采集的确定性复核
# 输出形如 "0 (0)"（括号内 = 不同像素数）；有差异时退出码为 1
magick compare -metric AE repeat-1.png repeat-2.png null: 2>&1
ae=$(magick compare -metric AE repeat-1.png repeat-2.png null: 2>&1 | sed -n 's/.*(\([0-9]*\)).*/\1/p')
test "$ae" = "0" && echo "AE pass" || echo "AE fail: $ae 像素不同"

# SSIM 阈值：仅用于"无预期视觉变化"的对（例如步骤 2 纯重构：改前/改后应几乎不变）
# 注意 ImageMagick 的 SSIM 指标输出为「差异度 (归一化 1−SSIM)」，归一化 ≤ 0.005 ⇔ SSIM ≥ 0.995
s=$(magick compare -metric SSIM ref-before.png ref-after.png null: 2>&1 | sed -n 's/.*(\(.*\)).*/\1/p')
python3 -c "import sys; assert float(sys.argv[1]) <= 0.005, sys.argv[1]" "$s"

# 步骤 1/3 属预期可见变化：只记录 SSIM 数值 + 目视确认变化限于导轮/链条区域（PR 中说明）
magick compare -metric SSIM before.png after.png null: 2>&1
```

- 评审门：A 抽查复采（AE = 0；截图脚本工作项 2 交付后由 A 复采）
- 回滚：`git revert`

## 步骤 5：接入统一资产接口（**阻塞**，待 A 的工作项 1）

前置条件（全部满足才能启动）：

- [ ] A 的工作项 1「零件实例和资产契约设计」完成（§11 工作项 1）
- [ ] N1–N7 需求输入已被 A 纳入契约（见 `design.md` §5）
- [ ] `PartInstance` / `PartAsset` / `ExplodeRule` 的类型与适配器可用（§4.2）

动作：把后拨注册为 `PartInstance`（含 4 个运动轴的子节点声明），迁移 `EXPLODE['rear-derailleur']` 到 `ExplodeRule`。

校验：§11 工作项 4 验收标准「**可完整接入新接口**」——需要 A 的接口就绪后定义具体断言

- 回滚：适配器并存（§4.3 迁移原则：允许新旧接口通过适配器并存）

## 工作量汇总

| 步骤 | 人日 | 阻塞 |
| --- | --- | --- |
| 1 导轮尺寸缺陷 + 链条路径 | 0.3 | 否（截图另依赖工作项 2） |
| 2 尺寸入配置 | 0.3 | 否 |
| 3 L3 子零件建模 | 1.5–2.5 | 建模否；截图校验依赖工作项 2 |
| 4 验证与文档 | 0.5–1.0 | 代码/断言否；截图与 perf 依赖工作项 2；爆炸图对照待资料 |
| 5 接入契约 | 待估 | **是（A 的工作项 1）** |
| **可立即执行合计** | **2.6–4.1** | — |

合计口径与 `design.md` §7 一致：0.3 + 0.3 + 1.5–2.5 + 0.5–1.0 = 2.6–4.1（不含步骤 0 的 0.1）。

## 依赖与阻塞

- 步骤 1–2 与步骤 3 的**建模部分**可立即执行（不依赖 A 的契约；仅需 A 的评审窗口）
- 步骤 3 的截图对比、步骤 4 的截图 / `perf.json` / AE 复采**依赖工作项 2**（`10-21-visual-baseline`）交付采集脚本、`03`/`05` 视角与 `perf.json`；未交付前这些校验标阻塞（不影响代码与断言部分）
- 步骤 4 的爆炸图对照因厂家资料 `[未获取]` 标阻塞，待用户线下资料到位
- 步骤 5 被 §11 硬门槛阻塞
- 步骤 3 的 `helixGeometry`、步骤 1 的 `CHAIN_PATH` 导出与步骤 1/4 的测试文件均属共享契约（`geometryHelpers.tsx`、`tests/`）→ 排期时避开 A 正在改同一文件的窗口（§7.3 规则 2）
