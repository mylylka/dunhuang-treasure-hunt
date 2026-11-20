# 三馆沙漠外景 v001

本版沿三馆原有路线布置 16 款、45 组装饰。纹彩院外用低矮草石形成几处停顿，翻过坡顶才逐渐看到月牙泉的胡杨和芦苇。乐舞坊沿东侧院墙增加一处亮叶小景，继续使用原来的大树。通往九层楼的四处砂岩小景以横向层岩为主，梯脚和正门方向留空。

- 实际点位和尺寸见 [四区布局](../src/content/world/desert-decoration-layout-v001.ts)。道路、湖岸、建物和模型之间的避让使用足印检查，布置后的胡杨和竖岩才注册简化碰撞。
- [素材登记](../art-source/world/desert-decoration/v001/manifest.json) 对应 PDF 的 58 条预览，记录实际采用、复用、暂缓和去重情况。原件以哈希保存在素材库。运行 GLB 统一为一个网格批次，保留树冠和岩石的轮廓。庭院的两款低景各用一张 512 像素贴图。
- 可移动后首次实际位移才启动装饰。场馆、语音和地表材质先行，装饰始终串行请求。首批是 A 区的 R01、G02、C04，B 区的 T01，C 区的岩石灌木3，以及 D 区的四款砂岩。移动视角以新增 20 次绘制、3 万个三角形为上限。

## 本地查看

从总版工作目录运行 `node scripts/serve-desert-playtest-v001.mjs`，打开 `http://localhost:5174/`。它同时读取总版工作区与项目公共素材目录，分支里的新素材优先。分区对照可在同一入口 URL 带上 `?desertDecoration=0`。

可用以下命令核对来源登记、边界和专项逻辑。

```sh
python3 scripts/prepare-desert-decoration-v001.py --verify
npm run typecheck
npx vitest run tests/world/desert-decoration-placement.test.ts tests/world/desert-decoration-streaming.test.ts tests/world/terrain-camera-v001.test.ts tests/world/terrain-planting-v003.test.ts tests/world/music-interior-navigation.test.ts
```

## 资源实测

从 5174 共享试玩服务请求 gzip 响应。以下是实际模型响应体字节，GLB 已包含贴图，页面脚本另计。

| 首批模型 | 响应体 |
| --- | ---: |
| A 纹彩院与越岭路 | 100.8 KiB |
| B 月牙泉岸 | 165.3 KiB |
| C 乐舞坊东院墙 | 306.4 KiB |
| D 砂岩戈壁 | 37.5 KiB |
| 16 款 GLB 累计 | 1.51 MiB |

仓库内的 16 款 GLB 原始大小为 3.38 MiB。两张 512 像素贴图按 RGBA8 和完整 mipmap 层估算合计约 2.67 MiB。

## 浏览器验收

- [四区同机位对照](../work/qa/screenshots/desert-decoration-v001/four-regions-before-after.jpg) 汇总了第一馆外、月牙泉、乐舞坊庭院和九层楼前的实景。七个桌面机位和四个模拟手机横屏机位的原图在 [验收目录](../work/qa/desert-decoration-v001/screenshots/)。
- 桌面和模拟手机横屏分别通过实际游戏输入沿现有两条道路往返，各经过 152 个采样点。手机固定机位新增最高为 7 次绘制、29,855 个三角形，往返跑测峰值为 13 次、29,981 个三角形和 2.67 MiB 贴图估算。返回第一馆外时，两张庭院贴图已释放。阴影更新仍由原有静态分块处理，屏幕内外切换只改变主画面绘制。 [跑动记录](../work/qa/desert-decoration-v001/continuous-route-mobile.json)
- 手机模拟将装饰请求改为 404 后仍可走动和退出，第二、第三馆入口附近的检查点恢复后可继续走动。模拟切后台后没有新增装饰请求，返回并点击「继续探索」后恢复。队列测试覆盖失败重试、退出后晚到资源回收、共享批次和碰撞布置。 [后台记录](../work/qa/desert-decoration-v001/visibility-mobile-verified.json)
- 本地生产构建在 1.6 Mbps、150 ms RTT、CPU 4 倍降速下做了关闭和开启装饰各三次冷启动。六次都遇到现有启动超时，期间装饰 GLB、贴图和装饰模块请求均为 0。此档没有首次可移动时间。模拟横屏数据与真机的帧时、耗电表现应分别记录。
- 约 8.39 Mbps、55 ms RTT、未模拟 CPU 降速时，在同一生产构建串行测试关闭和开启装饰各三次，六次都可进场。首次实际移动中位数从 24.159 秒到 24.200 秒，移动前传输中位数均为 24,055,768 字节，装饰重资源和装饰模块均在首次移动前保持 0 请求。 [串行测试记录](../work/qa/desert-decoration-v001/startup-mobile-moderate-summary-before-after-serial.json)
- 模拟手机横屏同一路线各跑一趟，关闭和开启装饰的 p95 帧时分别为 50.0 ms 和 33.4 ms。这组数据包含沿路加载场馆的波动，供本地复核。 [关闭装饰的跑动记录](../work/qa/desert-decoration-v001/continuous-route-mobile-before.json)

运行 `node --import tsx scripts/verify-desert-decoration-v001.mjs --visual` 可截取手机横屏固定机位，追加 `--desktop` 切换设备。使用 `--startup`、`--failure`、`--restores`、`--visibility` 分别检查冷启动、404 回退、检查点和后台恢复。用 `node --import tsx scripts/verify-desert-route-v001.mjs` 实际跑一圈并记录帧时，追加 `--mobile` 切到手机横屏，追加 `--before` 关闭装饰。
