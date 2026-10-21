# B 线评估的独立验证记录（2026-10-21）

> 目的：为 B 线评估与规范提供**不依赖作者自身判断**的检验凭据。
> 方法：由独立子代理重新推导与核查（不采信待验证文档的结论），逐条判定并给出证据行号。
> 状态：第一轮复核 6 条硬缺陷；第二轮核查四份任务文档集的内在一致性；修复由**发现问题的同一代理**执行（避免转述失真）。

## 一、第一轮：6 条硬缺陷的独立复核（Explore 代理）

判定格式：`PASS/FAIL/UNCERTAIN — 证据 — 与描述的差异`。结果：**6/6 PASS**。

| # | 命题 | 判定 | 关键证据 |
| --- | --- | --- | --- |
| 1 | 导轮节圆半径硬编码 0.0095，按 11 齿 × 12.7mm 应为 0.022234（2.34×） | PASS | `drivetrainModels.tsx:898`（`gearGeometry(11, 0.0095, …)`，第二参数即 pitchR，签名 `:107-114`）；`:70` 的 `pitchRadius()` 在飞轮处使用（`:549`、`:644`）；`bikeConfig.ts:99` pitch=0.0127；`0.022234/0.0095 = 2.3404` |
| 2 | 卡钳碟片缝与碟片平面错位 19mm / 9mm | PASS | `brakeModels.tsx:67-68`（z=−0.052/−0.024）；`CaliperBody` 局部原点即缝中心（注释 `:92-94`，两夹体 z=±0.01、厚 0.014 → 缝 ±0.003）；碟片用 `B.rotor.offsetZ=−0.033`（`bikeConfig.ts:102` → `brakeModels.tsx:310-311`） |
| 3 | 车把夹持口径四处不一致 | PASS | `bikeConfig.ts:70`（tubeR=0.0119 → ⌀23.8mm，注释写 31.8mm，零引用）；`cockpitModels.tsx:336-342`（把立夹环 ⌀23.6mm）；`drivetrainModels.tsx:1039`（手变夹环 ⌀31.0mm）；`bikeConfig.ts:76`（clampR=0.0159 → ⌀31.8mm，零引用）。补充：实际把管中心段 `tubeBarR=0.0115`（⌀23.0mm，`cockpitModels.tsx:92`），手变夹环完全抱不住 |
| 4 | 塔基被两个模块各建一份 | PASS | `wheelModels.tsx:56`（FREEHUB_R=0.0165，网格 `:310-311`，长 36mm）vs `drivetrainModels.tsx:603`（`B.cassette.bodyR−0.0005`=0.0155，z 0.016→0.064，长 48mm）；`BikeAssembly.tsx:14-18` 同时渲染两者。差异：半径 16.5 vs 15.5mm、长度 36 vs 48mm，且嵌套共存 |
| 5 | `matP.*` 的 `envMapIntensity` 在 `scene.environment` 路径下失效 | PASS（表述需精确化） | `WebGLRenderer.js:2738`：当 `material.envMap===null && scene.environment!==null` 时直接写入 `scene.environmentIntensity`；`WebGLMaterials.js:407` 有 guard，`material.envMapIntensity` **从未被上传**（比"被覆盖"更彻底）；`studio.tsx:49` 的 0.95 经 drei 写入 `scene.environmentIntensity` |
| 6 | 几何断言在 Node/vitest 环境跑不起来 | PASS（属潜伏性阻塞） | `vite.config.ts:9` `environment:'node'`（无 setupFiles、无 jsdom）；`materials.ts:19-24` 模块作用域调用纹理工厂，`textures.ts:20` 的 `document.createElement` → 首次导入几何模块即抛 `ReferenceError`。**当前 `vitest run` 能过**是因为 `tests/` 只 import `content/*` |

**额外发现（第一轮）**：

- **链条路径穿过导轮中心**：`drivetrainModels.tsx:657-660` 把导轮圆心当曲线控制点（CHAIN_Z=0.049 vs 导轮 z=0.05），链条完全不绕导轮圆周；即使按现有 9.5mm 节圆，也会穿过半径 7.6mm 的轮芯（`:981-984`）→ 第 7 个缺陷
- `B.bar.tubeR`、`B.caliper.flatMountZ=-0.042`（`bikeConfig.ts:103`）同样零引用

## 二、第二轮：四份任务文档集的内在一致性核查（general-purpose 代理 ×4）

核查项：AC 落点、验证方法落地、跨文档数字/结论矛盾、失效引用、evidence 出处抽查（≥8 条/份）。

| 任务 | 落点缺失 | 未落地验证项 | 矛盾 | 失效引用 | evidence 错位 |
| --- | --- | --- | --- | --- | --- |
| `component-refine` | AC9 无落点；AC2 词表不符 | §5.3 两条断言无步骤；S5/S8 校验清单不全 | 4 处（EXPLODE 键集合"相等 vs 超集"、Node import 自相矛盾、0.05mm 容差 vs 实际 0.101/0.069、EXPLODE 排序错） | 2 处行号错位 + `research/manuals/` 不存在 | 抽查通过 |
| `visual-baseline` | AC3、AC6 无落点 | 6 项（双后端 RMSE、timer query、首帧时间戳、dampingFactor、CIE76/性能回归、oxipng） | 6 处（含 **`capture=1` 在 HashRouter 下永不生效**、`grep dist` 不可能为 0、帧数 vs 1.2s、余量 20% vs 8–12%、AC8 vs package.json、schema 缺字段） | `BikeViewer.tsx` 不在基线 §7.3 清单（引错）；依赖变更未单独开 PR | 1/29（ms-playwright 目录实为存在） |
| `materials-lighting` | AC3/AC5/AC8/AC2 部分缺失 | A7/A8 断言、§5.3.1/5.3.2、共享常量断言（**AC5 判定方式本身不可行**）、AC11 方法 | 4 处（接触阴影 4 vs 5 项、粗糙度 0.09–0.14 事实 vs 未验证、AC7 阈值 vs 降级、PR 编号不对应） | 5 处（含 `vite.config.ts:7`→`:9`、paintMarine 15→12） | 3/20+（Bloom 行号、计数口径、mat 行域） |
| `high-precision-pilot` | AC6 无落点；AC8 截图无步骤 | AE=0 命令、SSIM 判定、爆炸图对照无输入、模型不导出尺寸 | 3 处（工作量 3.0–5.0 vs 2.5–4.0、"可立即执行"vs 依赖工作项 2、契约清单两侧不一致） | 3 处（导轮齿形归错工具、D 清单 N3、capture-baseline.mjs 未登记） | 2/26（行号区间） |

**结论**：数字类断言（预设 20=17+3、零引用 4+2、光强 5.05/6.55、曝光 1.02/1.08、212=190+22、导轮 0.0095/0.022234/2.34×）经交叉核对**全部一致**；问题集中在**落点、口径、引用与可执行性**四类——即"规范写得对，但执行清单接不住"。

## 三、子代理通道状态（本次实测）

- 上游 `reasoning_content` 故障期间：`general-purpose` 长任务密集失败（16 连败），`Explore` 与极简探针可成功
- 用户授权使用 `high` 档位后：`Explore`（6 条复核，39 次工具调用）与 `general-purpose`（4 份一致性核查，各 28–36 次调用）**全部成功**
- 项目级代理定义（`.zcode/agents/b-line-verifier.md`，`thoughtLevel: high`）**本会话未被发现**（Agent 类型在会话启动时枚举）→ 需新会话验证；当前以 `Explore` 承担只读复核角色

## 四、修复状态

四份文档集的修复由**发现问题的同一代理**在后台执行（避免转述失真），修复范围与要求已逐条下达；修复完成后需再次核对：改动数字与行号是否与源码一致、AC 落点是否闭合。
