# 一手材料与出处（工作项 2：渲染与材质基准检查）

> 每条 = 结论 + 出处。无法验证的标 `[未验证]`。仓库内出处用 `路径:行号`。

## A. 相机与视角

1. Canvas 初始相机 `fov 38, position [2.15,1.1,1.65], near 0.05, far 30` — `src/three/BikeViewer.tsx:440`
2. `resetView()` 补间目标 `[2.15,1.1,1.65]`、注视 `[0.05,0.47,0]` — `BikeViewer.tsx:175`
3. `focusPart(id, zoom=1.15)`：以 `worldBox(id)` 的包围盒中心与尺寸计算，距离 `max(size.length()*zoom, 0.5)` — `BikeViewer.tsx:161-173`
4. 相机预设 7 项（整车 / 车架 0.85 / 轮组 1.0 / 传动 1.0 / 刹车 1.1 / 操控 1.35 / 座舱 1.3）— `BikeViewer.tsx:356-364`
5. 窄屏缩放：aspect < 0.9 → 整体 ×1.6；< 1.25 → ×1.3；`userMoved.current === true` 时跳过 — `BikeViewer.tsx:149-155`
6. 相机补间：球面插值 + easeInOutCubic，默认 duration 1.0 s — `BikeViewer.tsx:215-240`
7. `pointerdown` 会取消补间并置 `userMoved = true` — `BikeViewer.tsx:138-146`（故不可用模拟点击设视角）

## B. 确定性与渲染状态

8. 阴影预热：`readyFrames.current < 6` 时 `light.shadow.needsUpdate = true` — `BikeViewer.tsx:203-213`
9. `StudioLights` 前 4 帧预热，注释记录了"未预热则场景被判为全阴影 → 整屏黑"的教训 — `src/three/studio.tsx:118-124`
10. `onReady()` 在第 3 帧触发 — `BikeViewer.tsx:241-244`（**3 帧 ≠ 阴影就绪的 6 帧**，采集不能以 onReady 为等待条件）
11. OrbitControls：`enableDamping, dampingFactor 0.08, minDistance 0.45, maxDistance 5.5, maxPolarAngle π*0.495, target [0.05,0.47,0], autoRotate={mode==='hero'}, autoRotateSpeed 0.9, enablePan={mode==='explore'}` — `BikeViewer.tsx:282-293`
12. `ContactShadows`：`frames={moving ? Infinity : 1}`、`key={moving ? 'moving' : 'idle'}`（key 变化会重建组件）— `BikeViewer.tsx:271-281`
13. `moving = playing || explode > 0` — `BikeViewer.tsx:455`
14. `PerformanceMonitor` 动态 dpr：`flipflops=3`，范围 [1,2]（high）/[1,1.5]（low），初始 dpr = 2 / 1.5 — `BikeViewer.tsx:375, 444-450`
15. 全仓无 `Math.random` / `Date.now()` / `performance.now()`（对 `src/`、`content/` 执行 `grep -rn`，结果为空）
16. `prefers-reduced-motion` 规则存在 — `src/index.css:128`
17. 质量档位判定：`innerWidth < 768 || hardwareConcurrency <= 4 || deviceMemory <= 4` → `low` — `studio.tsx:24-31`

## C. 色彩链路

18. R3F 默认 tone mapping：`if (glProps?.toneMapping === undefined) gl.toneMapping = flat ? NoToneMapping : ACESFilmicToneMapping` — `node_modules/@react-three/fiber/dist/events-0dab3c53.cjs.dev.js:1777`（本项目未传 `flat`、未传 `toneMapping` → **ACESFilmic**）
19. 曝光：整车 `1.02` — `BikeViewer.tsx:439`；单件预览 `1.08` — `src/three/PartPreview.tsx:29`
20. three 默认 `this.toneMapping = NoToneMapping` — `node_modules/three/src/renderers/WebGLRenderer.js:277`（被 R3F 覆盖）
21. three 默认 `this._outputColorSpace = SRGBColorSpace` — `WebGLRenderer.js:312`
22. 背景球 `toneMapped={false}` — `studio.tsx:42`（背景不参与 tone mapping，有意设计）

## D. 性能计数口径

23. `render.calls++`；TRIANGLES 模式 `render.triangles += instanceCount * (count / 3)` — `node_modules/three/src/renderers/webgl/WebGLInfo.js:18-27`
24. 普通绘制 `info.update(count, mode, 1)` — `node_modules/three/src/renderers/webgl/WebGLBufferRenderer.js:15`；实例绘制 `info.update(count, mode, primcount)` — 同文件 `:25` → **InstancedMesh 记 1 次 draw call，但三角形按实例数乘算**
25. `autoReset: true`（默认）→ 每帧 `renderer.render()` 开始时清零，读到的是当帧值 — `WebGLInfo.js:65`、`WebGLRenderer.js:1731`

## E. 环境与几何（本机实测）

26. 未安装 playwright / puppeteer：`node_modules/.bin` 中无对应可执行文件；`~/Library/Caches/ms-playwright` 目录**存在**但只有运行时文件（`b/`、`daemon/`、`cli-update-check.json`），**无浏览器二进制** → 需用 `puppeteer-core` 复用已安装的 Chrome
27. 已安装 Chrome `154.0.8037.99`（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）与 Microsoft Edge
28. 视角 2 试算依据：`wheelR = 0.34`、`rearHub = [-0.415, 0.34, 0]`、`frontHub = [0.575, 0.34, 0]` — `src/three/bikeConfig.ts`
29. 视角 5 试算依据：`EXPLODE` 表最大位移 `tire: [0, -0.04, 0.88]` — `src/three/interaction.tsx` 的 `EXPLODE` 表

## F. `[未验证]` 清单

- `[未验证]` headless Chrome 下 `--virtual-time-budget` 与 rAF 推进的实际行为（CLI 降级方案依赖它）
- `[未验证]` SwiftShader 与 GPU 路径的输出色差（首次采集时跑双后端记 `RMSE`，超阈值则固定后端并写进 README）
- `[未验证]` `EXT_disjoint_timer_query_webgl2` 在本机 headless 的可用性（不可用则如实记录"不可用"）
- `[未验证]` 视角 2 / 5 的试算距离是否满足 8–12% 余量（必须实测标定后写入元数据）
