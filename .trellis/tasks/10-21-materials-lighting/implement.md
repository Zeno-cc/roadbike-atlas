# 执行清单（材质与灯光规范）

> 涉及 `materials.ts` / `textures.ts` / `studio.tsx` / `BikeViewer.tsx` / `PartPreview.tsx` / `DESIGN.md` 的改动属共享契约（基线 §7.3）→ **必须 A 评审**。
> 每条 AC 编号对应 `prd.md` 的量化验收标准。

## 步骤 0：启动（0.1 人日）

```bash
python3 ./.trellis/scripts/task.py start .trellis/tasks/10-21-materials-lighting
git switch main && git pull --ff-only && git switch -c chore/materials-audit
```

- 前置：A 收到 D1（材质字段所有权清单）、D4（`BikeViewer` 侧配合改动窗口）
- 校验：`python3 ./.trellis/scripts/task.py current --source`

## 步骤 1：审计脚本（0.4 人日，PR-1）→ AC1/AC2/AC3/AC4/AC6/AC7 的静态部分

动作：新增 `scripts/materials-audit.mjs`（**纯静态分析，不改运行时代码**）：

| 检查 | 方法 | 对应 AC |
| --- | --- | --- |
| 零引用预设/纹理 | 解析 `materials.ts`/`textures.ts` 的导出名，在 `src/` 内反查引用（注意 `paintBlue` 与 `paintBlueDark` 的子串问题，用 `\b` 边界） | AC1 |
| 命名合规 | 正则：预设键 `^[a-z][a-zA-Z]*$`；纹理工厂 `^[a-z][a-zA-Z]*Texture$` | AC2 |
| `colorSpace` 声明 | 扫描纹理工厂返回值处的 `colorSpace` 标记：颜色类 `SRGBColorSpace`、法线/粗糙度类 `NoColorSpace` | AC3 |
| 参数区间 | 对 `materials.ts` 的预设逐条断言区间（R1/R3/R5/R6 规则，规则本体在步骤 4 的规范里定义） | AC4 |
| 光强代数和与曝光差 | 解析 `studio.tsx` 的四盏方向光 + ambient、`PartPreview.tsx` 的两盏额外光，算代数和；解析两处 `toneMappingExposure` | AC6/AC7 |

校验：

```bash
node scripts/materials-audit.mjs --json > /tmp/audit.json
# 期望：unused-preset = 4（paintBlue/paintBlueDark/carbon/carbonRaw）
#       unused-texture = 2（floorGradientTexture/brandGlowTexture）
#       直接光代数和 5.05 vs 6.55（差 29.7%）；曝光 1.02 vs 1.08
```

- 评审门：A 评审（新增脚本 + 不改业务代码）；脚本必须能在 CI 里跑（无副作用）
- 回滚：删除脚本文件
- 风险：静态解析正则对 `materials.ts` 的重构敏感 → 脚本内加"解析失败即报错"而非静默跳过

## 步骤 2：死代码清理（0.2 人日，PR-2）→ AC1

动作：删除 4 个零引用预设（`paintBlue`、`paintBlueDark`、`carbon`、`carbonRaw`）与 2 个零引用纹理（`floorGradientTexture`、`brandGlowTexture`）。

校验：

```bash
node scripts/materials-audit.mjs    # unused-preset = 0，unused-texture = 0
npm test && npm run build
node docs/visual-baseline/scripts/capture-baseline.mjs --view 01   # 截图应与删除前 AE = 0
```

- 评审门：A 评审 + 五视角截图（确认视觉零变化，AC9）
- 回滚：`git revert <commit>`
- 风险：`[未验证]` 是否有仓库外引用（如用户自己的分支）→ 删除前在 PR 说明中列出被删名字

## 步骤 3：影棚参数对齐（0.4 人日，PR-3）→ AC5/AC6/AC7

动作：把整车与单件预览的共享影棚参数抽为单一来源（`studio.tsx` 导出常量），对齐：

- 曝光：1.02 vs 1.08 → 统一（取值需 A 确认；**这是全局视觉变更**）
- 直接光强度代数和差 ≤ 5%（当前 29.7%）：`PartPreview.tsx:36-37` 的两盏额外光（0.9 + 0.6）需要并入或删除
- 接触阴影参数（opacity/scale/blur/far/resolution 五项不同）统一或显式声明差异理由

校验：`node scripts/materials-audit.mjs`（AC5/AC6/AC7 全绿）；两处截图对比（整车 + 单件）

- 评审门：A 评审（**D4 配合窗口**：改动会影响两处画面）；截图必须给"改造前后"
- 回滚：`git revert`
- 风险：曝光统一会让整车或单件画面亮度变化 → 若 A 认为两者差异是有意的（单件需要更亮），则本步骤改为"显式声明差异 + 记录理由"，AC7 阈值相应改为"差异有书面理由"

## 步骤 4：规范落文档（0.3 人日，PR-4）→ AC4 的规则本体

动作：在 `DESIGN.md` 新增"材质与灯光口径"一节，写入：

- 物理量区间（metalness / roughness / clearcoat / ior / envMapIntensity）与禁止项（§6.1 的"不以大幅金属度/Bloom/光强代替真实感"的可检查形式）
- 正交新增约定：命名、纹理缓存 key、`colorSpace` 标记规则、UV/平铺、"新增不重排"
- 灯光角色分工（key/fill/rim/环境反弹）与"改数值 = 全局变更"流程
- `roughnessMap` 与 `roughness` **乘算**的提醒（`roughnessmap_fragment.glsl.js:9`）——写进文档避免后人再踩
- `scene.environment` 会**覆盖** `material.envMapIntensity`（`WebGLRenderer.js:2738`）——因此单材质调环境反射只能改 `scene.environmentIntensity` 或改用 material 级 `envMap`

校验：`node scripts/materials-audit.mjs --rules`（脚本从文档或常量读区间）；文档链接有效

- 评审门：A 评审（DESIGN.md 是 §9.2 的视觉规范文档）
- 回滚：`git revert`

## 步骤 5：材质实例独立性检查（0.3 人日，PR-5）→ AC8

动作：运行时断言"材质实例不跨零件共享"（需 A 配合，见 D1）：开发态下遍历场景，检查同一 material 实例是否被两个不同 `partId` 的 mesh 引用。

校验：`npm run dev` → 控制台断言通过；故意共享一个材质应触发断言（反向验证）

- 评审门：A 评审（涉及交互层字段所有权，D1）
- 回滚：`git revert`
- 风险：与 A 的 `interaction.tsx` 改动冲突 → 按 §7.3 规则 2，同一阶段只由一个 PR 主导该文件

## 步骤 6：交付（0.2 人日）→ AC9/AC10/AC11

- 五视角改造前后截图（复用工作项 2 的基准与脚本）
- `perf.json` 对比（AC11：帧率下降 ≤ 10%）
- `npm test && npm run build`（AC10）
- PR 里逐条勾 AC1–AC11

## 工作量汇总

| 步骤 | 人日 |
| --- | --- |
| 1 审计脚本 | 0.4 |
| 2 死代码清理 | 0.2 |
| 3 影棚参数对齐 | 0.4 |
| 4 规范落文档 | 0.3 |
| 5 实例独立性检查 | 0.3 |
| 6 交付 | 0.2 |
| **合计** | **1.8** |

## 依赖与阻塞

- 步骤 3 依赖 A 的 D4 配合窗口（**唯一需要 A 参与的步骤**）；其余步骤可独立推进
- 步骤 5 依赖 A 的 D1（材质字段所有权清单）
- 步骤 1 可立即开始（纯静态分析，零风险）
