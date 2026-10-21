# 公路车零部件图鉴 · Roadbike Atlas

一个纯前端的公路车零部件学习网站：**3D 可交互整车模型** + 27 个零件的结构原理、规格扭矩、安装/拆卸步骤、调校、常见错误、保养周期与故障排查 + 18 步整车组装流程 + 74 条中英术语表。

> 视觉与渲染的品质标准、业内标杆评估与后续提升方向见 [DESIGN.md](./DESIGN.md)。

## 功能

- **3D 探索**（`/#/explore`）：程序化建模的整车，支持旋转缩放、悬停高亮、点击零件弹出摘要卡片并聚焦、**爆炸视图滑杆**、**装配动画**（按真实装车顺序依次飞入）、相机预设（整车/车架/轮组/传动/刹车/操控/座舱）、选中零件时其余零件自动透视化
- **零件详情**（`/#/parts/:id`）：3D 单件预览（自动旋转）+ 结构组成、工作原理、关键规格、工具与扭矩、兼容性、分步安装（含工具/扭矩/警告）、拆卸要点、调校方法、常见错误、保养周期、故障排查表、关联零件
- **系统总览**（`/#/systems/:id`）：六大系统（车架/轮组/传动/刹车/操控/座舱）的零件清单与系统工作原理
- **组装指南**（`/#/assembly`）：从空车架到整车的 18 步流程，每步标注零件、工具、扭矩与进阶提示
- **术语表**（`/#/glossary`）：中英对照 + 缩写速查，支持按系统筛选与搜索

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS 4 · three.js / @react-three/fiber / @react-three/drei · React Router（HashRouter）· Vitest

无后端、无外部资源依赖：3D 为代码程序化建模，环境反射贴图在运行时由 Canvas 生成，完全离线可用。

## 本地运行

```bash
npm install
npm run dev       # 开发服务器（默认 http://localhost:5173）
npm run build     # 生产构建（先 tsc 类型检查）
npm run preview   # 预览生产构建
npm test          # 内容数据完整性校验（Vitest）
```

## 部署

构建产物是纯静态文件（`dist/`），且使用 HashRouter，任意静态托管零配置可用：

- **GitHub Pages**：把 `dist/` 推到 `gh-pages` 分支（或使用 Actions），无需 404 重写规则
- **Vercel / Netlify**：导入仓库，构建命令 `npm run build`，输出目录 `dist`
- 其他：任何能托管静态文件的服务器直接上传 `dist/` 即可

## 目录结构

```
content/                # 全部内容数据（改这里即可更新网站）
├── schema.ts           # 数据模型（Part / BikeSystem / GlossaryEntry / AssemblyStep）
├── systems.ts          # 六大系统定义与工作原理
├── parts/              # 27 个零件的内容，按系统分文件
│   ├── frame.ts        #   车架 / 前叉 / 碗组 / 中轴
│   ├── wheels.ts       #   花鼓 / 轮圈 / 辐条 / 轮胎 / 内胎与真空胎 / 桶轴与快拆
│   ├── drivetrain.ts   #   牙盘曲柄 / 脚踏 / 飞轮 / 链条 / 前拨 / 后拨 / 手变头
│   ├── brakes.ts       #   卡钳 / 碟片 / 来令片 / 刹把
│   ├── cockpit.ts      #   车把 / 把立 / 把带
│   └── seating.ts      #   座管 / 坐垫 / 座管夹
├── glossary.ts         # 术语表
└── assembly.ts         # 整车组装流程

src/
├── three/              # 3D 层
│   ├── bikeConfig.ts   #   整车几何锚点（坐标系：+X 车头、+Y 上、+Z 传动侧）
│   ├── materials.ts    #   材质配色
│   ├── geometryHelpers.tsx  # Tube / 齿盘 / 旋转体 / 实例化工具
│   ├── interaction.tsx #   PartGroup、爆炸向量、BikeController（爆炸/装配/高亮）
│   ├── models/         #   27 个零件的程序化模型（按系统分文件）
│   ├── modelRegistry.tsx    # 零件 id → 模型组件
│   ├── BikeAssembly.tsx     # 整车装配
│   ├── BikeViewer.tsx       # 3D 探索场景与交互界面
│   └── PartPreview.tsx      # 零件详情页的单件预览
├── components/ui.tsx   # 共享 UI（规格表/步骤列表/排查表/零件卡片等）
└── pages/              # 六个路由页面

tests/content.test.ts   # 内容完整性校验（零件齐全、字段非空、关联 id 合法、流程覆盖全部零件）
```

## 如何更新内容

- **改零件文案/规格**：编辑 `content/parts/*.ts` 对应字段，保存即生效（`npm test` 会校验字段完整性与关联 id）
- **加新零件**：在 `content/parts/` 下新增符合 `Part` 类型的条目 → 在 `src/three/modelRegistry.tsx` 注册 3D 模型 → 在 `src/three/interaction.tsx` 的 `EXPLODE` 里给它一个爆炸向量 → 更新 `tests/content.test.ts` 的预期 id 列表
- **改整车几何**（管长、轮径、把位等）：改 `src/three/bikeConfig.ts`，所有模型与相机取景会跟随

## 说明

- 3D 模型为**程序化示意建模**：准确表达零件结构、装配位置与配合关系，但非 CAD 工程级精度
- 扭矩与规格数值为主流品牌（Shimano / SRAM 等）通用参考区间，实际请以你的零件说明书为准
- 界面为中文，术语保留英文对照（如 后拨（Rear Derailleur, RD））
