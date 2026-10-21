# 执行清单（工作项 4：高精度零件试点）

> **阻塞声明**：§11 硬门槛——"高精度零件试点必须在核心资产接口确定后正式接入"。本清单只覆盖**建模 + 接入准备**；接入步骤（步骤 5）标记为阻塞，待 A 的工作项 1 完成后启动。
> 涉及 `bikeConfig.ts`、`geometryHelpers.tsx`、`interaction.tsx` 的改动属共享契约（§7.3）→ **必须 A 评审**。

## 步骤 0：启动（0.1 人日）

```bash
python3 ./.trellis/scripts/task.py start .trellis/tasks/10-21-high-precision-pilot
git switch main && git pull --ff-only && git switch -c model/rear-derailleur-l3
```

- 前置：用户确认选件（推荐后拨，见 `design.md` §1）；A 收到 N1–N7 需求输入
- 校验：`python3 ./.trellis/scripts/task.py current --source`

## 步骤 1：修导轮尺寸缺陷（0.2 人日，PR-1）

动作：把 `drivetrainModels.tsx:898` 的硬编码 `0.0095` 改为 `pitchRadius(11)`（同文件 `:70` 已有该函数）；导轮厚度保持 0.0076 并加注释标注来源待查。

校验：

```bash
npm test && npm run build
# 新增断言（tests/geometry.test.ts，需 A 评审 —— tests/ 属共享契约）
# 断言：导轮节圆半径 === pitchRadius(11) === 0.02223 ± 0.0005
npm run dev   # 视觉确认：传动视角下导轮与笼的比例、与链条的啮合
```

- 评审门：A 评审（`tests/` 与共享契约）；附传动视角截图（改造前后）
- 回滚：`git revert <commit>`
- 风险：导轮放大 2.34× 后可能与笼板/链条穿模 → 必须截图确认（这是本步骤的主要不确定性）

## 步骤 2：尺寸入配置（0.3 人日，PR-2，需 A 评审）

动作：在 `bikeConfig.ts:106-109` 的 `derailleur` 段补齐本零件需要的常量（导轮齿数、节圆半径来源、笼长、四连杆轴距、B/P 轴位置），模型改为读取配置。

校验：`npm test && npm run build`；`grep -n "0\.0[0-9]*" src/three/models/drivetrainModels.tsx | wc -l` 应显著下降（魔法常量减少）

- 评审门：A 评审（`bikeConfig.ts` 是几何骨架）
- 回滚：`git revert`

## 步骤 3：L3 子零件建模（1.5–2.5 人日，PR-3 / PR-4）

动作（按优先级）：

1. **卷簧实体**：新增 `helixGeometry(pitch, turns, radius, wireR)` 到 `geometryHelpers.tsx`（**共享契约，需 A 评审**），替换 `:900/:909` 的"钢环"暗示
2. **H / L 限位螺丝 ×2**：用 `Tube` + 六角头，位置与止挡关系需与爆炸图核对（`[待查手册]`）
3. **枢轴销 / 衬套 ×4**：B 关节、P 关节、两连杆铰点
4. **导轮中心衬套**：替换现有中心螺栓（或并存）
5. **命名统一**：子零件改用 `rd.<part>` 命名，供契约引用

校验：

```bash
npm test && npm run build
node docs/visual-baseline/scripts/capture-baseline.mjs --view 03   # 传动视角（依赖工作项 2 的脚本）
magick compare -metric SSIM before.png after.png null:             # 记录变化幅度
```

- 评审门：A 评审（`geometryHelpers.tsx`）；截图必须给"改造前后"对比
- 回滚：每个子零件一个 commit，可单独 revert
- 风险：卷簧的螺旋几何若匝数过多会显著增加三角面 → 按 §6.3 记录 perf 变化

## 步骤 4：验证与文档（0.5–1 人日，PR-5）

动作：

- 写 `tests/geometry.test.ts`：§3 表中**可断言**的每条尺寸
- 填 `design.md` §6 的两张检查表（爆炸图对照、L2/L3 判据）
- 采集改造前后对比图（复用工作项 2 的 03 视角 + `perf.json` 口径）

校验：`npm test && npm run build`；对比图与 perf 记录齐全

- 评审门：A 抽查复采（AE = 0）
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
| 1 导轮尺寸缺陷 | 0.2 | 否 |
| 2 尺寸入配置 | 0.3 | 否 |
| 3 L3 子零件建模 | 1.5–2.5 | 否 |
| 4 验证与文档 | 0.5–1.0 | 否 |
| 5 接入契约 | 待估 | **是（A 的工作项 1）** |
| **可立即执行合计** | **2.5–4.0** | — |

## 依赖与阻塞

- 步骤 1–4 **可立即执行**（不依赖 A 的契约；仅需 A 的评审窗口）
- 步骤 5 被 §11 硬门槛阻塞
- 步骤 3 的 `helixGeometry` 与步骤 1 的测试文件均属共享契约 → 排期时避开 A 正在改同一文件的窗口（§7.3 规则 2）
