# 执行清单（材质与灯光规范）

> 涉及 `materials.ts` / `textures.ts` / `studio.tsx` / `DESIGN.md`（均在基线 §7.3 清单内）与 `BikeViewer.tsx` / `PartPreview.tsx`（**不在清单内**，但改动影响渲染画面，按共享契约流程走）→ **必须 A 评审**。
> 每条 AC 编号对应 `prd.md` 的量化验收标准。

## PR 计划（统一编号，与 `design.md` 的引用一致）

| PR | 内容 | 对应步骤 | design 引用 |
| --- | --- | --- | --- |
| PR-1 | 审计脚本 `scripts/materials-audit.mjs` | 步骤 1 | — |
| PR-2 | 纹理 `colorSpace` 显式声明 | 步骤 1b | `design.md:297`（A4 的前置） |
| PR-3 | 共享影棚参数抽为常量 | 步骤 3 | `design.md:298`（A5 的前置） |
| PR-4 | 拆纯数据模块 `src/three/studioPreset.ts` | 步骤 3b | `design.md:308` |
| PR-5 | 死代码清理 | 步骤 2 | — |
| PR-6 | 规范落文档（`DESIGN.md`） | 步骤 4 | — |
| PR-7 | 材质实例独立性检查 | 步骤 5 | — |

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
| 命名合规 | 正则：预设键 `^[a-z][a-zA-Z]*$`；纹理工厂 `^[a-z][a-zA-Z]*Texture$`；**纹理缓存 key `^[a-z][a-z0-9-]*$`（kebab-case）** | AC2 |
| `colorSpace` 声明 | 扫描纹理工厂返回值处的 `colorSpace` 标记：颜色类 `SRGBColorSpace`、法线/粗糙度类 `NoColorSpace`（声明动作本身见步骤 1b） | AC3 |
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

## 步骤 1b：纹理 `colorSpace` 显式声明（0.2 人日，PR-2）→ AC3

动作：给 `textures.ts` 的每个生成器返回值**显式标注** `colorSpace`——颜色类（贴花、背景渐变）标 `SRGBColorSpace`；法线 / 粗糙度 / 灰度类标 `NoColorSpace`。

理由：three 的默认是 `NoColorSpace`，颜色贴图若不标注会偏色；这也是 `design.md` §5.2 的 A4 断言（颜色类出现 `SRGBColorSpace`、法线/灰度类不出现）的前置。

校验：

```bash
node scripts/materials-audit.mjs --rules      # A4 断言
npm test && npm run build
```

- 评审门：A 评审（`textures.ts` 属共享契约）；附截图对比（若有色偏，应在改造前后对比中体现）
- 回滚：`git revert`

## 步骤 2：死代码清理（0.2 人日，PR-5）→ AC1

动作：删除 4 个零引用预设（`paintBlue`、`paintBlueDark`、`carbon`、`carbonRaw`）与 2 个零引用纹理（`floorGradientTexture`、`brandGlowTexture`）。

校验：

```bash
node scripts/materials-audit.mjs    # unused-preset = 0，unused-texture = 0
npm test && npm run build
node docs/visual-baseline/scripts/capture-baseline.mjs --view 01   # 截图应与删除前 AE = 0
# 若工作项 2 尚未交付脚本 → 用手工截图并在 PR 标注 captureMethod: manual
```

- 评审门：A 评审 + 视角截图（确认视觉零变化，AC9）
- 回滚：`git revert <commit>`
- 风险：`[未验证]` 是否有仓库外引用（如用户自己的分支）→ 删除前在 PR 说明中列出被删名字

## 步骤 3：影棚参数对齐（0.4 人日，PR-3）→ AC5/AC6/AC7

动作：把整车与单件预览的共享影棚参数抽为单一来源，对齐：

- 曝光：1.02 vs 1.08 → 统一（取值需 A 确认；**这是全局视觉变更**）
- 直接光强度代数和差 ≤ 5%（当前 29.7%）：`PartPreview.tsx:36-37` 的两盏额外光（0.9 + 0.6）需要并入或删除
- 接触阴影参数（opacity/scale/blur/far/resolution **五项**不同）统一或显式声明差异理由

校验：`node scripts/materials-audit.mjs`（AC5/AC6/AC7 全绿）；两处截图对比（整车 + 单件）

- 评审门：A 评审（**D4 配合窗口**：改动会影响两处画面）；截图必须给"改造前后"
- 回滚：`git revert`
- 风险：曝光统一会让整车或单件画面亮度变化 → 若 A 确认差异**有意**，本步骤改为"显式声明差异 + 书面理由"，AC7 降级为「已记录例外」（与 `prd.md` AC7 的例外条款一致）

## 步骤 3b：拆纯数据模块（0.3 人日，PR-4）→ AC5 的测试前置

动作：把影棚共享参数抽成 `src/three/studioPreset.ts`（**纯数据，不 import three / 不触 DOM**），供测试直接 import。

理由（`design.md` §5.3）：场景与模型文件的 import 链会触达 `textures.ts:20` 的 `document.createElement`，Node 环境下抛 `ReferenceError`——**测试实现不得 import 场景/模型文件**（与 `10-21-component-refine` §5.1 同根因）。

校验：

```bash
npx vitest run tests/materials.test.ts
# AC5：① import studioPreset.ts 断言共享字段；② 用 node:fs 读 BikeViewer.tsx / PartPreview.tsx 文本，断言二者消费同一常量
npm test && npm run build
```

- 评审门：A 评审（新增共享模块 + `tests/` 属共享契约）
- 回滚：`git revert`

## 步骤 4：规范落文档（0.3 人日，PR-6）→ AC4 的规则本体

动作：在 `DESIGN.md` 新增"材质与灯光口径"一节，写入：

- 物理量区间（metalness / roughness / clearcoat / ior / envMapIntensity）与禁止项（§6.1 的"不以大幅金属度/Bloom/光强代替真实感"的可检查形式）
- 正交新增约定：命名、纹理缓存 key、`colorSpace` 标记规则、UV/平铺、"新增不重排"
- 灯光角色分工（key/fill/rim/环境反弹）与"改数值 = 全局变更"流程
- `roughnessMap` 与 `roughness` **乘算**的提醒（`roughnessmap_fragment.glsl.js:9`）——避免后人再踩
- `scene.environment` 路径下 `material.envMapIntensity` **从未被上传**（`WebGLMaterials.js:407` 的 `material.envMap` guard + `WebGLRenderer.js:2738` 直接写入 `scene.environmentIntensity`）→ 单材质调环境反射只能改 `scene.environmentIntensity`，或改用 material 级 `envMap`

校验：`node scripts/materials-audit.mjs --rules`（脚本从文档或常量读区间）；文档链接有效

- 评审门：A 评审（DESIGN.md 是 §9.2 的视觉规范文档）
- 回滚：`git revert`

## 步骤 5：材质实例独立性检查（0.3 人日，PR-7）→ AC8

动作：两条腿——

1. **静态扫描**：扩展 `materials-audit.mjs`，禁止跨零件共享材质实例的写法（如 `<primitive object={material}>`、把同一材质对象传给多个零件）
2. **运行时断言**（需 A 配合，见 D1）：开发态遍历场景，检查同一 material 实例是否被两个不同 `partId` 的 mesh 引用

校验：`node scripts/materials-audit.mjs`（静态 0 处）；`npm run dev` → 控制台断言通过；**反向验证**：故意共享一个材质应触发断言

- 评审门：A 评审（涉及交互层字段所有权，D1）
- 回滚：`git revert`
- 风险：与 A 的 `interaction.tsx` 改动冲突 → 按 §7.3 规则 2，同一阶段只由一个 PR 主导该文件

## 步骤 6：交付（0.2 人日）→ AC9/AC10/AC11

- 五视角改造前后截图（复用工作项 2 的基准与脚本；脚本未到位时手工截图并标注）
- **AC11 方法**：同机、同分辨率、同视角下对比 `perf.json` 的 **p95 帧时间**与 `calls`/`triangles` 的中位数；帧率下降 > 10% 必须在 PR 说明
- `npm test && npm run build`（AC10）
- PR 里逐条勾 AC1–AC11

## 工作量汇总

| 步骤 | 人日 |
| --- | --- |
| 1 审计脚本 | 0.4 |
| 1b colorSpace 声明 | 0.2 |
| 2 死代码清理 | 0.2 |
| 3 影棚参数对齐 | 0.4 |
| 3b 拆纯数据模块 | 0.3 |
| 4 规范落文档 | 0.3 |
| 5 实例独立性检查 | 0.3 |
| 6 交付 | 0.2 |
| **合计** | **2.3**（不含步骤 0 的 0.1） |

## 依赖与阻塞

- 步骤 3 / 3b 依赖 A 的 D4 配合窗口；步骤 5 依赖 A 的 D1 清单
- **步骤 2 / 3 / 6 的截图对比依赖工作项 2**（`10-21-visual-baseline`）交付 `docs/visual-baseline/scripts/capture-baseline.mjs` 与 `perf.json`——两者**当前均不存在**（该任务仍在 planning）→ 未到位前用手工截图 + 本地记录代替，并在 PR 标注 `captureMethod: manual`
- 步骤 1、1b 可立即开始（纯静态分析与标注，零风险）
