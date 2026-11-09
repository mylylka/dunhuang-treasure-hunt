# 第二馆墙边、平台栏杆与墙面尺寸修订

2026-11-05，本轮对应浏览器批注 1—8，沿用已验收的加深室内、直梯、六灯位和双人同行。

## 已改内容

- 批注 1：一楼后墙青绿墙裙、朱砂/赭色细边及原花带补至真实斜梯底遮挡处，裁掉梯底后隐藏部分，消除半墙突然截断与梯脚重复贴花。
- 批注 2、3：补齐二楼西侧低位彩色花带；同时核查并补齐一楼西、东及飞天墙背面同类漏铺。使用原花带图片，按真实比例重复，不拉长花纹。
- 批注 4：二楼 Z 形平台两段临空边增加 1.05 米高木格栏，采用与入口同系的朱砂木构。栏杆实体、人物碰撞及相机边界共用尺寸；楼梯口敞开，梯段保持原状。
- 批注 8：旧乐人前廊 17 条厚木板饰面改为与后厅同高的平整木面，保留细木缝纹理。承重楼板、二楼标高、乐人和柱子不移位。

## 三面通高墙尺寸

编号对应原批注：从平台望去，左侧为 7，中间为 6，右侧为 5。以下是模型真实内表面的米制尺寸。

| 批注 | 墙面 | 内净宽 | 一楼地坪至顶净高 | 二楼地坪以上 |
| --- | --- | ---: | ---: | ---: |
| 5 | 原飞天墙室内背面 | 14.52 m | 11.73 m | 5.62 m |
| 6 | 东侧通高墙 | 13.95 m | 11.73 m | 5.62 m |
| 7 | 后墙所指梯旁段 | 13.15 m | 11.73 m，局部受梯体分割 | 5.62 m，局部受梯裙分割 |

7 号完整后墙宽 24.66 米，包含左侧二楼后墙，不能把截图中的梯旁段当成整面后墙。墙面总尺寸也不等于可用画幅：花带、墙裙、灯具与楼梯需留出。5 号建议画区约 14.02 × 9.81 米；6 号约 13.45 × 9.81 米包络内须绕开 L3 壁灯；7 号下缘随梯坡变化，按多边形分区，不能整段直接贴等高矩形。

装修 Agent 可直接使用本轮唯一尺寸说明与结构化数据：

- [尺寸及可布画范围](../work/world/music-interior-detail-v003/measurement-wall-dimensions.md)
- [结构化坐标与避让框](../work/world/music-interior-detail-v003/measurement-wall-dimensions.json)
- [实拍编号定位](../work/world/music-interior-detail-v003/wall-mapping-marked.png)、[俯视尺寸总览](../work/world/music-interior-detail-v003/measurement-walls-overview.png)
- [5 号立面](../work/world/music-interior-detail-v003/wall-05-measured-elevation.png)、[6 号立面](../work/world/music-interior-detail-v003/wall-06-measured-elevation.png)、[7 号立面](../work/world/music-interior-detail-v003/wall-07-measured-elevation.png)

尺寸图是游戏模型测量示意，蓝色区域是建议布画范围，当前未新增这些壁画。它们补充现有装修说明，不重新定义房间尺寸或灯位。

## 资源与验证

模型从 v004 非破坏派生至 v005。旧 v001—v004 源与运行文件保留，8 个旧文件哈希及 47,343 个无关旧面的位置、材质、UV 经独立复核保持。正式小旅人模型与本轮六灯位未改。

- 构建：`scripts/build-world-music-interior-v005.py`。
- 独立读取导出 GLB 复核：`scripts/verify-world-music-interior-v005.py`，117 项通过，覆盖花带比例与连续性、真实镂空木栏、梯口、35 踏面、门洞和 28 点平地板射线。
- GLB：`public/assets/world/music-interior/v005/music-pavilion.glb`，7,548,484 bytes。
- SHA256：`10daa781a7926056f0df15b837c1560734dd52684c9db8ad3be9f36c2c867285`。
- 共享布局/栏杆：`src/content/world/music-interior-v003.json`；实体：`music-interior-solids-v003.json`。仅双层同行入口切换本版本。
- 导航、辅助上下楼、同行者及真实 GLB 相机定向测试 46 项通过；相机测试的 20 个接缝采样最大高度误差为 0.000233 毫米，采用小于 1 毫米的验收阈值。
- TypeScript 与双层同行入口正式构建通过。构建日志保留已有字体相对路径提示，字体由预览服务 public 回退提供。
- 4 条到站定向轨迹（3 上、1 下）均恢复 Idle，最后 4 秒位移为 0，最小双人距离约 1.54 米。范围仅限相关功能，没有运行 2D 或全地形回归。
- 正式构建另做浏览器原生实走：一楼至梯脚、辅助上楼、二楼墙角及木栏内侧、跨前廊接缝、辅助下楼均通过；两次停稳后各采样 10 秒，人物保持 Idle、位移为 0。4 张实际截图已目检，记录见 [浏览器验证](../work/world/music-interior-detail-v003/detail-browser-verification.md)，没有以写入人物坐标代替行走。

本轮实拍、路线状态、模型测量和检查记录集中在 `work/world/music-interior-detail-v003/`。试玩仍使用 [第二馆双层同行入口](http://localhost:4228/music-companion-v002.html)。
