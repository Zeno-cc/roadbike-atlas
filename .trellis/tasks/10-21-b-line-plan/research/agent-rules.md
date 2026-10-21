# B 线评估子代理：质量与证据规则（所有 B 线评估任务共用）

> 本文件是 4 个 B 线评估子代理的共用契约。子代理必须先读本文件，再读各自任务指定的材料。

## 项目

`/Users/zacheryxu/Code_NoIcloud/roadbike-atlas` —— 纯前端公路车 3D 零部件图鉴（React 19 + three.js r186 + @react-three/fiber 9 + drei 10 + postprocessing 6 + Vite）。全部几何为程序化建模，零外部资源依赖。

权威文档：`docs/ARCHITECTURE_BASELINE.md`（技术基线 v1.0.1）、`DESIGN.md`（视觉标准 + 四条已知教训）、`CONTRIBUTING.md`（协作与共享契约规则）。

## 环境约束

- **WebSearch 不可用**（provider 不支持），不要依赖。
- **WebFetch 对 github.com 会超时**；`threejs.org` / `khronos.org` / `developer.mozilla.org` / `google.github.io/filament` 可尝试；失败就标 `[未获取]` 并改用本地一手材料。
- **本地一手材料是最终仲裁者**：`node_modules/three`（源码 + 类型声明）、`node_modules/@react-three/*`、`node_modules/postprocessing`、`src/three/*`。
- 只读的 git 查询（`git log/show/diff`）允许；**任何改变仓库状态的 git 操作禁止**。

## 证据规则（严格执行）

1. 中文；结论必须**可执行、可验证**。
2. 每条非显然论断必须给出处：仓库文件用 `路径:行号`；网络来源用 URL + 访问结果。
3. **禁止编造**数字、API 行为、零件号、厂家规格或标准条款；无法验证的标 `[未验证]` / `[未获取]` 并说明原因。
4. 需要量化的地方必须量化（容差、采样次数、阈值、尺寸）；不写"看起来像 / 差不多 / 应该可以"。
5. **透彻 ≠ 大**：宁少而准，禁止"最佳实践"式空话与填充段落。

## 硬边界

- 只写自己任务目录（`.trellis/tasks/10-21-<your-task>/`）下的文件；不得修改 `src/`、`content/`、`node_modules`、其他任务目录或仓库其他文件。
- **不得设计 A 角色的核心契约**（Catalog / Instance / Asset ID、`PartInstance` / `PartAsset` / `ExplodeRule` 属 A）；只能以"需求输入清单"的形式列出需要 A 提供什么。

## 写入顺序（重要）

按 `prd.md` → `design.md` → `implement.md` → `research/evidence.md` 顺序**逐个写入**，便于中断时保留已完成部分。

## 文件规格

| 文件 | 内容 | 行数 |
| --- | --- | --- |
| `prd.md` | 需求、范围边界、依赖（含对 A 的依赖）、**量化验收标准**、不做什么 | 60–120 |
| `design.md` | 方法学与工具、参数、命令、产物路径与命名、数据结构 | 120–260 |
| `implement.md` | 有序执行清单（每步含校验命令）、评审门、回滚点、工作量估计 | 60–140 |
| `research/evidence.md` | 一手材料与出处清单（含 `[未验证]` 项） | 不限，每条须有出处 |

## 返回格式

≤15 行摘要：写了哪些文件；最重要的 5 条结论；无法验证的事项清单。
