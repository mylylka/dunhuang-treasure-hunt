# 藻井梁边闪烁修复 v002

用户反馈抬头转向时横梁边缘普遍闪烁。本次仅修复藻井接缝几何，保留15.2米外框、2.43米总深度、五层高差、安装位置、彩绘UV和独立可更换的三兔原图。原v001模型、Blender及terrain/v008输出均保留。

## 原因与修复

v001五圈金色外饰条套在主梁内部，外立面与主梁完全共面；实际GLB有112对正面积重叠三角，面积共10.931277平方米。内饰条同样穿插，只有很窄的边露出。

v002每圈改为单一闭合实体：木梁侧面、金色倒角、彩绘底面共享边界顶点，取消套叠饰条。保留真实梁厚；金边为35毫米宽、25毫米高的实体倒角，不采用渲染顺序或深度偏移掩盖重叠，也未调整全局阴影。

432根红绿木条保持原数量、颜色及承托高度，仅把端点平面承托长度增加0–60毫米，确保端截面四角全部进入相邻梁框。相机代理范围与旧版一致。

## 文件

- 构建：`scripts/build-world-caisson-three-hares-v002.py`
- Blender：`art-source/world/models/caisson-three-hares/v002/three-hares-caisson.blend`
- GLB：`public/assets/world/caisson-three-hares/v002/three-hares-caisson.glb`
- 尺寸、安装和中心换图：`src/content/world/caisson-three-hares-v002.json`
- 预览：`outputs/terrain/v009/`，启动`node scripts/serve-terrain-v009.mjs`

模型47个语义网格、7,550个三角形，4,921,556字节。SHA256：`b1c54261689ccbd7a8cd362db78cff6d6d4afad0cd29d4647764e13e5a6383c4`。

## 定向验证

- 实际GLB五圈均闭合、绕向及法线正确，梁圈内正面积共面重叠为0。
- 432根木条共3456个端角全部埋入框内，最小平面/厚度余量5.129毫米，没有穿梁底。
- 结构仍四向对称，中心板9条向上检查射线首个命中仍为三兔图板。
- 一次TypeScript检查与独立v009构建通过。
- 网页1279×925，只在藻井下做抬头、持续转向和横移，检查9个视角帧；梁边不再出现原先红金面交替的碎点，脚本及资源错误为0。运动录屏为`work/world/caisson-v002-motion.webm`，几何独立审计为`work/world/caisson-v002-independent-geometry-audit.json`。
- 未运行全量测试、2D玩法或其他路线回归；未安装新依赖。

本地查看：http://localhost:4222/?view=caisson#/ 。旧页面刷新后加载v009。
