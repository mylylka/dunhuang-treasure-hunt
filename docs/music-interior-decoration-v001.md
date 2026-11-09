# 第二馆整体装修 v001

2026-11-05，按婧婧确认的 `docs/music-interior-decoration-design-v001.md` 实施。本版覆盖双层同行入口的一楼前廊与后室、直梯/上下平台、二楼后厅及原乐人前廊的建筑表面、细部收口与局部照明。仍为待试玩确认的室内装修样片。

试玩沿用：http://localhost:4228/music-companion-v002.html 。同一Wi-Fi手机横屏：http://192.168.1.116:4228/music-companion-v002.html 。刷新后加载新版本。

## 实际内容

浅米砂灰泥主墙、浅青绿0.75米低墙裙、朱砂门洞收边、细赭金线、顶部花叶窄带及木梁分色；一楼为平整米石地面，二楼为温暖木面，梯段踏面/踢面分色并加入4毫米踏沿。门洞内外、墙角、楼板底与梯下均作了对应处理。

后墙两层与一楼门洞隔墙正背两侧另加6条0.12米花叶窄带，让普通行走视角也能看到现有纹样。上层带顶8.865米，低于原窗下沿约8.927米。花叶图仍是既有 `courtyard/v002/wall-floral-border.jpg`，运行时只加载一次，保持1013∶97的原图比例；没有生成新壁画或改写原画内容。

6处局部暖补光，无实时阴影，范围5.8—7.2米。3张共享256px技术纹理提供细微灰泥、1.8×1.3米石板缝和约0.55米木板线，纹理本身近白低对比，颜色由独立材质给出。纹理与花带CPU像素合计约1.18MB（未计mipmap和GPU额外开销）。

## 接入与资源

- 新模型：`public/assets/world/music-interior/v003/music-pavilion.glb`，5,318,940字节、68批；SHA256 `ece855715756e2b4dcc9a81023b54d8586a1ddfe4f7e9ab427c09620a5e17442`。
- 可编辑模型、导出与保护登记：`art-source/world/models/music-interior/v003/`；构建与独立复核：`scripts/build-world-music-interior-v003.py`、`scripts/verify-world-music-interior-v003.py`。
- 配置及运行生命周期：`src/content/world/music-interior-decoration-v001.json`、`src/world/music-interior-decoration.ts`；只作用于 `music-decor-*` 新材质。
- 模型加载、装饰资源准备及静态阴影顺序由 `src/world/art-sample.ts` 接线；装饰准备完毕后才显示场景。取消加载、失败与离页会释放灯、技术纹理及花带图像，恢复GLB原map，不释放非本模块所有的材质。
- 仍使用独立 `music-companion-v002.html` 入口、已有v2会话与4228压缩构建服务，默认世界和旧原型不启用此装修。

所有结构顶点与多边形签名不变；原门洞、楼层、直梯及已移除中柱保持。新增122片薄饰面，最大突出约2.5厘米，位于既有碰撞安全余量内。349个受保护对象、41,384个面的原材质和UV通过源模型对比，原飞天、乐人、窗、其他柱、家具与主要外观保持；旧v002源及GLB哈希不变。

## 验证

类型检查与独立入口构建通过。8组54项定向测试通过，包含新装修纹理和资源生命周期、真实v003 GLB的门洞/楼板/梯段相机检查、导航、辅助、双人同行、人物与语音。未跑2D或全地形回归。

```sh
npx vitest run tests/world/music-interior-navigation.test.ts tests/world/music-interior-stair-assist.test.ts tests/world/music-interior-camera.test.ts tests/world/music-interior-decoration.test.ts tests/world/companion-follow-v002.test.ts tests/world/companion-follow.test.ts tests/world/companion-avatar.test.ts tests/world/companion-speech.test.ts
```

浏览器实走、最终截图、状态与帧时记录存 `work/world/music-interior-decoration-v001/`。该目录中的首次试装记录 `floor1.json` 属于增补低花带前的阶段；最终以 `floor1-final.json`、后续二楼及手机记录为准。手机检查是横屏浏览器触控模拟，不等于实机验收。

## 浏览器实走补记

最终模型已从4228服务读取并核对字节数及SHA，检查期间对本任务页面禁用了网络缓存。入口、一楼后室、梯下、梯段与顶面、二楼后厅、原乐人前廊均已截图；原前廊门口按原乐人实体绕行，再返回梯顶。双人辅助上楼、中途停止/继续及两人在二楼停步已复核。

初始同站位基线为811468三角/109调用，装修后采样811900三角/141调用；这是该视角单帧统计，其他朝向会看到院外树木与环境，调用和三角数不能直接与这个初始值比较。

辅助下楼后两人均回到一楼并停步，实测间距约1.55米。随后在844×390横屏触控模拟中重新加载，以真实触控事件操作原摇杆，玩家与同行者依次切换Walk、Run、Idle，同行者间距约1.63—1.65米，装修4张纹理及6处无阴影灯全部就绪。该模拟环境在DPR 1、844×390画布下连续采样121帧，中位帧时16.7毫秒、P95为17毫秒，没有超过34毫秒的帧；这仅是本机浏览器模拟采样，不代表手机实机性能。

最终11张截图按 `01-入口装修.png` 至 `11-手机横屏.png` 集中保存；手机状态与采样见 `mobile-final.json`。检查后已恢复触控/视口模拟设置并关闭本任务临时测试页，用户原页面保留。
