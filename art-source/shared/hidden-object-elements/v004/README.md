# 520张找物贴纸 q92 WebP 技术派生 v004

保留旧PNG与正式素材索引，运行URL由`src/content/hidden-object/runtime-images.ts`统一转换。任务卡与盘面共用同一张派生图。这里只改变技术编码，不裁切、不缩放、不重画、不镜像，不主动调色。

编码参数：`cwebp -q 92 -alpha_q 100 -exact -sharp_yuv -m 6 -metadata icc`。RGB为有损编码，不能称为像素无损；逐张核对原尺寸、全部alpha字节与ICC一致。来源PNG和输出WebP的SHA-256、体积及可见区域质量指标见`manifest.json`。

重建：`python3 scripts/import-hidden-object-webp-v004.py --workers 4`。快速只读复验（所有文件哈希、解码、透明通道及指标）：同命令加`--check`；编码字节完整复现验证再加`--reencode`。已有不同字节的版本会拒绝覆盖。脚本不安装依赖、不下载资源、不改变活跃pool或assets索引。

180px贴纸及480px宽底图指标来自离线Pillow缩放/合成，仅是技术质量检查；不替代真实网页或手机目检。
