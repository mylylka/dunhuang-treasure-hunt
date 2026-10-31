# 用户提供人物模型接入 v001

用户于2026-10-31要求将人物换为 `/Users/liujing/Downloads/chibi character 3d model` 中的模型。本次授权允许接入该人物；已确认灌木保持原样，其他环境资产和正式地图布局不变。

## 文件与版本约定

沿用 AGENTS.md 的源素材、Blender、运行资源和工作文件规则，不修改 AGENTS.md，不覆盖已有模型。

- 用户原始 FBX 及配套 `.fbm` 贴图原样复制到 `art-source/world/traveler-tripo/v001/`，保留原文件名与 SHA256 登记。
- 转换工程及导出登记放 `art-source/world/models/traveler-tripo/v001/`；保留 `.blend`，只做格式、单位、朝向、贴图接入等技术处理，不重塑用户模型。
- 网页 GLB 放 `public/assets/world/traveler-tripo/v001/traveler.glb`。
- 转换脚本为 `scripts/import-world-traveler-tripo-v001.py`。
- 审计、截图与验证为 `work/world/traveler-tripo-v001-*`；不自动删除中间文件。
- 先在独立环境预览中接入；保留旧人物模型、旧预览和正式地图资源。实际入口与交付结果在本文件补充。

## 本次接入方案

审计确认原模型有65骨骼、一个已蒙皮网格及真实待机、行走、跑步、环顾动作。使用原有动画，统一为项目的 Idle/Walk/Run/LookAround 名称；保留原网格、UV和贴图。按原人物约2.017米的游戏尺度及朝向接入。

新增 `traveler-preview-v001.html` 复用现有独立环境预览代码，使用明确的人物预览配置加载新GLB；旧入口和共用加载器默认仍加载旧人物。预览支持同机位原人物/新人物切换、模型正背侧面，以及真实待机/走/跑。严格保留缺失动画报错，不引入静态降级。

独立构建脚本为 `scripts/build-traveler-preview-v001.mjs`，服务脚本为 `scripts/serve-traveler-preview-v001.mjs`，输出 `outputs/traveler-preview/v001/`，使用4192端口。4191植被交付和旧正式游戏均保留。

## 接入检查

先检查 FBX 的实际骨骼、蒙皮、动画片段、材质和贴图，再确定动画适配。不能为通过加载校验伪造 Idle/Walk/Run 名称或将整个人物摆动冒充步行动画。缺少动作时明确区分静态外观预览与完整可动画人物，保留原动画资产的严格校验。

检查地面原点、米制比例、正背方向、贴图对应、网页同机位外观和资源加载失败恢复。源文件和已确认植被的哈希必须保持一致。

## 2026-11-01交付结果

人物已接入独立可操作网页：`http://localhost:4192/`。使用 WASD/方向键行走、Shift 跑步、Q/E 转镜头；手机横屏可按住方向按钮行走。右上角可切换原人物、用户模型及正面/背面/侧面/斜面/走跑展示。原人物与新人物的道路比较使用同一位置、摄像机、光照和雾参数。

- 正面：`http://localhost:4192/?view=traveler-front`
- 道路原人物对照：`http://localhost:4192/?traveler=original&view=road`
- 同一Wi-Fi的手机：`http://192.168.1.116:4192/`（本次本机局域网地址，网络切换后可能变化）。

模型保留原始 52,689 个三角面、65 根骨骼、UV、材质及 4096×4096 JPEG；GLB 中的 JPEG 与原贴图逐字节一致。身高按现有世界尺度统一为约2.017米。没有重塑脸部、衣服、背包或重绘贴图。

四段原始骨骼动作转换为 Idle、Walk、Run、LookAround。游戏目前使用前三段，LookAround 仅保存在资源中。技术适配去掉动画自身的水平位移，避免与键盘位移叠加；保留步态及上下运动，校正地面穿入与循环接缝。各动画从0秒开始，修正原NLA导出在循环开头多出的1/24秒空段。

| 动作 | 导出时长 |
| --- | --- |
| Idle | 17.583333秒 |
| Walk | 2.333333秒 |
| Run | 1.25秒 |
| LookAround | 15.583333秒 |

独立预览行走1.8米/秒、跑步4.4米/秒，按原步幅校准动画速度。原动作跑步时最远顶点距根节点约0.8764米，本预览碰撞半径为0.9米；通过扩展预览障碍边界接入现有碰撞逻辑。正式游戏的移动常量与默认人物选择保持原值。

最终 GLB：7,817,436字节；SHA256 `7d70e06fa0edfc3053290b245d6222015caa3182c7feb166420288e97891cd72`。源FBX、原贴图、Blender工程和完整导出记录均已归档。已确认灌木、其他环境模型、旧人物源工程与旧GLB的保护哈希核验一致。

## 实际验证与交付图

- `npm run typecheck`、`npm run validate:content` 已通过；`npm run test` 的22个测试文件、214项测试通过。
- 独立生产构建已通过，不覆盖旧正式构建。
- 真实Chrome检查9个展示视角；行走与跑步各检测到22根骨骼的局部变换，确认播放真实关节动作。
- 键盘走跑切换、松键停下、持续朝树干跑动时被阻挡、手机844×390横屏触控与松手停下均通过。
- 模拟新GLB加载失败后出现错误及重试按钮；恢复资源并点击重试可重新加载。
- 新旧人物道路截图的摄像机、位置、光照与雾参数完全相同。7个实际服务GLB与源资产字节一致；原始贴图、旧人物和已确认植被均核验哈希。
- 手机横屏选择菜单位于顶部，未与底部方向键/提示重叠；页面无横纵滚动。手机结果来自浏览器模拟，尚未作为真机性能结论。

验证记录：`work/world/traveler-tripo-v001-verification.json`。网页截图归档在 `outputs/traveler-preview/v001/`：`road.png`、`original-road.png` 为同机位前后对比；`traveler-front.png`、`traveler-back.png`、`traveler-side.png`、`traveler-diagonal.png` 为完整模型；`traveler-walk.png`、`traveler-run.png` 为原动画实际网页画面；`mobile.png` 为横屏触控。

## 本次文件清单

- 来源归档：`art-source/world/traveler-tripo/v001/` 下原FBX、配套JPEG及 `source-manifest.json`。
- 模型工程：`art-source/world/models/traveler-tripo/v001/traveler.blend`、`export-manifest.json`。
- 运行模型：`public/assets/world/traveler-tripo/v001/traveler.glb`。
- 转换、独立构建、服务、验证：`scripts/import-world-traveler-tripo-v001.py`、`scripts/build-traveler-preview-v001.mjs`、`scripts/serve-traveler-preview-v001.mjs`、`scripts/verify-traveler-preview-v001.mjs`。
- 独立入口及适配：`traveler-preview-v001.html`、`src/world/traveler-preview-v001.css`；`src/world/art-sample.ts` 增加可选人物配置，`src/world/environment-preview-v003.ts` 增加独立人物预览模式。
- 本交付说明：`docs/traveler-tripo-v001.md`。

运行复验：先 `node scripts/build-traveler-preview-v001.mjs`，再启动 `node scripts/serve-traveler-preview-v001.mjs`，另一个终端运行 `node scripts/verify-traveler-preview-v001.mjs`。验证脚本使用版本化导出记录中的保护哈希，不依赖前次会话的临时基线文件。

本版保留用户源模型质量，尚未做手机减面或贴图压缩；约7.8MB为人物GLB本身大小。视觉效果等待用户审阅，本次交付范围为独立预览。
