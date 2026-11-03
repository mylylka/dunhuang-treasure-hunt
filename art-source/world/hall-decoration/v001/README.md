# 方形观赏厅纹理 v001

两张用户 PNG 原稿按原字节归档；SHA、来源坐标、透视矩阵和运行文件清单见 `source-manifest.json`。

- `hall-lotus-mural.jpg`：1672×941，完整画面，7m 宽对应 3.9396m 高。不能裁切或拉成正方形。
- `hall-banner.jpg`：82×234，RGB 无 alpha，仅布面及金色边框，不含挂杆与流苏。原生有效像素透视提取，低清待替换；保留原图折痕和光照，无新增细节。建议 0.9×2.5683m。
- `hall-floral-border.jpg`：1013×97，现有 v002 边饰原字节复制，不声称是新参考图同款。

运行文件位于 `public/assets/world/courtyard/v003/`，按 sRGB 颜色纹理使用。布幡不需要 alphaTest 或透明材质；可用独立布面几何，UV 完整覆盖 0–1。穗子和挂杆另作几何。

`texture-preview.jpg` 为素材拼图，`banner-source-review.png` 为带提取边界的 3 倍像素查看图，均不得作为运行纹理。未来布幡若需地面近看清晰，补独立正视布面图，约 1:3、512×1536。没有生成美术、去水印或改动藻井。

重建：`python3 scripts/prepare-hall-decoration-v001.py`。已有不同原稿或边饰时脚本拒绝覆盖；旧院落版本保持原样。
