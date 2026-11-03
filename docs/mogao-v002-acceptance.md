# 莫高窟独立样片 v002：短岩石洞口

2026-11-01。用户已认可室内，本轮仅修整主洞口及其衔接，不扩展故事或其他场景。以下均为游戏设计尺度，不是历史洞窟实测数据。

## 当前结果

- 入口由五块手工定义轮廓的砂岩组成，宽切面、略有错落；移除本样片主入口的木构门楼。背景窟檐和栈道保留。
- 通道进深由约10米缩为3米；洞口净宽约8米、净高约9米。岩石围边本体厚约2米，大部分嵌在崖体中，向外突出不足1米。
- 主室整体向前平移7米以衔接短洞口，保持用户已认可的24×30米平面、18米壁画高度与20米顶点。无中央柱，三壁UV裁切及深暖褐砂土地面不变。
- 三壁仍取原图连续的0—10033.33px片段，完整高度2150px，按30/24/30米分配。原12918×2150全卷保留在故事播放器中，没有覆盖或重绘母图。
- 增加洞口岩石碰撞；缩短入口对应的镜头碰撞和室内区域。崖壁布尔开口比通道壳体略宽，消除内壁共面闪烁；修正台阶外侧地面高度，人物不再在台阶旁悬空。
- v001的GLB、Blender工程与4202静态预览保留。角色、已确认建筑和原小游戏资产未修改。

## 预览与截图

- 新版试玩：`http://localhost:4203/?view=approach#/`
- 同机位前后对比：`http://localhost:4203/review.html`
- 短洞口：`http://localhost:4203/?view=passage#/`
- 已认可室内：`http://localhost:4203/?view=interior#/`
- 旧版：`http://localhost:4202/`

真实网页截图位于`work/world/mogao-v002-web-{approach,entrance,entrance-side,passage,interior,side}.png`。入口改前/改后的相机位置及目标一致，记录在`outputs/mogao/v002/review/cameras.json`。Blender模型图为`work/world/mogao-v002-blender-matched-approach.png`，使用相同相机位置和49度垂直视角；Blender与网页灯光不同，审美以真实网页为准。

## 资源与实现

| 用途 | 文件 |
| --- | --- |
| 可编辑Blender工程 | `art-source/world/models/mogao/v002/mogao.blend` |
| 导出登记 | `art-source/world/models/mogao/v002/export-manifest.json` |
| 外部与内部模型 | `public/assets/world/mogao/v002/exterior.glb`、`interior.glb` |
| Blender建模导出 | `scripts/build-world-mogao-v002.py` |
| Blender同机位图 | `scripts/render-mogao-v002-comparison.py` |
| 布局、碰撞、相机 | `src/content/world/mogao-layout-v002.json`、`src/world/mogao-rules-v002.ts`、`mogao-camera-v002.ts` |
| 独立入口 | `mogao-v002.html`、`src/world/mogao-preview-v002.ts` |
| 构建、服务、对比页 | `scripts/build-mogao-v002.mjs`、`serve-mogao-v002.mjs`、`build-mogao-v002-review.mjs` |
| 自动验证 | `tests/world/mogao-v002.test.ts`、`scripts/verify-mogao-v002.mjs` |

共用运行器按`data-mogao`版本选择布局与GLB，普通入口不启用新区域。新版本会话键为`dunhuang:mogao-preview:v2`，旧存档不迁移。

外部89,284三角形/17材质批次，内部3,178三角形/8批次。内部约15.2MB包含壁画和烘焙PBR贴图；网页统计还包含旧世界与阴影绘制，不等同于本区域预算。未引入依赖。

## 验证记录

- `npm run build`：内容校验、TypeScript和生产构建通过。
- `npm run test`：最终33个文件、302项全部通过。首次全量运行与共享任务并发时，找物抽样测试曾超时；保持原阈值，在空闲后隔离复验15项通过，再全量复验302项通过，未更改或绕过该测试。
- 两版莫高窟规则测试：12项通过，涵盖全路宽、登阶、厅内绕行、早期提示、相机约束、独立会话及台阶侧面高度。
- `verify-mogao-v002.mjs`：桌面真实穿行、故事冻结/空格跳过/二选一/返回与刷新、资源失败重试、离开清理，以及WebKit手机横竖屏均通过；无页面异常。
- 旧世界桌面浏览器回归：12项通过。使用独立输出目录，未覆盖其他任务的测试产物。
- 旧版与新版GLB均按各自导出登记核验；既有已跟踪美术资产无更改。
- 详见`work/world/mogao-v002-{rules,verification,old-world-e2e,production-build,unit-tests}.log`与验证JSON。

## 仍待后续验收

本次交付是入口造型修订，不自动代表用户已通过美术验收。岩石使用概括大面，尚未添加密集风化裂隙；保留这种程度由用户视觉判断。故事播放器仍是两段技术预览，六段完整故事与正式配音属于后续工作。

## 重建

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --python scripts/build-world-mogao-v002.py
node scripts/build-mogao-v002.mjs
node scripts/serve-mogao-v002.mjs
```

浏览器与Blender重负载验证串行执行；不要自动删除`work/`、旧版资源或旧构建。共享仓库内另有找物玩法任务，不能用整目录暂存或回退处理它的改动。
