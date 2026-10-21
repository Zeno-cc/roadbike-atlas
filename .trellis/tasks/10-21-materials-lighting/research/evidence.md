# 一手材料与出处（材质与灯光规范）

> 每条 = 结论 + 出处。全部为本地一手材料（仓库源码与 `node_modules` 源码）。无法验证的标 `[未验证]`。
> 说明：本文件由主代理逐条**重新验证**后写入（初稿的论断均经 grep/读源码复核，复核结论已并入）。

## A. 材质预设与引用

1. 预设总数 **20**：`mat` 17 个 + `matP` 3 个 — `src/three/materials.ts:29-105`（mat）、`:107-136`（matP）
2. 逐条行号：`paintBlue:31`、`paintBlueDark:33`、`carbon:35-41`、`carbonRaw:43-49`、`alu:51-56`、`aluBlack:58`、`steel:60`、`ti:62`、`drivetrain:64`、`disc:66`、`rubber:68-74`、`soft:76`、`saddle:78-84`、`tape:86-92`、`inner:94`、`housing:96`、`friction:98` — 均在 `materials.ts`
3. `matP`：`paintMarine:109-116`、`paintMarineDark:118-125`、`carbonGloss:127-136`
4. **零引用预设 4 个**：`paintBlue`、`paintBlueDark`、`carbon`、`carbonRaw`
   - 验证方式：`grep -rn "mat\.carbon\b" src/` → 0 命中（`\b` 排除 `carbonGloss/carbonRaw/carbonWeave`）；`paintBlue`/`paintBlueDark`/`carbonRaw` 在 `materials.ts` 之外的引用文件数均为 0
   - 注意：`paintBlue` 是 `paintBlueDark` 的子串，检查时必须用词边界，否则误判
5. 材质预设的实际参数（含 `roughnessMap` 引用）：`alu:51-56`（含 `brushed` 粗糙度贴图）、`disc:66`（含 `brushed`）、`rubber:68-74`（含 `tread` 法线）、`saddle:78-84`（含 `carbonWeave` 法线）、`tape:86-92`（含 `tapeRib` 法线）— `materials.ts`

## B. 程序化纹理

6. 纹理导出共 13 个（工厂函数与常量）：`makeNormalTexture:12`、`makeGrayTexture:54`、`carbonWeaveNormal:87`、`brushedMetalRoughness:106`、`tireTreadNormal:114`、`barTapeRibNormal:127`、`makeDecalTexture:140`、`decalBrandTexture:161`、`decalBadgeTexture:186`、`decalSmallTexture:203`、`backdropGradientTexture:217`、`floorGradientTexture:231`、`brandGlowTexture:245` — `src/three/textures.ts`
7. **零引用纹理 2 个**：`floorGradientTexture:231`、`brandGlowTexture:245`（除定义处外引用文件数 = 0；两者编码的是已废弃的深色影棚）
8. 背景渐变纹理在用：`backdropGradientTexture` 被 `studio.tsx:19, 38` 引用

## C. 内联材质声明与实例独立性

9. 模型侧内联材质声明 **212 处**：`<meshStandardMaterial>` 190 + `<meshPhysicalMaterial>` 22
   - 190 的分布：`brakeModels.tsx:32`、`cockpitModels.tsx:10`、`drivetrainModels.tsx:62`、`frameModels.tsx:44`、`seatingModels.tsx:11`、`wheelModels.tsx:31`（合计 190，与 `grep -rc` 实测一致）
   - 22 由总数 212 − 190 得出（`grep -rc "<meshStandardMaterial\|<meshPhysicalMaterial"` 实测 212）
   - 循环内生成的声明会更多（计数为静态出现次数）
10. **每处 JSX 材质元素生成一个独立实例**：R3F 的 `createInstance` 在 `node_modules/@react-three/fiber/dist/events-0dab3c53.cjs.dev.js:16704` 执行 `child.object = child.props.object ?? new target(...args)` → 未显式传 `object` 时**必定 new 一个实例**
11. 因此 `interaction.tsx` 的 `applyVisuals`（`:179`）逐 mesh 改写 `emissive`(`:192-193`)、`opacity`/`transparent`/`depthWrite`(`:195-198`) **不会串件**（每个 mesh 有自己的材质实例）——这是现状的**有利事实**，规范只需保持（AC8）
12. `applyVisuals` 写入的字段清单（材质规范必须声明这些字段由交互层独占）：`emissive`、`emissiveIntensity`、`opacity`、`transparent`、`depthWrite` — `interaction.tsx:190-198`

## D. 物理量与渲染链路

13. **`roughnessMap` 与 `roughness` 是乘算**：`roughnessFactor *= texelRoughness.g;` — `node_modules/three/src/renderers/shaders/ShaderChunk/roughnessmap_fragment.glsl.js:9`
    → `mat.alu`（roughness 0.32）与 `mat.disc`（0.30）叠上 `brushed` 贴图后，**有效粗糙度低于注释值**；具体有效数值取决于贴图像素值，`[未验证]`（需采样贴图后计算，属审计脚本的 AC4 范围）
14. **`scene.environment` 会覆盖 `material.envMapIntensity`**：`m_uniforms.envMapIntensity.value = scene.environmentIntensity;` — `node_modules/three/src/renderers/WebGLRenderer.js:2738`
    → 在 `scene.environment` 路径下（本项目即此路径），`matP.*` 的 `envMapIntensity`（1.3 / 1.25 / 1.1）**全部无效**；有效环境强度只有 `scene.environmentIntensity = 0.95`（`studio.tsx:49`）
15. 材质自身带 `envMap` 时 `envMapIntensity` 才会被采用：`uniforms.envMapIntensity.value = material.envMapIntensity;` — `node_modules/three/src/renderers/webgl/WebGLMaterials.js:58, 74, 407`

## E. 影棚参数差异（整车 vs 单件）

16. 曝光：整车 `1.02` — `src/three/BikeViewer.tsx:439`；单件预览 `1.08` — `src/three/PartPreview.tsx:29`
17. 直接光强度代数和：共用 `StudioLights` = ambient 0.95 + key 1.9 + 0.85 + 0.8 + 0.55 = **5.05**（`src/three/studio.tsx:127-149`）；`PartPreview` 另有**两盏额外方向光** 0.9 + 0.6 = **1.5**（`PartPreview.tsx:36-37`）→ **6.55（+29.7%）**
18. 接触阴影参数差异（5 项）：
    - 整车：opacity 0.38、scale 3.4、blur 3、far 1.25、resolution 1024/256、color `#4a4438` — `BikeViewer.tsx:271-281`
    - 单件：opacity 0.32、scale 2.4、blur 2.6、far 1.4、resolution 512/128、color `#4a4438` — `PartPreview.tsx:43-51`
19. 相机：整车 `fov 38, [2.15,1.1,1.65]`（`BikeViewer.tsx:440`）；单件 `fov 40, [0.9,0.55,0.9]`（`PartPreview.tsx:30`）——**相机差异属预期**（取景需求不同），不属需对齐项
20. 环境与光照清单（两处共用）：`StudioEnvironment` 六个 Lightformer（强度 6.5 / 2.0 / 2.8 / 2.6 / 1.3 / 2.2，`environmentIntensity 0.95`）— `studio.tsx:49-104`；`StudioLights` 四盏方向光 + ambient — `studio.tsx:127-149`
21. 后处理：`StudioEffects` Bloom 强度 high 档 0.2 / low 档 0.12（`BikeViewer.tsx:294`）、单件 0.28（`PartPreview.tsx:57`）；Bloom 阈值 0.95、Vignette 0.32、SSAO intensity 10 — `studio.tsx:155-194`

## F. 已知教训与规范条款

22. DESIGN.md 四条教训：教训 1（地面平面）`:43`、教训 2（静态阴影预热）`:44`、教训 3（实例矩阵用局部坐标）`:45`、教训 4（页面动画不用 opacity）`:46`
23. DESIGN.md 中接触阴影的既有记录（`#4a4438`、opacity 0.38、blur 3）— `DESIGN.md:40`
24. 基线 §6.1（材质要求：保持一致、不以金属度/Bloom/光强代替真实感）— `docs/ARCHITECTURE_BASELINE.md:284-289`
25. 基线 §6.2（资源与材质管理：实例交互状态独立、禁止串改颜色透明度、动态资源释放责任、GLB 许可证）— `:291-299`
26. 基线 §7.3（共享契约文件与"另一方必须审查"）— `:352-376`
27. CONTRIBUTING §5（共享契约修改规则；`materials.ts`/`textures.ts`/`studio.tsx` 属共享契约）— `CONTRIBUTING.md` §5

## G. `[未验证]` / `[证据不足]` 清单

- `[未验证]` `mat.alu` / `mat.disc` 叠 `brushed` 贴图后的**有效粗糙度具体数值**（需采样贴图像素；机制已证实，数值待算）
- `[未验证]` 是否有仓库外（用户本地分支/其他会话）引用被删的 4 预设与 2 纹理
- `[未验证]` 单件预览额外的两盏光（0.9 + 0.6）是**有意**为单件补光还是历史遗留——需 A 或用户确认；这决定步骤 3 是"对齐"还是"声明差异"
- `[未获取]` Filament 材质参考页（PBR 物理量区间的权威依据）——本环境未取到；规范中的区间需在步骤 4 用 three 源码注释与既有预设统计替代，或请用户提供离线资料
