# 独立自然环境样片 v001 交付记录

日期：2026-10-31。仅 A 型树、低矮灌木、连续沙丘。状态：**候选已交付，视觉尚未达到全部概念图标准，停止扩展，待用户决定。**

- 可操作预览：[localhost:4188](http://localhost:4188/)
- 验收图册：[同机位对照与模型三视图](http://localhost:4188/review.html)
- 同 Wi-Fi 横屏预览：[192.168.1.116:4188](http://192.168.1.116:4188/)
- 原 4186 试玩页、正式资源和 AGENTS.md 保持原样；没有批量替换地图。

## 实际完成与视觉判断

| 项目 | 当前模型 | 与概念图仍有的差距 |
| --- | --- | --- |
| A 型树 | 4.8米高、4.05米宽、2.694米深；有锥度的弯曲主干、连续分叉；叶冠由有前后厚度的定向枝簇组成，使用实际圆钝叶形网格，无球体/二十面体叶团 | 近看仍有薄叶片插叠感，部分末枝节律规则；侧面比设定板偏窄，叶冠整体疏密、木质转折和细部概括仍不足 |
| 灌木 | 0.64米高、1.5米宽、1.019米深；贴地横向展开，叶层覆盖大部分木杆，独立设计，不是缩小树 | 局部叶形重复、叶片扁平感仍较强；比参考图的细碎自然边缘简化 |
| 沙丘 | Blender制作的单一连续网格；100×35米、最高8.55米；不同长度、错位沙脊与相连谷地；通过GLB加载 | 独立斜视能读出错位脊线，但真实第三人称低位仍偏平；前后大坡的层次和明暗分区仍明显低于W01/W02，不能以“消除了尖刺”判定通过 |

**本轮未证明三项都达到参考图标准，尤其不建议把沙丘扩大到整张地图。** 已停止继续加叶、增加山块或扩展变体。若用户决定更换制作方式，建议仍按已确定的 Blender → GLB 路线，将造型主导改为人工控制网格/雕刻与逐视角修形；树冠先由美术设计完整体块与叶簇轮廓，再用有限实例化叶形完成；沙丘逐条塑造脊线、坡面、谷地，脚本仅辅助重复、导出和检查。继续调整随机参数或增加面数不能替代这一步。

## 样片形成过程中的有效检查

- 首版树冠有明显成排薄片感，改为三维交错叶向、衔接上冠和前后肩部；灌木压低木杆并覆盖基部。正、侧、斜视均逐张查看，当前不足如上表。
- 首版三条沙脊等长、近乎平行，外观像折布，已改为错位长度和自然收尾。
- 网页低位仍偏平，实测发现远脊坡面抬高了相邻谷地。只将远脊迎风坡有效宽度从18.5米收至12米，保留总高、长度与其他脊线；没有抬单个顶点。
- 实际网格射线测量：x=0远/中谷相对较低山脊落差约1.316米，x=17约3.084米；但x=0近/中谷仍只有0.281米，解释了部分低位视角层次不足。记录见沙丘manifest。
- 预览曾漏隐藏GLTF多材质树冠父组，造成旧树冠悬空叠在新树上；已改为按完整语义根节点控制，新版14个视图中旧自然物根节点可见数均为0。

## 预览的隔离与取景

独立入口复用现有 Three.js 渲染版本、暖光、49°透视镜头、曝光1.08和游戏道路布局，加载旧院落作为只读参照。单独模型视图关闭雾便于观察；场景视图沿用原雾参数，未增加光源或后处理。旧版按钮在同一镜头下切换可见性，不改变相机。

道路按用户纠正，理解为**不规则铺石板路**。独立预览沿既有中心线/路宽增加石板取景参照，旧新对照共用；正式道路脚本、路线、建筑结构未修改。此道路表现不作为本轮新增正式道路资产验收。

本页有14个观察视图，含道路旁树/灌木、正侧斜及近远树形、沙丘两处第三人称视角与模型侧/斜视。仅道路/沙丘行走视图提供WASD及Q/E；固定观察机位便于重复比较。预览不写正式游戏存档。

## Blender、模型及资源清单

本轮新增文件如下，既有正式文件没有修改：

| 路径 | 用途 |
| --- | --- |
| `art-source/world/models/environment-sample/v001/vegetation.blend` | A树、灌木独立集合的源工程 |
| `art-source/world/models/environment-sample/v001/dunes.blend` | 连续沙丘源工程 |
| 同目录 `vegetation-manifest.json`、`dunes-manifest.json` | 真实尺寸、面数、哈希、方法及限制 |
| `public/assets/world/environment-sample/v001/tree-a.glb` | 树运行候选 |
| 同目录 `shrub-a.glb`、`dunes.glb` | 灌木与沙丘运行候选 |
| `scripts/build-world-environment-vegetation.py` | 受控枝网/叶簇、Blender导出和截图 |
| `scripts/build-world-environment-dunes.py` | 独立沙丘控制面、Blender导出与截面测量 |
| `environment-preview.html` | 独立网页入口 |
| `src/world/environment-preview.ts`、`environment-preview.css` | 样片加载、同机位比较与观察界面 |
| `scripts/build-environment-preview.mjs` | 独立构建，仅复制所需5个GLB |
| `scripts/serve-environment-preview.mjs` | 独立4188静态服务 |
| `scripts/verify-environment-preview.mjs` | 实际网页检查与截图 |
| `scripts/prepare-environment-review.mjs` | 真实截图图册，不修改截图内容 |
| `docs/environment-sample-workplan.md`、本文 | 本轮约定及交付 |
| `outputs/environment-preview/v001/` | 独立构建和验收图册；未纳入Git的历史outputs不自动提交 |

截图在`work/world/environment-sample-v001-*`，最终截图复制到独立预览目录。Blender：tree/shrub的front、side、oblique及dunes的overall、low、side；网页：web前缀14视图，before前缀8组同机位对照。

| 资产 | GLB三角面 | GLB字节 | Mesh / 材质 |
| --- | ---: | ---: | --- |
| tree-a | 17,358 | 499,916 | 3 / 6 |
| shrub-a | 3,720 | 116,100 | 2 / 5 |
| dunes | 4,404 | 428,824 | 1 / 1 |

树木低处0–2.1米范围实测最大水平半径0.944353米，独立预览使用0.97米保守碰撞半径。叶片合并为少量网格批次，没有每片叶子独立实时灯光或物理。

## 验证结果

- TypeScript、正式内容校验通过；原214项规则测试通过。
- 独立Vite构建成功，不运行主项目build、不覆盖`outputs/web`。
- 真实Chromium检查14个视图、8组旧新相机坐标/FOV一致对照；移动和松键停止、横屏布局、GLB失败提示/重试均通过。
- 22个受保护文件哈希未变，包括AGENTS.md、正式地图源码、道路、旧GLB/Blender、小游戏源码和4186页面入口。
- 一次本机运行：加载约194ms，首轮资源传输10,164,761字节（含旧建筑等参照），120个帧间隔样本中位/P95约16.7ms。不是实际手机性能验收。
- 道路场景实测522次绘制调用，含旧建筑参照及阴影通道；树独看15、灌木独看11、沙丘独看3。`renderer.info.render.triangles`含阴影通道，不能与GLB唯一三角面混为一谈。
- 最终报告：`work/world/environment-sample-v001-verification.json`，`artApproval`明确为`pending-user-review`。

重开方式：`node scripts/serve-environment-preview.mjs`。重建独立输出：`node scripts/build-environment-preview.mjs`；重新截图：`node scripts/verify-environment-preview.mjs`；生成图册：`node scripts/prepare-environment-review.mjs`。
