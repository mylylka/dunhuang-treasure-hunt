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
