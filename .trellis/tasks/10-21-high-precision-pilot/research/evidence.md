# 一手材料与出处（工作项 4：高精度零件试点）

> 每条 = 结论 + 出处。仓库内用 `路径:行号`；基线条款用 `docs/ARCHITECTURE_BASELINE.md:行号`。

## A. 现有实现盘点（后拨）

1. `RearDerailleurModel` 全貌：`src/three/models/drivetrainModels.tsx:896-993`
2. 导轮齿形：`gearGeometry(11, 0.0095, 0.0076, 0.0015)`（11 齿、**节圆半径硬编码 0.0095**、厚 7.6 mm、齿高 1.5 mm）— `:898`
3. B 张力弹簧现为"钢环"暗示：`ringGeometry(0.0092, 0.0125, 0.006, 32)` — `:900`；渲染在 `:909`
4. 上挂架螺栓 `Tube r 0.008` — `:905-907`
5. B 关节盒 `RoundedBox [0.028, 0.046, 0.02]` — `:913-922`
6. B 张力螺丝 `Tube r 0.0022` — `:924-926`
7. 平行四连杆（上/下薄方盒）— `:928-933`
8. 微调旋钮（8 段圆柱 + flatShading）与六角锁母 — `:935-942`
9. 导线管曲线 `CABLE_GUIDE` — `:890-894`；渲染 `:944-947`
10. P 关节 `RoundedBox [0.022, 0.032, 0.018]` — `:949-958`
11. 导板笼两片 `[0.07, 0.016, 0.0022]` — `:960-972`
12. 上/下导轮组（齿缘 + 轮芯 + 中心螺栓）— `:974-990`

## B. 尺寸缺陷的算术依据

13. 正确的节圆半径公式已存在于同文件：`pitchRadius = (teeth) => (teeth * B.chain.pitch) / (Math.PI * 2)` — `drivetrainModels.tsx:70`
14. 链条节距 `chain: { pitch: 0.0127, ... }` — `src/three/bikeConfig.ts:99`
15. 11 齿应有节圆半径 `11 × 0.0127 / (2π) = 0.022234 m`；模型用 `0.0095` → 偏差 `2.34×`（模型为应有尺寸的 42.7%）
16. 该公式在飞轮上被正确使用（`pitchRadius` 被 `CassetteModel` 引用），说明缺陷是导轮处的**局部硬编码**而非公式错误 — `drivetrainModels.tsx:70, 538-627`（`CassetteModel` 函数体为 `:538–627`）

## C. 几何配置与装配位置

17. `derailleur: { rdBody: [-0.45, 0.33, 0.045], fdClamp: [-0.02, 0.55, 0] }` — `src/three/bikeConfig.ts:106-109`
18. 碟片 `rotor: { r: 0.08, ... }`（160 mm）— `bikeConfig.ts:102`
19. 爆炸向量表现状：`EXPLODE['rear-derailleur'] = [-0.26, -0.28, 0.36]` — `src/three/interaction.tsx:39`
20. `EXPLODE` 表结构（`Record<string, Vec3>`）— `interaction.tsx:20-54`
21. `PartGroup` 注册机制（`explode`、`installAt`、`userData.partId`）— `interaction.tsx:~260-296`

## D. 可复用几何工具（`src/three/geometryHelpers.tsx`）

22. `Tube`（两点圆柱，支持锥形 r1/r2）— `:21-55`
23. `makeGearGeometry(teeth, pitchR, thickness, toothDepth, holes?)` — `:58-90`
24. `latheGeometry(profile, segments)` — `:93-96`
25. `Instances({ matrices, children })`（实例化，含 `computeBoundingSphere`）— `:102-116`
26. `strutMatrix(a, b, thickness)` / `trsMatrix(position, rotation, scale)` — `:121-145`
27. **缺口**：无螺旋弹簧生成器（`helixGeometry`）；无铰点/转动副辅助

## E. 契约条款（`docs/ARCHITECTURE_BASELINE.md`）

28. 三种身份不可混用（Catalog / Instance / Asset ID）— `:140-167`（§4.1 标题在 `:140`）
29. `PartInstance` / `PartAsset` / `ExplodeRule` 接口定义 — `:171-208`
30. 迁移四步（引入契约与适配器 → 前后轮试点 → 控制器支持实例 ID → 逐步迁移）— `:212-219`
31. §4.4 模型所有权："组合式零件应定义子节点和独立运动轴，而不是叠加一个新的完整模型" — `:221-228`
32. §5.2 局部坐标与装配基准（"禁止为同一个尺寸在多个模块中分别编写相互独立的魔法常量"）— `:245-253`
33. §5.3 数据来源分级 `official` / `measured` / `estimated` — `:255-267`
34. §5.4 精度分级 L0–L3（L3 = 轴承、棘轮、弹簧、连杆、紧固件等内部机构）— `:269-278`
35. §7.2 角色分工：传动/操控/刹车模型 = B 主开发 — `:345`
36. §7.3 共享契约文件与修改规则 — `:352-376`
37. §11 工作项 4（验收：可完整接入新接口）— `:536`
38. §11 硬门槛："高精度零件试点必须在核心资产接口确定后正式接入" — `:542`

## F. `[未获取]` / `[待查手册]` 清单

- `[未获取]` Shimano Dealer's Manual / SI 技术文档的爆炸图与零件号（本环境无法访问厂家站点；建议用户线下下载 PDF 或实物测量）
- `[未获取]` SRAM Service Manual 同类资料
- `[待实测]` 笼板长度、四连杆铰点轴距、B 关节盒尺寸的真实值
- `[待实测]` 导轮厚度 7.6 mm 是否与真实规格一致（量级合理，但无出处）
- `[待实测]` 卷簧的线径、匝数、自由长度
- `[未验证]` 导轮放大到 `pitchRadius(11)` 后是否与笼板、链条穿模——方案（链条路径绕导轮圆周）与判据见 `design.md` §3.1，步骤 1 仍须断言 + 截图确认

## G. 链条路径与魔法常量基线（本次补充）

39. 上/下导轮圆心定义 — `drivetrainModels.tsx:637-638`（`RD_PULLEY_UP [-0.452, 0.263, 0.05]`、`RD_PULLEY_LO [-0.472, 0.215, 0.05]`）
40. 链条路径把两个导轮**圆心**直接当折点 — `drivetrainModels.tsx:655-661`（折点在 `:658-659`），因此导轮放大后链条会穿过导轮本体
41. 圆心距 = 0.052 m；`pitchRadius(11)` = 0.022234 m → 两轮外缘净距 ≈ 0.00753 m（由 `:637-638` 坐标与 `:70` 公式算得）
42. AC6 基线（`RearDerailleurModel` 函数体内含 `0.x` 字面量的行数）：**23 行 / 64 处** — main @ 2026-10-21，命令见 `implement.md` 步骤 2
