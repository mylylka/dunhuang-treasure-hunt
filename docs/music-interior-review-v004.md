# 第二馆入口与室内批注修正

2026-11-05。按 11 处浏览器批注更新 [第二馆试玩](http://localhost:4228/music-companion-v002.html)。门的样式以用户随后确认的“正面竖栅，侧向实体墙”为准。

| 批注 | 本轮改动 |
| --- | --- |
| 1、2 | 门前看进去，一楼和二楼的局部暖光均收暗。玩家经过以真实门后面为中心的约 3 米范围时，局部补光由 30% 连续升至室内值；转动镜头不会触发。30% 指附加补光贡献，世界总曝光和原太阳光保持。 |
| 3、4、11 | 门外西侧前廊恢复建筑灰泥，墙裙和彩带在门内收口。侧向回折墙恢复实体、接入原飞天墙，补上门侧墙缝；外面用原建筑灰泥，厅内面延续墙裙与花带。 |
| 5、6 | 两块正面固定栅片和两扇打开的木门都改为真实透空竖条。门扇细条减薄，正面斜视也能看见孔隙；保留原框和 6.09 米净门洞。 |
| 6、7 | 入口栅片灯与一楼后墙低位灯的灯体、支架和点光均移除；其余四灯继续提供弱暖补光。 |
| 8 | 原二楼前廊 18 根栏杆竖杆延长到木地板。原杆底高出地板约 0.41 米；复核实际杆底与独立楼板承托。 |
| 9 | 修正室内光照体积：闭合墙角、墙顶和裙脚完整受光，去掉原本在交角处削暗的计算；局部光仍限制在馆内。 |
| 10 | 一楼后墙在楼板下补原花带与上沿细线，侧向实体墙及原墙端头同步收齐；花带止于真实低顶边缘，不横穿梯口和挑空。 |

房间进深、层高、台阶、直梯、原楼面和 Z 形平台不改。新增/调整的实体侧墙及原前廊栏杆同时进入人物和相机碰撞，门口和原上下楼辅助保持通畅。

## 实现与复核

- 从 v005 非破坏派生 `music-interior/v006`；构建和独立复核分别用 `scripts/build-world-music-interior-v006.py`、`scripts/verify-world-music-interior-v006.py`。
- 共享配置 `music-interior-v004.json`、`music-interior-solids-v004.json` 和 `music-interior-decoration-v004.json`。灯光只接双层同行入口，保留原 PBR 材质、阴影、低强度宽域点光及真实原图纹样。
- 最终 GLB 为 7,462,172 字节，SHA256 `6651e4b14d20333819adfded803265f66478cfe8ff364cbae75ece3d1681abd3`。216 项独立几何/饰面检查通过，13 个旧资源哈希保持。
- 69 项定向用例、24 类真实 GPU 接收面、入室三帧率轨迹、类型检查和独立构建通过。最终 GLB 的 12 项实模相机检查已按最新哈希重跑。照明无原聚光圆斑，闭合墙角完整受光，室外样本的额外局部光贡献为零。
- 定向验证明细：[导航与光照报告](../work/world/music-interior-review-v004/validation-report.md)、[模型验证](../work/world/music-interior-review-v004/model-verification.json)。未运行全地形、2D 或手机实机回归。

## 游戏实拍

最终照片：[门外看两层](../work/world/music-interior-review-v004/review-after-facade.png)、[外廊与竖栅](../work/world/music-interior-review-v004/review-after-exterior-close.png)、[进门后回看](../work/world/music-interior-review-v004/review-after-entry.png)、[一楼顶缘花带](../work/world/music-interior-review-v004/review-after-low-cornice.png)、[后墙和梯脚](../work/world/music-interior-review-v004/review-after-rear-wall.png)、[二楼前廊栏杆](../work/world/music-interior-review-v004/review-after-gallery-rail.png)。照片未经调色。

浏览器里用键盘和镜头正常操作，两人从门外走进一楼。无缓存加载了最终 GLB；[进门轨迹](../work/world/music-interior-review-v004/review-front-final.json)的 117 帧中，局部补光由 30% 平稳升至约 100%，无反向变化，单独转镜没有重触发。随后实点“上楼”，两人抵达二楼，同行者停下约 10 秒无位移，保持 Idle，距玩家约 1.54 米；再步行到前廊核对栏杆。[室内轨迹](../work/world/music-interior-review-v004/review-interior-final.json)和进门轨迹均无浏览器错误。
