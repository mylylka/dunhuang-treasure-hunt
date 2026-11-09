# 第二馆连续柔和暖光

2026-11-05。修正地面孤立圆形白斑，保留目前两层空间、原灯笼安装点、人物、材质和敦煌花带。试玩入口仍为 [第二馆](http://localhost:4228/music-companion-v002.html)。

## 灯光设计与实现

原六盏灯是高强度、短射程的下照 SpotLight，光锥与强距离衰减叠加，在昏暗基础光中形成明显地面光岛。本次取消六个聚光锥，不沿用方向/锥角参数。

基础照明改为第二馆体积内的实时近似间接漫反射：使用接近中性的暖白 `#fff6eb`，在 PBR 的间接漫反射通路加入连续辐照度。墙、地、楼梯、木构以及玩家和同行者均从真实变形后的片元位置受光；不会跟着相机变化。保留小幅法线方向差异、原太阳阴影和材质粗糙度，维持低多边形卡通的结构层次。

六盏原灯笼改为弱暖色 PointLight：各强度 1.0，范围 12 米，距离衰减指数 1，并以 1.35 米有效柔化尺度消除近壁处的点源奇点。该尺度是卡通光照近似，并非改大灯具几何。灯笼附近略亮，以宽缓的衰减融入基础照明，不再产生光锥边界。灯具位置、支架、吊杆和原三批次几何保持。

补光只在室内空间生效。基础光与这六盏灯的贡献都由同一体积约束；其他点光、太阳、全局半球光与曝光保持。闭合外壳有 1.5 厘米数值容差，渐隐置于室内侧；沿接收面法线采样，两个体积向各自楼板内延伸约半米，避免墙裙贴楼面处出现人为暗线。没有用发光材质或改白原画来替代照明，没有新增实时阴影贴图。

## 当前文件

- 参数：`src/content/world/music-interior-decoration-v003.json`；旧 v001/v002 参数保留。
- 灯具/纹理归属：`src/world/music-interior-decoration.ts`。
- 局部间接光、六灯作用域及近源柔化：`src/world/music-interior-lighting.ts`。
- 接线：`src/world/art-sample.ts`。所有模型与两个人物就绪、完成地形变换后安装局部材质回调，再准备原静态太阳阴影；销毁时逆序还原，保留之前的 shader 回调与程序缓存归属。
- 定向测试：`tests/world/music-interior-decoration.test.ts`、`music-interior-lighting.test.ts`、`music-interior-lighting.fixture.ts`；真实 GPU 检查脚本 `scripts/verify-music-interior-lighting-v003.mjs`。

本轮未改建筑 GLB、行走/碰撞/同行逻辑、输入或相机。运行建筑仍为 v005，SHA256 `10daa781a7926056f0df15b837c1560734dd52684c9db8ad3be9f36c2c867285`；原图和正式人物模型保持。

## 验证结果

13 项装饰/照明单测、类型检查、相关 diff 检查及第二馆独立正式构建通过。真实 WebGL 检查使用生产代码和实际创建的灯，分别读取 Float32 线性 PBR 输出与游戏 ACES 1.08/sRGB 默认画布，覆盖 17 类地面、墙面、裙脚、梯面、人物变形及室外接收体。

| 区域 | 旧聚光 P95/P05 | 当前 P95/P05 |
| --- | ---: | ---: |
| 一楼地面 | 3.93 | 1.08 |
| 二楼地面 | 5.61 | 1.06 |
| 梯面 | 9.31 | 1.08 |

P95/P05 为统一灰材同平面的线性亮度分布比，用来隔离光照与原图纹样。点灯峰值贡献为 24.51%，基础光占主要部分；所有接收面 0.25 米间距亮度梯度小于 20%，近白显示像素占比为 0。外地面、近外墙、屋面及室外人物开关局部光前后的像素差均为 0；骨骼和实例接收体与同位置刚体亮度一致，shader/GL 错误为 0。

这些是受控渲染检查，不等同于把实际材质画面的每个亮暗变化都当成灯光不均。真实建筑中的木纹、朱砂、深木色和自然阴影另外通过实拍检查。详细方法、参数哈希和原始数值见 [验证报告](../work/world/music-interior-lighting-v003/validation-report.md)。首轮近壁灯偏亮及修正前版本的检查记录保留，没有放宽阈值。

## 实拍与交付

前后实际游戏照片、原生操作脚本、路线状态、构建日志和原始验证记录集中在 `work/world/music-interior-lighting-v003/`，不新建网页。

- `light-before-*.png`：上轮 v005 建筑与旧 v002 灯光的真实照片，用于相近路线/角度对照。
- `light-after-ground.png`：一楼梯下与大面地板。
- `light-after-stair.png`：梯段中途及高处壁灯。
- `light-after-upper.png`：二楼墙角、花带、木地板。
- `light-after-platform.png`：平台木构、挑空墙与双人。
- `light-after-gallery.png`：二楼乐人前廊与后厅。
- `light-check-ground-delivery.json`、`light-final-state.json`及拍摄原始回执：最终参数与角色状态；详见 [实景检查记录](../work/world/music-interior-lighting-v003/light-browser-verification.md)。

`light-candidate-*.png`、`validation-gpu-initial.*` 等是调光过程记录，不作为最终效果照片。GPU 诊断图使用灰色接收面，不是游戏装修效果图。

仅做本次照明、材质生命周期、真实画面和原上下楼操作检查；不运行 2D 或全地形回归，不声称完成手机实机或全部地图的渲染验收。
