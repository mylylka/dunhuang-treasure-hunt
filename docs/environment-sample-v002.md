# 独立自然环境样片 v002

本轮只修整 A 型树、低矮灌木及一组沙丘。状态为待用户视觉验收；不扩展树木变体、远山、崖壁，不接入正式地图。

## 查看

- 本版预览：http://localhost:4189/
- 同机位前后图册：http://localhost:4189/review.html
- 上版保留：http://localhost:4188/
- 原游戏预览：http://localhost:4186/

图册中的“修改前”是上一版独立环境样片 v001，不是更早的正式地图树木。模型摆放、14 个相机位置、太阳光、环境光、曝光、色调映射和雾设置均沿用上一版。道路仍为独立预览中的不规则石板路。

## 本轮制作方法

植被按用户中途纠正采用枝端承接的多层云状叶团：先设计大团位置、大小和前后高低，再让下层叶团包裹分枝，形成整体宽冠。每个叶团具有封闭体积，避免薄片主导外形；保留团与团之间的遮挡边界。灌木采用贴地交叠叶簇。第一候选的整块罩状树冠被否定，候选截图仍保留于 work/world。

沙丘不再将多条坡面的高度包络相加。直接设计不等长的弧形/S形脊线、宽谷底和迎光/背光坡面的横截面，在 Blender 中建立连续闭合网格。主背光坡改变朝向，让固定网页镜头能看见它与阳面的区别；沙材质使用单一底色，不靠深浅色块假画阴影。

以上是通过 Blender Python 写入明确设计控制点、编辑网格和自动导出的制作流程，不宣称使用鼠标手工雕刻。`.blend` 保留可编辑的真实网格；Three.js 只加载模型及组织预览，不生成这三项资产的主体几何。

## 最终候选与剩余差距

| 资产 | 宽 × 深 × 高 | 三角面 | GLB 字节 |
|---|---|---:|---:|
| A型树 | 5.15 × 4.15 × 4.80m | 17,658 | 344,340 |
| 灌木 | 1.65 × 1.25 × 0.68m | 7,200 | 142,984 |
| 沙丘 | 100 × 35 × 9.4m，含地下0.35m封底 | 4,110 | 226,564 |

树冠由12个云状叶团组成，正面和侧面都可读出上、中、下层及前后遮挡；下冠最低约2.1m，遮住多数细枝，仅保留主要分叉。灌木为6个贴地交叠叶团。两者近看仍偏光滑、概括，缺少原设定板的细小叶簇和冠缘变化；这轮交付用于确认用户最新指定的云冠审美方向，不声称已完全达到原设定板。

沙丘在相同网页光照下已可区分亮坡与背光坡，主丘与两侧形成高低错落。低机位仍主要呈现一座主丘，部分谷底被前坡遮挡；近景三角切面较明显，连续起伏的节奏比概念图简化。模型使用单一哑光材质，未烘焙或涂画阴影，也没有新增灯光、雾或后处理。

网页截面对照和固定场景信息记录于 `work/world/environment-sample-v002-verification.json`；视觉判断记录于 `work/world/environment-sample-v002-visual-review.json`。本轮不再扩展资产，等待用户验收。

## 已完成验证

- 类型检查、内容校验通过，22个测试文件的214项规则测试通过。
- 独立 Vite 构建成功，输出仅写入 v002 预览目录。
- 14个网页视图全部拍摄 v001/v002 对照；相机、光照、雾、资产摆放逐项相同，相机也与上一版已交付记录一致。
- 6个前后版本 GLB 的网页实际响应与磁盘文件逐字节一致；页面无报错、加载失败可重试，行走松键停止，844×390布局无横向/纵向溢出。
- 86个受保护文件的SHA256保持不变，覆盖正式资源、代码、AGENTS.md、v001源工程和预览构建。
- 本机Chrome采样120帧，帧间隔中位/P95均约16.7ms；首次传输约10.9MB，包含前后两版和原场景参照。此数据不是手机实机性能结论。

技术验证通过不等于美术验收通过。没有重建或覆盖正式 `outputs/web`。

## 文件清单

| 用途 | 路径 |
|---|---|
| 植被源工程、规格 | `art-source/world/models/environment-sample/v002/vegetation.blend`、`vegetation-manifest.json` |
| 沙丘源工程、规格 | `art-source/world/models/environment-sample/v002/dunes.blend`、`dunes-manifest.json` |
| 三项运行资产 | `public/assets/world/environment-sample/v002/tree-a.glb`、`shrub-a.glb`、`dunes.glb` |
| Blender 辅助脚本 | `scripts/build-world-environment-vegetation-v002.py`、`scripts/build-world-environment-dunes-v002.py` |
| 独立预览入口 | `environment-preview-v002.html`、`src/world/environment-preview-v002.ts` |
| 构建与服务 | `scripts/build-environment-preview-v002.mjs`、`scripts/serve-environment-preview-v002.mjs` |
| 检查与图册 | `scripts/verify-environment-preview-v002.mjs`、`scripts/prepare-environment-review-v002.mjs` |
| 输出 | `outputs/environment-preview/v002/` |
| 截图与测量 | `work/world/environment-sample-v002-*` |

不修改 AGENTS.md、正式地图/建筑/小游戏代码；不覆盖 v001 的 Blender、GLB、脚本、截图或预览构建。受保护文件逐项核对 SHA256。模型只在独立 4189 服务中展示。

## 重建

运行 `scripts/build-world-environment-vegetation-v002.py` 与 `scripts/build-world-environment-dunes-v002.py` 需要本机 Blender。植被候选导出参数见脚本头；无需安装新依赖。

```sh
node scripts/build-environment-preview-v002.mjs
node scripts/serve-environment-preview-v002.mjs
node scripts/verify-environment-preview-v002.mjs
node scripts/prepare-environment-review-v002.mjs
```

浏览器截图必须在预览构建完成且服务运行后拍摄；图册脚本要求最终截图、技术检查及视觉检查记录齐全，缺失即报错。
