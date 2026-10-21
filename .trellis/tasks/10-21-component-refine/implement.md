# 执行清单（有序、每步可独立成 PR）

规则：一个步骤 = 一个分支 = 一个 PR（`CONTRIBUTING.md:14`）+ 理想 < 400 行 diff（`CONTRIBUTING.md:140`）；每步必须 `npm test && npm run build`
全绿（`CONTRIBUTING.md:70`）+ 对方 review（§7.5）+ 涉及画面时自带截图（`CONTRIBUTING.md:174-180`）。
`EXPLODE` / `MODEL_BY_PART` / `@theme` / 既有测试断言**只追加不重排**（`CONTRIBUTING.md:122`）。
回滚点：每步的几何改动都限于 B 自己的 3 个模型文件（+ 新增纯模块），`git revert` 单个 squash 提交即可复原；
共享文件（`bikeConfig.ts` / `tests/`）的新增内容回滚时须同步删除，避免留下无引用的死字段（§2 硬结论 5 已吃过一次亏）。

## 阶段 0：裁决与前置（不阻塞 S1/S2，阻塞 S6/S7）

| 步 | 动作 | 校验 | 门 | 工作量 |
| --- | --- | --- | --- | --- |
| S0.1 | 向用户提交三项裁决：① 座舱（`seatingModels.tsx`）归属（§7.2 无该行 vs `CONTRIBUTING.md:112`）② 手变/刹把模型所有权（§4.4）③ 碟片平面与前后平装座 z 的权威值（§2 #8/#9） | 裁决记录写入本任务 `prd.md` 的「归属待确认」段 | 用户回复 | 0.2 天 |
| S0.2 | 向 A 提交需求输入清单 D1–D6（`prd.md`「依赖」段） | A 确认清单接收 | 对方回复 | 0.2 天 |

## 阶段 1：可测性基建（B 独立可做）

| 步 | 动作 | 校验 | 门 | 工作量 |
| --- | --- | --- | --- | --- |
| S1 | 抽取纯几何模块：`drivetrainGeometry.ts` / `brakeGeometry.ts` / `cockpitGeometry.ts`（只 import `three`，不 import `materials`/drei/react）；把 `pitchRadius`、`gearGeometry`、`crankArmGeometry`、`ringGeometry`、`plateGeometry`、`wedgeGeometry`、`CHAIN_PATH`、`RD_PULLEY_UP/LO`、`ROTOR*`、`makeRotorBand`、`PAD`、`CALIPERS`、`barSectionAt`、`halfBarPoints`、`STEM_BODY` 搬过去并在几何上写 `userData={teeth,pitchR,thickness}`；模型文件改为消费这些导出，**几何数值一个都不改** | `npm run build`；`node -e "import('./<打包后的纯模块>')"` 成功（对照实测：含 `materials` 的模块在 Node 下抛 `document is not defined`）；`npm test` 绿；截图 5 视角与原基准无差异 | CI + 对方 review；PR 描述注明"零数值变更" | 1.0 天 |
| S2 | 新增 `tests/geometry.drivetrain.test.ts` / `…brake…` / `…cockpit…`：先落**现状基线断言**（把 `design.md` §5.2 的 G1–G16 写成"当前值 + 注释目标值"），缺陷项断言当前（错）值并标注 `// TODO S3/S4… 修为目标值` | `npm test` 绿（断言与现状一致） | CI + 对方 review；`tests/` 属共享契约，PR 声明 | 1.0 天 |
| S2b | 新增 `tests/geometry.registry.test.ts`（AC9 的自动化部分，design §5.3）：**不 import 模型模块**（`modelRegistry.tsx:2-15` → `../materials` → `textures.ts:20` 的 `document`，Node 下不可 import）；用 `node:fs` 读 `src/three/interaction.tsx:20-54` 与 `src/three/modelRegistry.tsx:20-54` 文本抽取键集合 → 断言**相等**（各 27 项，含 B 的 14 件）；把 design §5.3 的 14 件位移模长写成回归断言（±1e-6，防止 EXPLODE 被静默改动） | `npx vitest run tests/geometry.registry.test.ts` 绿 + `npm test` 绿 | CI + 对方 review；`tests/` 属共享契约，PR 声明 | 0.5 天 |

## 阶段 2：有硬错误的部位（B 独立可做，除 S3 的 z 值需 S0.1 ③）

| 步 | 动作 | 校验 | 门 | 工作量 |
| --- | --- | --- | --- | --- |
| S3 | 刹车三件套对位：统一碟片平面与卡钳碟片缝（G7）；来令片间隙收到 0.2–0.3mm 内（G8）；碟片外径 160±0.5mm（G9）；油管外径 5mm（§2 #10）；卡钳螺栓改 M5 量级（§2 #11）；后卡钳补一份来令片（`brakeModels.tsx:504-511`） | 断言 G7–G9 由"现状"改"目标"；`npm run build`；视角 3 + 视角 5 截图（改前/改后并列） | CI + review + 截图；若 S0.1 ③ 未裁决，本步只做不涉 z 的项（间隙/外径/油管/后卡钳） | 1.5 天 |
| S4 | 后拨：导轮齿距对齐链距（G6，`drivetrainModels.tsx:898`）；导板笼长度随导轮放大后重算（`:876-884`）；卷簧由装饰环改为可见卷簧（`:900`）；补枢轴销（P/B 关节）；补 H/L 限位螺丝（内容层 `drivetrain.ts:611`）；拉线固定螺栓 | 断言 G6 转目标值；`npm run build`；视角 3 截图；记录三角面增量 | CI + review + 截图 + 三角面记录（§6.3） | 1.5 天 |
| S5 | 飞轮：间隔环填满齿片间隙（G4）；最大两片加变速齿形特征；锁紧环齿数标注 `[待查手册]`；塔基按 S0.1/D5 裁决去重（§2 #14） | 断言 G3/G4 + G16 由"现状"改"目标值"（塔基去重后静态扫描命中 0）；`npm run build`；视角 3 + 视角 5 截图 | CI + review；去重涉及 `wheelModels.tsx`（A 的文件）→ 需 A 同 PR 或 A 开 PR | 1.5 天 |
| S6 | 手变 + 刹把（需 S0.1 ②）：按裁决把油压主缸归位到唯一一侧；补棘轮/棘爪与拨杆行程（目标 L3 可演示）；补夹环螺栓；Reach 调节与手柄行程联动 | 新增断言：同一位置只允许一份主缸几何（静态扫描或 `userData.owner` 标记）；`npm run build`；视角 4 截图 | CI + review + 截图 | 2.0 天 |

## 阶段 3：口径与锚点类（需与 A 同窗口）

| 步 | 动作 | 校验 | 门 | 工作量 |
| --- | --- | --- | --- | --- |
| S7 | 车把 + 把立：夹持口径统一到裁决值（G10）；把立角 −6° 落到几何（G11，当前 `bikeConfig.ts:75` 零引用）；把立补舵管夹开口槽与夹紧螺栓；车把补内走线孔 | 断言 G10/G11；`npm run build`；视角 4 + 视角 2 截图；`bikeConfig.ts` 变更在 PR 声明影响面 | **需 A 同窗口**（牵动头管/舵管/手变夹环）；CI + review + 截图 | 2.0 天 |
| S8 | 牙盘曲柄：Q 值收进 145–155mm（G13）；链条中心线统一（G14，与大盘平面一致）；盘钉注释与数量一致（§2 #15）；补预紧盖 | 断言 G12/G13/G14；`npm run build`；视角 3 截图 | CI + review + 截图；`bikeConfig.ts` 新增字段而非改既有值（除非 D3 一并裁决） | 1.5 天 |
| S9 | 前拨：补回位弹簧、H/L 限位螺丝、拉线固定螺栓与线管止动；导板下缘距齿尖收到 ~2mm（G15 区间内） | 断言 G15；`npm run build`；视角 3 截图 | CI + review + 截图 | 1.0 天 |

## 阶段 4：汇聚件与收尾

| 步 | 动作 | 校验 | 门 | 工作量 |
| --- | --- | --- | --- | --- |
| S10 | 链条（必须最后）：补滚子与 8 字形链板；按 S4/S5/S8 定稿后的齿盘/飞轮/后拨几何重算链长与链节数（G5）；快扣真实卡扣 | 断言 G5（链节数 ∈ 内容层 114–118 节区间，`drivetrain.ts:358`）；`npm run build`；视角 3 + 视角 5 截图 | CI + review + 截图；上游若再改，本步需重跑 | 1.5 天 |
| S11 | 脚踏（弹簧张力调节螺丝 + 轴承 + 密封，`:444-525`）与把带（径向厚度 1.5–3.5mm + 螺旋搭接，`:513-516`） | 新增断言：把带等效厚度 ∈ [1.5,3.5]mm；`npm run build`；视角 4 截图 | CI + review + 截图 | 1.5 天 |
| S12 | 收尾：五视角重拍（对齐工作项 2 的固定参数）与性能记录；`content/parts/{drivetrain,brakes,cockpit}.ts` 的 `specs` 与几何同步；回填 `design.md` §2 表状态；登记遗留 `[待查手册]` 项 | `npm test && npm run build`；五视角截图 + 帧率/三角面记录（`DESIGN.md:79-83` 同机同分辨率） | CI + review；双方确认无未处理阻断项（§7.5） | 1.0 天 |

## 工作量与顺序约束

- 合计约 **18 人日**（含 S0）；单个 PR 均 ≤ 2 天，符合 §7.4「1–3 天内形成可独立审核的 PR」。
- **硬顺序约束**：S1 → S2（先有可执行断言再改几何）；S2b 先于 S3（AC9 的键集合/位移回归先于任何几何改动，且不依赖 S1 的抽取，可与 S1 并行）；S10（链条）在所有改动大盘/飞轮/后拨的步骤之后；
  S7/S8 与 A 的 `bikeConfig.ts` 变更**不得并行**（§7.3 第 2 条：同一阶段尽量一个 PR 主导同一共享文件的结构性修改）。
- **可并行**：S3 与 S4 分属不同文件（`brakeModels.tsx` / `drivetrainModels.tsx`），但两人同改 `bikeConfig.ts` 时需串行。

## 评审门（每个 PR 的完成定义，§8.3）

1. `npm test && npm run build` 全绿。
2. 断言由"现状基线"改为"目标值"，且失败项与缺陷一一对应；AC9 的键集合相等与 14 件位移模长断言（S2b）在后续每步保持全绿。
3. 视角 3/4/5 中受影响的视角提供改前/改后截图；整车视角 1/2 确认比例未变。
4. `git diff --stat` 中不出现未声明的文件（`CONTRIBUTING.md:179`）。
5. 三角面/帧率增量记录在 PR 描述（§6.3）。
6. 共享文件（`bikeConfig.ts` / `tests/` / `EXPLODE`）变更在 PR 描述中写明影响范围与回滚方式。
