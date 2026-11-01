# 乐舞馆 v005：语音、烟雾与平整铺地

用户批注已实装为独立版本，等待试玩验收。

- 试玩：http://localhost:4199/?view=music-road#/
- 壁画：http://localhost:4199/?view=mural#/
- 实际网页图册：http://localhost:4199/review.html
- 手机同网：http://192.168.1.116:4199/
- 会话键 `dunhuang:music-pavilion-preview:v5`；4198/v004 与此前版本保留。

## 已完成

1. 指定路段（岔路后左侧沙丘与岩组旁，约 X=2.5、Z=12）前音乐严格静音，进入后开始空间乐声，停步约2.8秒。复用已存在的 LookAround 动作中3.5—11.9秒片段，播放“哪里来的音乐声？”，同步字幕。停步后需重新操作，不沿用被暂停的按键。
2. 每次入院首次靠近壁画，站立抬头、说“好美的飞天啊！”并显示字幕；完成或跳过后才可唤醒。离院0.7m以上重置入院标记，避免门槛抖动重复触发；同次入院重播或退出壁画不重说。
3. 灰转彩3.6秒期间局部流烟、无语音及台词字幕。完全变彩才开始原飞天对白。减少动效关闭流烟并立即上色；暂停、重播、退出统一管理时间，退出恢复灰色。
4. 当前语音用空格跳过；长按只处理一次，并拦截键松开，避免误触焦点上的重播按钮。飞天跳过对白后继续观察，不强制退出；小旅人跳过后恢复控制；九色鹿故事跳过当前段，末段退出。手机可点击跳过。背景音乐不属于语音，不随空格误停。
5. Blender派生v005，仅将院内地面换成暖灰米色矩形石板：1.2×0.8m、16mm细缝、5mm凹缝，表面同高无砖块侧面。院外不规则石板路保持。

## 资产与代码

- 源工程：`art-source/world/models/music-pavilion/v005/music-pavilion.blend`
- 模型：`public/assets/world/music-pavilion/v005/music-pavilion.glb`，113816三角形、57模型批次、5274232字节；SHA256 `4c0f06a442b97d132765df6fe7cd9f684151aaa43f0a33595f9d2009378dde57`。
- 建模脚本：`scripts/build-world-music-pavilion-v005.py`，读取v004并另存；导出登记同源目录。
- 两句本机试听：`art-source/world/traveler-voice/v001/`、`public/assets/world/traveler-voice/v001/`，macOS Tingting、rate190；原始AIFF、文本、处理登记和MP3均保留。音色为试听，不称正式角色配音。
- 触发数据/状态：`src/content/world/music-encounters.ts`、`src/world/music-encounters.ts`。
- 公共快捷键：`src/services/speech-skip.ts`；原语音播放器增加skip生命周期；故事播放器接入。
- 新样片加载器、局部烟雾：`src/world/music-pavilion-v005.ts`、`src/world/mural-mist.ts`。
- 入口/构建/服务：`music-pavilion-v005.html`、`scripts/build-music-pavilion-v005.mjs`、`scripts/serve-music-pavilion-v005.mjs`。

## 验证

- 内容检查、TypeScript、267条规则测试（29文件）通过。
- 默认世界12条桌面E2E通过，独立生产包构建通过。
- Chrome实际键盘行走、真实音频playing/currentTime、固定停步、长按空格、焦点按钮、灰彩和语音顺序、暂停重播退出、真正走出院门再进院通过。报告 `work/world/music-pavilion-v005-verification.json`。
- 手机844×390横屏模拟：跳过按钮/观察按钮在视口内，触屏可用。减少动效、到达语音暂停恢复、默认九色鹿故事空格逐段跳过、WebKit真实延迟语音及空格通过。报告 `...-access-check.json`。
- 55个非地面导出网格的顶点、法线、索引与v004完全相同；旧Blender源SHA不变。地面仅两种高度0.030/0.035m。报告 `...-model-check.json`。
- 实际网页地面前后截图摄像机完全相同，报告 `...-floor-comparison.json`。

未改角色模型、小游戏内容、已确认建筑结构、自然环境资产、AGENTS 或旧GLB。没有发布、推送或替换正式地图入口。音频异常时仍可读字幕及跳过；路上停步最长约3秒，不等待失败音频无限锁住玩家。
