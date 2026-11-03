# 莫高窟 v004：沙色与岩脚积沙验收

独立预览：[4206](http://localhost:4206/?view=approach#/)。旧4205、用户原始FBX/贴图和v003模型继续保留。

## 修改内容

浅色岩面向既有沙漠的暖米黄协调，原UV和纹理细节保留；暗部做亮度保护，无全场曝光、灯光或雾效改动。母版中亮度≤0.38的2,001,773个暗部像素与原稿逐通道一致。网页使用JPEG95压缩，暗部平均压缩差约1.22/255，不宣称有损运行贴图逐像素相同。

Blender中沿实际岩脚制作连续的低矮积沙，较高沙堆与低缓部分交替，边缘下沉至原地面以下。前方积沙覆盖岩体硬底缘，同时保留岩石露出；中央台阶及石板路留空。侧后方也有衔接积沙。高度由同一模型网格导出供人物行走插值，网页不生成地形。

外立面共76,944三角形（新增积沙16,512），2个材质批次，GLB 4.63 MB；积沙最高1.63米。四个同机位的浏览器统计显示绘制调用数未增加。

## 真实网页对比

相机位置、朝向、光照、窗口1279×925保持一致。下列为原始网页截图，未调色合成。

|视角|修改前|修改后|
|---|---|---|
|远景|[原图](../work/world/mogao-v004-overview-before.png)|[新图](../work/world/mogao-v004-overview-after.png)|
|主入口|[原图](../work/world/mogao-v004-approach-before.png)|[新图](../work/world/mogao-v004-approach-after.png)|
|左侧岩脚|[原图](../work/world/mogao-v004-foot-left-before.png)|[新图](../work/world/mogao-v004-foot-left-after.png)|
|右侧岩脚|[原图](../work/world/mogao-v004-foot-right-before.png)|[新图](../work/world/mogao-v004-foot-right-after.png)|

## 文件

- `art-source/world/models/mogao/v004/mogao.blend`：保留独立岩体、积沙网格和当前可见地面，可继续编辑。
- 同目录`cliff-basecolor-v004.png`：选择性调色后的无损母版；`export-manifest.json`、`material-verification.json`：导出和暗部核验。
- `public/assets/world/mogao/v004/exterior.glb`：新外部模型；内部继续引用v003。
- `scripts/build-world-mogao-v004.py`：调色、积沙网格与模型导出；显式校验当前可见地面在世界零高度，排除旧工程隐藏地面。
- `src/content/world/mogao-surface-v004.json`、`src/world/mogao-surface-v004.ts`：模型高度采样与行走插值。
- `mogao-v004.html`、`src/world/mogao-preview-v004.ts`：独立入口；公共运行器通过`mogaoSurfaceVersion`分支加载，原入口不启用。
- `scripts/build-mogao-v004.mjs`、`scripts/serve-mogao-v004.mjs`：构建与4206预览。
- `tests/world/mogao-v004.test.ts`：道路/台阶、室内地面、坡度、GLB底板高度和资源规模验证。
- `scripts/verify-mogao-v004.mjs`：同机位截图、实际键盘走入洞窟和故事入口检查。

## 验证

- 内容校验、TypeScript、生产构建通过。
- 3D规则测试149项通过，包括新增4项地面衔接检查。
- 4205/4206四组相机位置严格相同；4206实际沿台阶进入内室、故事开始和退出通过；无脚本错误。
- 共享浏览器回归36项通过（桌面Chrome、移动Chrome、WebKit）；日志`work/world/mogao-v004-shared-e2e.log`。
- WebKit 844×390横屏加载新版外立面和原内室通过，无脚本或资源错误；仅为浏览器模拟，不代表实机性能验收。

本轮只调整指定外立面与接地。美术效果以用户网页验收为准；未扩展自然资产或修改角色、内室与小游戏。
