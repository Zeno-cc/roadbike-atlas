# 协作与版本管理约定

本项目采用 **GitHub Flow**：`main` 永远可构建、可部署；所有改动走**短分支 → Pull Request → CI 通过 → Squash 合并**。

2 人规模**不需要** `develop` 分支，也不需要长期特性分支。唯一会让协作变痛苦的模式是"大分支做两周"——分支活得越久，冲突越贵。

---

## 一、三条铁律

1. **`main` 只能通过 PR 合入**。已开启分支保护：需要 1 人 approve + CI 通过；不允许强推、不允许删除分支。
2. **一个任务 = 一个分支 = 一个 PR**，分支寿命控制在 2–3 天内，做完立即合并。
3. **共享契约文件（第四节）的改动必须在 PR 描述里写明影响范围**，由另一方重点核对。

## 二、环境准备

### 仓库 owner（首次）

```bash
# 邀请同事为协作者（对方会收到邮件邀请，接受后即可推送）
gh api -X PUT repos/Zeno-cc/roadbike-atlas/collaborators/<同事GitHub用户名> \
  -f permission=push
```

### 同事首次上手

```bash
git clone git@github.com:Zeno-cc/roadbike-atlas.git
cd roadbike-atlas
nvm use            # 读取 .nvmrc（Node 22）
npm install
npm run dev        # http://localhost:5173
```

推送前先自报家门（否则 commit 作者信息不对）：

```bash
git config user.name  "你的名字"
git config user.email "你的邮箱"
```

**网络：若 `github.com:443` 连不上**（裸连超时、但 api.github.com 正常时就是这种），改用 SSH over 443。写入 `~/.ssh/config`：

```
Host github.com
  Hostname ssh.github.com
  Port 443
  User git
```

之后 `git@github.com:...` 的地址照常可用（`ssh -T git@github.com` 应显示 `Hi <用户名>!`）。

## 三、日常流程

```bash
# 1. 开工前：同步 main
git switch main && git pull --rebase

# 2. 开短分支（命名：类型/简短描述）
git switch -c feat/rear-derailleur-cage

# 3. 写代码…… 然后本地自检（与 CI 跑的是同两条命令）
npm test && npm run build

# 4. 提交
git add -A
git commit -m "feat: 后拨导轮增加齿形"

# 5. 合并前先对齐 main（把别人已合入的改动 rebase 进来，在本地解决冲突）
git fetch origin && git rebase origin/main

# 6. 推送 + 开 PR
git push -u origin feat/rear-derailleur-cage
gh pr create --fill        # 或到网页创建

# 7. CI 绿灯 + 对方 approve → "Squash and merge" → 分支自动删除
```

### 分支命名

| 前缀 | 用途 | 例子 |
| --- | --- | --- |
| `feat/` | 新功能/新零件/新交互 | `feat/rotor-centerlock` |
| `model/` | 纯 3D 模型精修 | `model/saddle-rail-hook` |
| `content/` | 纯文案/规格/术语 | `content/chain-wear-check` |
| `fix/` | 修 bug | `fix/spoke-nipple-offset` |
| `chore/` | 依赖、CI、配置 | `chore/bump-three` |

### 提交信息

`类型: 中文描述`，类型同分支前缀（feat/model/content/fix/chore/docs）。一次提交只做一件事。

## 四、模块所有权与并行切分

原则：**一个人完整拥有一批文件**；文件归属不清的改动先开 PR 说明。建议的初始切分：

| 归属 | 内容 |
| --- | --- |
| **A（车架/轮组 + 基建）** | `src/three/models/frameModels.tsx`、`wheelModels.tsx`；`studio.tsx` / `materials.ts` / `textures.ts` 视觉基建；`BikeViewer.tsx` / `interaction.tsx` 交互；CI 与部署 |
| **B（传动/刹车/操控/座舱 + 内容）** | `src/three/models/drivetrainModels.tsx`、`brakeModels.tsx`、`cockpitModels.tsx`、`seatingModels.tsx`；`content/parts/*.ts` 全部内容数据；`parts/` 与 `glossary` 相关页面 |
| **共享契约（改 = 开 PR + 对方 review）** | `bikeConfig.ts`、`interaction.tsx` 的 `EXPLODE` 表、`geometryHelpers.tsx`、`studio.tsx`、`materials.ts`、`textures.ts`、`modelRegistry.tsx`、`index.css` 的 `@theme`、`content/schema.ts`、`tests/`、`package.json` |

页面层可按需再分：`src/pages/*` 一人一半（如 B 拿 `PartDetail` + `Glossary`，A 拿 `Explore` + `Home` + `AssemblyGuide` + `SystemPage`）；`src/components/ui.tsx` 视为共享，**只追加新组件，不重排已有组件**。

## 五、共享契约文件的修改规则

这些文件是整车所有零件共同依赖的"接口"，改动方式决定了协作是否顺畅：

- **`bikeConfig.ts` 是几何骨架**：改任何一个锚点（`headTop`、`bb`、`rearHub`…），头管、把立、前叉、走线、传动链条的贴合位置全都跟着变。改它 = 契约变更：PR 里写清影响哪些零件，合并前必须跑一遍 `npm run dev` 逐视角看整车（尤其头管/五通/后拨链线）。
- **`EXPLODE` 表、`MODEL_BY_PART`、`@theme` 令牌、测试断言：只追加，不重排**。各自在自己的分区里加行，冲突概率接近 0。
- **`materials.ts` / `textures.ts` / `studio.tsx`：正交新增优先**（加一个 `paintXxx` 材质、加一张纹理、加一盏灯），改动已有光照数值属于全局视觉变更，需对方确认。
- **`content/schema.ts`：改字段 = 27 个零件全受影响**，必须在 PR 里说明，并同步更新 `tests/content.test.ts` 的校验。
- **`package.json` / `package-lock.json`：依赖变更单独开 PR**，不要和功能改动混在一起。`package-lock.json` 是生成文件，冲突时不要手工合并：

  ```bash
  git checkout origin/main -- package-lock.json
  npm install          # 按合并后的 package.json 重新生成
  ```

## 六、冲突预防与解决

预防（顺序即优先级）：

1. **每天开工前 `git fetch origin && git log --oneline origin/main -5`**，知道对方合了什么。
2. **不重排、不重格式化你没改的代码**——"顺手格式化一下"是冲突的第一大来源。改哪一行动哪一行。
3. 共享文件按第五节"只追加"。
4. PR 保持小（理想 < 400 行 diff）。大 PR 不仅难 review，还长期霸占共享文件的修改权。

解决：

- **内容/追加类冲突**（两人各加了一个零件、各加了一行 EXPLODE）：两边都要保留。
- **数值类冲突**（`bikeConfig.ts` 同一行被双方改了）：**不能"两边都要"**——以"经过 review 的那一方"为准，重新在本地跑一遍整车视觉确认后再合并。
- 拿不准时不要在冲突中猜：先在 PR 里 @ 对方说明，再决定保留哪一版。

## 七、CI 做什么，为什么必须绿

`.github/workflows/ci.yml` 在**每个 PR 和每次合入 main 时**运行：

1. `npm ci` — 严格按 lockfile 安装（能发现"本地能跑、别人装不上"）
2. `npm test` — 13 项内容完整性校验：27 个零件字段齐全、关联 id 合法、组装流程覆盖全部零件、术语与车型分类无缺项
3. `npm run build` — `tsc -b` 类型检查 + 生产构建

这里的关键价值是第 2 项：**内容数据是这个项目的核心资产，改 `content/` 下任何文件若破坏了字段或关联 id，CI 会立刻拦下**，不会等到页面白屏才发现。

CI 名称为 `CI`，已在分支保护里设为必需检查——红灯的 PR 无法合并。

## 八、加新零件要同步改的地方

见 [README 的"如何更新内容"](./README.md#如何更新内容)。四处必须同步：内容条目 → 模型组件 → `MODEL_BY_PART` 注册 → `EXPLODE` 向量 → `tests/content.test.ts` 的 id 列表。这四处分属不同人的话，由"发起人开一个 PR 全部改完"，不要让半成品散落在 main 上。

## 九、视觉/渲染层的已知坑（改模型前先读）

以下均已写入 [DESIGN.md](./DESIGN.md) 的"四条教训"，改 3D 代码时容易重现：

- 实例化矩阵必须用**局部坐标**（曾导致 48 个条孔座漂浮在车轮外）
- 静态阴影贴图必须在**前 4 帧预热**（否则零件预览整屏黑）
- 不要用不透明地面平面（整车会不可见，只用 ContactShadows）
- 页面级动画不要用 `opacity` 关键帧（后台标签页会停在透明，整页空白）
- 改 R3F 代码后若画布卡死/尺寸异常，先**刷新或新开标签页**（Fast Refresh 局限，不是代码问题）

## 十、可视化确认的责任

改 3D/UI 的人**自己截图放进 PR**。对方 review 时看三件事：

1. 截图里整车比例、零件贴合是否正常（尤其新改动涉及的部位）
2. `git diff --stat` 里有没有出现"你没说过的文件"（误改信号）
3. 是否动了共享契约却没说

---

部署说明见 [README 的"部署"](./README.md#部署)。若后续接入 GitHub Pages 自动部署，流水线同样从 `main` 触发，所以"main 永远可构建"这条约定会被强制执行。
