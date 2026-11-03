# 院墙装饰与颜料架 v006 验收记录

2026-11-02。预览 http://localhost:4222/#/ ，厅前入口 http://localhost:4222/?view=hall#/ ，同一Wi-Fi手机 http://192.168.1.116:4222/#/ 。本轮只调整3D漫游。

## 完成内容

1. 两条左廊帘子改为浅石青蓝，保留原布料形状，与朱红柱分开。
2. 用户`调料架.glb`整体等比规范为高1.5米（含顶部毛笔）、宽1.449米、深.514米。脚底贴地，正面朝院内，放在原展示板旁，二者边缘净距.800米；设置独立人物和镜头碰撞。来路双向可走。
3. 前翼与侧墙的墙脚、墙帽统一截面和高度，以45度斜接相连；四处角部接点无间隙、顶部无重叠表皮。退役8项旧相机代理，改用新构件实测边界。
4. 两面入口翼墙内侧增加与侧墙同色同高的深绿色细条。
5. 门外两翼旧方形花片移除，换成用户图扩绘的连续莲花纹。每幅8.2×1.498803米，完整运行图等比映射，没有镜像或二次拉伸，避开门柱的真实遮挡。原有门外岩石和沙坡保留。

已有方厅、通高、后墙莲花图、藻井处理、地形、角色与其他区域均沿用。

## 源文件和美术登记

- 新院落Blender：`art-source/world/models/courtyard/v005/courtyard.blend`。
- 新院落GLB：`public/assets/world/courtyard/v005/courtyard.glb`，10,440,416字节、134,956三角形。运行源与打包模型SHA256一致：`df2b1f4d7933f1a95990a6adf6b8f7ef651bd476bbc6957b48283c53b1ee6c2f`。
- 颜料架原GLB完整归档及独立规范化登记：`art-source/world/models/pigment-rack/v001/`。规范化阶段只添加根级等比变换，源99个网格、19材质和17张内嵌纹理保留。
- 外墙美术采用内置imagegen参考图编辑模式，依据用户本轮明确授权扩展同色调、同笔触的横向纹样。原图、生成候选、完整提示词和裁切登记存`art-source/world/courtyard-decoration/v001/`；运行图`public/assets/world/courtyard/v005/entrance-lotus-wide.jpg`为2172×397。
- 裁去生成画面的灰色辅助区及外装饰边带边缘，主体莲花、两侧延展纹样保留，不拉伸、不AI放大。完整生成候选保留，不将新增图样称作历史复原。

## 验证

- 内容校验、TypeScript、主项目构建、terrain v006独立构建通过。
- 全量规则测试53文件、427项通过，采用2个worker，原超时不变。
- 实际GLB加运行期扩院变换后的定向审计8项通过，覆盖帘色、架子尺寸/通路、两翼图比例/UV/遮挡、旧花片移除、绿条高度及转角斜接。
- 电脑实际生产网页15项通过，包括本轮颜料架碰撞/来路、已有厅堂通行/暂停/转镜头；脚本与资源错误0。
- 手机实际触屏5项通过，覆盖844×390、667×375布局、摇杆松手、高空切换、横竖屏清输入；脚本与资源错误0。浏览器检查串行执行。
- 首次电脑检查的旧650毫秒左廊移动断言未到达预期点，保持原阈值隔离复验通过；新增检查纠正了把1.8米/秒步行当作跑步的距离计算，并将截图点从既有工作台/岩石碰撞范围移到真实可走位置。最终完整断言全部执行通过。

报告：`work/world/hall-v006-report.json`、`terrain-mobile-v006-report.json`、`courtyard-v005-targeted-audit.json`。

## 实景截图

- `outputs/terrain/v006/hall-left.png`：两条石青蓝帘。
- `outputs/terrain/v006/pigment-rack-display.png`：颜料架、展示板与人物。
- `outputs/terrain/v006/courtyard-corner-east.png`和`courtyard-corner-west.png`：两边转角与绿色条。
- `outputs/terrain/v006/entrance-murals.png`：门外两翼整体。
- `outputs/terrain/v006/entrance-mural-west.png`和`entrance-mural-east.png`：两翼近景。

## 两种素材方式的token

合格GLB直接接入通常明显节省token：无需重新推断、编写和迭代几何，只检查尺寸、朝向、材质、复杂度、放置和碰撞。由参考图建模还要处理不可见背面、构件厚度、UV及造型反复核对。没有按这两种方式分项计量，不能给出可靠固定倍数；GLB文件MB数也不等于对话token数。本次颜料架已有完整模型与纹理，属于直接接入更省事的情况。
