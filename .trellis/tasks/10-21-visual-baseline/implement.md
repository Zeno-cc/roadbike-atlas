# 执行清单（工作项 2：渲染与材质基准检查）

> 每步给出：动作、校验命令、评审门、回滚点、工作量。
> 涉及 `package.json`（基线 §7.3 清单内）与 `src/three/BikeViewer.tsx`（**不在 §7.3 清单内**，但改动影响渲染行为，按共享契约流程走）的改动 → **必须 A 评审**。

## 步骤 0：启动（0.1 人日）

```bash
python3 ./.trellis/scripts/task.py start .trellis/tasks/10-21-visual-baseline
git switch main && git pull --ff-only
git switch -c feat/visual-baseline
```

- 前置：A 已收到 D1/D2 需求输入（见 `prd.md`「依赖」）；`git status` 干净
- 校验：`python3 ./.trellis/scripts/task.py current --source`

## 步骤 1：D1 采集钩子（0.3 人日，PR-1，需 A 评审）

动作：在 `BikeViewer.tsx` 增加**仅采集态生效**的全局钩子：

- 生效条件：`window.__atlasCapture === true`——由采集脚本用 `page.evaluateOnNewDocument` 在应用脚本执行**之前**注入。**不要用 `location.search`**：路由是 HashRouter（`src/main.tsx:3,9`），`/#/explore?capture=1` 的 query 落在 hash 内、`location.search` 恒为空，判定永不成立；也不用 `import.meta.env.DEV`，采集跑的是 preview 生产构建
- 暴露：`resetView() / focusPart(id, zoom) / selectPart(id) / setExplode(v) / setDpr(v) / setDamping(v) / getState() / frameCount / firstFrameAt`
- `getState()` 返回：`camera.position/target`、`fov`、`explode`、`dpr`、`tier`、`damping`、`moving`、`reducedMotion`、`renderer.toneMapping`、`renderer.toneMappingExposure`、`renderer.info.render`

校验：

```bash
npm test && npm run build
npm run preview   # 手工：控制台先执行 window.__atlasCapture = true，再刷新页面
                  #   → __atlas.getState() 有值、setExplode(1) 生效
                  # 不带该标志刷新 → window.__atlas 必须为 undefined
```

- 校验（运行时断言，替代不可行的静态 grep）：`grep dist` 不可能为 0——钩子字符串必然打进 bundle。改为在 puppeteer 里断言「未注入标志 → `window.__atlas === undefined`；注入后 → 有值」
- 评审门：A 评审；确认既有交互行为未被改变
- 回滚：`git revert <commit>`（钩子完全隔离，无状态残留）
- 风险：钩子泄漏到生产 → 以 `window.__atlasCapture` 显式开关为准；钩子只读暴露 + 三个 setter，不改变渲染逻辑

## 步骤 2：采集脚本（依赖 PR 0.1 + 脚本 0.4，PR-2a / PR-2b）

动作（**依赖变更必须单独开 PR**，见 CONTRIBUTING「依赖变更单独开 PR」）：

```bash
# PR-2a（仅依赖，独立评审与回滚）
npm i -D puppeteer-core        # 不下载 Chromium，复用本机 Chrome
# PR-2b（脚本）
# 新增 docs/visual-baseline/scripts/capture-baseline.mjs
```

脚本流程：`npm run build` → `vite preview --port 4173` → `puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 默认 Chrome 路径, args: [...] })` → `page.evaluateOnNewDocument(() => { window.__atlasCapture = true })` → 逐视角 `page.evaluate` 设置 → **等待 ≥1.2 s 且 ≥30 帧** → `page.screenshot({ clip: canvasRect, type: 'png' })` → 写同名 `.json` → 汇总 `perf.json`。
启动参数见 `design.md` §3（含 `--use-angle=swiftshader`、`--force-device-scale-factor=1`、`--hide-scrollbars`、`--force-prefers-reduced-motion`、`--window-size=1600,1000`）。

校验：

```bash
node docs/visual-baseline/scripts/capture-baseline.mjs --view 01
node docs/visual-baseline/scripts/capture-baseline.mjs --repeat 2 --view 01
magick compare -metric AE out/run1/01-side-3q.png out/run2/01-side-3q.png null:   # 必须为 0（AC2）
```

- 评审门：`package.json` 变更需 A 评审（共享契约）；确认依赖不引入 Chromium 下载
- 回滚：删除脚本 + `git revert` package.json 变更

## 步骤 3：视角标定（0.2 人日）

动作：按 `design.md` §1 的 **8–12% 余量**规则标定视角 2 与视角 5 的相机距离；标定值写入元数据与 `README.md`。

校验：脚本输出各视角的像素边界余量；连续两次标定结果一致（AE = 0）

- 评审门：无（仅参数）
- 回滚：无

## 步骤 4：B0 基准采集（0.2 人日，PR-3）

动作：在当前 `main`（B0）上采集完整批次（5 视角 + `perf.json`）+ 写 `docs/visual-baseline/README.md`。

校验：

```bash
node docs/visual-baseline/scripts/validate-metadata.mjs   # AC3：按 design §6 schema 校验每张图的同名 .json（缺字段 0）
magick compare -metric AE a.png b.png null:                # AC2 / AC5：同 commit 两次采集、第三方复采
du -sh docs/visual-baseline                                # AC7 ≤ 8 MB
```

- **AC6**：按 `design.md` §2 的 12 条逐条核对，产出核对表（每条写明"如何固定"的**实际证据**：元数据字段或脚本参数），未处理项必须为 0
- **性能五项**（design §5）：`perf.json` 须含帧时间分位（p50/p95/p99）、calls、triangles、GPU 计时（`EXT_disjoint_timer_query_webgl2` 探测；不可用则如实记"不可用"，不跳过）、加载大小与耗时（含 `firstFrameAt`）
- **双后端色差**（design §4 的 `[未验证]`）：同一视角分别用 `--use-angle=swiftshader` 与 GPU 各采一次，记 `magick compare -metric RMSE`；超阈值则固定后端并写入 `README.md`
- **压缩**（design §7）：`oxipng` / `pngquant` 本机未安装 → 优先无损方案（安装 `oxipng` 或 ImageMagick 无损参数），有损必须在元数据标注

- 评审门：A 抽查一张图，按元数据独立复采 → AE = 0（AC5）
- 回滚：`git revert`（产物为新增文件，删除即回滚）

## 步骤 5：交付（0.1 人日）

- `README.md` 写清：如何复现（含依赖安装与命令）、后端选择（图像用 swiftshader / 性能用 GPU）、色彩约定、各阈值含义与校准记录
- PR 中附五张图与 `perf.json`；对照 `design.md` §8 的验证表逐条给结果
- 校验 AC8：`git diff --stat` 相对任务开始时仅 `BikeViewer.tsx`、`package.json`、`package-lock.json` + 新增文件（与 `prd.md` 的 AC8 允许清单一致）

## 工作量汇总

| 步骤 | 人日 |
| --- | --- |
| 1 D1 钩子 | 0.3 |
| 2 采集脚本 | 0.4 |
| 3 视角标定 | 0.2 |
| 4 B0 采集 | 0.2 |
| 5 交付 | 0.1 |
| **合计** | **1.2** |

## 依赖与阻塞

- 步骤 1 依赖 A 的评审窗口（D1/D2）；**步骤 2 的脚本可先行开发**（不依赖钩子完成，用占位接口）
- 步骤 3、4 依赖步骤 1 完成
- 若 `puppeteer-core` 安装受阻，退到 `design.md` §3 的 B/C 档并明确标注 `captureMethod`（此时 AC2/AC5 无法自证，需在 PR 说明）
