# v011 入口镜头修复验收记录

预览：http://localhost:4218/#/ 。旧 4217 构建和旧资源保留。

## 本轮结果

- 探索全区域开放 R 抬头、T 低头、C 恢复平视，屏幕按钮保留 Q 左转/E 右转的明确说明。包括起点、院落间道路、崖前、楼梯、门廊与洞内。俯仰只转观察方向，不改变角色移动方向或已避障的镜头位置；暂停、故事和竖屏仍锁住操作。
- 去掉顶部区域徽标及左侧方向卡；预览称“石窟样片”，路线图使用“石窟”泛称。文化旁白中的历史名称和原像说明保留。
- 补齐 30 级台阶及中央台基的镜头碰撞。在台阶附近逐渐缩短镜头距离并提高跟随位置；每次插值后同时检查人物身体与目标点的视线。
- Blender 检查确认：左侧窗下山体凹槽底面与廊台顶面同处 6.85546875 米。只将台基下面的既有岩体接面降低 0.12 米，保留外部造型、贴图和 UV。采样点不再有同高可见叠面。
- 原台阶为 30 个重叠盒子，有同面侧壁；改成同样踏面和立面位置的单个闭合阶梯轮廓。后端与台基相接，通道地板从台基凹槽开始，不再盖到最后两级台阶上。

## 验证

- `npm run typecheck`、`npm run test`（43 个文件、367 项）、`npm run build` 通过；独立 v011 构建通过。
- `tests/world/mogao-camera-v011.test.ts` 覆盖逐级不同朝向、连续插值和有正负角度的全局俯仰。
- `scripts/verify-mogao-v011.mjs`：浏览器实际步行下楼、上楼、跑步下楼，共 397 个运动采样；人物显示、身体视线、镜头不在实体内和正常探索时人物未被画面裁掉均通过。中途转向、门前转镜头、洞内大佛旁白、九色鹿导语和空格跳过通过。844×390 横屏按钮完整，竖屏仍暂停。无页面错误或资源请求错误。
- `scripts/verify-mogao-v011-baseline.mjs`：原首页仍只加载原角色和院落，不加载本轮石窟样片资源，主题入口正常。
- `scripts/audit-mogao-v011-porch.py -- --after`：实际 GLB 接面核查通过；旧文件 SHA-256 保持一致。
- 山体三角面数保持 163077；入口由 436 降到 320。俯仰不新增模型、灯光或渲染通道；未据此宣称所有设备帧率不变。

## 检查素材与文件

- 下楼同位置、同朝向对比：`work/world/mogao-v011-v010-stairs.png` / `work/world/mogao-v011-v011-stairs.png`。镜头位置因本轮修复而不同。
- 门前：`work/world/mogao-v011-porch-clean.png`，转镜头帧 `mogao-v011-porch-pan-0.png` 至 `-3.png`。
- 室外仰望：`work/world/mogao-v011-tower-up.png`；横屏：`mogao-v011-global-look-landscape.png`。
- 连续操作录像：`work/world/mogao-v011-walkthrough.webm`。自动检查结果：`mogao-v011-verification.json`、`mogao-v011-assets-audit.json`。
- Blender：`art-source/world/models/mogao/v011/porch-and-stairs.blend`；导出登记同目录 `export-manifest.json`；新运行资源 `public/assets/world/mogao/v011/{entry,mountain}.glb`。
- 新逻辑：`src/world/mogao-camera-v011.ts`、`exploration-look.ts`、独立 v011 会话与入口；接入 `runtime.ts`、`art-sample.ts`、`WorldScreen.tsx`、`WorldMogaoRouteMap.tsx`、`App.tsx`。新行为仅在 v011 入口启用。

角色资产、原小游戏、文化建筑外形、入口坐标、角色碰撞规则均沿用。旧源文件和运行资产未覆盖，AGENTS 未改动。
