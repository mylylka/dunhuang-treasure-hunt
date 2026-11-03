# 莫高窟 v010 交付检查

独立预览：http://localhost:4217/?view=buddha#/ 。旧 v009 / 4216 保留。

## 交付行为

- 室内不显示左侧方向卡或标题下的位置徽标；浏览器标题改为“莫高窟洞窟样片”。组合陈设不以“大佛殿”标签冒充真实窟室。
- Q 左转、E 右转、R 抬头、T 低头、C 平视。左右按钮方向与键盘一致。
- 仰视大佛的面部/胸部、其投影尺寸占据主要画面，并连续稳定观看 0.65 秒，才启动讲解；额外检查画面中心射线确实命中佛像，且未被门洞顶板或壁面遮挡。平视、看向门口或壁画不触发。
- 每次进入洞窟自动播一次；退出再进入可重听。字幕完整呈现一个段落。空格立即结束；暂停、后台与竖屏停播；进入故事会终止当前讲解，不重叠发声。
- 约 25 秒本机 Grandpa 老者临时配音，独立配置与音频可替换。末句：“当前雕像为游戏中的仿制品，并非对原像的精准还原。”

## 顶部闪烁修复

实际 GLB 检查确认：旧遮挡墙 `tower-interior-screen-v007` 的底面与 `passage-head-v007` 同在地坪以上 6.28 米、深度 2.6～2.8 米处重叠。另有新旧通道顶板在 3.1 米处拼接。

Blender 派生版将遮挡墙底部收至顶板上方 6.52 米，并改成一片连续通道顶板，底面保持 6.28 米。旧文件原样保留；源工程保留旧构件作隐藏参考，运行 GLB 仅导出明确节点名单，不导出构造布尔切割体。洞口、台阶、角色、壁画 UV、建筑尺寸、碰撞代理均保持原有数据。

## 实际验证

- `npm run test`：42 文件、363 测试通过。
- `npm run build`（包含内容校验与 TypeScript）通过。
- `node scripts/build-mogao-v010.mjs` 独立构建通过。
- `node scripts/verify-mogao-v010.mjs`：真实浏览器的触发/误触发、自然播完、暂停恢复、空格、实体进出洞、与九色鹿播放器切换、844×390 横屏字幕、竖屏阻止通过，无页面错误和资源错误。
- `scripts/audit-mogao-v010.py`：导出 GLB 原共面处从两层变为一层；前后顶板接点均属于同一片新顶板；内景仍为 490 三角面；所有保护文件 SHA 不变。
- `scripts/verify-mogao-v010-seam.mjs`：相同位置与方向的 v009/v010 对照，抬头后左右转动，截图与短视频位于 `work/world/mogao-v010-seam-*`。原横向闪线在修订截图中消失。

## 文件

- Blender：`art-source/world/models/mogao/v010/entrance-repair.blend` 与 `export-manifest.json`。
- 模型：`public/assets/world/mogao/v010/{entry,interior}.glb`；山体与大佛继续读取 v009。
- 配音：`art-source/world/buddha-narration/v001/`、`public/assets/world/buddha-narration/v001/buddha-narration.mp3`、`src/content/world/buddha-narration-v001.json`。
- 新逻辑：`src/world/buddha-gaze.ts`，复用既有单句音轨控制器、全局空格跳过和字幕组件。
- 入口与布局：`mogao-v010.html`、`src/world/mogao-preview-v010.{ts,css}`、`src/world/mogao-rules-v010.ts`、`src/content/world/mogao-layout-v010.json`。
- 共享运行器、场景加载与界面的新增行为都以 v010 条件隔离；v009 继续使用自己的资源与构建。
- 测试：`tests/world/buddha-gaze.test.ts`，本轮 `scripts/*mogao-v010*` 和 `scripts/build-buddha-narration-v001.py`。

截图：`work/world/mogao-v010-narration-desktop.png`、`mogao-v010-narration-landscape.png`、`mogao-v010-seam-before.png`、`mogao-v010-seam-after.png`。
