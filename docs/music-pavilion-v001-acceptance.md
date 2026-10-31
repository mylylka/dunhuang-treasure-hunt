# 乐舞馆独立样片 v001 交付记录

2026-11-01：按用户批准，制作纹彩院到乐舞馆的可玩路线及乐舞馆首版独立样片。当前待用户视觉验收；未切换正式入口，未制作洞窟。

## 试玩与实录

- 图册、两段实际网页录像及试玩入口：`http://localhost:4194/review.html`。
- 从纹彩院正常走过去：`http://localhost:4194/?view=courtyard#/`。
- 馆前视角：`http://localhost:4194/?view=approach#/`。
- 飞天壁画前：`http://localhost:4194/?view=mural#/`，按F或点击“唤醒飞天壁画”。
- 完整开场：`http://localhost:4194/?view=start#/`。
- 同一Wi-Fi手机：`http://192.168.1.116:4194/review.html`；需横屏，地址随本机网络变化。

页面底部的复看链接是明确的评审捷径；实际往返录像使用真实按键行走，没有调用瞬移或模拟完成事件。普通刷新读取独立样片会话，不重置探索位置。

## 实际完成内容

1. Blender制作开放二楼乐廊、两位静态乐师、右侧飞天壁画墙、门廊、浅台阶、前庭围墙、石板地面、旗幔、陶器及琵琶陈列。保留原地图中乐舞馆的位置及已确认的左廊右壁画结构关系。二楼没有可达行走面。
2. 从已有岔路新增不规则铺石板支路，绕开现有岩组；馆前旗杆退到道路净空之外。纹彩院原道路、建筑GLB、小游戏与已确认角色资产保持原样。自然环境只加载已确认A树、A灌木与Blender沙丘，新场景实例共享几何和材质，未制作新树形或新地形。
3. 靠近只出现提示；主动确认后切到壁画观察镜头，约3.6秒完成灰转彩。支持暂停、重播和退出。退出恢复同一位置与探索方向，按键在观察期间不移动人物。
4. 完成演出后保留彩色壁画状态；提前退出不伪记完成。存储使用 `dunhuang:music-pavilion-preview:v1`，不写旧正式世界位置键或旧小游戏记录。
5. 两处自由末端的位移上限为母图像素2.2px；连接处逐渐固定。原1448×1086母图完整显示为7.6×5.7米，保持4:3比例，未拉伸为概念场景图里的竖幅。

## 图源与局部动画

六张用户图原字节归档于 `art-source/world/music-pavilion/v001/`，文件名、尺寸及SHA登记在 `source-manifest.json`。正式画面使用《独立彩色飞天主壁画母图.png》，局部修补只来自已交付补底图，未重新生成或全幅替换。

两处轮廓、裁切范围 `(60,85,294,491)` 与处理方法已登记。补底仅改变20633个母图像素，蒙版外0像素改变。只上传234×406的小补底与小蒙版，不重复上传整张补底大图。零位移及减少动效状态直接显示原母图；演出仅让左侧两段短自由端微动，人物、双手、琵琶保持静止。

真实网页两帧对比脚本 `verify-music-pavilion-pixels-v001.py` 将截图按实际相机投影映射回壁画，验证右侧79%静止区（包含人物、手与乐器）无像素变化，同时左侧自由端存在实际变化。结果保存在 `work/world/music-pavilion-v001-ribbon-pixel-check.json`。

## 与概念图的剩余差距

- 建筑主体比例、开放乐廊和壁画关系已建立；木构雕饰、墙面层次与自然风化仍比参考简化，侧墙尤其如此。本轮没有用额外雾、灯光或后处理掩盖造型。
- 两位二楼乐师为静态、远观用模型，没有演奏动作。正式乐声、环境音乐和提问旁白未提供，本版采用文字观察提示，无新增声音。
- 壁画采用用户独立母图的横幅原比例，因此与概念场景图中的竖向壁画构图不同；不能靠拉伸人物使二者一致。
- 场景仅少量复用已确认植被与沙丘，尚未进行整张地图的景观布置。远山、莫高窟崖壁及洞窟继续留待后续阶段。
- 乐舞主题教学、小游戏尚未制作，本轮不提供虚假的可玩入口。人物与自然资产的既有视觉验收不自动代表本建筑通过。

## 技术验证

内容校验、TypeScript与233项规则测试通过。新增8项规则检查覆盖支路完整宽度、双向行走、墙柱道具阻挡、门廊台阶、主动互动、减少动效、完整壁画构图和独立会话。17项Chrome实际网页检查通过，另有4项WebKit检查及默认入口12项桌面探索E2E通过。网页检查覆盖往返路线、演出与输入锁定、暂停/重播/提前退出、失焦、刷新、2D往返、横竖屏及摇杆、缺模型/缺贴图的重试、默认入口回归。

浏览器报告、截图和录像在 `work/world/music-pavilion-v001-*`；交付图册仅使用实际Blender和网页输出。27项受保护文件（既有GLB、Blender工程及AGENTS.md）哈希复核；六张新归档图与下载目录原稿字节相同。

新馆GLB为3,640,808字节，71,568个三角面、47个材质/结构批次。网页沿用现有光照、曝光和阴影设置。本机Chrome首屏可操作约799ms，首屏资源内容总量27,185,961字节；150帧采样中位数16.7ms、P95 16.8ms。报告中的另一个resourceBytes包含随后2D往返加载，不应当作首屏量。本机Chrome及模拟横屏不代表物理手机已达标。

## 文件清单与重建

- 规则：`docs/music-pavilion-v001-plan.md`；交付：本文件。
- 原图/分层：`art-source/world/music-pavilion/v001/`，`scripts/prepare-music-pavilion-v001.py`。
- Blender：`art-source/world/models/music-pavilion/v001/music-pavilion.blend`、`export-manifest.json`；脚本 `scripts/build-world-music-pavilion-v001.py`。
- 运行：`public/assets/world/music-pavilion/v001/music-pavilion.glb`、`mural-original.png`、`mural-underlay-crop.png`、`ribbon-masks-crop.png`。
- 共享布局：`src/content/world/music-pavilion-layout.json`。
- 运行模块：`src/world/music-pavilion-rules.ts`、`music-pavilion.ts`、`music-pavilion-preview.ts`及CSS；观察面板 `src/app/WorldFlyingObservation.tsx`。
- 显式预览接入：`WorldScreen.tsx`、`App.tsx`、`runtime.ts`、`art-sample.ts`、`camera.ts`、`movement.ts`、`geometry.ts`、`events.ts`、`session.ts`、`types.ts`、`preview-paving.ts`。默认入口不设置 `data-music-pavilion`，保留原资源和原场景。
- 检查：`tests/world/music-pavilion.test.ts`、`scripts/verify-music-pavilion-v001.mjs`、`scripts/verify-music-pavilion-pixels-v001.py`、`scripts/verify-music-pavilion-webkit-v001.mjs`。
- 独立构建/服务/图册：`scripts/build-music-pavilion-v001.mjs`、`serve-music-pavilion-v001.mjs`、`build-music-pavilion-review-v001.mjs`；入口 `music-pavilion-v001.html`。

顺序：素材准备 → Blender建模/导出 → 独立构建 → 启动4194服务 → 网页验证 → 像素验证 → 生成图册。旧版本、原始素材与中间截图不自动删除。服务只读回源本项目 `public/assets/` 提供既有教学和小游戏资源，交付目录需配合本项目服务脚本使用。

未公开发布，未修改AGENTS.md，未覆盖旧GLB/Blender工程、旧预览或正式构建。
