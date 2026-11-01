# 乐舞馆 v006：字幕与文化选择

用户2026-11-01批注已实装，等待试玩验收。

- 试玩：http://localhost:4200/?view=music-road#/
- 壁画左侧台阶下：http://localhost:4200/?view=mural-left#/
- 壁画右侧台阶下：http://localhost:4200/?view=mural-right#/
- 实际网页图册：http://localhost:4200/review.html
- 同一Wi-Fi手机试玩：http://192.168.1.116:4200/
- 会话键 `dunhuang:music-pavilion-preview:v6`。4199/v005静态交付及旧资源保留。

## 本轮行为

1. 原指定路段响起乐声后，允许继续行走2秒，再原地停步张望、播放“哪里来的音乐声？”。暂停或切后台不累计这2秒。实际网页从乐声开始到停步测得2017ms。
2. 壁画赞叹与唤醒按钮共用整幅壁画前方台阶区域：X约44.25—60.45、Z约-17.445—-9.58。左、中、右都可触发，赞叹自然播完或跳过后，在原地立即出现按钮。每次进院的重复规则沿用v005。
3. 共用字幕只放台词及普通字体“（摁空格跳过）”；括号文字也能触摸点击。语音结束即收起。灰转彩时不显示说明框。暂停、重播在右上方独立控制区；必要的音频故障提示另列，不混入字幕。
4. 飞天对白自然结束或空格跳过后，收起字幕，虚化当前画面，中央半透明窗口只显示“返回漫游 / 进入文化导览”。返回漫游后壁画恢复灰色。路上自言自语、壁画前赞叹不弹文化选择。
5. 藻井和现有九色鹿故事预览采用相同选择组件。藻井当前无语音，观察镜头3秒后出现选择；九色鹿仍是两段字幕技术预览，末段结束/跳过进入选择，未伪造正式旁白。正式洞窟未扩展。
6. 选择窗阻止背景操作，Tab在两个按钮内循环，Esc返回漫游。进入文化导览后可返回对应世界位置；藻井沿用安全返回点(-12,-13)。移除试玩画面底部的调试跳转条，快捷复看入口放在图册。

## 内容边界

纹样文化导览已存在且可进入。乐舞、壁画故事导览尚未开放，两个选择窗已连到各自主题入口，仍如实显示未开放状态。本轮没有新增其教学或小游戏内容。配音仍为既有本机试听。

v006复用v005 GLB、角色、树木灌木、沙丘、建筑及音频，不改模型、空间布局、小游戏、AGENTS或旧资源。共有字幕与文化选择组件同时更新默认探索的界面行为；不将乐舞馆样片区域批量替换进正式地图。

## 实际文件

- 共用组件：`src/app/WorldSubtitle.tsx`、`src/app/WorldCultureChoice.tsx`。
- 界面整合：`WorldScreen.tsx`、`WorldFlyingObservation.tsx`、`WorldStoryPlayer.tsx`、`App.tsx`、`src/styles/world.css`。
- 事件与触发：`src/world/events.ts`、`music-encounters.ts`、`runtime.ts`、`types.ts`、`art-sample.ts`。
- 独立入口：`music-pavilion-v006.html`、`src/world/music-pavilion-preview-v006.ts`。
- 构建与图册：`scripts/build-music-pavilion-v006.mjs`、`build-music-pavilion-review-v006.mjs`；服务：`serve-music-pavilion-v006.mjs`。
- 验证：`tests/world/music-encounters-v006.test.ts`、更新后的`tests/e2e/world.spec.ts`、`scripts/verify-music-pavilion-v006.mjs`、`verify-music-pavilion-v006-access.mjs`。
- 交付位于 `outputs/music-pavilion/v006/`，检查报告和截图位于 `work/world/music-pavilion-v006-*`。

## 验证结果

- 内容检查、TypeScript、275条规则测试（30文件）、默认生产构建、独立生产构建通过。
- 默认世界12条桌面E2E通过。旧测试原本等待已经移除的藻井说明框，已改为验证真实观察视角、无字幕、中央两选项、教学页面及安全返回；没有放宽超时或删除关键行为断言。
- Chrome实际音频与键盘行走：2秒延后停步、台阶左中右自然播放结束即按钮、灰彩期间无说明框、纯字幕、自然结束与空格跳过同一选择、焦点约束、各主题路由及返回均通过。
- WebKit真实音频、空格/触摸跳过、虚化、退出复灰通过。手机844×390横屏模拟：字幕与按钮均在视口内，故事字幕在选择前收起。暂停冻结2秒前奏计时通过。未冒充真机测试。
- 实际图片检查确认桌面及横屏字幕纯净，中央窗背后确有虚化，按钮没有混入字幕。

## 本地复现

```sh
node scripts/build-music-pavilion-v006.mjs
node scripts/serve-music-pavilion-v006.mjs
# 另开终端，浏览器任务串行执行
node scripts/verify-music-pavilion-v006.mjs
PLAYWRIGHT_BROWSERS_PATH=work/browsers node scripts/verify-music-pavilion-v006-access.mjs
node scripts/build-music-pavilion-review-v006.mjs
```
