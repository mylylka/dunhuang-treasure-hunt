# 三馆沙漠绿洲 v002

按《最新世界地图》和试玩批注调整正式三馆联通场景。17 款用户素材共落位 228 处，纹彩院外 39 处，月牙泉一带 136 处，乐舞坊一带 22 处，九层楼外围 31 处。

- 以游戏中的 1.8 米旅人为参照，新乔木高 5.6–7.35 米。月牙泉内岸沿真实弧线布置 70 组前排和 26 组后排芦苇、灌木。前排根中心距实际岸线约 0.37–0.99 米。外岸另外补五簇，保留稀疏与留白。
- 三馆墙根补草、灌木和岩石。砂岩采用同一模型的不同大小和转向，选取三处层岩做卧放和半立对照，旋转后按岩脚重新计算接地。
- 团状树和灌木来自早期 Blender 植被样片。联通入口停用其模型请求和对应的玩家、相机碰撞。原来的场景代码继续支持历史预览。 [生成脚本](../scripts/build-world-environment-vegetation-v002.py) · [旧树原件](../../../public/assets/world/environment-sample/v002/tree-a.glb) · [旧灌木原件](../../../public/assets/world/environment-sample/v002/shrub-a.glb) · [可编辑备份](../../../art-source/world/models/environment-sample/v002/vegetation.blend)
- 「设置」里的「一键解锁所有场馆」用于 5174 本地试玩，开放三馆通路和总览地图。临时跑图位置独立存放，恢复正常门禁时回到正式存档的位置。奖项、图鉴和任务仍按现有完成条件记录。
- 芦苇和灌木的密植批次复用轻量网格，移动端还使用轻量胡杨。沿用分块、串行加载和 20 次绘制、3 万个三角形的移动增量预算。新增的展冠胡杨和六份轻量派生共 648,900 字节原始大小。 [素材来源和尺寸](../art-source/world/desert-decoration/v002/manifest.json)

使用本地共享 5174 刷新可试玩。验收脚本 `node --import tsx scripts/verify-desert-route-v001.mjs --preview` 从空白进度点击设置按钮并实际跑完 152 个往返采样点，同时核查任务和正常站位。 [跑图记录](../work/qa/desert-decoration-v001/continuous-route-desktop-preview.json)

最终手机横屏模拟取了内岸、第一馆墙根、乐舞坊湖岸、崖前四个机位。移动前装饰资源均为零请求，旧云状树和灌木也无请求。四机位的新增峰值为 10 次主画面绘制和 27,927 个可见三角形。 [内岸实景](../work/qa/desert-oasis-v002/screenshots/visual-mobile-08-inner-bank-after-oasis-final.jpg) · [第一馆墙根](../work/qa/desert-oasis-v002/screenshots/visual-mobile-09-courtyard-wall-after-oasis-final.jpg)
