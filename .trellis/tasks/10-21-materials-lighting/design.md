# 材质与灯光技术规范

依据：`docs/ARCHITECTURE_BASELINE.md` §6.1/§6.2/§7.3、`DESIGN.md`、`CONTRIBUTING.md` §5。
一手证据全部来自本机 `node_modules` 源码，逐条出处见 `research/evidence.md`。

## 1. 现状盘点

### 1.1 材质清单（`src/three/materials.ts`）

| 名称 | 行号 | 关键参数 | 用途（全仓引用次数） |
| --- | --- | --- | --- |
| `mat.paintBlue` | 31 | `#1e40af` m0.5 r0.26 | **0（死代码）** |
| `mat.paintBlueDark` | 33 | `#172554` m0.5 r0.28 | **0（死代码）** |
| `mat.carbon` | 35-41 | `#24262c` m0.42 r0.36 + `carbonWeave` ns0.22 | **0（死代码）** |
| `mat.carbonRaw` | 43-49 | `#1b1d22` m0.32 r0.52 + `carbonWeave` ns0.3 | **0（死代码）** |
| `mat.alu` | 51-56 | `#cdd2d9` m1.0 r0.32 ×`brushed` | 抛光铝件 39 |
| `mat.aluBlack` | 58 | `#2b2e35` m0.9 r0.36 | 阳极氧化黑铝 61 |
| `mat.steel` | 60 | `#a8b0b9` m1.0 r0.28 | 钢件/螺栓/辐条 58 |
| `mat.ti` | 62 | `#bcbdc0` m0.92 r0.32 | 坐垫轨 1 |
| `mat.drivetrain` | 64 | `#d3d8de` m1.0 r0.22 | 链条/飞轮 6 |
| `mat.disc` | 66 | `#b3b9c1` m1.0 r0.30 ×`brushed` | 碟片 1 |
| `mat.rubber` | 68-74 | `#141518` m0 r0.94 + `tread` ns0.5 | 轮胎/把带/来令片背 1 |
| `mat.soft` | 76 | `#0e0f12` m0 r0.82 | 手变套/坐垫底 14 |
| `mat.saddle` | 78-84 | `#101114` m0 r0.78 + `carbonWeave` ns0.08 | 坐垫面 1 |
| `mat.tape` | 86-92 | `#232833` m0 r0.88 + `tapeRib` ns0.4 | 把带 1 |
| `mat.inner` | 94 | `#2a2c30` m0 r0.90 | 内胎 1 |
| `mat.housing` | 96 | `#17181c` m0.2 r0.60 | 线管/油管 6 |
| `mat.friction` | 98 | `#4b4f56` m0.3 r0.70 | 来令片摩擦材料 1 |
| `matP.paintMarine` | 109-116 | `#123a86` m0.78 r0.30 cc1.0 ccR0.06 env1.3 | 车架主漆（`frameModels.tsx:732-924`）15 |
| `matP.paintMarineDark` | 118-125 | `#0c2a63` m0.78 r0.32 cc1.0 ccR0.08 env1.25 | 前叉（`frameModels.tsx:1023-1040`）3 |
| `matP.carbonGloss` | 127-136 | `#22242a` m0.45 r0.38 cc0.85 ccR0.12 `carbonWeave` ns0.2 env1.1 | 轮圈/一体把/座管/曲柄 11 |

模型侧材质声明共 **212 处**（`<meshStandardMaterial>` 190 + `<meshPhysicalMaterial>` 22；
brake32 / drivetrain62 / frame44 / wheel31 / seating11 / cockpit10；循环内会更多）。
每处 JSX 材质元素生成**一个独立实例**（R3F `createInstance` → `new target(...)`），
所以 `interaction.tsx:179-203` 逐 mesh 改写 `emissive/opacity` 不会串件。

**内联材质（绕过预设，共 4 处）**：`frameModels.tsx:527-537`（字标 r0.35 m0.1 polygonOffset −2）、
`seatingModels.tsx:220`（字标 r0.50 m0.1 alphaTest0.4）、`wheelModels.tsx:421-427`（圈面字标 r0.45 m0 `depthWrite=false`）、
`studio.tsx:40-44`（背景球 `meshBasicMaterial` + `toneMapped=false`，有意例外）。前 3 处同类表面参数互不相同。

### 1.2 纹理清单（`src/three/textures.ts`）

| key | 生成器（行号） | 尺寸 / RGBA8 数据量 | 类型 | 声明 colorSpace | 运行期 colorSpace | 引用 |
| --- | --- | --- | --- | --- | --- | --- |
| `carbon-weave` | `makeNormalTexture` 256² str1.6（87-103） | 256² / 256 KiB | 法线 | 未声明 | `NoColorSpace`（正确） | `mat.carbon*`/`matP.carbonGloss` |
| `brushed-metal` | `makeGrayTexture` 256²（106-111） | 256² / 256 KiB | 粗糙度 | 未声明 | `NoColorSpace`（正确） | `mat.alu`/`mat.disc` |
| `tire-tread` | `makeNormalTexture` 128² str1.2（114-124） | 128² / 64 KiB | 法线 | 未声明 | `NoColorSpace`（正确） | `mat.rubber` |
| `bar-tape-rib` | `makeNormalTexture` 128² str1.4（127-133） | 128² / 64 KiB | 法线 | 未声明 | `NoColorSpace`（正确） | `mat.tape` |
| `decal-brand` | `makeDecalTexture` 1024×256（161-183） | 1 MiB | 颜色+alpha | 未声明 | `SRGBColorSpace`（R3F 自动赋） | 下管字标 |
| `decal-badge` | 256²（186-200） | 256 KiB | 颜色+alpha | 未声明 | 同上 | 头管徽标 |
| `decal-small` | 512×96（203-210） | 192 KiB | 颜色+alpha | 未声明 | 同上 | 立管/圈面/座管字标 |
| `backdrop-v` | 16×512（217-228） | 32 KiB | 颜色 | 未声明 | 同上 | `studio.tsx:38` 背景球 |
| `floor-radial` | 512²（231-242） | 1 MiB | 颜色 | 未声明 | — | **0（死代码，深色影棚遗留）** |
| `brand-glow` | 512²（245-253） | 1 MiB | 颜色 | 未声明 | — | **0（死代码）** |

- 生成总量 **548,864 px**（≈0.55 MP，≈2.09 MiB），全部在**模块加载时同步**执行（`materials.ts:19-27` 顶层调用）；
  法线贴图每像素 4 次高度采样。缓存 `cache`（`textures.ts:9`）返回值是**共享可变单例**。
- 法线/灰度贴图统一 `RepeatWrapping`（`textures.ts:47,76`）；贴花与背景用默认 `ClampToEdgeWrapping`。
- 全仓无任何 `repeat`/`offset`/`rotation` 设置 → 平铺完全由几何 UV 决定（见 §3.4）。

### 1.3 光照清单（`src/three/studio.tsx`）

真实光源（`StudioLights`，`studio.tsx:109-152`）：

| # | 光源 | 行号 | 位置 | 强度 | 颜色 | 角色 |
| --- | --- | --- | --- | --- | --- | --- |
| L1 | `ambientLight` | 127 | — | 0.95 | 白 | 全局底光 |
| L2 | `directionalLight` **name=`key-light`** | 128-145 | `[2.6,3.4,2]` | 1.9 | 白 | 主光 + 唯一投影（静态阴影贴图） |
| L3 | `directionalLight` | 146 | `[-3.2,2.4,1.4]` | 0.85 | `#eef4ff` | 冷色侧补 |
| L4 | `directionalLight` | 147 | `[0.5,1.6,-3]` | 0.8 | `#fff0d8` | 暖色背光（轮廓分离） |
| L5 | `directionalLight` | 149 | `[-1.6,1.5,-2.6]` | 0.55 | `#f4f7ff` | 轻轮廓 |
| L6 | `directionalLight` | `PartPreview.tsx:36` | `[1.6,2.2,3]` | 0.9 | `#ffffff` | **仅单件**：正面柔光 |
| L7 | `directionalLight` | `PartPreview.tsx:37` | `[-2.4,0.9,2.2]` | 0.6 | `#e6eeff` | **仅单件**：低位侧补 |

影棚环境（`StudioEnvironment`，`studio.tsx:47-105`；`<Environment resolution={256|128} frames={1} environmentIntensity={0.95}>`）：
Lightformer 的 `intensity` 是 **HDR 发光倍率**（drei 把它乘进 `meshBasicMaterial.color`，`Lightformer.js:22-29`），
**不产生投影**，只贡献反射/IBL：E1 主柔光箱 `[3.5,4,2.5]` 6.5 白（51-58）、E2 冷侧补 `[-4.5,2.5,1.5]` 2.0 `#eef4ff`（59-67）、
E3 背景暖反弹 `[-0.5,2.8,-4.5]` 2.8 `#fff6e8`（68-76）、E4 顶部大柔光 `[0,5.5,0]` 2.6 `#fdfcf8`（77-85）、
E5 地面反弹 `[0,-2.5,2]` 1.3 `#fff9ef`（86-94）、E6 细长条光 `[2.5,1.2,3.5]` 2.2 白（95-103）。

后期与全局：SSAO(16/0.06/10/0.5/`#3a342a`)、Bloom(整车0.20 / 单件0.18 / low档0.12，阈值0.95，mipmapBlur)、
Vignette(0.3/0.32)、`multisampling=4`（`studio.tsx:155-194`）；
曝光 整车 **1.02**（`BikeViewer.tsx:439`）/ 单件 **1.08**（`PartPreview.tsx:29`）；
接触阴影 整车(0.38/3.4/3/1.25/1024)（`BikeViewer.tsx:271-281`）/ 单件(0.32/2.4/2.6/1.4/512)（`PartPreview.tsx:43-51`）；
背景球半径 整车 18（`BikeViewer.tsx:263`）/ 单件 7（`PartPreview.tsx:32`）。

**耦合点**：`name="key-light"`（`studio.tsx:130`）被 `BikeViewer.tsx:204` 用
`scene.getObjectByName('key-light')` 反向查找，用于「零件运动时手动刷新静态阴影贴图」；
改名/删除会让装配动画与爆炸时阴影不再更新。

### 1.4 与 §6.1 / §6.2 的差距清单

| ID | 差距 | 证据 | 条款 | 严重度 |
| --- | --- | --- | --- | --- |
| G1 | 整车/单件曝光不等（1.02 vs 1.08，+5.9%） | `BikeViewer.tsx:439` / `PartPreview.tsx:29` | §6.1 一致性 | 高 |
| G2 | 整车/单件直接光强度代数和 5.05 vs 6.55（**+29.7%**） | §1.3 L1-L7 | §6.1 一致性 | 高 |
| G3 | 接触阴影 4 项参数不等（opacity/scale/blur/far/res） | `BikeViewer.tsx:271-281` vs `PartPreview.tsx:43-51` | §6.1 一致性 | 中 |
| G4 | `matP.*` 的 `envMapIntensity`（1.3/1.25/1.1）**不生效**，是死参数 | three `WebGLMaterials.js:403-407` 需 `material.envMap` 才写入；`WebGLRenderer.js:2736-2738` 写入 `scene.environmentIntensity` | §6.1 | 高 |
| G5 | 金属度中间值：`paintMarine*` 0.78、`aluBlack` 0.9、`ti` 0.92、`carbonGloss` 0.45、`friction` 0.3、`housing` 0.2 | `materials.ts:58,62,96,98,110,119,128` | §6.1「不以拉高金属度代替真实感」 | 高 |
| G6 | `roughnessMap` 乘算未在注释体现：`alu`/`disc` 有效粗糙度 0.09–0.14（名义 0.32/0.30） | `materials.ts:51-56,66` + `textures.ts:106-111` | §6.1 | 中 |
| G7 | 共享纹理单例是可变全局状态：`colorSpace` 被 R3F 就地改写；`repeat/wrap/anisotropy` 无保护 | `textures.ts:9,46-49` + R3F `colorMaps` 自动赋值 | §6.2 实例状态独立 | 中 |
| G8 | 3 处贴花内联材质参数互不相同（r0.35/0.50/0.45） | §1.1 内联材质 | §6.1 一致性 | 中 |
| G9 | 碳纹物理尺度未受控：同一张贴图在轮圈与下管的单元尺寸相差约 11×（估算） | `textures.ts:87-103` + 几何 UV 0..1 | §6.1 | 中 |
| G10 | 4 预设 + 2 纹理零引用（死代码） | `materials.ts:31,33,35,43`；`textures.ts:231,245` | §6.2 资源管理 | 低 |
| G11 | 动态资源释放责任未定义：模块级纹理永不 `dispose`；`useMemo` 自建几何是否被 R3F 回收 `[未验证]` | `materials.ts:19-27`、`frameModels.tsx:347` | §6.2 释放责任 | 中 |
| G12 | 文档漂移：`DESIGN.md` §四 写 `matP.paintBlue/paintBlueDark`（不存在）、Bloom 阈值 0.82（实际 0.95）、曝光 1.08（整车实际 1.02） | `DESIGN.md` §三/§四 vs 代码 | 基线 §9.2 | 中 |
| G13 | 程序化纹理同步生成 0.55 MP 阻塞首屏，成本未测 | `textures.ts:20-45` | §6.3 | 低 |

## 2. 材质口径规范（把「真实感」翻译成物理量）

依据 three r186 源码 JSDoc：`MeshStandardMaterial.js:77-96`、`MeshPhysicalMaterial.js:141-171,313-340,395-400`、
`lights_physical_fragment.glsl.js:60`。Filament / Khronos 官方页本次未取到，见 `research/evidence.md`。

| 物理量 | three 原文要点 | 允许区间 | 禁止 |
| --- | --- | --- | --- |
| `metalness` | 「非金属用 0.0，金属用 1.0，通常没有中间值；中间值可用于锈蚀金属」 | 非金属 ≤ **0.2**；金属 = **1.0**；或 0 + `clearcoat` 表示涂层金属 | 0.4–0.95 中间值无注释理由 |
| `roughness` | 0 = 镜面，1 = 完全漫反射；与 `roughnessMap` **相乘** | 漆面 0.20–0.35；光泽碳 0.30–0.45；未涂装碳 0.45–0.60；铝 0.25–0.45；橡胶 0.85–0.95 | 有效值 < 0.05 而无说明 |
| `clearcoat` | 「0..1 的透明薄层强度」，默认 0 | 漆面 0.8–1.0；清漆碳 0.6–0.9 | 用它给非漆面「加亮」 |
| `clearcoatRoughness` | 清漆层粗糙度 | 0.04–0.15 | < 0.02 |
| `ior` | 「非金属折射率，1.0–2.333」，默认 1.5 | 用默认 1.5 | 用它替代 `roughness` 调高光 |
| `specularIntensity` | 仅非金属；0 = 朗伯，默认 1 | 默认 1；哑光塑料可下调 | 与 `metalness` 同向叠加 |
| `envMapIntensity` | 默认 1 | **本仓库不生效**（G4）→ 不得依赖它调亮 | 写进预设却不生效 |
| `normalScale` | 法线贴图 XY 强度 | 0.05–0.5 | > 1 |

清漆 F0 在 three 中固定 **0.04**（等价 IOR 1.5，`lights_physical_fragment.glsl.js:60`），不可调 ——
「清漆亮度」只能通过 `clearcoat` 与 `clearcoatRoughness` 表达。

### 2.1 §6.1 禁止项的**可检查形式**（R 规则集）

| 规则 | 内容 | 检查方式 |
| --- | --- | --- |
| **R1** | 非金属 `metalness ≤ 0.2`；金属 `metalness = 1.0`（或 0+clearcoat）。中间值必须在注释写明「模拟的真实结构」 | 脚本扫预设数值 + 注释；例外在 PR 登记 |
| **R2** | 环境反射强度只允许通过 `scene.environmentIntensity` 调整（当前 0.95）；`envMapIntensity` 不得作为调亮手段 | 脚本扫预设（出现即警告）；单次改动 > 10% 需 A 确认 |
| **R3** | `Bloom.intensity ≤ 0.25` 且 `luminanceThreshold ≥ 0.9` | 脚本扫 `studio.tsx` 调用点 |
| **R4** | 任一光源 `intensity` 单次变动 > 10%，或直接光强度代数和变动 > 10% → 视为全局视觉变更 | 脚本 diff + PR 流程（§4.3） |
| **R5** | 预设注释必须写明「有效粗糙度区间」（含 `roughnessMap` 乘算结果）；有效值 < 0.05 必须说明 | 脚本扫注释格式 |
| **R6** | 整车与单件 `toneMappingExposure` 必须**完全相等** | 脚本 / vitest 断言 |

判定「用拉高参数代替真实感」的充分条件（任一命中即需 PR 说明）：金属度落在 0.2–0.95 且无注释理由；
Bloom/环境/光强总和单次上调 > 10%；有效粗糙度 < 0.05；曝光两侧不等。

## 3. 正交新增约定（§6.2）

### 3.1 命名

- 标准材质 `mat.<lowerCamel>`，物理材质 `matP.<lowerCamel>`；语义前缀限定为
  `paint*` / `carbon*` / `alu*` / `steel` `ti` / `rubber` `soft` `tape` `saddle` `inner` / `housing` `friction` `disc` `drivetrain` `decal`。
- 纹理生成函数 `<subject><Kind>`，`Kind ∈ {Normal, Roughness, Texture}`（如 `carbonWeaveNormal`）。
- 纹理缓存 key kebab-case，与函数名一一对应（`carbonWeaveNormal` → `carbon-weave`）；
  **key 是缓存主键，发布后不得更改**（改 key = 缓存失效 + 引用断裂）。

### 3.2 纹理生成与缓存

1. 一律经 `makeNormalTexture` / `makeGrayTexture` / `makeDecalTexture`（`textures.ts:12,54,140`）；
   禁止在模型文件中 `new CanvasTexture`。
2. key 必须全局唯一；新增前先 `grep` 现有 key。
3. 返回值是**共享单例，只读**：禁止 post-creation 改动 `repeat`/`offset`/`rotation`/`wrap*`/`anisotropy`/`colorSpace`/`flipY`。
   需要不同平铺时用**新 key** 生成（`Texture.clone()` 的 GPU 复用行为 `[未验证]`，不作默认手段）。
4. 成本口径：≈ `size²` × 每像素采样次数（法线 4 次）；新增 > 256² 需在 PR 说明收益。

### 3.3 colorSpace（常见错误点）

three 的 `Texture.colorSpace` 默认 `NoColorSpace`（`Texture.js:48`）；渲染时**只有 `SRGBColorSpace` 触发硬件
sRGB→linear 解码**（`WebGLTextures.js:230`：RGBA+UnsignedByte → 内部格式 `SRGB8_ALPHA8`）。按 three 自身文档：

- 颜色数据（`map`/`emissiveMap`/`sheenColorMap`/`specularColorMap`）→ **`SRGBColorSpace`**
  （`MeshStandardMaterial.js:104-105,178-179`；`MeshPhysicalMaterial.js:232-233,346-348`）。
- 非颜色数据（`normalMap`/`roughnessMap`/`metalnessMap`/`aoMap`/`bumpMap`/`alphaMap`/`displacementMap`/
  `clearcoat*Map`/`anisotropyMap`/`iridescence*Map`/`specularIntensityMap`）→ **`NoColorSpace`**（默认值，不要动）。
- 本仓库现状：全部未声明，颜色类靠 R3F 自动转换兜底（`colorMaps = ['map','emissiveMap','sheenColorMap','specularColorMap','envMap']`，
  命中即就地写 `texture.colorSpace = SRGBColorSpace`）。**要求改为在 `textures.ts` 创建时显式声明**，原因：
  ① 该兜底只对 R3F 的材质属性赋值生效，`<primitive object={material}>` 等路径不受保护；
  ② 它**就地改写共享单例**，使 colorSpace 成为隐式全局状态；③ 显式声明后兜底变成幂等空操作，可安全保留。
- 贴花同时带 alpha：`SRGB8_ALPHA8` 下 **alpha 通道不做色彩转换**（硬件行为），`transparent`+`alphaTest` 与 sRGB 标记不冲突。

### 3.4 UV、切线空间与平铺

- **切线空间**：本仓库几何**无任何 `tangent` 属性**（grep 为空）→ three 走 `getTangentFrame`
  （屏幕空间导数 TBN，`normal_fragment_begin.glsl.js:30-38`、`normalmap_pars_fragment.glsl.js:20-45`）。推论：
  ① 法线贴图「+Y」绑定**几何 UV 的 +V**，不是几何的「上」；② 对网格做镜像/负缩放会翻转 G 通道方向
  （本仓库 −Z 侧贴花用 `rotation={[0,π,0]}` 旋转物体，不是负缩放，且贴花不用 `normalMap`，暂不受影响）；
  ③ UV 常量/退化时 `det == 0` → 法线扰动被完全抑制，因此**必须有非退化 UV**；
  ④ 不同 UV 布局的几何共用同一张贴图时「凹凸方向」表现不同，属预期行为，换几何时需复核。
- **平铺口径**：无 `repeat` 设置 → 纹理在几何 UV 的 0..1 各贴一次。对圆周向 UV 的旋转体
  （`cylinderGeometry`/`latheGeometry`），u 方向 1 个周期 = 周长，故 **纹理单元物理尺寸 = 周长 / 单元数**。
  以碳纹（256px 内 16 格，`textures.ts:92`）为例：轮圈 `r≈0.288 m` → 周长 ≈1.81 m → 单元 ≈ **113 mm**；
  下管 `r≈0.025 m` → 周长 ≈0.157 m → 单元 ≈ **9.8 mm**；相差约 **11×**（估算，各生成器实际 UV 需逐零件复核）。
- **修正方式（正交）**：为该用途**新建 key**（如 `carbon-weave-4x`）并在生成器里提高格数密度；
  **不要**就地改共享单例的 `repeat`。贴花/背景保持 `ClampToEdgeWrapping` 与 `polygonOffset`
  （`frameModels.tsx:533-535`）或 `depthWrite=false`（`wheelModels.tsx:423`）防 z-fighting。

### 3.5 「新增不重排」的落地做法

1. `mat`/`matP`/`decals` 新键一律**追加末尾**；不改已有键的顺序、数值、注释（保持 `as const`）。
2. 删除死项（G10）作为**独立 PR**，一次只删零引用项，PR 里附「全仓 0 引用」的 `grep` 证据。
3. 纹理新函数追加在 `textures.ts` 对应分区末尾，key 只增不改名。
4. `studio.tsx` 新光源/新 Lightformer 追加末尾并给唯一 `name`；**不动** `key-light` 的名称与语义。
5. 改这三个文件前先在 Issue/PR 写明范围（`CONTRIBUTING.md` §5、基线 §7.3），A 必须 review。

## 4. 灯光规范

### 4.1 角色分工（一个光源只有一个主职责）

| 角色 | 承担者 | 允许调整 | 不应承担 |
| --- | --- | --- | --- |
| 主光 / 唯一投影 | `key-light`（L2） | 位置、强度、shadow 参数 | 改 `name`（断 `BikeViewer.tsx:204`） |
| 全局底光 | `ambientLight`（L1） | 强度 | 制造高光 |
| 补光 fill | L3 / L6 | 强度、颜色 | 制造第二组投影 |
| 轮廓 rim | L4 / L5 / L7 | 强度、颜色 | 提亮主体正面 |
| 环境反弹 / IBL | E1–E6 | 位置、强度、颜色、scale | 制造投影（Lightformer 无阴影） |
| 全局曝光 | `toneMappingExposure` | 单一数值，整车/单件必须相等 | 补偿材质问题 |

### 4.2 数值改动的影响面矩阵

| 改动 | 影响面 | 需重烘焙/重拍 | 备注 |
| --- | --- | --- | --- |
| `ambientLight.intensity` | 所有材质漫反射底；对金属影响很小 | 否 | 整体提亮/压暗 |
| `key-light.intensity` | 主光照明 + 阴影对比度 | 阴影贴图 | |
| `key-light.position` | 所有零件镜面高光位置 + 阴影方向 | 阴影贴图 + 五视角 | 影响面最大 |
| L3–L7 强度/颜色 | 对应方向漫反射与高光、金属高光条位置 | 否 | |
| Lightformer 任一字段 | **只影响反射/IBL**（无投影） | 环境 cube（`frames={1}`，children 变化重烘焙一次） | 对金属与清漆面影响最大 |
| `scene.environmentIntensity` | 全局环境反射强度（当前唯一有效的环境控制） | 否 | ≈ 全局改所有材质反射 |
| `toneMappingExposure` | 全场景线性缩放（ACES 前置） | 否 | 两侧必须同步 |
| Bloom / SSAO / Vignette | 仅 > 阈值像素 / 局部对比 | 否 | 受 R3 约束 |

### 4.3 「改动已有光照数值 = 全局视觉变更」流程（`CONTRIBUTING.md` §5）

1. **声明**：PR 写明改哪个光源的哪个字段、旧值 → 新值、理由。
2. **量化**：给出「直接光强度代数和」「曝光」「环境强度」改动前后的三个数字（脚本可算，§6.1 A5）。
3. **证据**：附五类固定视角改造前后对比截图（基线 §6.4；相机参数取自 D2）。
4. **确认**：A 明确 approve（共享契约 + 全局视觉变更双条件）。
5. **回滚点**：每个 PR 只含一组光照数值改动，回滚 = `git revert` 单提交即恢复旧画面。
6. **禁止**：同一 PR 混合「光照数值改动」与「几何/模型改动」（出问题无法归因）。

### 4.4 新增灯光的正交做法

1. 追加在 `StudioLights` 返回数组末尾（L 类）或 `StudioEnvironment` 末尾（E 类），不改已有元素顺序与参数。
2. 必须给唯一 `name`（当前只有 `key-light` 有 name）。
3. 强度从 0 起加：先以 `intensity=0` 合并，再用单独 PR 上调，避免一次性破坏曝光。
4. L 类新增若设 `castShadow`，会与 `key-light` 的静态阴影策略冲突
   （`shadow-autoUpdate={false}` 只对 `key-light` 设置，`studio.tsx:132`）—— 需在 PR 说明。
5. 新增后重拍五视角并记录 draw call / 帧率变化（AC11）。

## 5. 一致性验证方案（整车 vs 单件）

### 5.1 结构性约束（首选，自动可测）

把两场景**共享**的影棚参数抽成单一定义（落在 `studio.tsx`，B 的文件）：

```ts
export const STUDIO_PRESET = {
  ambient: 0.95,
  exposure: 1.02,                 // 整车与单件共用同一个值
  environmentIntensity: 0.95,
  key: { position: [2.6, 3.4, 2], intensity: 1.9 },
  fills: [/* L3-L5 */],
  bloom: { intensity: 0.2, threshold: 0.95 },
  contactShadow: { opacity: 0.38, scale: 3.4, blur: 3, far: 1.25, color: '#4a4438' },
} as const
```

场景只允许覆盖**视角相关**字段：背景球半径、shadowExtent/shadowSize、camera、dpr、autoRotate、SSAO 开关。
测试断言两侧共享字段完全相同（AC5/AC7）→ 一致性由结构保证，而不是靠事后比对。

### 5.2 量化比对（无浏览器依赖）

指标：直接光强度代数和、曝光、环境强度、接触阴影 5 元组。
判定：AC6（代数和差 ≤ 5%）、AC7（曝光相等）、G3 的 5 元组逐项相等。
现状基线（不合格）：5.05 vs 6.55（+29.7%）、1.02 vs 1.08、接触阴影 4 项不等。

### 5.3 像素级比对（需浏览器，最终证据）

1. **消元法（零新依赖，先做）**：在单件预览页临时把 `exposure` 改为 1.02、去掉 L6/L7，与默认截图对比。
   差异可忽略 → 证明差异来源就是这 3 个变量，直接按 §5.1 统一；仍有明显差异 → 再查背景球半径与接触阴影。
2. **同几何同材质双场景**：取 `tire` / `rotor` / `frame` 各一，在整车视角与单件预览下用固定相机、
   固定 `dpr=1`、固定视口渲染，统计该零件屏幕包围盒区域的**平均 RGB 与 95 分位亮度**。
   容差建议：均值 |Δ| ≤ 2/255，95 分位 ≤ 4/255（**建议值，需 A 确认**）。
3. **依赖**：像素比对需浏览器自动化或人工截图 + 图像统计。当前 `node_modules` 无
   `jsdom`/`canvas`/`playwright`/`puppeteer`（已确认），新增依赖需单独开 PR（`CONTRIBUTING.md` §5）。

### 5.4 只能人眼评审

金属高光层次、过曝死白、接地阴影自然度、Bloom 是否「发光代替材质」、车漆色相、纹理物理尺度协调性。

## 6. 自动化边界

### 6.1 能自动测

| # | 检查项 | 实现 | 现状可行性 |
| --- | --- | --- | --- |
| A1 | 预设零引用（`mat.*`/`matP.*`） | 读 `materials.ts` 文本取键 → 扫 `src/three/**` 引用 | 立即可做（纯文本） |
| A2 | 纹理零引用 + 缓存 key 唯一 + 命名规范 | 读 `textures.ts` 文本正则 | 立即可做 |
| A3 | 数值区间 R1/R3/R5 | 文本解析 `materials.ts`/`studio.tsx` 数值 | 立即可做 |
| A4 | colorSpace 声明正确 | 文本断言：颜色类生成器出现 `SRGBColorSpace`，法线/灰度类不出现 | **需先做 PR-2 显式声明** |
| A5 | 整车/单件共享参数一致（AC5/6/7） | 参数抽为常量后直接 import 断言 | 需先做 PR-3 |
| A6 | 材质实例不跨零件共享（AC8） | 静态：禁止 `<primitive object={material}>` / `material={...}`；运行时：dev 断言 | 静态立即可做；运行时需 A 配合 |
| A7 | 光照耦合点未被改（`key-light` 名称） | 文本断言两文件中的字符串一致 | 立即可做 |
| A8 | 五视角截图产物存在且尺寸固定 | 文件存在性 + 尺寸（不比像素） | 需先有截图目录约定（D2） |

**关键约束**：`materials.ts`/`textures.ts` 在**模块顶层**调用 `document.createElement('canvas')`
（`materials.ts:19-27` → `textures.ts:20`），而 `vite.config.ts:7` 的测试环境是 `environment: 'node'`，
且未安装 `jsdom`/`canvas`。因此 **vitest 里 `import '../src/three/materials'` 会抛
`ReferenceError: document is not defined`**。所以：立即可做的检查一律走**文本解析**（不 import）；
若要做真正的数值断言，需先把预设拆成**纯数据模块**（无 DOM 依赖），纹理生成保持独立
—— 这是共享契约的结构性改动，需 A 评审（PR-4）。

### 6.2 只能人眼评审

同 §5.4；另外「性能观感」不由眼睛判定，帧率用记录工具测（AC11）。

## 7. 与 §6.2 逐条对照

| §6.2 条款 | 当前状态 | 结论 |
| --- | --- | --- |
| 几何可共享，实例交互状态必须独立 | 几何共享；材质逐 mesh 独立（212 实例） | **成立**，但缺保护机制（AC8） |
| 外部模型需检查材质实例是否共享 | 无 GLB | 不适用；B1 引入时按 D5 预留检查点 |
| 禁止因选中零件而意外改其他零件的颜色/透明度 | `interaction.tsx:179-203` 逐 mesh 写；材质实例不共享 | **当前成立**；风险在「未来有人用共享材质对象」 |
| 动态创建的资源必须有清晰释放责任 | 模块级纹理永不释放；drei `Environment` 卸载时 `fbo.dispose()`（`Environment.js:117-121`）✅；自建几何回收 `[未验证]` | **部分缺口**（G11） |
| 重复几何优先复用/实例化 | 辐条/链节用 `InstancedMesh`（`geometryHelpers.tsx:112`、`drivetrainModels.tsx:279`、`wheelModels.tsx:159`） | 成立 |
| GLB 许可证 | 无 GLB | 不适用 |
