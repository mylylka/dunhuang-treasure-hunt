# 植被变体独立样片 v003

用户确认v002三项样片后要求继续。本轮完成B型矮紧凑树、C型倾斜偏冠树，以及两种新灌木。用户随后明确确认“现在灌木挺好了 不用改了”：当前B/C灌木已通过视觉验收，无需继续加厚或修改；B/C树仍待确认。A型树、A灌木和沙丘以已确认文件只读复用，正式地图未修改。

## 查看

- 图册：http://localhost:4191/review.html
- 三种树原尺寸并排：http://localhost:4191/?view=tree-lineup
- 三种灌木原尺寸并排：http://localhost:4191/?view=shrub-lineup
- 道路旁树形切换：http://localhost:4191/?view=road-tree&tree=b
- 道路旁灌木切换：http://localhost:4191/?view=shrub-road&shrub=b

左A为已确认基准，中B、右C为本轮变体；灌木A/B/C均已确认，树B/C仍待确认。19个视图包含正面、侧面、斜侧面、近远景、道路旁和并排展示。原有机位、日光、曝光、雾和道路均保持一致；并排视图保持模型原尺寸，不逐个放大到相同高度。

本次只更新验收文档、图册和独立预览的验收文字，不改模型、场景、灯光或动作。截图摄于灌木确认前，截图、manifest及技术报告中的旧“待验收”标签保留为交付时记录；当前状态以 [v003验收记录](environment-sample-v003-acceptance.md) 为准。

## 造型与资产

| 新资产 | 造型区别 | 宽×深×高（米） | 三角面 | GLB字节 | 材质绘制批次 |
|---|---|---|---:|---:|---:|
| Tree B | 低处分出粗主枝、低重心、9组紧凑叶团 | 3.90×3.17×3.30 | 12,154 | 292,536 | 3 |
| Tree C | 连续倾斜主干、较小回枝、11组向一侧偏重的叶团 | 4.80×3.78×4.30 | 15,048 | 357,520 | 3 |
| Shrub B | 6组低矮横展叶团，左重右低 | 1.90×1.10×0.50 | 7,200 | 174,844 | 1 |
| Shrub C | 6组双肩和前后错层叶团，整体较紧凑 | 1.30×1.20×0.85 | 7,200 | 174,864 | 1 |

两种树各自重新设计连接枝图，两种灌木各自重新设计组合；没有导入A再整体缩放旋转冒充变体。叶团局部形状复用已确认v002的确定性控制点和曲面函数，不新增随机参数。

Blender源保留分开的叶团和枝图，导出时对副本按材质合并，保持几何和法线。树根小凸点及灌木C侧面悬空问题已在网页检查前修整。前期候选图保留于work/world，不覆盖已确认v002。

本轮保持用户已确认的概括云状叶团，不重新改成逐叶薄片。B/C灌木的现有高低、厚度和轮廓已获确认，保持当前文件；B/C树的树形差异及整套风格仍待用户确认，灌木通过不自动等于树通过。

## 验证

- TypeScript、内容校验、22个测试文件的214项规则测试通过。
- 独立构建成功，只写入v003目录；旧4186、4188、4189服务保留。
- 拍摄43个网页画面，其中24组B/C与A的比较核对了相同机位、光照、雾和模型摆放。保留视图的机位也与v002交付记录一致。
- 7个环境GLB的网页实际响应与源文件逐字节一致，原地图自然节点始终隐藏，无网页报错。
- 加载失败重试、松键停止、844×390和390×844布局通过；工具栏控件检查未被裁切。
- 152个受保护文件SHA256不变，包括已验收的Blender/GLB、旧预览构建、正式地图代码与AGENTS.md。
- 本机Chrome120帧采样的帧间隔中位16.7ms、P95约16.8ms，首次传输约10.8MB（含A/B/C、原场景参照）；不作为手机实机性能结论。

低树的行走碰撞包含2.1米以下的封闭叶团。比较页使用三树低位包络的共享边界，切换树形时无需移动相机和当前位置；对完整道路的3762个采样均通畅，计入行走半径后的最小余量约0.49米。这是独立比较页的碰撞，不修改正式世界碰撞文件。

首次验证修正了诊断数组顺序的比较方式，并发现4190触发Node受限端口检查；最终服务使用4191，没有绕过端口检查。失败记录保留，最终验证记录为 `work/world/environment-sample-v003-verification.json`。

## 文件清单

| 用途 | 文件 |
|---|---|
| 已通过基准的验收记录 | `docs/environment-sample-v002-acceptance.md` |
| 本轮灌木验收记录 | `docs/environment-sample-v003-acceptance.md` |
| B/C树源工程与登记 | `art-source/world/models/environment-sample/v003/trees.blend`、`trees-manifest.json` |
| B/C灌木源工程与登记 | `art-source/world/models/environment-sample/v003/shrubs.blend`、`shrubs-manifest.json` |
| 新运行模型 | `public/assets/world/environment-sample/v003/tree-b.glb`、`tree-c.glb`、`shrub-b.glb`、`shrub-c.glb` |
| 共享造型函数 | `scripts/environment-cloud-forms.py`（导入无构建副作用） |
| Blender构建 | `scripts/build-world-environment-trees-v003.py`、`scripts/build-world-environment-shrubs-v003.py` |
| 独立预览 | `environment-preview-v003.html`、`src/world/environment-preview-v003.ts`、`src/world/environment-preview-v003.css` |
| 构建与服务 | `scripts/build-environment-preview-v003.mjs`、`scripts/serve-environment-preview-v003.mjs` |
| 验证与图册 | `scripts/verify-environment-preview-v003.mjs`、`scripts/prepare-environment-review-v003.mjs` |
| 交付目录 | `outputs/environment-preview/v003/` |
| 截图、模型检查、技术记录 | `work/world/environment-sample-v003-*` |

树源工程默认显示B，C保存在独立可编辑集合内；灌木源工程将两种模型分开放置，导出时各自回到地面原点。GLB统一米制、Y向上。

```sh
node scripts/build-environment-preview-v003.mjs
node scripts/serve-environment-preview-v003.mjs
node scripts/verify-environment-preview-v003.mjs
node scripts/prepare-environment-review-v003.mjs
```

没有变更AGENTS.md、已确认资产、小游戏或正式建筑结构。本轮也未制作远山/崖壁或批量替换正式地图。
