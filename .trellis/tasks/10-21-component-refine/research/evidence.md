# 一手材料与出处清单

规则：每条非显然论断必须有出处；仓库文件用 `路径:行号`，网络来源给 URL + 访问结果，无法验证的标 `[未获取]`/`[未验证]`/`[未实测]`。
本任务**未修改** `src/`、`content/`、`node_modules`、`package.json`（`git status --short` 为空，实测于 2026-10-21）。

## E1 本机一手材料（最终仲裁者）

### E1.1 规范与文档

| 出处 | 内容 |
| --- | --- |
| `docs/ARCHITECTURE_BASELINE.md:345` | §7.2 表格行「传动、操控、刹车模型｜协助验证｜主开发」——本任务归属依据 |
| `docs/ARCHITECTURE_BASELINE.md:338-350` | §7.2 完整六行分工；**全文无「座舱」行**（`:338-350` 与全文检索均无 seating/座舱/坐垫/座管归属） |
| `docs/ARCHITECTURE_BASELINE.md:247-253` | §5.2「新开发零件应尽可能在本地空间建模」「禁止为同一个尺寸在多个模块中分别编写相互独立的魔法常量」 |
| `docs/ARCHITECTURE_BASELINE.md:269-278` | §5.4 精度分级 L0–L3 定义与「按查看频率、结构复杂程度、教学价值确定精修顺序」 |
| `docs/ARCHITECTURE_BASELINE.md:304-312` | §6.3 性能记录要求（FPS/帧时间、Draw Call、三角面、同机同分辨率） |
| `docs/ARCHITECTURE_BASELINE.md:314-327` | §6.4 五类固定视角 + 「GPU 平台差异导致的轻微像素变化不应直接判定为失败」 |
| `docs/ARCHITECTURE_BASELINE.md:356-376` | §7.3 共享契约文件清单与修改规则 |
| `docs/ARCHITECTURE_BASELINE.md:439-447` | §8.2 B1 应增加的测试：模型注册 / 几何约束（明列「链条节距、碟刹尺寸」）/ 装配结构 / 交互状态 / 渲染冒烟 |
| `docs/ARCHITECTURE_BASELINE.md:529-543` | §11 工作项表：工作项 2（B，渲染与材质基准检查）、工作项 4（B，一个高精度零件试点） |
| `docs/ARCHITECTURE_BASELINE.md:223-227` | §4.4 模型所有权「同一个物理零件只允许一个装配组件负责生成其几何」 |
| `CONTRIBUTING.md:112` | B 归属含 `seatingModels.tsx`（与基线 §7.2 冲突点） |
| `CONTRIBUTING.md:113` | 共享契约清单（`bikeConfig.ts`、`interaction.tsx` 的 `EXPLODE` 表、`tests/`、`package.json`…） |
| `CONTRIBUTING.md:107` | 「若两处出现冲突，以架构基线为准并同步修正本表」 |
| `CONTRIBUTING.md:121-124` | `bikeConfig.ts` 是几何骨架；`EXPLODE`/`MODEL_BY_PART`/`@theme`/测试断言「只追加，不重排」 |
| `CONTRIBUTING.md:126` | 依赖变更单独开 PR |
| `CONTRIBUTING.md:152` | CI 的 `npm test` = 13 项内容完整性校验 |
| `CONTRIBUTING.md:174-180` | 改 3D 的人自己截图；review 看三件事 |
| `DESIGN.md:28` | 「把带从手变处起缠（上把裸碳，真实现代做法）」——支持 `TAPE_FROM_Z=0.18` 而非注释的 0.11 |
| `DESIGN.md:56` | 整车约 33 万三角面 |
| `DESIGN.md:79-83` | 性能实测：阴影是最大开销；静态阴影贴图/接触阴影按需渲染等优化 |
| `DESIGN.md:90` | 「刹车碟片加同心拉丝」列为后续提升方向 |

### E1.2 配置与共享契约

| 出处 | 内容 |
| --- | --- |
| `src/three/bikeConfig.ts:86-89` | `crank.armLength=0.1725`、`ring50R=0.101`、`ring34R=0.069`、`qFactorHalf=0.075`、`armW=0.03` |
| `src/three/bikeConfig.ts:93-99` | 飞轮 12 齿 `[34,30,27,24,21,19,17,16,15,14,13,11]`、`width=0.041`、`bodyR=0.016`；`chain.pitch=0.0127`、`inner=0.0058`、`outer=0.0068` |
| `src/three/bikeConfig.ts:102-103` | `rotor={r:0.08, thickness:0.0018, offsetZ:-0.033}`；`caliper={flatMountZ:-0.042}` |
| `src/three/bikeConfig.ts:107-108` | `derailleur={rdBody:[-0.45,0.33,0.045], fdClamp:[-0.02,0.55,0]}` |
| `src/three/bikeConfig.ts:65-77` | `bar={center,width,reach,drop,tubeR:0.0119,tubeBarR:0.0115}`；`stem={length:0.1,angleDeg:-6,clampR:0.0159}` |
| 零引用实测 | 全仓检索 `B.<字段>` 后，以下字段**仅出现在 `bikeConfig.ts` 定义处**：`bar.reach`、`bar.drop`、`bar.tubeR`、`stem.length`、`stem.angleDeg`、`stem.clampR`、`crank.qFactorHalf`、`crank.armW`、`cassette.width`、`chain.inner`、`chain.outer`、`rotor.r`、`rotor.thickness`、`caliper.flatMountZ`、`derailleur.rdBody`（`qFactorHalf` 另在 `drivetrainModels.tsx:440` 注释中被提及但未参与计算） |
| `src/three/interaction.tsx:20-54` | `EXPLODE` 表（27 键，与 Catalog 零件一一对应） |
| `src/three/interaction.tsx:169-173` | `group.position = base + explode × sep`（爆炸位移是**世界向量**） |
| `src/three/interaction.tsx:206-229` | `worldBox()` 依赖世界矩阵（相机聚焦） |
| `src/three/interaction.tsx:259-298` | `PartGroup` 按 Catalog `id` 注册，`base` 取组的世界位置 |
| `src/three/modelRegistry.tsx:20-54` | `MODEL_BY_PART` 27 键 |
| `src/three/BikeAssembly.tsx:10-22` | 按 `content/parts` 顺序逐件挂载（一个 Catalog 一件） |
| `src/three/BikeViewer.tsx:440` | 相机 `fov 38, position [2.15,1.1,1.65], near 0.05, far 30` |
| `src/three/BikeViewer.tsx:175` | `resetView` target `[0.05,0.47,0]` |
| `src/three/BikeViewer.tsx:154` | 窄屏自适应拉远（无固定视角预设系统） |
| `src/three/PartPreview.tsx:37-39` | 单件预览：`<Model unit />` + drei `Bounds` 自动取景 |
| `src/three/geometryHelpers.tsx:21-55,58-90,93-96,102-145` | `Tube` / `makeGearGeometry` / `latheGeometry` / `Instances`+`trsMatrix`（B 侧复用积木） |

### E1.3 B 的三个模型文件（逐段）

`src/three/models/drivetrainModels.tsx`（1098 行）：

| 行号 | 事实 |
| --- | --- |
| `:5-7` | 文件头声明「几何直接建在整车坐标里」 |
| `:70` | `pitchRadius(t) = t × B.chain.pitch / 2π`（唯一与节距挂钩的推导） |
| `:81-100` | `TOOTH_FINE`（10 点/齿）与 `TOOTH_COARSE`（6 点/齿）齿形剖面 |
| `:107-139` | `gearGeometry()`（挤出 `curveSegments 40`、`bevelEnabled:false`） |
| `:142-162` | `plateGeometry()`（圆角矩形链板，非 8 字形） |
| `:189-255` | `ARM_T=0.006`、`ARM_BEVEL=0.0011`、`crankArmGeometry()`（S 形轮廓 + 倒角挤出） |
| `:294-300` | `ARM_ANGLES=BOLT_ANGLES=[45,135,225,315]`（4 个）、`HOLE_ANGLES=[0,90,180,270]`（4 个） |
| `:333-336` | 50T/34T 齿片几何（齿高 0.0035、厚 0.002、减重孔 `ringHoles(0.079,0.017)` / `ringHoles(0.045,0.0095)`） |
| `:356,388` | 注释称「5 个 Ø34 减重孔」「5 颗盘钉」——与 `:294-296` 的 4 个不符 |
| `:357,361` | 大盘 z=+0.052、小盘 z=+0.045 |
| `:365-377` | 4 臂盘爪 `RoundedBox [0.064,0.016,0.0095]`，位于 r=0.047 |
| `:389-407` | 盘钉组：Tube 杆 + 内六角螺母 + 外六角头，位于 r=0.055（BCD=110mm） |
| `:409-416` | 左右曲柄臂 z=±0.062；脚踏安装座 `Tube r0.0095`（z 0.062→0.071） |
| `:418-428` | 轴心（z -0.06→0.062，r0.0118）、左锁紧盖、六角工具孔 |
| `:442` | `PEDAL_BODY_Z = 0.097`（Q 值 194mm）；`:440` 注释引用未使用的 `B.crank.qFactorHalf` |
| `:451-464` | 脚踏锁扣楔板几何、轴承座套 lathe 剖面 |
| `:481-519` | 踏板本体 `RoundedBox [0.085,0.012,0.06]`、锁扣、轴心 `r0.0075`、座套、端部六角孔 |
| `:532-536` | `CASSETTE_Z_IN=0.021`、`CASSETTE_Z_OUT=0.062`（跨度 0.041 = `B.cassette.width`，但后者未被引用）、`LOCKRING_Z=0.0675` |
| `:544` | `gap=(0.062-0.021)/11` → 3.727mm |
| `:549,559` | 齿片半径用 `pitchRadius(t)`；齿片厚 0.0016、齿高 0.0035、`fine=false` |
| `:560-566` | 间隔环 `ringGeometry(bodyR-0.0006, pitchRadius(next)-0.0012, gap-0.0024)` → 厚 1.327mm |
| `:571-590` | 锁紧环 `ringGeometry(0.0135,0.019,0.006)` + 12 内齿实例矩阵（r=0.0138） |
| `:598-605` | 塔基锥体 `cylinderGeometry [0.017,0.028,0.024]` + 塔基本体 `Tube r=B.cassette.bodyR-0.0005=0.0155`（z 0.016→0.064 = 48mm） |
| `:634` | `CHAIN_Z = 0.049` |
| `:637-638` | `RD_PULLEY_UP=[-0.452,0.263,0.05]`、`RD_PULLEY_LO=[-0.472,0.215,0.05]` |
| `:643-644` | `R_RING=B.crank.ring50R`、`R_TOP=pitchRadius(34)` |
| `:655-661` | `CHAIN_PATH`（21 控制点，含切点 281.4°/264.4°） |
| `:684-690` | 链板/快扣/销轴几何（内链板 `0.0112×0.0056×0.0034`、外链板 `0.0124×0.0068×0.006`、销轴 `r0.0015×0.0072`）——**无滚子** |
| `:701` | `count = round(curve.getLength()/0.0127)` |
| `:705-717` | 内外链板交替 + 销轴错开半个链距 |
| `:719-734` | 快扣：顶段最高点两片亮金属（无卡扣结构） |
| `:765-783` | 前拨夹环位置 = `B.derailleur.fdClamp` 在立管轴线上的垂足（注释 ≈[-0.078,0.533]） |
| `:798-813` | 夹环（`cylinderGeometry` 开口薄壳 `side={2}`）+ 锁紧螺栓/六角头/螺母 |
| `:815-861` | 拨体、上下平行连杆（`deg(-65.2)`）、导板顶桥、内外导板（z=0.038/0.058）、摩擦条 |
| `:854` | 注释「外导板下缘距大盘齿尖约 3mm」 |
| `:871-884` | `RD_MOUNT=[-0.425,0.318,0.032]`、`RD_LINK_UP/LO`、`RD_CAGE_MID`、`RD_CAGE_QUAT` |
| `:898` | `pulleys.teeth = gearGeometry(11, 0.0095, 0.0076, 0.0015)`（节圆半径硬编码 0.0095） |
| `:900` | `springRing = ringGeometry(0.0092,0.0125,0.006)`（装饰环，非卷簧） |
| `:905-947` | 挂架螺栓、B 关节盒、B 张力螺丝、平行连杆、微调旋钮+锁母、导线管 |
| `:948-972` | P 关节盒、导板笼两片 `[0.07,0.016,0.0022]`（z=0.044/0.056） |
| `:973-990` | 上下导轮（齿缘 + 轮芯 `r0.0076` + 中心螺栓） |
| `:999-1008` | `SHIFTER_Z=0.185`、`SHIFTER_BAR`、`SHIFTER_BODY=[0.565,0.828]`、`SHIFTER_UNIT_OFFSET` |
| `:1032` | 注释「变速拨杆挂在体内侧（向车架中线偏 12mm）」 |
| `:1036-1043` | 手变夹环 `Tube r1=0.0155`（Ø31mm，z 跨 38mm） |
| `:1045-1065` | 本体 `RoundedBox [0.13,0.036,0.045]`、橡胶护套 |
| `:1067-1092` | 手柄转轴、刹车手柄片（曲线）、出线口、变速拨杆薄片 |

`src/three/models/brakeModels.tsx`（629 行）：

| 行号 | 事实 |
| --- | --- |
| `:66-69` | `CALIPERS = [{front:[0.535,0.47,-0.052], tilt 20°}, {rear:[-0.27,0.53,-0.024], tilt 35°}]` |
| `:74-91` | `CALIPER_HOSE` 与 `CALIPER_BANJO` 曲线 |
| `:94-95` | 注释「局部原点取碟片缝中心，局部 Z 轴垂直于碟片平面」 |
| `:100-119` | 内外夹体各 `RoundedBox [0.04,0.055,0.014]`（z=±0.01 → 缝宽 6mm） |
| `:121-127` | 散热槽薄片 ×2 |
| `:129-141` | 活塞 ×2（`r0.0095×0.007` + 内盘 `r0.0068`） |
| `:143-162` | 固定螺栓 ×2（`r0.0035` 杆、垫片、六角头），x=±0.0135 |
| `:164-175` | 接头六角螺母、香蕉头、油管 `Hose r=0.0042` |
| `:180-200` | `CaliperModel`：unit 单只居中；整车前后各一（仅平移+绕 Z 倾斜） |
| `:206-221` | `ROTOR` 常数（注释 160mm；`pitchR 0.078` + `toothDepth 0.0035` → 外半径 0.0815 = Ø163mm；`thickness 0.0018`；`armCount 6`） |
| `:224-233` | 摩擦环孔：8 个 r0.0135（r=0.0505）+ 16 个 r0.0048（r=0.0725） |
| `:239-284` | `makeRotorBand()`：24 齿 4 点/齿 + 倒角挤出（总厚 = depth + 2×bevel，`:273-282`） |
| `:299-312` | `LOCKRING_PROFILE`、`ROTOR_POSITIONS`（z=`B.rotor.offsetZ`=-0.033） |
| `:315-354` | `RotorPiece`：摩擦环、铝支架 `r0.028`、6 连接臂、锁环、12 内花键 |
| `:406-416` | `PAD`：`backT 0.0016`、`frictionT 0.003`、`sep 0.0035`、`sepUnit 0.0065`、`finT 0.0016`、4 片鳍片位置 |
| `:410-411` | 注释与值：摩擦面 ±0.0012，碟片两侧各 0.3mm 间隙 |
| `:419-457` | `Pad()`：背板/鳍片/摩擦层/沟槽 |
| `:459-488` | `PadSpring()` 双弓弹簧片 |
| `:490-512` | `BrakePadsModel`：unit 分开 0.0065 预览；整车仅装在前卡钳（`:505`） |
| `:518-524` | `LEVER_POS=[0.585,0.815,0.185]`（与 `SHIFTER_Z` 同位）、`LEVER_UNIT_SHIFT` |
| `:527-544` | `LEVER_BLADE`、`LEVER_HOSE` 曲线 |
| `:558-582` | 主缸 `r0.011×0.045`、前端环、储油舱 `r0.0125`、端盖、六角孔 |
| `:584-603` | 枢轴座、Reach 旋钮（底座 + 8 段棱纹旋钮） |
| `:605-626` | 手柄片 `r0.0055`、两端圆头、油管 `r=0.0045` |

`src/three/models/cockpitModels.tsx`（530 行）：

| 行号 | 事实 |
| --- | --- |
| `:29-30` | `STEERER_TOP_Y=0.855`、`STEERER_TOP`（头管轴线上） |
| `:32-33` | 注释「把带起点 z=±0.11」 vs 代码 `TAPE_FROM_Z=0.18` |
| `:39-53` | `halfBarPoints()` 9 控制点（reach 0.08 / drop 0.128 的曲线体现） |
| `:59-61` | `denseBarPoints()` = 沿基础曲线等弧长取 13 点 |
| `:72-84` | `hoseCurve()` 内走线线管（z=±0.185 处引出） |
| `:91-99` | `barSectionAt()`：`round=B.bar.tubeBarR`（0.0115=Ø23mm）→ 上把翼型 34×17mm → 手变处收回圆管 |
| `:111-164` | `loftBar()` 变截面放样（96 站位 × 24 点超椭圆，平行传输标架） |
| `:166-197` | `HandlebarModel`：左右两条独立曲线（`:168`）、unit 用 `Box3` 动态居中（`:174-178`） |
| `:204-215` | `STEM_BODY`（`wSteer 0.036/hSteer 0.032 → wBar 0.028/hBar 0.024`、`topRatio 0.72`、16×24） |
| `:282-305` | `makeStemBody()` 放样 |
| `:307-321` | 舵管夹 y=0.837/0.815；把立轴线由 `STEERER_TOP → B.bar.center` 决定 |
| `:332-347` | 车把夹环 lathe 内半径 **0.0118**（Ø23.6mm） |
| `:349-364` | 舵管夹环 lathe（内径 0.0152→Ø30.4mm） |
| `:381-405` | 4 面板螺栓 + 8 个六角头 |
| `:422-426` | `tapeCurve()`：从 `|z|≥0.18` 起缠绕 |
| `:458-467` | `PLUG_PROFILE`（把塞） |
| `:513-516` | 把带 `tubeGeometry` 等径 `r=0.0165`（Ø33mm） |
| `:519-523` | 收尾胶带环 `r1=0.0172` |

### E1.4 A 侧与内容层（跨模块参照）

| 出处 | 内容 |
| --- | --- |
| `src/three/models/wheelModels.tsx:55-58` | 塔基（A）：`FREEHUB_R=0.0165`、`FREEHUB_LEN=0.036`、`RATCHET_TEETH=36` |
| `src/three/models/wheelModels.tsx:293-317` | `freehub` 分支实际生成棘轮体/塔基筒/端盖 |
| `src/three/models/wheelModels.tsx:330-341` | `HubModel` 前后花鼓位置 = `B.frontHub` / `B.rearHub` |
| `src/three/models/wheelModels.tsx` 全文 | **无碟片座/中心锁花键**（检索 `rotor`/`centerlock`/`中心锁` 无命中）→ 碟片无安装座 |
| `src/three/models/frameModels.tsx:912,919` | 后平装座：`position [-0.2675,0.53,-0.014]`、tilt 35°、螺栓 ±13.5mm |
| `src/three/models/frameModels.tsx:1061,1066` | 前平装座：`position [fx-0.045, fy+0.13, -0.052]`、tilt 20°、螺栓 ±13.5mm |
| `src/three/models/frameModels.tsx:1210+` | `BottomBracketModel`（含轴承 `outer 0.0185 / inner 0.0122`，与曲柄轴心 r0.0118 配合） |
| `content/parts/drivetrain.ts:21-28` | 牙盘 spec：齿片组合/BCD 110/曲柄长度/轴心标准/链条中心线 43.5–44.5mm/Q 值 145–155mm |
| `content/parts/drivetrain.ts:18` | 原理段：齿片变速坡道（Shift Ramps）与齿尖修形 |
| `content/parts/drivetrain.ts:129-136` | 脚踏 spec：锁片系统/轴心螺纹 9/16"×20TPI/浮动角/弹簧张力调节/轴承结构/堆高 10–15mm |
| `content/parts/drivetrain.ts:243` | 原理段：飞轮齿片变速坡道 |
| `content/parts/drivetrain.ts:246-253` | 飞轮 spec：齿数范围 11-34/速别/塔基接口/塔基长度 36.85mm/锁紧环扭矩 |
| `content/parts/drivetrain.ts:357-364` | 链条 spec：链宽 6.2/5.5/5.2mm、链节数 114–118、连接件、方向性 |
| `content/parts/drivetrain.ts:479-485` | 前拨 spec：导板高度 1–3mm（常见 2mm）、导板角度、齿容、最大齿盘、扭矩、半档 |
| `content/parts/drivetrain.ts:608-615` | 后拨 spec：笼长、齿容、B 间隙 5–6mm、限位螺丝 H/L、拉线比、导轮 11T-13T、扭矩 |
| `content/parts/drivetrain.ts:733-739` | 手变 spec：速别/操作方式/Reach 调节/刹车类型/车把固定扭矩 6–8Nm |
| `content/parts/brakes.ts:21-28` | 卡钳 spec：平装/直装、螺栓扭矩 M5/M6、碟片兼容 140/160/180、活塞数 2/4、来令片总间隙 0.4–0.6mm |
| `content/parts/brakes.ts:145-151` | 碟片 spec：直径、厚度 1.8/1.85mm、中心锁/六钉、扭矩、MIN TH |
| `content/parts/brakes.ts:251-256` | 来令片 spec：材质/摩擦材料 3–4mm/背板/散热/磨合 |
| `content/parts/brakes.ts:361-367` | 刹把 spec：油管外径约 5mm、接头形式（压接/香蕉头）、Reach 10–20mm、扭矩、储油舱 |
| `content/parts/cockpit.ts:21-28` | 车把 spec：31.8mm 口径、宽度、Drop 120–130mm、Reach 70–80mm、Flare、把立夹持扭矩、走线 |
| `content/parts/cockpit.ts:134-140` | 把立 spec：长度 80–130mm、角度 −6°/−17°、口径 1-1/8" 与 31.8mm、扭矩、垫圈上限 |
| `content/parts/cockpit.ts:246-252` | 把带 spec：长度 2–2.5m、宽度约 30mm、厚度 1.5–3.5mm、材质、背胶、搭接重叠 1/3–1/2、附件 |

### E1.5 node_modules（几何语义）

| 出处 | 事实 |
| --- | --- |
| `package.json:24` | three `^0.186.1` |
| `node_modules/three/src/geometries/ExtrudeGeometry.js:89` | `depth` 默认 1；形状从 z=0 挤到 z=depth |
| `node_modules/three/src/geometries/ExtrudeGeometry.js:92-93` | `bevelThickness` / `bevelSize` 默认值 |
| `node_modules/three/src/geometries/ExtrudeGeometry.js:416-417,522-523` | 倒角 z 偏移 `bevelThickness×cos(t·π/2)` → 倒角在 z=0 外侧与 z=depth 外侧各加一层 |
| `node_modules/three/src/geometries/ExtrudeGeometry.js:530,547` | 前侧面位于 `depth + z` → **总厚 = depth + 2×bevelThickness** |
| `node_modules/three/src/geometries/LatheGeometry.js:24,83,137-183` | 剖面点数组按序旋转成环、相邻环连线（法线方向由点序决定） |

## E2 复算与探针（原始输出）

**P-1 链条与齿距（`node --input-type=module`，import `node_modules/three/build/three.module.js`）**

```
chain curve length m = 1.5483   link count = 122
pulley center distance = 0.0520
RD pulley tooth pitch (11T @ r0.0095) = 0.00543
11T true pitch radius @12.7 = 0.02223
50T pitchR check = 0.10106   34T = 0.06872
rotor outer radius = 0.0815 => dia mm 163.0
cassette gap = 0.003727   spacer t = 0.001327   sprocket gap = 0.002127
crankset bolt BCD = 110 mm ; holes = 4 ; bolts = 4
Q factor = 194 mm ; qFactorHalf*2 = 150
```

**P-2 字面 JSX 节点数**（按行区间统计 `<mesh` / `<RoundedBox` / `<Tube` / `<Instanced*`）→ 见 `design.md` §1.2。

**P-3 `EXPLODE` 位移模长（m）**：rotor 0.864 / cassette 0.780 / brake-pads 0.679 / rear-derailleur 0.525 /
bar-tape 0.513 / brake-caliper 0.505 / crankset 0.462 / stem 0.449 / chain 0.410 / front-derailleur 0.405 /
handlebar 0.388 / brake-lever 0.384 / pedal 0.323 / shifter 0.261。

**P-4 内容层知识密度（structure+principle 字符数）**：brake-caliper 1112 / handlebar 1000 / brake-lever 972 /
stem 921 / brake-pads 887 / bar-tape 820 / rotor 787 / crankset 783 / rear-derailleur 771 / shifter 769 /
cassette 763 / front-derailleur 744 / chain 736 / pedal 711。口径说明：仅统计 `structure` 与 `principle`
两段（`specs`/`installSteps` 等在各零件间条数一致，区分度低）。

**P-5 车把截面（沿 `denseBarPoints` 等弧长采样 `barSectionAt`）**

```
t@z=0.185: 0.5050  point (0.545, 0.830, 0.185)
bar section at shifter: 前后 23.0mm × 上下 23.0mm   （已收回圆管）
bar section at t=0（把立夹持区）: 23.0 × 23.0mm
bar section at t=0.4: 27.3 × 20.6mm
→ 手变夹环 Ø31mm 与把管 Ø23mm 之间径向间隙 4mm
```

**P-6 Node 可测性探针（决定性证据）**

```
# 打包后在 Node 中 import：
src/three/models/drivetrainModels.tsx → ReferenceError: document is not defined
src/three/geometryHelpers.tsx        → IMPORT OK, exports: CylinderGeometry,Instances,Tube,latheGeometry,
                                        makeGearGeometry,strutMatrix,trsMatrix
@react-three/drei（barrel，单独）     → IMPORT OK
→ 根因：drivetrainModels.tsx:33 → ../materials → materials.ts:19-27 顶层调用
  → textures.ts:20/61/148 `document.createElement('canvas')`
```

**P-7 基线 CI 现状（只读运行）**

```
npm test → vitest 5.0.5 → tests/content.test.ts (13 tests) 全部通过
tests/content.test.ts:1-6 仅 import content/*；无任何 src/three 引用
```

## E3 网络来源获取结果

| URL | 结果 | 结论 |
| --- | --- | --- |
| `https://si.shimano.com/` | **HTTP 403 Forbidden**（WebFetch，2026-10-21） | Shimano Dealer's Manual / SI 爆炸图 `[未获取]` |
| `https://www.sram.com/en/service` | HTTP 200，页面列出 Manuals & Documents 与 Spare Parts Catalog；可见路径形态 `/en/service/spc-links/<name>`、`docs.sram.com/en-US/publications/...` | 站点可达，但本次**未取回具体公路件手册** → 具体规格仍 `[未获取]` |
| WebSearch | 环境不支持（provider 不支持，见任务规则） | 无法按型号检索手册编号 → 不写任何型号/零件号 |

**获取路径建议（人工）**：把 PDF 下载到本任务目录 `research/manuals/`（由用户或 B 手工提供），
再据其数值更新 `design.md` §4 的 `[待查手册]` 项；**在拿到手册前不得写入具体数字**。

## E4 未验证 / 未获取 / 未实测清单

| # | 项 | 状态 | 原因 |
| --- | --- | --- | --- |
| U1 | Shimano 各件 Dealer's Manual 与 SI 爆炸图（含零件号） | `[未获取]` | si.shimano.com 返回 403 |
| U2 | SRAM 各件 Service Manual 与 Spare Parts Catalog | `[未获取]` | 站点可达但未取具体手册 |
| U3 | 链条节距 12.7mm 的官方出处 | `[未验证]` | 仅来自 `bikeConfig.ts:99`（项目配置） |
| U4 | 12 速公路链条中心线 44.5mm、Q 值 145–155mm | `[未验证]` | 来自内容层 `drivetrain.ts:26-27`，内容层未标注原始来源 |
| U5 | 飞轮齿片间距官方值（Shimano 12 速） | `[待查手册]` | 模型 3.727mm 为按 41mm 堆宽均分所得 |
| U6 | 后拨两导轮中心距官方值 | `[待查手册]` | 模型 52.0mm |
| U7 | B 间隙 5–6mm | `[未验证]` | 内容层 `drivetrain.ts:610`，非厂家手册 |
| U8 | 平装卡钳两螺栓中心距（模型 27mm） | `[未获取]` | 内容层只写 M5/M6 扭矩，未写间距；仅能确认 A/B 双方模型一致 |
| U9 | CenterLock 花键齿数（模型 12）与飞轮锁紧环内齿数（模型 12） | `[未获取]` | 无手册依据 |
| U10 | 把带厚度 1.5–3.5mm、搭接重叠 1/3–1/2 | `[未验证]` | 内容层 `cockpit.ts:248,251` |
| U11 | 前后平装座 z 的权威值（A 的前后座相差 38mm） | 待裁决 | 需 A 确认车架/前叉基准（D3） |
| U12 | 渲染截图与性能数据 | `[未实测]` | 本任务只做评估，未启动 dev server、未截图、未测帧率；`DESIGN.md:79-83` 为历史参考 |
| U13 | 子件级爆炸/隔离的可行性 | `[未验证]` | 依赖 A 的 Instance ID 规则（D2），当前 `PartGroup` 只按 Catalog ID 注册 |
| U14 | `interaction.tsx` 在 Node 测试环境可否 import | `[未验证]` | 其依赖 `content/parts` 与 `bikeConfig`（不含 `materials`），推测可行但未实测；S2 落地前需先跑一次探针 |
| U15 | `it.fails()` 等 vitest 5 断言 API 行为 | 未使用 | `implement.md` S2 改为「现状基线断言 + 注释目标值」，避免依赖未验证 API |

## E5 交付文件与本任务的文件写入边界

- 写入（仅本任务目录）：`prd.md`、`design.md`、`implement.md`、`research/evidence.md`。
- 未触碰：`src/`、`content/`、`tests/`、`node_modules`、`package.json`、其他任务目录（`git status --short` 为空）。
- 探针产物写在 `/tmp`（`dv-probe.mjs`、`gh-probe.mjs`、`drei-probe.mjs`、`content-probe.mjs`），与仓库无关，已用 `trash` 清理。
