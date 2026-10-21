# 视觉基准采集与性能测量设计（工作项 2）

依据：`docs/ARCHITECTURE_BASELINE.md` §6.3 / §6.4 / §11；证据出处逐条见 `research/evidence.md`。

## 1. 五类固定视角的可复现定义

固定视口 **1600 × 1000**（aspect = 1.6）、`mode='explore'`、非播放态、dpr 钉住、等待帧数 ≥ 30（覆盖阴影预热 6 帧 + 接触阴影单次重绘 + 相机补间 1.0 s）。

| # | 视角（§6.4） | 相机位置 | 注视点 | fov | 来源 / 是否需新增 |
| --- | --- | --- | --- | --- | --- |
| 1 | 整车右侧三分之四 | `[2.15, 1.1, 1.65]` | `[0.05, 0.47, 0]` | 38 | 现有 `resetView()`（`BikeViewer.tsx:175`） |
| 2 | 整车标准侧视 | `[0.05, 0.47, 1.85]` | `[0.05, 0.47, 0]` | 38 | **需新增**（试算值，必须实测标定） |
| 3 | 传动系统近景 | 由 `focusPart('crankset', 1.0)` 计算 | 曲柄包围盒中心 | 38 | 现有 API（`:161-173`）；参数采集时记录 |
| 4 | 车头与手变近景 | 由 `focusPart('shifter', 1.0)` 计算 | 手变包围盒中心 | 38 | **需 D1 钩子**（`shifter` 无预设按钮） |
| 5 | 爆炸拆解视图 | 视角 1 × 1.40 拉远（试算） | 同视角 1 | 38 | **需新增**；前置 `setExplode(1.0)` |

**视角 2 距离的试算依据**：整车 x 跨度 ≈ `[-0.755, +0.915]`（后轴 −0.415 − 轮半径 0.34；前轴 +0.575 + 0.34，见 `bikeConfig.ts` 的 `rearHub/frontHub/wheelR`）→ 宽度 1.67 m；竖直 fov 38°、aspect 1.6 → 水平半角 28.9°；`D = (1.67/2)/tan(28.9°) = 1.52 m`，留 20% 余量 → **起始值 1.85 m**。
**标定程序（必须执行，不得直接采信试算值）**：采集后用像素边界法检查——整车左右边缘距画面边缘的余量应落在 **8–12%**；不足则按比例调整 `D` 重采，把最终值写进元数据。

**视角 5 的取景依据**：`EXPLODE` 表的最大位移约 0.88 m（`tire`，`interaction.tsx`），爆炸后包围盒在 z 向显著增长 → 相机距离按 1.40 倍试算，同样按 8–12% 余量标定；并确认无零件被裁切。

**静止态与爆炸态不可混采**：`ContactShadows` 在 `moving = playing || explode > 0` 时逐帧重绘、静止时只渲染一次（`BikeViewer.tsx:272-281`）——同一视角必须在同一状态下采集，且元数据记录 `explode` 值。

## 2. 确定性协议（逐条来源 → 固定做法）

| # | 非确定性来源 | 依据 | 固定做法 |
| --- | --- | --- | --- |
| 1 | 窄屏相机缩放 | `BikeViewer.tsx:149-155` | 固定视口 1600×1000；**不得模拟点击**（`pointerdown` 会置 `userMoved=true`，改变该逻辑走向），改用 D1 钩子 |
| 2 | hero 模式自动旋转 | `:290`（`autoRotate={mode==='hero'}`） | 一律用 `explore` 模式 |
| 3 | OrbitControls 阻尼 | `:285`（`dampingFactor 0.08`） | 程序化设相机后等待 ≥30 帧；如仍不稳定，经 D1 把 `dampingFactor` 临时设 0 |
| 4 | `PerformanceMonitor` 动态 dpr | `:444-450` | 经 D1 的 `setDpr()` 钉住（high 档 2 / low 档 1.5），并在元数据记录实际 dpr |
| 5 | 阴影贴图预热 | `:209`（6 帧）、`studio.tsx:120-124`（4 帧） | 等待 ≥30 帧 |
| 6 | 相机补间（1.0 s 缓动） | `:215-240` | 等待 ≥30 帧或 ≥1.2 s |
| 7 | 接触阴影双路径 | `:272-281` | 同视角同状态采集；元数据记录 `explode` 与 `moving` |
| 8 | 装配动画（时间驱动） | `interaction.tsx` 的 `play()` | 不采集播放态 |
| 9 | 纹理/几何随机性 | 全仓无 `Math.random`（grep 为空） | 无需处理；仍以 AC2 零像素差自证 |
| 10 | 系统"减少动态效果"偏好 | `src/index.css:128`（`prefers-reduced-motion`） | 启动参数显式声明 `--force-prefers-reduced-motion`，并记入元数据 |
| 11 | UI 悬浮层（卡片、滑杆、提示条） | `BikeViewer.tsx:474-674` | 截图只裁 **canvas 区域**（`clip` 到 canvas bounding box），不包含 UI —— 避免 UI 改动造成假 diff |
| 12 | 设备像素比与窗口尺寸 | — | 启动参数 `--force-device-scale-factor=1` + 固定 `--window-size` |

## 3. 采集通道（三档，按可复现性排序）

### A. puppeteer-core + 本机 Chrome（推荐）

- 依赖：`npm i -D puppeteer-core`（**不下载 Chromium**，复用已安装的 Chrome 154）
- 启动参数：`--headless=new`、`--use-angle=swiftshader`（软件渲染，跨机器最可复现）、`--force-device-scale-factor=1`、`--hide-scrollbars`、`--force-prefers-reduced-motion`、`--window-size=1600,1000`
- 页面来源：**必须用 `npm run build && npm run preview`（端口 4173）**，不用 dev server（HMR 与源码映射引入额外不确定性）
- 设视角：`page.evaluate` 调 D1 钩子 → 等待 `frameCount` 增长 ≥30 → 截图 `clip` 到 canvas
- 脚本路径：`docs/visual-baseline/scripts/capture-baseline.mjs`（与基准批次一起版本化）

**两种渲染后端的用途区分（必须记录在元数据）**：

| 后端 | 用途 | 说明 |
| --- | --- | --- |
| `--use-angle=swiftshader` | **图像基准** | 软件光栅，跨机器差异最小；慢 |
| 默认（Metal/GPU） | **性能测量** | 真实用户路径；有 GPU 驱动差异，性能数据仅同机可比 |

### B. 纯 CLI 降级（无 Node 依赖）

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --screenshot=01-side-3q.png --window-size=1600,1000 \
  --force-device-scale-factor=1 --hide-scrollbars \
  --virtual-time-budget=8000 "http://localhost:4173/#/explore"
```

限制：**无法设置相机**，只能采到视角 1（默认视角）→ 仅作应急，产出必须标 `captureMethod: "cli-degraded"`。

### C. 人工协议（最后手段）

固定窗口 1600×1000、等 3 s、系统截图、按命名规范保存、手工填写元数据 → 标 `captureMethod: "manual"`。仅用于没有脚本环境的场合（例如第三方复采者），且该批次不可用于 AC2 自证。

## 4. 色彩管理

**实际链路（证据）**：R3F 默认 `ACESFilmicToneMapping`（`@react-three/fiber` events-*.cjs.dev.js:1777；本项目未传 `flat`）→ 曝光 `1.02`（整车）/`1.08`（单件）→ three 默认输出 `SRGBColorSpace`（`WebGLRenderer.js:312`）。背景球显式 `toneMapped={false}`（`studio.tsx:42`）→ 背景**不参与** tone mapping，这是有意设计。

由此得出三条硬要求：

1. 截图是 **ACES 映射后的 sRGB 8-bit 图像**，不是线性数据；任何"亮度/对比"判断都必须在同一 tone mapping 与曝光下比较。**改曝光 = 全局视觉变更**（CONTRIBUTING §5：需对方确认）。
2. 截图后**禁止**任何二次色彩处理：不转 JPEG、不加滤镜、不调色阶、不裁剪重采样。
3. 人眼评审色彩时必须在同一台（或已校准的）显示器上；跨显示器只做结构性判断（几何、贴合、比例），不做色彩判断。
4. 元数据必须记录 `toneMapping` 与 `exposure`（经 D1 的 `getState()` 读 `renderer.toneMapping` / `toneMappingExposure`）。

`[未验证]`：SwiftShader 与 GPU 路径的输出是否存在可见色差。处理方式——首次采集同时跑两种后端，记录 `compare -metric RMSE`；若差异 > 阈值则在后端选择上固定 SwiftShader 并在 README 声明。

## 5. 性能测量协议

**口径（证据：`WebGLInfo.js:18-50`、`WebGLBufferRenderer.js:15/25`、`WebGLRenderer.js:1731`）**

- `render.calls`：每次 draw call +1；**InstancedMesh 记为 1 次**（`renderInstances` → `info.update(count, mode, primcount)`）
- `render.triangles`：`instanceCount × (count / 3)` → **实例数乘算**（48 根辐条 = 48 倍三角形）。这是最容易记错的一项，报告里必须写明该口径
- `autoReset: true`（`WebGLInfo.js:65`）→ 每帧 `render()` 开始时清零，读到的是**当帧**数值，不是累计值
- 读法：经 D1 暴露 `renderer.info.render`，取稳定帧的中位数

**采样协议**

1. 预热 ≥30 帧（覆盖阴影与 shader 编译）
2. 连续采样 300 帧的帧间隔（`performance.now()` 差分），报告 **p50 / p95 / p99 与最长帧**
3. 重复 3 轮，取轮间中位数；报告波动范围
4. 同一次运行内记录：`calls`、`triangles`、`points`、`lines` 的中位数

**§6.3 五项记录的落法**

| 项 | 工具 / 口径 | 备注 |
| --- | --- | --- |
| FPS / 帧时间 | 上述采样协议 | 报告 p50/p95/p99，不报"平均 FPS"单值 |
| Draw Call | `renderer.info.render.calls` | InstancedMesh = 1 |
| 三角面 | `renderer.info.render.triangles` | 含实例乘算 |
| GPU 占用 | `EXT_disjoint_timer_query_webgl2` | `[待实测]`：SwiftShader 下不可用；不可用时**如实记录"不可用"**，不跳过该项 |
| 加载大小与耗时 | `du -sh dist`、`dist/assets/*.js` gzip 后体积、`performance.getEntriesByType('navigation')`、D1 记录的首帧时间戳 | 大小与耗时分别记录 |

**控制变量清单（每次采集必填）**：commit SHA、构建命令、设备型号、macOS 版本、Chrome 版本、视口、dpr、tone mapping、exposure、质量档位 `tier`、WebGL 后端、视角名。

## 6. 元数据 JSON schema（每张图一个同名 `.json`）

```json
{
  "schemaVersion": 1,
  "capturedAt": "ISO-8601",
  "commit": "<full sha>",
  "buildCmd": "npm run build",
  "view": "01-side-3q | 02-side | 03-drivetrain | 04-cockpit | 05-exploded",
  "camera": { "position": [0,0,0], "target": [0,0,0], "fov": 38, "near": 0.05, "far": 30 },
  "explode": 0,
  "mode": "explore",
  "tier": "high",
  "dpr": 2,
  "viewport": { "width": 1600, "height": 1000 },
  "toneMapping": "ACESFilmic",
  "exposure": 1.02,
  "backend": "swiftshader",
  "chromeVersion": "154.0.8037.99",
  "os": "macOS <version>",
  "device": "<model>",
  "frameWait": 30,
  "captureMethod": "puppeteer-core",
  "file": "01-side-3q.png",
  "sha256": "<png 校验和>"
}
```

## 7. 产物目录与命名

```text
docs/visual-baseline/
├── README.md                      # 协议摘要：如何复现、如何对比、后端与色彩约定
├── 2026-10-21-<sha7>/             # 一个批次 = 一次采集（目录名含日期与 commit 短 SHA）
│   ├── 01-side-3q.png  + .json
│   ├── 02-side.png     + .json
│   ├── 03-drivetrain.png + .json
│   ├── 04-cockpit.png  + .json
│   ├── 05-exploded.png + .json
│   └── perf.json                  # 五项性能记录 + 控制变量
└── scripts/capture-baseline.mjs   # 采集脚本（与批次同版本化）
```

- **命名**：`NN-<view>.png`；批次目录必须含日期与 commit 短 SHA（对比材料必须与 commit 绑定，§6.4）
- **体积预算**：单张 PNG ≤ 1.2 MB；整批（5 图 + JSON）≤ 8 MB（AC7）
- **压缩**：优先无损 `oxipng -o4`；仍超限才用 `pngquant --quality=80-95`（有损，必须在元数据标注）
- **为什么入库**：§6.4 要求视觉变更提供改造前后对比；基准必须可被第三方按元数据复现，因此与源码同仓版本化

## 8. 独立验证

| 目的 | 命令 / 方法 | 阈值 |
| --- | --- | --- |
| 可复现性自证（AC2） | `magick compare -metric AE a.png b.png null:` | AE = 0 |
| 第三方复采一致（AC5） | 按元数据复采后同上 | AE = 0 |
| 变更对比 | `magick compare -metric RMSE before.png after.png diff.png` + SSIM | SSIM ≥ 0.995 视为无可见变化；0.98–0.995 需人眼确认；< 0.98 视为显著变化（阈值首次真实对比时校准并记录） |
| 色彩漂移 | `-metric CIE76` 或 CIEDE2000（`skimage`） | 报告**区域**而非全图均值；阈值同上待校准 |
| 性能回归 | 对比 `perf.json` | p95 帧时间或 calls/triangles 上升 > 10% 必须在 PR 说明（对应 §6.3"未经说明的显著退化"） |

## 9. 与验收判据的映射

AC1 → §7；AC2 → §8；AC3 → §6；AC4 → §5；AC5 → §8；AC6 → §2；AC7 → §7；AC8 → `implement.md` 步骤 1 的改动范围约束。
