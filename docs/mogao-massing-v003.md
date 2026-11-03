# 莫高窟整山体量修整 v003

用户进一步指出v002左右两条深色折线裂缝过于相似，并询问当前材质是否最终版。明确当前为统一哑光底色，尚未进行整山UV和烘焙。

本版保留v001、v002及已验收样块。沿用v002独立上下层轮廓，只将两条长而深的折线切口，替换成左侧短浅裂隙和右侧岩台边缘崩缺。使用真实几何与自然阴影，无新增黑色贴花。

目录沿用既有约定：源工程`art-source/world/models/mogao-massing/v003/`、GLB `public/assets/world/mogao-massing/v003/`、构建`outputs/mogao-massing/v003/`、对应脚本/网页采用v003后缀；上下层轮廓仍复用`scripts/mogao-massing-profiles-v002.py`。日志与截图放`work/world/mogao-massing-v003-*`。页面对比按钮在固定相机下切换v002和v003。

45米楼体、1.8米人物、25:1比例以及六组岩体和现有地图边界继续保持。正式地图、原资源、洞窟故事和碰撞未接入或改动。本次只交付整山体量方向验收，不进入整山烘焙阶段。

## 检查中修正

- 导入旧Blender源工程时，按`tower-`前缀筛选会误纳入用于开槽的`tower-recess-*`辅助块。本版排除`constructionOnly`对象，保留真实楼体构件，避免辅助块遮住门窗。原v006文件不变。
- 布尔切削暴露的岩面统一指定砂岩底色，台基切面指定原石阶材质，避免空材质槽。
- 网页阴影范围和偏移按127米山体尺度设置，减少大平面自阴影条纹；保留游戏原有灯光方向、颜色、强度与曝光。未增加雾或后处理。
- “人物视角”允许向上观察并保持人物在画面中；前后对比按钮只切换山体，不改变机位。

## 当前阶段的差距

本版仍是体量模型。大断面的表面风化、岩台崩边、细层理、矿物色差和整山UV/法线/AO烘焙尚未制作，因此观感仍比已验收的独立岩块平整、概括。当前不宣称已达到最终砂岩材质效果。

## 交付与验证结果

- 网页：`http://localhost:4212/`；正面、左斜侧、右斜侧、背面、人物视角；可切换修改前v002/修改后v003，机位保持一致。
- 山体实体约127米宽，最高57.7998米；六组主要岩体与基体几何合并。主体6116个三角面、一个基础材质；闭合边界0、非流形边0。网页另含山脚积沙。
- 九层楼平台面以上实测45米；平台海拔6.8555米另计。人物Idle姿势实例实测1.8米，比例25:1。源人物GLB未修改。
- `npm run typecheck`、独立Vite构建、Blender几何审计及Chrome网页检查均通过。五机位截图、同机位切换、模型显隐、标尺、旋转缩放、小横屏布局均完成；未记录网页运行或资源错误。
- 旧山体/内室/人物/已验收样块及v001、v002源工程哈希保持不变。网页不写游戏存档、不加载正式地图。
- 关键结果文件：`work/world/mogao-massing-v003-verification.json`、`work/world/mogao-massing-v003-geometry-audit.json`；模型清单：`art-source/world/models/mogao-massing/v003/export-manifest.json`。
- 实际网页截图：`work/world/mogao-massing-v003-web-front.png`、`-web-left.png`、`-web-right.png`、`-web-back.png`、`-web-third.png`；对应前版同机位：`-before-front.png`、`-before-right.png`。Blender视图为`-blender-front.png`、`-blender-oblique.png`、`-blender-side.png`。

视觉状态：用户于2026-11-01确认“可以，继续吧”，进入`docs/mogao-sandstone-v001.md`所述独立整山材质制作。此体量版本和正式地图继续保留。
