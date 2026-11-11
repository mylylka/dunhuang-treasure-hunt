> 本文为原项目的 2D 开发历史记录。本分支通过独立 2D 主题入口进入游戏，不经过漫游解锁或文化导览；文中提及的第三馆入口、漫游返回和文化导览属于原项目历史，不是本分支的当前流程。原工作区的截图、临时报告、试玩端口和历史验收结果不随本分支迁移，也不代表本分支已经重新验收。现行规则以本分支 AGENTS.md 和代码为准。

# 计时找物：三章九关 v001

更新日期：2026-11-04。三张底图已获用户确认，三章九关已接入正式内容。保留首关`music-hidden-objects-intro`及既有完成记录；未更改progress结构。本文记录当前实现和本轮专项检查，[程序化规则及历史记录](hidden-object-procedural-v002.md)保留此前单关方案的来源边界。v001/v002 Excel仅为对应阶段设计档案，本轮不重建。

用户随后实机指出冷加载等待及第二章二维空洞。下方v002 PNG原字节、3×6统计和首次压力/截图验收是章节接入时的历史状态；该横带指标不能保证左右均衡。本次运行图技术编码、启动校验分离、压缩试玩服务及二维布局修复以[加载修复记录](hidden-object-loading-v001.md)和新增v004/v002派生登记为准，原始PNG及稳定素材ID继续保留。

## 章节与正式关序

每章三关共用本章难度参数，只更换候选目标组合、随机图片和布局。同章不逐关加难，新章不恢复更宽松的入门参数。所有关均为120个实例、50秒、960×1800长卷；缩放1.2～1.6、朝向约±24度，保持原图比例、颜色和轮廓。

| 章 | 章节ID与名称 | 本章配额（目标及干扰共同遵守） | 每局任务 | 底图asset ID |
| --- | --- | --- | --- | --- |
| 1 | `music-hidden-chapter-1` 衣冠乐舞 | 乐器40＋服饰80 | 3种精确图片，每种1～2份，共3～6件 | `hidden-object-background-ch1` |
| 2 | `music-hidden-chapter-2` 花间生灵 | 动物90＋花卉30 | 4种精确图片，共7件；三种各2份、一种1份 | `hidden-object-background-ch2` |
| 3 | `music-hidden-chapter-3` 万象寻宝 | 乐器、服饰、动物、纹样、花卉、供器各20 | 4种精确图片，共8件，即每种2份 | `hidden-object-background-ch3` |

| 关序 | 稳定关卡ID | 标题 |
| --- | --- | --- |
| 1-1 | `music-hidden-objects-intro` | 乐舞寻宝 |
| 1-2 | `music-hidden-objects-ch1-02` | 衣饰寻踪 |
| 1-3 | `music-hidden-objects-ch1-03` | 冠带寻踪 |
| 2-1 | `music-hidden-objects-ch2-01` | 花间寻踪 |
| 2-2 | `music-hidden-objects-ch2-02` | 生灵寻踪 |
| 2-3 | `music-hidden-objects-ch2-03` | 花叶寻踪 |
| 3-1 | `music-hidden-objects-ch3-01` | 纹样百宝 |
| 3-2 | `music-hidden-objects-ch3-02` | 器物寻踪 |
| 3-3 | `music-hidden-objects-ch3-03` | 万象寻宝 |

正式配方位于`src/content/levels/music-hidden-objects*.json`。`chapter`包含`id/title/order/level/backgroundAssetId`，`tasks.totalCount`约束第二、三章严格为7/8件；不能先独立随机各组数量后得到错误总数。关序依据章节序号与章内序号，不能依赖文件名字典序。选关按章展示九关并在目录内部滚动；游玩“上一关/下一关”只进入同主题同玩法的相邻实际关，首末缺项为disabled，切关不记完成。结果页下一实际关为主要操作，末关回目录。

## 目标与资源

独立素材池仍为520张，稳定池ID为`dunhuang-stickers-v001`。当前目标分类元数据归档于`art-source/shared/hidden-object-elements/v003/`，运行贴纸仍引用`public/assets/shared/hidden-object/v002/`的原字节，长边≤512px且不放大原图。active池为`src/content/hidden-object/pool.json`，当前SHA为`ac8292552d1752bfa27b43e6ae0c9eece1768fcadd80abf7694bdb9b64b2362e`。

| 图库 | 目检候选数 | 已登记目标组 |
| --- | --- | --- |
| 乐器 | 19 | 琵琶、鼓、铃铛、笛子、排箫、钹 |
| 服饰 | 14 | 飘带、头冠、项链、耳坠、手镯、腰带、靴子 |
| 动物 | 16 | 鹿、孔雀、兔子、马、骆驼、牛、狮子、鱼 |
| 花卉 | 10 | 莲花、莲蓬、荷叶、花形、叶片 |
| 纹样 | 6 | 圆纹、菱纹、火焰纹 |
| 供器 | 10 | 香炉、烛台、碗、卷轴、珠串 |

合计34组、75张目标候选。目检图号与理由见`target-groups.json`，技术总览为`target-review.png`；名称描述可见外形，不构成洞窟、年代、植物品种或宗教用途鉴定。原13张琵琶/鼓/铃铛分类保留，新增分组不改图片像素、尺寸或命中点。

各关候选组多于本局任务种数，同章三关的候选组合不同；不再每次固定找琵琶、鼓和铃铛。先随机选组，再为每组选择一个精确`spriteId`，按数量复制独立实例；类别配额容纳该图片的全部副本。任务卡和目标实例引用同图，其他同组异图仍可作干扰但不得计数，目标原图不混入干扰池。120实例的去重贴纸纹理数：第一章117～120、第二章117、第三章116；另加载本章一张背景。

三张底图为用户批准的AI游戏美术，均916×1717，原PNG字节归档与运行复制，不重绘、改色或裁切。原件及SHA见`art-source/shared/hidden-object-backgrounds/v001/manifest.json`；运行路径为`public/assets/shared/hidden-object-backgrounds/v001/`下的`chapter-1-silk.png`、`chapter-2-celadon.png`、`chapter-3-plaster.png`。Scene只加载本章底图，将其映射到整个960×1800盘面，与贴纸共用长卷滚动/缩放变换，不固定在观察窗口上。背景失败保留重试且不开表。

准备页本地字体为`Dunhuang Labels`，运行`dunhuang-labels-v002.woff`，24,872字节、87字符，覆盖全部目标名称、章节标题与准备文案/数字/乘号。来源、字集、OFL与SHA在`art-source/shared/fonts/v003/`；真实字重400 Regular，700由CSS显式合成。旧16字、4,552字节的v001运行字体及v002归档保留。

## 局面、计时与摆放

准备页只展示本局精确图片、名称数量、独立时限行和开始按钮；外壳任务栏、进度、倒计时、倍率工具与功能栏隐藏。同一Phaser实例保留，准备及加载不扣时。开始后手机右侧显示紧凑任务与操作，四目标完整同屏、必要触点≥44px；主卷使用完整可用高度，无手机1×/2×/3×工具行。电脑保留合理缩放工具。页面不滚动，长卷支持滚轮、触屏拖动与原生独立滚动条，提示滚到真实未找到目标。

只有找物计时。运行浏览、缩放与提示持续扣时；暂停、后台、失焦或手机竖屏同步停表并禁止输入。恢复横屏保留同局与浏览位置，需主动继续。误点不额外扣时，无限提示/重试；成功才写原完成记录，超时与截止后的点击不写完成。重试同种子，新一局换种子重新抽任务、干扰和位置。

网格仅作空间索引，3×6区域仅作覆盖统计。每物件比较最多8个合法连续位置并按密度评分，不沿格线排列。高密度盘面保留14次后备预算：6轮全适配空矩形采样＋8轮最贴合前8矩形采样；后者在随机角附近连续取偏移，减少中部落位造成的不可用碎隙。整盘还须通过600px/300px滑窗（100px步长）的密度极差硬门限，分别严格小于15/25个百分点。失败只在原预算内重排坐标，不缩图、漏物、重抽图片或延长时限，耗尽则明确报错。

1～2关“能发声”等语义分类变种仍未开发，也不在这九关中；不能将精确同图任务悄悄改成同类都算。

## 本轮专项验证（截至2026-11-04）

- 内容校验通过：20个正式关卡、55项正式索引素材，另有520张独立贴纸。
- 找物/章节/选关/相邻关单测43项，加内容schema/中断生命周期32项，共75项通过；不是全量unit声明。
- Chrome手机6项通过：三章各三关准备数据/不提前计时/单章背景加载，真实七件完成后跨章，两种手机尺寸的四目标44px触点、0.999视口可见率与竖屏保局。
- Chrome电脑3项通过：按章目录滚到末关、背景全卷滚动/真实2倍缩放、背景失败重试。
- WebKit3项通过：七件真实完成跨章、640×300竖屏中断、背景全卷滚动/真实2倍缩放。没有声称整份E2E或全部production通过。
- `work/hidden-object-chapters-pressure.json`记录九关各100种子、共900局，生成失败0，数量/类别限制/精确副本/实例唯一、旋转AABB无重叠越界通过。600px窗口最大极差14.93个百分点，300px最大24.74个百分点。第二章三关P95分别101.78/99.42/103.48ms，本机最大单局116.94ms；不能写全关P95<100ms，也不能视作学生难度校准或真机性能结论。
- 首轮6个摆放失败保存在`work/hidden-object-chapters-pressure-before-pack.json`；修正连续近角偏移后，另有滑窗密度超标记录保存在`work/hidden-object-chapters-pressure-before-density-gate.json`。最终报告对应加入硬门限后的实现，不覆盖失败记录。
- 背景、目标分类、新字体和旧字体的`--check`均通过。四目标缩略图最后增至30×44px、卡片56px高后，Chrome的640×300/852×330及WebKit的640×300三个保局/触点用例复验通过。
- 最终内容/类型/生产构建和diff检查通过。以独立本地静态服务器加载构建，电脑1279×925与手机852×330各实际进入三章代表关；准备页、上中下段及选关共26张截图已逐张查看，未见遮挡/越界/重叠或此前的大空洞。第二章手机底部右缘相对疏一些，但未见明显大空洞或堆簇。640×300为专项DOM与真实操作验收，未称本批有其视觉截图。
- 截图位于`work/hidden-chapter-{1,2,3}-{desktop,phone}-{ready,top,middle,bottom}.png`和`work/hidden-chapters-{desktop,phone}-selection.png`；`work/hidden-chapters-screenshot-check.json`登记每章每设备同一局的seed、目标数、背景与首尾偏移。背景的归档/运行/构建PNG SHA逐字节一致，构建字体与运行字体一致，静态游戏素材请求无404/500；浏览器默认favicon有3次404，未修改无关图标。该检查只覆盖本轮静态代表关，不冒称全量production或3D回归通过。

专项文件和可重跑命令如下；浏览器必须串行，仅选择与本轮有关的用例：

```sh
npm run validate:content
npx vitest run tests/unit/hidden-object.test.ts tests/unit/hidden-object-chapters.test.ts tests/unit/hidden-object-selection.test.ts tests/unit/level-sequence.test.ts
npx vitest run tests/unit/content-schema.test.ts tests/unit/scene-blocking.test.ts
node --import tsx work/check-hidden-object-chapters.ts
python3 scripts/import-hidden-object-backgrounds-v001.py --check
python3 scripts/import-hidden-object-targets-v003.py --check
python3 scripts/import-hidden-object-chapter-font.py --check
python3 scripts/import-hidden-object-label-font.py --check
npm run test:e2e -- tests/e2e/hidden-object-chapters.spec.ts --project=mobile-chromium --grep '第[123]章三关|第二章异图|手机'
npm run test:e2e -- tests/e2e/hidden-object-chapters.spec.ts --project=desktop-chromium --grep '找物目录|第三章背景|章节背景加载'
npm run test:e2e -- tests/e2e/hidden-object-chapters.spec.ts --project=webkit --grep '第二章异图|手机640|第三章背景'
```
