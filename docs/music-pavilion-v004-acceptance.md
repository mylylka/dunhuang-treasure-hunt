# 乐舞馆 v004：扩院、整墙壁画与多层台基

独立预览，等待用户视觉验收；未切换正式地图。

- 试玩：<http://localhost:4198/?view=approach#/>
- 壁画：<http://localhost:4198/?view=mural#/>
- 图册：<http://localhost:4198/review.html>
- 同一 Wi-Fi：<http://192.168.1.116:4198/>

## 按本轮反馈完成

围墙主墙冠从方案的约5.9米降到4.71米，只降低下部实墙；两排花格仍高1.6米，44块面板为真实几何开孔。后墙收至楼后，前墙从方案再前移8米。楼体扩大后，院宽随之调整为约46米、进深31.65米，楼体至侧墙约10米，扣除环绕台阶后仍可布置桌案并通行。

主体楼层原高度提高45%。一层层高约6.09米，二层净高也超过人物站立高度的1.5倍；现有旅人名义身高2.017米、乐师尺寸保持。整栋楼采用十层0.18米台阶，台基高1.8米，前面和两侧均有连续阶面，后面紧贴院后墙。行走使用连续支撑代理。

用户追加要求壁画铺满墙面，因此没有沿用最初2.1倍的尺寸：右侧墙相应加宽，壁画改为14.2×10.65米，面积约151.23平方米，为v003的3.49倍，完整保留4:3。下缘高1.95米，与台基间仅0.15米用于窄边框，不再保留空白墙带；上缘到檐下花梁。原图、人物和纹样均未裁切、拉伸或重绘。

院内按乐器坊用途布置：两侧桌案与长凳、横置整理中的琵琶、笛子与布垫、双琵琶展示架、大小鼓、悬锣、大小陶罐。左侧高布幔架8.4米，有连续横梁和挂点。乐器与器物为参考图的风格化环境陈设，不声称文物复原，也没有新增小游戏入口。

原石板道路保留，连接前移后的院门。只调整独立样片中现有Blender沙丘的摆放与缩放，不重做其网格。音频按新空间调整衰减，并在纹彩院区域保持安静、出院后逐渐出现。实走约36.21秒；默认音量下约3.15秒达到检测阈值，约10.08秒围墙首个采样点进入视野，先闻声约6.93秒。自然图形和乐句源文件均保留。

飞天观看保留灰转彩、两处飘带末端动态、本机女声试听和字幕；退出仍恢复灰色。声音继续明确标为试听，未冒充正式神女配音。

## 文件与复现

- Blender源工程：`art-source/world/models/music-pavilion/v004/music-pavilion.blend`
- 导出登记：同目录 `export-manifest.json`
- GLB：`public/assets/world/music-pavilion/v004/music-pavilion.glb`
- 生成脚本：`scripts/build-world-music-pavilion-v004.py`
- 布局：`src/content/world/music-pavilion-layout-v004.json`
- 预览、模型加载与规则：`src/world/music-pavilion-{preview-,rules-}v004.ts`、`src/world/music-pavilion-v004.ts`
- 构建/启动/图册：`scripts/{build,serve}-music-pavilion-v004.mjs`、`scripts/build-music-pavilion-review-v004.mjs`
- 验证：`scripts/verify-music-model-v004.py`、`scripts/verify-music-pavilion-v004.mjs`、`scripts/capture-music-route-v004.mjs`、`tests/world/music-pavilion-v004.test.ts`
- 截图、日志、路线视频与JSON：`work/world/music-pavilion-v004-*`

```bash
blender -b --python-exit-code 1 --python scripts/build-world-music-pavilion-v004.py
node scripts/build-music-pavilion-v004.mjs
node scripts/serve-music-pavilion-v004.mjs
PLAYWRIGHT_BROWSERS_PATH=work/browsers node scripts/verify-music-pavilion-v004.mjs
node scripts/capture-music-route-v004.mjs
node scripts/build-music-pavilion-review-v004.mjs
```

GLB约5.86MB、126492三角形、58个材质/结构批次。复用原装饰贴图和材质，墙体无透明贴图；无新实时灯光或布料物理。浏览器帧率仍受设备与可见旧场景影响，不把本机检查称为真实手机性能验收。

## 已验证与边界

保存的Blender源模型：44块花格的孔洞/框体射线检查、20条屋面与墙体连接射线均通过。40项既有资源/布局/配音SHA未变。AGENTS、角色、小游戏、旧GLB和旧源工程未修改。

Chrome实际键盘进门、登上/走下1.8米台基、侧后围墙阻挡、壁画完整观看、真实本机语音暂停/恢复/重播、退出复灰、导航离开清理，以及844×390横屏模拟通过。同机位对比使用相同角色位置，并断言前后摄像机位置和目标完全一致。默认世界预览不请求乐舞馆资源。

本轮仍需用户判断建筑是否足够雄伟、前院疏密和器物大小是否合适。单纯的测试通过不代表审美验收；不扩展洞窟或其他正式自然资产。

最终复验：内容校验、TypeScript、261项规则测试和生产构建通过；Chrome与WebKit壁画/配音检查均无页面错误。图册由各项通过的报告生成。

默认探索流程12项桌面端E2E也全部通过，覆盖原纹彩院路线、藻井事件、暂停恢复、故事播放器、加载失败重试与离开清理。真实手机仍需用户试玩。
