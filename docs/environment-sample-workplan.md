# 独立自然环境样片 v001 工作约定

本轮依据用户最新批准，仅制作 A 型树、低矮横展灌木、连续沙丘，待视觉验收。不是正式地图更新。

## 目录与隔离

沿用现有 AGENTS.md 的模型、脚本、运行资产、工作截图及交付目录规范；不直接修改 AGENTS.md。本文件登记本轮具体路径，不改变原规范。

- `art-source/world/models/environment-sample/v001/`：独立 `.blend`、资产导出登记；原模型及旧资源保持原样。
- `public/assets/world/environment-sample/v001/`：独立树、灌木、沙丘 GLB；不加入正式地图资源索引。
- `scripts/build-world-environment-vegetation.py`、`scripts/build-world-environment-dunes.py`：本轮 Blender 辅助建模及导出。控制点和造型有明确设计，不沿用旧随机尖峰或二十面体堆叠规则。
- `environment-preview.html`、`src/world/environment-preview.ts`：独立网页预览入口；仅导入所需既有模块/资源，不修改主游戏入口及正式地图构造。
- `scripts/build-environment-preview.mjs`、`scripts/serve-environment-preview.mjs`：独立构建与本地预览；不重建或覆盖 `outputs/web`。
- `scripts/prepare-environment-review.mjs`：将实际 Blender / 网页截图复制到独立交付目录，生成验收图册；保留原截图，不重绘或修饰图像。
- `outputs/environment-preview/v001/`：用户可浏览的独立构建。
- `work/world/environment-sample-v001-*`：模型检查、截图、对照与临时日志。不得自动清理旧文件。
- `docs/environment-sample-v001.md`：实际交付、测量、截图、差距与修改清单。

## 已批准范围

1. A 型树先设计正侧面整体轮廓、锥形弯曲主干与主分叉，再制作有疏密变化的叶团；不能把42个多面体减少成几个多面体当作完成。
2. 灌木独立设计为贴地横展簇，安置地面，不放岩顶；样片不使用尖刺草。
3. 正式自然地形统一由 Blender 保存 `.blend` 并导出 GLB。Three.js负责加载、组合和运行，不生成本轮沙丘主要几何。远山和砂岩留待本次三项初步验收后。
4. 道路为不规则铺石板路；预览保留既有路线、建筑结构。原运行版尚是平色路带，预览中只可在同一路线展示石板设计，不改正式道路代码、布局或资源。
5. 不修改角色资产、小游戏、正式建筑、正式地图；不覆盖或删除已有资源，不修改旧 createRidgeGeometry 代码。已有模型仅加载作只读环境参照。
6. 预览前后对照使用相同相机、光照、曝光；提供模型正侧斜视、道路旁第三人称及近远视图，清楚披露剩余差距。
7. 导出与测试通过仅代表技术有效；美术通过由用户确认。若小样仍明显低于参考，停止扩展，不批量生成。

## 验证

保存受保护文件的哈希基线；检查实际 GLB 拓扑/材质/尺寸、Blender截图与网页近远侧面结果；独立预览构建与浏览器交互/加载失败反馈验证。记录面数、绘制次数、加载与帧间隔。旧网页入口及受保护资源的哈希应保持不变。

## v002 定向造型修整（用户已批准）

仅继续同三项独立样片。树冠与灌木采用饱满、横展、云团般的封闭体块，直接设计正、侧、斜侧轮廓和向下包裹的冠缘；取消薄叶片作为主外形，不以增加随机参数或随机叶片数量修补。树干及分叉与冠内体积连接。沙丘直接修整既定脊线、谷底、迎光/背光坡面朝向与坡度，使用同一真实网页光照检查明暗，不能靠新灯光或后处理掩盖。

- 新模型源工程及登记：`art-source/world/models/environment-sample/v002/`。
- 新运行资产：`public/assets/world/environment-sample/v002/`；v001 源工程、GLB、脚本与交付截图保留。
- 新建模与预览脚本使用 `-v002` 后缀；入口为 `environment-preview-v002.html`、`src/world/environment-preview-v002.ts`，沿用现有样片样式与只读运行组件。
- 独立构建至 `outputs/environment-preview/v002/`，端口4189；4188的v001和4186正式游戏均保留。
- 检查与截图为 `work/world/environment-sample-v002-*`，报告为 `docs/environment-sample-v002.md`。
- 版本对照为上一版独立样片v001与本次v002，固定相机、模型位置、光照、曝光及道路；至少检查树正/侧/斜、道路树与灌木、沙丘第三人称及斜侧。
- 不扩展变体、远山、崖壁或正式地图；本轮继续待用户视觉验收，不自动清理旧文件，不修改AGENTS.md。

### v002 用户中途造型纠正

用户看过首个封闭冠体候选后指出：整块云罩不像树、缺层次且裸枝过多。树冠改为由各主要/次要枝头承接的小云状叶团层层叠成，明确设计每团大小、高低和前后遮挡，保留叶团之间的视觉边界，不融合成整体光滑罩子。下层叶团向分枝内侧和下方包裹，减少上半部裸枝，只保留主要分叉。灌木同样使用贴地叠层的饱满叶簇，避免单块枕形体。所有候选图按序号保留；此纠正优先于先前“连续冠体”的实现选择。

## v002 视觉验收结果

2026-10-31，用户明确确认“这下可以了”。A型树、低矮灌木与连续沙丘的本次造型方向通过视觉验收。以后以枝头云状叶团层叠、饱满贴地灌木和阳背光分明的连续沙丘为基准。已确认文件的SHA256登记于 `docs/environment-sample-v002-acceptance.md`；本次确认不修改正式地图或现有资产。

## v003 植被变体阶段（验收后继续）

用户在确认v002后要求继续。下一批独立预览制作B型矮树、C型倾斜树，以及两种不同轮廓的贴地灌木；以原方案的三种基础树形为目标，A型和已确认灌木/沙丘只读复用。不靠对A型整体缩放旋转冒充新树形，树干分叉及叶团组合分别设计。云状叶团层叠、饱满和少露细枝的风格保持一致。

- 新源工程与登记：`art-source/world/models/environment-sample/v003/`；树和灌木各自独立 `.blend`。
- 新模型：`public/assets/world/environment-sample/v003/tree-b.glb`、`tree-c.glb`、`shrub-b.glb`、`shrub-c.glb`。
- 脚本：`scripts/build-world-environment-trees-v003.py`、`scripts/build-world-environment-shrubs-v003.py`；允许新增无副作用的 `scripts/environment-cloud-forms.py` 复用已确认叶团造型函数，禁止直接执行旧构建脚本而覆盖旧版本。
- 预览入口：`environment-preview-v003.html`、`src/world/environment-preview-v003.ts`，沿用现有预览样式，增加三种树形/灌木并排及同路旁机位切换。
- 构建、服务、验证、图册脚本采用 `-v003` 后缀；独立输出至 `outputs/environment-preview/v003/`，端口4191（4190触发客户端受限端口检查，改用普通可用端口，不绕过检查）。旧三个服务保持原样。
- 截图与测量：`work/world/environment-sample-v003-*`，交付报告：`docs/environment-sample-v003.md`。
- 检查正、侧、斜侧轮廓、枝团连接、同机位道路尺度、真实网页表现、加载与交互。首次交付的新资产保持待验收，不把v002通过自动延伸到新资产；后续确认按下方验收结果分别记录。
- 本阶段不修改正式地图、文化建筑、小游戏、AGENTS.md或已批准的模型，不批量布置树木；远山、崖壁仍按分项样片继续，不与本批植被混在正式地图中一次替换。

### v003 灌木验收结果

2026-10-31，用户明确确认“现在灌木挺好了 不用改了”。当前B/C灌木通过视觉验收，保持现有厚度和轮廓，无需继续加厚或修改；A灌木仍沿用v002已确认基准。B/C树未获得本次确认，继续保持待验收。

本次仅收尾验收记录、图册及独立预览的验收文字：树A已确认，树B/C待验收；灌木A/B/C均已确认。不修改模型、场景、灯光或动作，不自动进入正式地图替换。当前灌木GLB及源工程的SHA256登记于 `docs/environment-sample-v003-acceptance.md`；生成时的技术报告、manifest及截图保留为交付记录，以该文件的后续验收状态为准。
