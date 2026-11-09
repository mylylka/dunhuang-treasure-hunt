# 第一馆进场、画卷与填色返回

2026-11-06。入口沿用 `first-gallery-v001.html`，局域网试玩使用 4229 端口。

- [电脑试玩](http://127.0.0.1:4229/first-gallery-v001.html)
- [手机横屏试玩](http://192.168.1.116:4229/first-gallery-v001.html)，手机与电脑连接同一 Wi-Fi。

## 画卷台

院落 v007 将西侧桌案从 10° 转回庭院轴线，台面的画布、颜料碟和画笔随桌归位。六格画架等比放大 2 倍，高约 1.96 米。同款原件透视校正后以 494×426 贴图上板，画架往院门微移 15 厘米以留出取色通路。颜料柜等比放大 1.5 倍，高 2.25 米，两套木纹单独调浅，保留原颜料色。桌、柜和画架的模型与玩家、相机碰撞共用 v007 实测布局。

三项首次完成后，等壁画总结、藻井退出或填色挂画反馈结束，小旅人步行到桌边，收到「第一馆通关！游戏世界已开启。」途中可跳过带路，暂停或转竖屏会停在原地。已通关存档直接点亮桌上画布。到桌边点发光画布或按 F 可反复打开纹样玩法选择。画布光效使用金色回旋丝带、上升金丝和光尘，第一次到达有短暂加强，减少动效时呈现静态光效。

[陈设实景](../work/world/first-gallery-v001/courtyard-v007-workshop-live.png) · [桌面常驻光效](../work/world/first-gallery-v001/portal-old-desktop-always-glowing.png) · [横屏通关通知](../work/world/first-gallery-v001/portal-easel-mobile-webkit-notice.png)

## 填色

从现场画架进入的填色保留当前画架入口和原站位。成功提交后自动回到 3D，在画板展示刚保存的作品。保存失败留在画布，重试成功再返回。普通 2D 入口按常规提交，留在作品完成页，提示可到 3D 画架的作品库选择展出。[横屏实拍回原处挂画](../work/world/first-gallery-v001/portal-easel-mobile-webkit-returned-artwork.png)

## 首屏

人物和近处院落优先进入加载队列，首屏按恢复站位准备对应区域。远处模型先用低成本外观，精细模型按位置和通行资格分段加载。离开页面会取消后台请求。壁画先恢复画面，显影准备好后再接受互动。试玩服务会为支持的浏览器压缩传输 GLB。

| 横屏仿真条件 | 修改前 | 修改后 |
| --- | --- | --- |
| 67.1 Mbps、四倍 CPU 减速、冷启动 | 20.54 秒、137.50 MB | 6.89 秒、37.06 MB |
| 16.8 Mbps、四倍 CPU 减速、冷启动 | 约 32.55 秒后超时 | 18.47 秒、35.12 MB |
| 16.8 Mbps、四倍 CPU 减速、热缓存 | — | 6.79 秒、8.81 MB |

合法的乐舞坊旧站位和第三馆外围站位按原坐标恢复。另实测接近二馆后补齐建筑、树与阴影，模型请求失败时在入口给提示，附近仍可漫游。

[同机同条件启动记录](../work/world/first-gallery-v001/staged-startup-report.json) · [场馆分段与失败回退记录](../work/world/first-gallery-v001/staged-regions-report.json)

## 验证

第一馆 35 项定向单测及类型检查通过。桌面 Chromium 和手机横屏 Chromium 的 10 项入口检查通过，覆盖普通 2D 结果页、3D 自动回原站位挂画、保存失败重试、刷新、后退和门禁。另用独立压缩构建分别从壁画、藻井及现场填色完成最后一项，实走到画卷并点击真实桌面画布，验证重访、旧档常亮和手机转屏暂停。现场填色回院及后续仪式也通过 WebKit 横屏触控仿真。移动浏览器验证在电脑仿真环境执行。

补查的旧地形 v001 套件有 5 条断言与当前 v013 地形的乐舞坊门位、坡线和湖面数据不符。院落 v007 的碰撞与路线单独复测通过。

[模型测量](../work/world/first-gallery-v001/courtyard-v007-model-verification.json) · [走位核对](../work/world/first-gallery-v001/courtyard-v007-navigation-verification.json) · [通关实景复测脚本](../work/world/first-gallery-v001/verify-first-gallery-portal.mjs)
