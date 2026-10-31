# 小旅人关键节点镜头 v001 交付记录

2026-11-01：第一版独立可玩预览完成后，用户明确回复“可以了”。开场挥手与转身、藻井厅张望与抬头两段动作和镜头节奏通过本轮视觉验收；表情与围巾保持原样。

本次确认仅记录当前独立样片通过，不自动切换正式入口、批量替换地图资产或扩大制作范围。用户随后询问其他场景的开发顺序，下一阶段具体实施范围另行确定。

## 查看入口

- 预览与实录：`http://localhost:4193/review.html`。
- 重播开场：`http://localhost:4193/?shot=opening#/`。
- 重播入厅：`http://localhost:4193/?shot=hall#/`。
- 从门口正常走入：`http://localhost:4193/?shot=approach#/`，向前行走并在出现“抬头看看”后停步。
- 同一Wi-Fi手机：`http://192.168.1.116:4193/review.html`，试玩使用横屏。此地址随本机网络变化。

页面底部的三个复看链接用于明确重播或重新摆放样片人物；普通刷新、返回探索及回到起点不重播。手动复看只重置本预览端口的探索位置及演出标记。

## 已实现行为

开场总长2.2秒。小旅人面向镜头做一次短挥手，转身时展示侧面，然后沿道路迈出不超过0.3米的短步；全部位移通过现有碰撞规则。镜头从中景拉回背后跟随，结束后不继续自动前进。

藻井厅总长2.5秒。第一次进入观察范围且停止输入约0.35秒后，切到侧前方近景，先小幅左右张望再抬头。结束采用一次短切恢复背后跟随，避免在室内快速绕柱旋转。继续移动不触发；按F直接进入原有藻井观察，不要求先看完人物镜头。

两段都只自动播放一次。WASD、方向键、摇杆、Q/E、右键拖动转镜头、Esc和跳过按钮可中断；操作方向始终沿用探索坐标。暂停、失焦、后台或横竖屏切换取消演出；恢复后不继续自动行走。减少动效开启时跳过。演出标记使用独立键 `dunhuang:character-cinematics:v1`，不写入文化事件完成记录。

采用现有墙体/柱子/屋檐的摄像机碰撞数据，侧前方镜头依次检查左右两个候选位置；两侧都无法构图时跳过近景。开场过渡逐帧检查安全位置。独立场景沿用已确认A树、A灌木、Blender沙丘及石板路；移除被隐藏参考树的行走碰撞，A树按2.1米以下实际几何测得的1.01米半径处理，新人物使用0.9米净空。

## 动作资产

在用户提供人物的原65骨骼上手工设计关键姿势并烘焙，新增 `Greeting`（1.5秒）与 `HallLookUp`（2.25秒）。镜头时间包含转身、短步和恢复。原 Idle、Walk、Run、LookAround 保留；角色网格顶点、UV及4096 JPEG的哈希与v001一致。未增加面部或围巾动画，手指张开属于已有手指骨骼动作。

- Blender：`art-source/world/models/traveler-tripo/v002/traveler.blend`。
- GLB：`public/assets/world/traveler-tripo/v002/traveler.glb`，7,918,856字节。
- SHA256：`81b6b7c5a02fb6e84fd807be2f003e5e99f8f92daaeb7788dd62eec1ca084609`。
- 导出记录：同源目录 `export-manifest.json`，含24个既有模型/工程的保护哈希。
- Blender正面挥手、侧面挥手和斜面抬头截图在 `work/world/character-cinematics-v001-blender-*.png`。

## 验证结果

- TypeScript检查、内容校验通过；23个测试文件、225项规则测试通过。
- 独立生产构建通过。20项真实Chrome浏览器检查通过，正常流程无页面、控制台或资源错误。
- 验证开场完成、限幅短步、刷新不重播、W/D/Q/Esc中断、跳过、暂停恢复、鼠标右键转镜头、离开再返回。
- 验证厅内展示不自动进入观察、不标记文化事件完成；按F直接进入观察、返回漫游不重播；正常行走入厅不停步不播、停步后触发，再次移动即结束。
- 模拟手机844×390横屏，验证摇杆中断、松手停下、竖屏旋转提示和恢复后不自动行走；减少动态效果时跳过。
- 阻断新GLB触发真实错误界面，恢复资源后重试成功。24个既有GLB/Blender文件哈希一致，已确认植被与旧人物工程未覆盖。
- 单独构建默认入口 `baseline.html`：确认仍加载原人物且不启用新演出，原有行走、F观察和返回流程通过。
- 浏览器验证修复了“加载就绪同步重复清除输入，偶尔吃掉首次按键”的时序问题；相同暂停状态现在不重复清输入。

完整浏览器记录：`work/world/character-cinematics-v001-verification.json`。真实网页实录 `opening.webm`、`hall.webm` 与截图拷贝到 `outputs/character-cinematics/v001/`；均来自实际Three.js渲染，不是动画效果示意图。

手机检查为浏览器模拟，未作物理手机性能结论。人物仍保留约5.27万三角面及原4K贴图；本轮没有减面或压缩。技术检查与视觉验收分别记录；上述动作和镜头节奏已获用户确认，不代表整张地图或真机性能已验收。

## 文件与复验

- 动作生成：`scripts/build-world-traveler-gestures-v002.py`。
- 状态、分镜和存储：`src/world/character-cinematics.ts`。
- 独立入口：`character-cinematics-v001.html`、`src/world/character-cinematics-preview.ts`、对应CSS。
- 石板道路样片复用：`src/world/preview-paving.ts`，沿用已确认铺石算法和路径。
- 接入：`src/world/runtime.ts`、`art-sample.ts`、`input.ts`、`types.ts`、`src/app/WorldScreen.tsx`。默认入口不设置独立样片标记，保持原人物和原探索行为。
- 验证：`tests/world/character-cinematics.test.ts`、`scripts/verify-character-cinematics-v001.mjs`。
- 构建与服务：`scripts/build-character-cinematics-v001.mjs`、`scripts/serve-character-cinematics-v001.mjs`；实录页生成脚本 `scripts/build-character-cinematics-review-v001.mjs`。

执行顺序：先运行独立构建脚本，再启动4193服务，在另一终端运行验证脚本，最后生成实录页。原有文化导览/小游戏资源通过服务从 `public/assets/` 只读提供，未复制和改写；因此交付目录需配合本项目服务脚本使用。

未修改AGENTS.md、旧模型、正式资产索引、原有建筑结构或地图布局；未覆盖4192人物预览及正式构建，未发布线上版本。
