# 工作项 2：渲染与材质基准检查（B 线）

> 归属：架构基线 §11 工作项 2（负责人 B，验收标准「**有独立对比结果**」）+ 工作项 0 中"五类固定视角截图与环境记录"的 B 份额。
> 依赖：**不依赖 A**（§11 原文：「工作项 1 与 2 可以并行进行」）。
> 本任务的产出是**可复现的基准协议 + 一套基准产物**，不是一次性截图。

## Goal

把"改造前后对比"从主观印象变成可复现、可量化、可校验的流程：

1. 五类固定视角（§6.4）各有**精确的相机参数与固定前置状态**；
2. 性能有**固定口径与采样协议**（覆盖 §6.3 的五项记录）；
3. 采集产物带**完整元数据**，任何人在任何机器上都能复现，或明确标注差异来源。

## 现状事实（代码级；明细与出处见 `design.md` §1/§2 与 `research/evidence.md`）

- 相机初始参数：`fov 38, position [2.15, 1.1, 1.65], near 0.05, far 30`（`src/three/BikeViewer.tsx:440`）；`resetView()` 补间到同一位置、注视 `[0.05, 0.47, 0]`（`:175`）
- 曝光：整车 `toneMappingExposure 1.02`（`:439`）、单件预览 `1.08`（`src/three/PartPreview.tsx:29`）；tone mapping 未显式设置，由 R3F 默认设为 **ACESFilmic**
- 相机预设 7 个（`:356-364`：整车 / 车架 / 轮组 / 传动 / 刹车 / 操控 / 座舱）—— **与 §6.4 的五类视角不一一对应**："整车标准侧视"与"爆炸拆解视图"没有现成参数
- 窄屏自适应会直接改写相机位置（`:149-155`，aspect < 0.9 时整体 ×1.6）→ **视口尺寸必须固定**
- dpr 由 `PerformanceMonitor` 动态调整（`:444-450`）→ 采集时必须钉住
- 阴影贴图为静态：`BikeViewer` 前 6 帧强制预热（`:203-213`）、`StudioLights` 前 4 帧预热（`studio.tsx:120-124`）；而 `onReady` 只在第 3 帧触发（`:241-244`）→ **等待条件不能用 onReady**
- `ContactShadows` 有两种渲染路径：运动时逐帧重绘、静止时只渲染一次（`:271-281`）→ 静止态与爆炸态不可混采
- 源码中**不存在** `Math.random` / `Date.now()` / `performance.now()`（全仓 grep 为空）→ 确定性基础良好
- 本机**未安装** playwright / puppeteer；已安装 Chrome 154 与 Edge → 无头采集通道需自建；`oxipng` / `pngquant` 亦未安装（可用：ImageMagick 7.1.1、`jq` 1.7.1）→ 压缩需安装或按无损降级执行
- 路由是 **HashRouter**（`src/main.tsx:3,9`）→ `/#/explore?capture=1` 的 query 落在 hash 内、`location.search` **恒为空**：采集钩子的激活**不能**用 `location.search` 判定

## Requirements

- **R1 视角可复现**：五类视角各自给出精确相机参数 + 前置状态（模式、爆炸系数、等待条件：≥1.2 s 且 ≥30 帧）
- **R2 确定性**：逐条固定 `design.md` §2 列出的全部非确定性来源，不允许"凭经验等一会儿"
- **R3 色彩管理**：明确 tone mapping 链路与输出色彩空间，规定对比前的统一要求
- **R4 性能记录**：§6.3 的五项各给出口径、工具与采样协议
- **R5 产物与元数据**：固定目录、命名规范、元数据 JSON schema、体积预算
- **R6 独立验证**：可复现性自证（两次采集零像素差）+ 阈值化图像 diff 的具体命令

## 范围边界

**做**：采集协议、目录与命名约定、元数据 schema + 校验脚本、对比方法、五类视角参数标定、确定性核对表（AC6）、独立验证（双后端色差 / 色彩漂移 / 性能回归对比）、一次 B0 基准采集、`docs/visual-baseline/README.md`。

**不做**：不改零件几何 / 材质 / 交互（分别属 A 的工作项与 B 的其他任务）；不引入 CI 自动化渲染回归（B1 之后再考虑）；不做部署。

## 依赖（对 A 的需求输入，非本任务设计）

- **D1（必须，需 A 评审）**：`src/three/BikeViewer.tsx` 增加**仅采集态生效**的全局钩子（建议 `window.__atlas`），暴露 `resetView() / focusPart(id, zoom) / selectPart(id) / setExplode(v) / setDpr(v) / setDamping(v) / probeGpuTimer() / frameCount / getState()`；`getState()` 需返回 `camera.position/target`、`fov`、`near/far`、`explode`、`dpr`、`tier`、`damping`、`renderer.toneMapping`、`renderer.toneMappingExposure`、`renderer.info.render`、`firstFrameAt`（自导航起算的首帧时间戳，供加载耗时与确定性核对使用）。**激活方式**：`window.__atlasCapture === true || location.href.includes('capture=1')`；因路由为 HashRouter，**不得**用 `location.search` 判定（见「现状事实」）。理由：外部脚本无法精确设置相机与状态，模拟点击会触发 `pointerdown`（`:138-146`，置 `userMoved` 并取消补间）从而改变逻辑走向。该文件**不在**基线 §7.3 的共享契约清单内（清单见 `docs/ARCHITECTURE_BASELINE.md:352-377`），但改动影响渲染行为 → **建议按共享契约流程走 A 评审**。
- **D2（必须）**：确认爆炸态采集是否允许绕过滑杆直接设 `explode`，以及爆炸态下的取景意图（本任务已给 1.40 倍**试算起点**，需 A 确认）。
- **D3（信息）**：`PartPreview.tsx` 曝光 1.08 是否并入统一影棚参数——该问题归 `10-21-materials-lighting` 的 AC7，本任务只把差异记录进元数据。
- **D4（信息）**：性能测量的 GPU 后端（默认 Metal/GPU）与图像基准后端（SwiftShader）分属两条口径（`design.md` §3）；`EXT_disjoint_timer_query_webgl2` 不可用时按「不可用」如实记录。仅同步结论，无需 A 决策。

## 量化验收标准

| # | 验收项 | 判定方式 | 阈值 |
| --- | --- | --- | --- |
| AC1 | 五类视角各 ≥1 张基准图 | 目录检查 | 5/5 |
| AC2 | 同 commit 连续两次采集零像素差 | `magick compare -metric AE a.png b.png null:` | AE = 0 |
| AC3 | 每张图有完整元数据 | `node docs/visual-baseline/scripts/validate-metadata.mjs <批次>/*.json`（按 `design.md` §6 schema） | 缺失字段 0 |
| AC4 | 性能五项齐全（§6.3） | 报告检查 | 5/5 |
| AC5 | 第三方按元数据复采一致 | 复采后 compare | AE = 0 |
| AC6 | 非确定性来源全部处理 | 核对表 `research/determinism-check.md`（对 `design.md` §2 的 12 项逐条核对） | 未处理 0 条 |
| AC7 | 产物体积 | `du -sh docs/visual-baseline` | ≤ 8 MB |
| AC8 | 不改动业务行为 | `git diff --stat`（相对本任务开始） | 仅 `BikeViewer.tsx`（D1 钩子）+ `package.json`（`puppeteer-core`，独立依赖 PR）+ 新增文件 |

## 不做什么

- 不做像素级美术评审（人眼判定留给 §7.5 的评审流程，本任务只提供可比对材料）
- 不设硬性性能预算（§6.3：初期只要求"不得发生未经说明的显著性能退化"）
- 不采集装配动画过程中的帧（时间驱动、不可复现；只采静止态与爆炸终态）
- 不为「双后端色差」「色彩漂移」设硬性艺术阈值：给初值 + 每次真实对比时校准并记录（`design.md` §8）
