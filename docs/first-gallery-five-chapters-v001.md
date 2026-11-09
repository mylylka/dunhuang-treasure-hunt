# 敦煌寻宝记｜第一馆五章试玩交付

2026-11-05。第一馆剧情使用独立入口，继承综合地形 v013 的院落、大厅、人物、操控和小游戏。请从以下链接试玩。本轮验收使用该入口，默认首页和原地形试玩入口继续提供原流程。

- 电脑 [第一馆五章试玩](http://127.0.0.1:4229/first-gallery-v001.html)
- 同一 Wi-Fi 下用手机横屏打开 [第一馆五章试玩](http://192.168.1.116:4229/first-gallery-v001.html)

三个事件可任选先后。走到藻井或画架前，可点实物、交互提示或按 F。壁画在距墙约 6 米的观察位发出邀请，选择「玩壁画」后由系统带看。正式角色与画外音暂用字幕。

| 位置 | 试玩内容 |
| --- | --- |
| 大厅后墙与右侧桌案 | 借物补画。带看可跳过，直接回观察位猜物。莲花有明确提示，另外两轮自行猜。点中后实物起亮，流光沿曲线入墙，先描线再显原色。鸟纹与葡萄纹各双侧复原，莲花渐显稍慢。每轮显影后播科普，三轮齐全后整幅翻新、播总结，再恢复漫游。重玩使用本局进度。 |
| 大厅藻井下 | 藻井寻秘。抬头看井心，再点「放大看看」，原画从天花板浮到视野中央。直接点画上任意一只兔身，再找齐它的两只耳朵。前两只各自找齐后揭晓共耳，已有描金保留。点最后一只兔身后，金色流光沿三兔外圈跑一圈。 |
| 入院门右手画架 | 画架设色。从现场画架进入《飞天持莲》，完成并保存后自动回到原站位，画架换上新作品。普通 2D 填色提交后进入原结果页，可从画架作品库选展。 |
| 入院门左侧画卷台 | 庭院解锁。三项探索齐全后，桌上的画布亮起。首次通关演出结束后，旅人自动走到画卷台领取通知。此后点击画布可反复进入纹样玩法选择页。 |

壁画初次邀请时地面没有标记。选「自由探索」并走出观察区后，小圈才亮起，走回可再次选择。该提示记在当前标签页。画架入口会验证本标签页的现场来源，直接输入关卡 URL 受剧情门禁约束。3D 确实加载失败时，页面提供「兼容游玩」，可以进入纹样主题的 2D 内容。该模式的填色按普通提交处理。

## 存档与素材

本地进度、三枚印记、作品库、展出记录和解锁提示存于 `dunhuang:first-gallery:v1`。漫游站位与画架尝试分别保存在本标签页的 `dunhuang:first-gallery-world:v1` 和 `dunhuang:first-gallery-easel:v1`。独立收藏支持同一线稿的多幅配色。可确认的旧提交会按关卡与线稿版本只读导入，旧作品键仍用于兼容现有草稿和结果页。普通 2D 提交新增收藏，展出由画架提交或玩家主动选择决定。

新存档每次修改都读取最新记录，检测到写入竞争会提示重试。真正同时写入的多个标签页仍受浏览器本地存储的事务限制。作品保存失败会留在当前填色页，重试沿用同一次提交编号。不可读记录在覆盖前备份原文。

壁画沿用你给的完整图和脱落图。运行图从原图配准、裁片和制蒙版，井心沿用三兔藻井图，画架沿用《飞天持莲》线稿。桌上物件的点击范围、真实画纸面和注视点已经从现有模型量取，二维热区也已录入。坐标可随试玩反馈再调。[壁画原图与配准记录](../art-source/world/first-gallery/v001/mural-registration.json) · [装置测量](../work/world/first-gallery-v001/station-measurements.json) · [原实施方案](first-gallery-five-chapters-plan-v001.md)

## 验证与复现

- 手机首屏与画卷台更新另有交付记录。[首屏、画卷台与两种填色来源](first-gallery-portal-v001.md)
- 藻井浮图通过桌面鼠标和手机横屏触控仿真实点，核对原图离开天花板、任选起步顺序、第二只两耳点齐才揭晓、累计描金、三兔收尾流光与完成存档。手机转竖屏再回横屏可继续同一局。[实际试玩录像](../work/world/first-gallery-v001/caisson-float-gameplay.mp4) · [桌面记录](../work/world/first-gallery-v001/caisson-float-desktop.json) · [手机横屏记录](../work/world/first-gallery-v001/caisson-float-mobile.json)
- 手机漫游支持双指张开拉近、合拢拉远。通过横屏触控仿真验证缩放、距离限制、碰撞、单指转镜和暂停恢复。[双指验证记录](../work/world/first-gallery-v001/mobile-pinch-report.json)
- 纹光显影的最终版验证使用桌面 Chromium 和手机横屏触控仿真。两端均实点道具，核对快进、误猜、双侧落点、原色显影、科普、整幅翻新和重玩存档。[实际游戏录像](../work/world/first-gallery-v001/mural-light-gameplay.mp4) · [桌面记录](../work/world/first-gallery-v001/mural-light-desktop.json) · [手机横屏记录](../work/world/first-gallery-v001/mural-light-mobile.json)
- 新版壁画带看核对了首次邀约、婉拒离开后显示光圈、桌边字幕与返程顺序，以及固定全景下三件模型的直接点击。回程台词显示时人物站定约 2.4 秒，随后步行约 3.9 米回观察位。[桌面记录](../work/world/first-gallery-v001/mural-tour-desktop.json) · [手机横屏记录](../work/world/first-gallery-v001/mural-tour-mobile.json)
- 8 项浏览器验收通过，覆盖桌面 Chromium 与手机横屏 Chromium 仿真。验证了直链门禁、画架回院、刷新、保存失败和重试，另核对普通 2D 的结果页、收藏和兼容入口。[Playwright 报告](../work/world/first-gallery-v001/entry-playwright.json)
- 8 个文件中的 54 项定向单测通过，覆盖第一馆事件、进度、作品、视线、藻井热区、输入与关序。类型检查和差异检查均通过。
- 第一馆压缩构建中，手机横屏仿真走完壁画三轮。[借物补画画面](../work/world/first-gallery-v001/mural-lotus-integrated-mobile.png)
- 3D 装置检查复核了实物点击与遮挡、画架上的真实作品和抬头姿态。正文提示与身体/头颈目标同步，正式面板打开、关闭不会误取消新排队的动作。[实物点击复现](../work/world/first-gallery-v001/puzzle-real-object-pick.mjs) · [桌案与壁画](../work/world/first-gallery-v001/mural-gaze-trail-live.png) · [画架挂画](../work/world/first-gallery-v001/easel-artwork-live.png) · [藻井抬头](../work/world/first-gallery-v001/caisson-look-live.png)
- 实走验证第二、三馆正面和侧向门禁，以及三项完成后的第二馆放行。走近画卷台才亮起并记录仪式，重访不重复；换画后确认台词和注视仍保留。[门禁与仪式日志](../work/world/first-gallery-v001/gates-and-ceremony.log) · [字幕与触控日志](../work/world/first-gallery-v001/integrated-gaze-and-mobile.log) · [换画日志](../work/world/first-gallery-v001/artwork-change-cue.log)

本次报告覆盖第一馆和关联路径，手机触控采用浏览器仿真。正式录音、目标手机实机触控与帧率、默认入口切换留待验收。

在项目目录运行以下命令，可重建并启动局域网试玩。

```sh
node scripts/build-first-gallery-v001.mjs
node scripts/serve-first-gallery-v001.mjs
```

[素材准备脚本](../scripts/prepare-first-gallery-v001.py) · [装置测量脚本](../scripts/measure-first-gallery-stations.py) · [浏览器验收脚本](../tests/e2e/first-gallery-entry.spec.ts)
