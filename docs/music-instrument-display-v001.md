# 第二馆二楼 · 十二件乐器点听展

现行双层同行入口 `music-companion-v002.html`。展品设在二楼后室，前廊仍展示原四位乐师。

| 位置 | 组合及从观众视角看由左到右 | 模型中心与宽度 |
| --- | --- | --- |
| 上楼正对的西墙 | 琵琶、阮、筝、竖箜篌 | `(35.50, -24.85)`，5.10 米 |
| 上楼右手的北墙 | 埙、笙、横笛、筚篥、海螺 | `(41.31, -31.30)`，约 3.53 米 |
| 两墙夹角前 | 拍板、羯鼓、钹 | `(37.059, -29.861)`，4.50 米，斜放 45° |

三组模型等比放大 1.5 倍。弦乐与吹奏沿墙向两端错开，鼓乐沿正面向厅内移约 1.10 米，三组排成缓弧。坐标为第二馆模型本地坐标，组合底面在 `y=7.915375`。三组是单网格，使用测定的模型本地点选区域和可见表面的射线命中。横笛单独定位在吹奏组合前沿。两片钹对应同一条目。

二楼后室由露台方向的暖白日光照亮。展台和两位角色的投影使用一张独立阴影图，落在木地板和能接到光的墙面。一楼靠大门也接入这束日光，光线向三面壁画的楼梯间减弱。二楼后室撤去吊灯，其余区域继续使用原有室内补光。

现行第二馆室内和联通外观采用原四乐师的 v002 摆位。按琵琶、横笛、筝、腰鼓排布，相邻净距 22–25 厘米，靠栏杆约 26–31 厘米。地毯缩至约 6.40 × 1.86 米，前缘 `z=-17.92` 位于两种楼板的共同平整区。渲染和碰撞读取同一摆位资料，模型原件沿用。

## 试听

解释框左侧显示供稿壁画，右侧显示名称、音色、录音说明。点选即播放，录音播完、再次点画面或按 Escape 均关闭卡片并恢复漫游。播放失败可重试，静音时可读图文并手动关闭。三个模型从楼梯开始补载，图像和录音按点中的乐器请求。

九条已有音色沿用供稿试听页。竖箜篌为现代复原，筚篥由高音管代听。海螺音色参考馆藏与声学介绍，拍板、羯鼓各补一句。录音按原供稿接入，音频来源区分供稿 README 所列 CCMusic 与单独交付的 MP3。 [故宫博物院《法螺》](https://www.dpm.org.cn/lemmas/244658.html) · [国立历史博物馆《镶银法螺》](https://collections.culture.tw/nmh_collectionsweb/Collection?GID=M6MKMWMBMCM2) · [大都会艺术博物馆《螺号》](https://www.metmuseum.org/it/perspectives/brass-beginnings-conch-trumpet-fanfare) · [《乐动敦煌》拍板介绍](https://www.gsyanyi.com/col_zgsdt/202311/ED1B6CB283AC57D775A212B568F85DE1.htm) · [唐·南卓《羯鼓录》](https://www.shidianguji.com/book/SK1697/chapter/1lc4mq70ifsib)

## 构建

供稿原件与派生登记在 `art-source/world/music-instrument-display/v001/`。三个运行 GLB 仅缩减嵌入贴图，逐字节核对几何缓冲。三个手机版约 7.80 MB，桌面版约 9.34 MB。横笛录音转换为 16 位 PCM WAV，原采样率、声道和时长一致，其他录音保留原文件。原件和资源复核见 `asset-manifest.json`。

```sh
DUNHUANG_PLAYTEST_BUILD=work/world/music-companion-daylight-build-v001 node scripts/build-world-playtests-v001.mjs
DUNHUANG_PLAYTEST_BUILD=work/world/music-companion-daylight-build-v001 node scripts/serve-music-companion-v002.mjs
```

展台摆位验收保存于 `work/world/music-instrument-display-v001/`，光影和后墙同机位对照保存于 `work/world/music-interior-daylight-v001/`。
