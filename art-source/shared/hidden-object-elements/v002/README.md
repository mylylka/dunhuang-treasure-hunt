# 找物独立贴纸派生 v002

本版本以用户确认的更大物件和更清晰画布方案为目标，从v001原始归档重新生成520张透明PNG，最长边512px，只缩小、不放大、不AI补绘。原图不足512px时保留原生尺寸。v001的527件原始文件、旧256px运行图与处理登记均不覆盖。

`manifest.json`以SHA-256引用v001原档manifest，并逐项登记原PNG的SHA、原生尺寸、运行图尺寸和SHA。`pool-v002.json`保存本版本可重建的完整池索引，稳定pool ID、sprite ID和目标分组均沿用。当前激活索引为`src/content/hidden-object/pool.json`。

`layout-reference.png`逐字节归档用户的《找你妹》布局参考，SHA与原路径见manifest；仅用于比较物件占比，不作为正式游戏素材或文化考据。

重建并激活：`python3 scripts/import-hidden-object-assets.py --version v002 --max-edge 512`。默认从v001归档读取原件，可选`--source-root <切割结果目录>`。只验证：`python3 scripts/import-hidden-object-assets.py --version v002 --max-edge 512 --check`。旧命令`python3 scripts/import-hidden-object-assets.py --check`仍独立核验v001，不要求active pool仍指向v001，也不会降级当前索引。
