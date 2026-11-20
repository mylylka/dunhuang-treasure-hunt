# V013 三馆外景运行模型

本目录登记审阅稿所用模型的原件、派生文件、三角面数和校验值。新增运行模型放在 `public/assets/world/desert-decoration/v013/`，文件名用英文资产名，后缀 `-mid`、`-far` 表示中景和远景。近景沿用既有 GLB 时直接引用原路径。模型版本与清理分别确认。

运行索引为 `src/content/world/desert-oasis-models-v013.json`。用 `python3 scripts/prepare-desert-oasis-v013.py --verify` 核对全部派生。原件登记仍有效时，直接运行同一脚本可从素材库重新生成。构建使用本机 Blender 所带的 meshoptimizer 和项目现有的 three.js，无需网络解码服务。

六款普通大树的中景逐枝保留原模型的主干、分叉和彼此独立的叶簇，在每个连通部分内减面，沿原树贴图采样顶点色。大树9的近远模型保留按原始顶点烘焙的日照与天光系数。贴近观看的灌木一沿用已确认的既有 GLB。

远景备用图集 `route-ground-light-v013.webp` 共 223,756 字节。上半区的两个方向从每种近景 GLB 的原树枝、叶簇和岩石取形，保留顶点原色或贴图取色。胡杨另有黄叶、枯枝。下半区存放四个方位的直射遮挡、顶面天光遮挡和模型法线所确定的平均光照及两个方向分量。游戏根据每株的实际转角还原 250° 方位、30° 高度的光照变化。远景树影共用上半区的叶隙和枝干轮廓，按太阳方向投到沙地，临水处按水面高度渐隐。

运行 `python3 scripts/prepare-desert-oasis-route-v013.py --verify` 可从运行索引所列实体模型重算，并逐字节核对当前图集。早期单层 `route-ground-atlas.webp` 共 159,000 字节。
