# 执行清单（工作项 2：渲染与材质基准检查）

> 每步给出：动作、校验命令、评审门、回滚点、工作量。
> 涉及 `src/three/BikeViewer.tsx`、`package.json` 的改动属共享契约（基线 §7.3）→ **必须 A 评审**。

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

- 生效条件：`location.search.includes('capture=1')`（不用 `import.meta.env.DEV`，因为采集跑的是 preview 生产构建）
- 暴露：`resetView() / focusPart(id, zoom) / selectPart(id) / setExplode(v) / setDpr(v) / getState() / frameCount`
- `getState()` 返回：`camera.position/target`、`fov`、`explode`、`dpr`、`tier`、`renderer.toneMapping`、`renderer.toneMappingExposure`、`renderer.info.render`

校验：

```bash
npm test && npm run build
grep -c "__atlas" dist/assets/*.js   # 未带 capture=1 时构建产物中应为 0（钩子为条件注入）
npm run preview   # 手工：/#/explore?capture=1 → 控制台 __atlas.getState() 有值、setExplode(1) 生效
```

- 评审门：A 评审（共享契约文件）；确认既有交互行为未被改变
- 回滚：`git revert <commit>`（钩子完全隔离，无状态残留）
- 风险：钩子泄漏到生产 → 用 `capture=1` 显式开关 + 上述 grep 校验兜底

## 步骤 2：采集脚本（0.4 人日，PR-2）

动作：

```bash
npm i -D puppeteer-core        # 不下载 Chromium，复用本机 Chrome
# 新增 docs/visual-baseline/scripts/capture-baseline.mjs
```

脚本流程：`npm run build` → `vite preview --port 4173` → `puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? 默认 Chrome 路径, args: [...] })` → 逐视角 `page.evaluate` 设置 → 等帧 ≥30 → `page.screenshot({ clip: canvasRect, type: 'png' })` → 写同名 `.json` → 汇总 `perf.json`。
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

校验：AC1–AC5、AC7 逐条过；`du -sh docs/visual-baseline` ≤ 8 MB

- 评审门：A 抽查一张图，按元数据独立复采 → AE = 0（AC5）
- 回滚：`git revert`（产物为新增文件，删除即回滚）

## 步骤 5：交付（0.1 人日）

- `README.md` 写清：如何复现（含依赖安装与命令）、后端选择（图像用 swiftshader / 性能用 GPU）、色彩约定、各阈值含义与校准记录
- PR 中附五张图与 `perf.json`；对照 `design.md` §8 的验证表逐条给结果
- 校验 AC8：`git diff --stat` 相对任务开始时仅 `BikeViewer.tsx` + 新增文件

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
