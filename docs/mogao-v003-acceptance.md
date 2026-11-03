# 莫高窟 v003：用户石窟模型与四壁观赏

独立预览：http://localhost:4205/?view=approach#/
洞内直达：http://localhost:4205/?view=interior#/
旧版4204和既有FBX、GLB、Blender工程保留。

## 实际变更

- 原ZIP逐字节归档。导入其中的石窟FBX与4096像素底色贴图，在Blender统一等比定位，外立面宽约120米、高约68米。保留原模型台阶、柱廊、岩块、其他窟口；仅打通中央下层洞口后的封闭面，并为已确认的室内清出不可见的内部空间。
- 中央台阶直接进入九色鹿室内。行走高度采样自导入模型，而不是以另一套阶梯代替。其他窟口保留原有凹入空间与暗部，通过独立边界阻止进入；山脚岩块阻挡边界同样从实际模型取样。近入口的道路末端接到台阶前，其他场景布局不变。
- 已接受的24×30米室内与18米壁画高度保留，整体地坪提高至与用户模型平台一致的6.855米。原图按相同比例从左墙、正墙、右墙继续延伸到门口墙，横向覆盖原图12918像素中的12900像素（约99.86%）。门口下部留出真实通道，因此该区域画面没有强行移位、压缩或补画；完整图仍在故事播放器中。
- 洞内提供抬头、低头、平视、左右转镜头按钮。抬头只改变观察方向，不把相机升进顶棚。手机横屏中观看按钮与镜头按钮分开；竖屏仍只显示横屏提示，并暂停。
- 九色鹿五段故事分别显示该段全文，段内不按句子更换。每段一个音频，播放到实际音频结束后退回长卷再进入下一段；空格跳过当前段。结尾邀请语另有一段配音与字幕。保留已确认的半透明、金边、圆角字幕框；字幕高度预留给图片，避免覆盖画面。

## 原稿与构建文件

- `art-source/world/mogao/v003/石窟3D模型.zip`：原ZIP，SHA-256为`af450350600e65099bf27571080772255e360b030fec9428be449e9a3c55257d`。
- `art-source/world/mogao/v003/imported/`：原FBX与底色贴图；`source-manifest.json`登记来源。
- `art-source/world/models/mogao/v003/mogao.blend`：可编辑工程；`export-manifest.json`登记网格、映射、文件哈希。
- `public/assets/world/mogao/v003/exterior.glb`：约6.04万三角面、2个材质批次、5.11MB；`interior.glb`沿用已确认内室并补第四墙，约2488三角面、7个材质批次、15.21MB。
- `scripts/build-world-mogao-v003.py`：导入、连接、实际台阶采样、四壁UV与导出。
- `src/content/world/mogao-layout-v003.json`、`src/world/mogao-rules-v003.ts`、`mogao-camera-v003.ts`：版本化布局、碰撞、镜头。
- `src/world/cave-look.ts`、`src/app/WorldScreen.tsx`、`src/styles/world.css`：洞内观察控制。
- `src/content/world/nine-colored-deer-v002.json`、`deer-story.ts`、`src/app/WorldStoryPlayer.tsx`、`src/styles/deer-story.css`：五段全文与字幕空间分配。原临时配音cue时间仅保留为来源记录，播放不依赖逐句时间点。
- `mogao-v003.html`、`src/world/mogao-preview-v003.ts`、`scripts/build-mogao-v003.mjs`、`serve-mogao-v003.mjs`：独立构建与4205预览。

正式录音交付后只需另存新音频版本、更新五段的音频路径及总时长，不需要给每句配时间戳。故事段落文字始终由配置中的`text`提供；结尾邀请录音独立。

## 检查方式

- `tests/world/mogao-v003.test.ts`：道路全宽、模型台阶高度、主入口通行、其他洞口阻挡、四壁比例、相机避碰与抬头复位。
- `tests/world/deer-story.test.ts`：五段全文/音频配置、故事切换与空格跳过、图片比例。
- `scripts/verify-mogao-v003.mjs`：Chrome真实键盘上台阶入窟、观察按钮、五段全文稳定显示、暂停/重播/跳过、错误重试；WebKit横屏的最长字幕和镜头控制、竖屏暂停及手动恢复。
- 网页截图与检查数据位于`work/world/mogao-v003-*`。网页截图是实际Three.js渲染；Blender检查图仅用于源模型检查，不代替网页验收。

本轮不以此石窟模型宣称真实莫高窟考古复原。视觉效果由用户继续验收；没有扩展其他自然资产，也没有修改角色与小游戏规则。

## 本轮验证记录

- Blender v003完整导出与检查图完成；外立面约6.04万三角面（源FBX的3.88万是多边形数，不是导出后三角面数）。
- 内容校验、TypeScript检查、独立v003构建和标准生产构建通过。
- Vitest串行完整回归：35个文件、320项通过；新增6项覆盖新石窟接入与观察镜头。
- 4205实际浏览器回归通过：Chrome键盘上台阶入窟、抬头/转向/平视、五段全文、音频暂停重播跳段、结束邀请及返回、GLB失败后重试；WebKit手机横屏无图片字幕遮挡，观看入口与镜头按钮分开，竖屏暂停并需主动恢复。未交付竖屏游戏界面。
- 详细结果：`work/world/mogao-v003-verification.json`。本机自动浏览器检查不等于真实手机性能验收。
- 共享世界E2E回归：Chrome电脑、Chrome手机、WebKit三环境的故事控制与横竖屏暂停，共6项通过。
- 标准生产包子路径检查通过：3D与Phaser切换、资源路径、故事图片、暂停与资源失败回退无异常；结果见`work/world/mogao-v003-production-check.log`。
