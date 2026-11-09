# 第二馆双层同行灰模 v002

2026-11-05。按婧婧“实施”批准的 `music-companion-two-floor-plan-v001.md` 完成。仍为独立灰模原型，正式导览内容及新壁画未制作。

## 试玩

- 压缩构建：http://localhost:4228/music-companion-v002.html
- 同一 Wi-Fi 手机横屏：http://192.168.1.116:4228/music-companion-v002.html
- 开发入口仍可用：http://localhost:4227/music-companion-v002.html
- v001 原型及默认世界保持各自入口；v002会话使用 `dunhuang:music-companion:v2`。刷新把两人一起放回一楼开放门前，不读取或覆盖旧v1会话。

出生于一楼前廊。进开放门后向右穿过后室、绕到直梯低端即可看到“上楼”；梯上可选上下方向或停止，到平台结束。手动移动和摇杆立即接管，暂停、失焦、离页取消。辅助到站后同行者可沿实际路线走完最后几步，到同层停下；普通手动松键立即停步。再次操作不会残留上一次的收队状态。

## 实际空间与行动

- 一楼门洞真实净宽3.6米、最低净高3.6米，原门叶旋转打开；二楼与原乐人前廊之间开2.7米通口。
- 一楼源高1.8米，二楼7.915375米，落差6.115375米（世界高度4.3和10.415375米）。
- 后室直梯宽3.6米、水平9.42米、坡度32.991°，36个约17厘米踢面、35个约27厘米踏面。梯段无折返、无新增栏杆，完整脚印约束防坠。
- 新左后楼板接原二楼乐人前廊。高处梯底及平台下方保留一楼穿行；原14.2×10.65米飞天墙和乐人保留。
- 两人分别持有所在行走面与高度；分层寻路经过真实门和楼梯，不按同一XZ跳层。同层避让、不同高度的身体不相互误挡。宽处侧前方并排，门洞和楼梯口可错位依次通过，不强占并排位置。
- 复用原小旅人GLB同次加载、独立骨架与AnimationMixer。步行Walk、跑步Run、停步Idle；原测试字幕/浏览器合成对白仍在庭院指定区域。
- 镜头用真实墙、门洞、楼板、梯面和木天花的高度代理；保留庭院树干碰撞。门前中柱后采用小幅肩位避让，梯顶到平台的镜头高度连续，平滑之后再检查碰撞。同行者进入镜头附近时只暂隐其渲染，离开后恢复，避免头部占满画面；其碰撞、位置与动画继续正常运行，不修改共享模型或材质。
- 手机同行状态移至标题下方；本入口辅助按钮置于下方中央，与摇杆分离，按钮72×44px。旧莫高窟楼梯与故事提示的错位规则保持。

## 验证

`npm run typecheck` 通过。7组专项共49项通过：

```sh
npx vitest run tests/world/music-interior-navigation.test.ts tests/world/music-interior-stair-assist.test.ts tests/world/music-interior-camera.test.ts tests/world/companion-follow-v002.test.ts tests/world/companion-follow.test.ts tests/world/companion-avatar.test.ts tests/world/companion-speech.test.ts
```

包含真实实体下庭院进门、上下楼、二楼前廊、梯下通道、防坠、同投影分层、双人避让、梯上跑步与反向、辅助收队和取消、原v1行为。相机测试还独立读取交付GLB真实三角核对两门洞、旁墙、楼板、树干和天花，捕获并修复了梯顶跨界镜头跳变。

源模型及导出后重新导入的GLB，35个踏面、两门洞及旁墙、4处梯下身体净空均通过射线核查。导出61批、114176三角、5,291,620字节，78个实体盒。旧v004/v005模型哈希未变；旅人GLB SHA256仍为 `81b6b7c5a02fb6e84fd807be2f003e5e99f8f92daaeb7788dd62eec1ca084609`。

浏览器使用真实键盘输入经过开放门、一楼后室、上楼、原二楼乐廊和返回；上下辅助、中途停止、手动接管后松键均检查了两人的实际状态。第一次完整辅助上楼含同行者到站约5.4秒；这是辅助实测，普通步速的12米平台间路线约6.7秒按1.8米/秒计算，未将计算值称作实机计时。

844×390横屏浏览器触控模拟检查了真实上/下楼按钮、暂停/继续、摇杆Walk→Run→Idle以及双方到站。Run采样同行者实际速度7.4米/秒，两个模型均为Run动画。最后在压缩构建中复走同一条路线，确认近镜头同行者暂隐后画面不再被头部遮满，到二楼恢复可见且两人Idle；最终截图为`work/world/music-companion-v002-mobile-stair-clear.png`，旧`mobile-stair.png`保留为修复前证据。检查不等于iPhone/Android实机验收。

独立生产构建通过；局域网预览的HTML/JS返回gzip、GLB返回200与正确字节数。未跑2D、全地形或全套E2E回归。

## 文件与复现

- 尺寸/楼面/洞口：`src/content/world/music-interior-v001.json`；实测碰撞：`music-interior-solids-v001.json`。
- 模型脚本：`scripts/build-world-music-interior-v001.py`；源文件与导出登记：`art-source/world/models/music-interior/v001/`；运行模型：`public/assets/world/music-interior/v001/`。
- 分层移动、辅助、相机：`src/world/music-interior-*.ts`；v2同行：`src/world/companion-follow-v002.ts`；v2独立会话与入口：`music-companion-session-v002.ts`、`music-companion-preview-v002.ts`。
- 浏览器状态记录、键盘路线脚本与截图：`work/world/music-companion-v002-*`。

构建使用本轮独立入口，保留旧输出：

```sh
node --input-type=module -e 'import {build} from "vite"; await build({build:{outDir:"work/world/music-companion-build-v002",emptyOutDir:false,copyPublicDir:false,rollupOptions:{input:"music-companion-v002.html"}}});'
node scripts/serve-music-companion-v002.mjs
```

服务器复用现有压缩预览器，构建缺少的素材只读回退public，不复制或修改正式素材。手机须与电脑同一网络，电脑与本地服务保持运行；IP变化时使用启动日志中的新地址。
