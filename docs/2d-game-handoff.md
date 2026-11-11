# 2D 游戏接管说明

本分支的现行约定以仓库根目录 `AGENTS.md` 为准。2D 正式内容配置位于 `src/content/levels/`，当前共有 22 关；`src/content/assets.json` 是运行素材索引。纹样、乐舞与壁画故事主题的实际开放内容以关卡配置为准。

## 内容与素材

- 游戏运行素材位于 `public/assets/levels/`、`public/assets/shared/`、`public/assets/themes/`、`public/assets/lessons/`。原稿与来源记录位于 `art-source/levels/`、`art-source/shared/`、`art-source/themes/` 和 `art-source/references/`。
- 九色鹿长卷原图和派生登记在 `art-source/levels/puzzle-nine-colored-deer/v001/`，运行图在 `public/assets/levels/puzzle-nine-colored-deer/v001/`。
- 找物贴纸的正式索引及原 PNG 路径保留，运行时映射到 `public/assets/shared/hidden-object/v003/` 的 WebP；三章底图映射到 `public/assets/shared/hidden-object-backgrounds/v002/`。
- 历史专题文档记录了当时的设计、图源和有限范围的验收。原项目的截图、临时报告、端口及历史测试结果不表示此分支已重新验证。

## 素材脚本

`scripts/import-*.py` 及 `scripts/prepare-puzzle-retouches.mjs` 保留相关素材导入和处理流程；`scripts/asset_intake.py` 为教学参考素材导入提供原件查重和来源登记。导入前先阅读相应脚本与素材目录下的来源记录，不覆盖现有原件或运行文件。部分历史脚本的默认输入路径是当时的剪贴板临时目录或下载目录；原件已归档时相关脚本可回退归档，使用其他素材时应检查脚本提供的参数或按新版本方案处理。

需要复现已登记的字体和找物候选目检文件时，Python 及依赖版本会影响重建结果。本机记录使用 Python 3.14、fontTools 4.63.0、Pillow 12.2.0；脚本的 `--check` 只读比较归档与派生输出。不同环境先检查版本和现有登记，不能直接覆盖已有素材。教学素材导入入口的素材库位置可通过 `DUNHUANG_ASSET_LIBRARY` 指定，该库位于 Git 工作区之外。

手机玩法按横屏设计；竖屏只提示转屏并保留进行中的局面。具体行为与历史检查记录见 `2d-mobile-landscape.md`、`mobile-play-redesign-v001.md`。九色鹿画廊排序见 `mural-gallery-order-plan-v001.md`，找物与影子配对见相应专题文档。
