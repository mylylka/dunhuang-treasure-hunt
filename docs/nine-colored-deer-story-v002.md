# 九色鹿五段故事实施与验收

## 本轮范围与目录规则

按用户2026-11-01给定的五段文字、六张局部图、2048×340定位坐标和结尾台词实现。沿用单一故事播放器，替换两段技术预览的数据与视觉时序；莫高窟模型不改。旧4203构建、旧story/v001资源保留，新增4204独立预览。

- 配置：`src/content/world/nine-colored-deer-v002.json`；图像与音频测量登记分别为同目录`story-media-v002.json`、`story-audio-v002.json`。
- 原稿：`art-source/world/nine-colored-deer/v002/`，保存原字节、图源SHA与本机临时旁白源文件。原名允许保留中文。
- 运行资源：`public/assets/world/story/v002/`。只等比转换图片格式；不重绘、不裁切局部图、不覆盖旧图。
- 资源脚本：`scripts/prepare-deer-story-v002.py`、`build-deer-narration-v002.py`。中间音频与逐句时长放原稿目录，检查截图和日志放`work/world/deer-story-v002-*`。
- 播放时序与布局计算：`src/world/story-playback.ts`；React展示仍由`src/app/WorldStoryPlayer.tsx`负责。
- 静态交付：`outputs/mogao/story-v002/`；入口、构建和服务脚本均使用独立文件，不覆盖莫高窟v001/v002。

## 共用机制

打开故事后自动依次执行：完整背景清晰 → 金色定位框 → 局部从对应位置平缓前推 → 旁白与逐句字幕 → 局部退回、长卷清晰 → 下一段。第三段同时保留两个定位框、两张并排图；只展示当前段。

采用用户“高度虚化洞窟背景完整长卷浮现”原图作为整体背景。清晰图完整contain，画幅以外用同图虚化填充；金框映射到背景中实际长卷的矩形，不误把背景全幅当母图。所有局部保持原宽高比，单图尽量占满可用图区，双图居中并排；手机横屏同样不硬裁切。

旁白暂用本机已安装的普通话Grandpa老者音色，记录为临时合成音，不宣称正式配音。每段一个MP3，逐句合成后按测得时长串联，字幕使用这些时码。自动换段由音频结束驱动；音频失败给出重试，并保持字幕和跳过可用。

暂停同时停止旁白和转场；重播当前段；空格只跳当前段，长按只触发一次。退出、切后台、全局暂停清理或停止音频。结尾读完指定邀请语后，以中央半透明选择窗展示“探索更多 / 再看一次 / 继续漫游”，按钮不放字幕框。

按用户后续确认，故事与3D漫游统一只支持横屏。竖屏仅显示转屏提示并冻结当前画面及音频，转回后由继续按钮恢复；不另做竖屏播放器。全局共用字幕尾注改为“（空格跳过）”。正式录音到位后替换对应音频路径、时长与字幕时码即可。

## 验收项

五段自动连播、第三段双图、定位与飞入/退回、自然音频结束、暂停/重播/空格、结尾三选择和stories主题链接；手机横屏、竖屏暂停提示与减少动效；失焦/卸载无残留声音；图像和音频失败可恢复；保留洞窟返回点与旧资源。

字幕外观按用户本轮反馈统一为半透明暖褐底、细金边、14px圆角与浅米色文字；字幕框不容纳选择按钮。

## 文件清单与替换录音

- 五段正文、顺序、每段局部图和母图矩形：`src/content/world/nine-colored-deer-v002.json`。
- 图片原尺寸与运行路径：`src/content/world/story-media-v002.json`；MP3时长、字幕时码和临时音色登记：`src/content/world/story-audio-v002.json`。`deer-story.ts`组合以上数据。
- 共用时序/布局：`src/world/story-playback.ts`；播放器：`src/app/WorldStoryPlayer.tsx`；样式：`src/styles/deer-story.css`。
- 三选项及返回/重播：`src/app/WorldCultureChoice.tsx`、`src/world/events.ts`、`src/app/WorldScreen.tsx`。
- 全局金边字幕及尾注：`src/styles/world.css`、`src/app/WorldSubtitle.tsx`。
- 预览入口：`mogao-story-v002.html`；构建/启动：`scripts/build-mogao-story-v002.mjs`、`scripts/serve-mogao-story-v002.mjs`。
- 验证：`tests/world/deer-story.test.ts`、更新的`tests/e2e/world.spec.ts`及`scripts/verify-world-production.mjs`；独立整段实播检查：`scripts/verify-deer-story-v002.mjs`。

正式配音到位后另存音频版本，在故事配置中更换该段`audio`文件名，并在音频登记中更新`duration`及每句`start/end`。不要仅替换MP3而继续沿用旧语速的字幕时码。临时版音频与母图仍保留。

运行预览：`node scripts/serve-mogao-story-v002.mjs`，打开`http://localhost:4204/?view=interior#/`，主动点击“观看九色鹿故事”。4203为上轮洞窟外观版本，不会自动同步本轮播放器及字幕样式。

## 本轮实测结果（2026-11-01）

- 内容校验、TypeScript及生产构建通过。
- 全量规则测试串行执行314项通过。默认并发时找物100种子高负载用例触及既有5秒阈值；隔离串行复验通过，未改用例或延长阈值。
- 独立4204网页：五段MP3和结尾邀请均以真实音频自然结束驱动，未模拟ended或倍速；字幕切句、第三段双图、回卷、暂停/重播、空格长按只跳一次、三选择跳转、资源失败重试通过。Chrome及WebKit横屏检查通过。
- 竖屏仅覆盖转屏提示、故事inert且音频时间不增长；恢复横屏并继续后从原位置播放，通过。
- 探索E2E首轮11项通过；原路径行走用例一次采样偏移，隔离复验原路径和故事两项均通过，未放宽断言或时间。
- 生产子目录资源、返回主题、世界释放及原探索回归通过。额外验证结尾长卷刚恢复、邀请尚未开口时快速按空格，直接进入选择，不会产生不存在的第六段。
- 实际字幕样式：暖褐底透明度0.72，金边透明度0.79，圆角14px。底框仅含当句字幕与“（空格跳过）”。

检查报告：`work/world/deer-story-v002-verification.json`、`deer-story-v002-final-controls.json`；日志与截图同前缀。`deer-story-v002-episode-1.png`至`episode-5.png`、`highlight.png`、`ending.png`为最终横屏截图；手机使用`mobile-landscape.png`、`mobile-pair-landscape.png`。早期竖屏试验不属于交付，按用户后续要求取消，历史中间文件保留。

音色仍为本机临时合成老者旁白，等待用户正式录音替换；原图与所有旧版本、模型、角色和原小游戏未因本轮故事播放器更改。
