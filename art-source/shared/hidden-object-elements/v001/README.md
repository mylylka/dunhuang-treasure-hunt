# 找物独立贴纸素材 v001

用户于2026-11-01授权接入程序化找物试玩。`originals/`逐字节保留用户提供的520张原PNG与7份统计、位置和来源JSON，原文件名与分类目录名均保留。`manifest.json`记录每个原文件和运行派生图的SHA-256、尺寸及映射。

运行图位于`public/assets/shared/hidden-object/v001/`，最长边256px，不放大、裁切或内容改绘；PNG保留透明。池索引位于`src/content/hidden-object/pool.json`。同一局只加载抽中的素材。

只将乐器01–04登记为“琵琶造型”、25–30登记为“鼓”、34–36登记为“铃铛”。其余图片只按素材类别索引；目录、AI造型或来源拼版文件名不自动成为历史事实。原有母图切割坐标不作关卡布局坐标。

重建：`python3 scripts/import-hidden-object-assets.py --source-root <切割结果目录>`。只验证：`python3 scripts/import-hidden-object-assets.py --check`。脚本不删除文件，不覆盖与现有内容不同的原稿或派生文件；素材变化应另建版本。
