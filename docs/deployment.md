# 分支与 GitHub Pages 发布

两版源码都维护在 [敦煌寻宝记源码仓库](https://github.com/mylylka/dunhuang-treasure-hunt)。发布时，部署 Agent 用同一份已确认的源码提交构建成品，并上传到该版本的 Pages 发布分支。

| 版本 | `origin` 源码分支 | 本地工作树（相对项目根目录） | Pages 发布仓库和分支 | 试玩入口 |
| --- | --- | --- | --- | --- |
| 3D-World（三馆联通） | `codex/3d-world` | `work/3d-world/` | `mylylka/dunhuang-treasure-hunt` 的 `gh-pages` 根目录 | [三馆试玩](https://mylylka.github.io/dunhuang-treasure-hunt/) |
| Co-Work（第一馆精简版） | `co-work` | 项目根目录 | `mylylka/dunhuang-co-work` 的 `main` 根目录 | [Co-Work 试玩](https://mylylka.github.io/dunhuang-co-work/) |

本地开发和提交可以随时进行。只同步 Co-Work 源码时，只更新原仓库的 `co-work`。发布 Co-Work 新版时，Agent 检查原仓库已有该源码提交，缺少时先推送，再把静态成品上传到独立发布仓库。3D-World 的源码和成品在同一个仓库的不同分支，也可以用一条口令完成。各站继续使用已配置的 Pages 发布分支，发布仓分支只存放对应站点的静态成品。

## 部署 Agent 口令

| 口令 | 处理方式 |
| --- | --- |
| `查发布状态` | 核对两版的本地提交、远端源码提交、线上源码提交、Pages 成品提交和试玩地址，标明哪里有差异。 |
| `只推送 Co-Work 源码` / `只推送 3D-World 源码` | 列出该版本待推送的提交和远端分支，确认后同步源码。 |
| `发布 Co-Work` / `发布 3D-World` | 默认选该分支最新的本地已提交版本。列出源码提交、需推送的分支、发布去向和验证结果，取得本次授权后完成同步、部署及线上验收。可在口令后指定提交号。 |
| `把 3D-World 的 <提交号> 合并到 Co-Work` | 在 Co-Work 做完整 Git 合并。留空时以核对后的 `origin/codex/3d-world` 的最新提交为准。保留 3D-World 的实现、素材与历史，按 Co-Work 的场馆、可走范围、显隐、互动和存档规则解决冲突。合并完成后报告验证结果，推送和部署由相应口令启动。 |

`查发布状态` 可以直接执行。涉及 `git push`、公开部署及其他 `AGENTS.md` 红线时，先取得本次明确授权。一次发布可以把源码推送和成品部署放在同一次确认里。部署请求只适用于所点名的版本。出现远端分支分叉、授权后远端版本变动或构建失败时，先核对原因及可行的恢复方式。用户的未提交文件和素材留在原工作树。

## Agent 发布步骤

1. 在版本对应的工作树核对 `git status --short --branch`、`git rev-parse HEAD` 和 `git remote -v`。使用 `git ls-remote` 核实两个源码分支的远端提交，使用 `gh api repos/<owner>/<repo>/pages` 和 `gh api repos/<owner>/<repo>/pages/builds/latest` 核实站点的发布分支、状态和成品提交。
2. 从确认要发布的已提交源码取构建输入，运行 `npm run validate:content` 和 `npm run typecheck`。用 Vite 的相对基路径 `./`，输出到 `work/` 下为本次发布新建的目录。项目默认构建目录会保留历史文件。Co-Work 只构建精简正式首页和所需运行素材。3D-World 构建三馆正式首页，核对当前线上仍提供的入口及三馆素材。每个包都在各自的 Pages URL 子目录下验收资源路径。
3. 包含该版本所需的图片、模型、音频和字体，核对发布包大小及运行资源是否齐全。交付的正式入口须先显示旅人选角，分别以新浏览器和已有角色记录的隔离存档核验；不得通过清除玩家存档制造选角效果。若当前源码无法满足，报告问题并交由获授权的开发者修复，部署 Agent 不自行修改游戏功能代码。Co-Work 从选角进入第一馆，检查地貌、借物补画、三兔共耳、画卷解锁、小游戏和其余场馆门禁。3D-World 检查选角、三馆主路和门禁、各馆关键互动及小游戏入口。按变动补做桌面与手机横屏核查。
4. 把要发布的完整源码 SHA 写到站点 `release.json` 的 `sourceCommit`，把对应源码分支写到 `branch`。准备好成品后，把源码提交、待推送分支、线上去向及验证结果一起交给婧婧确认。按确认将缺少的源码同步到 `origin`，再将静态成品推到表里指定的 Pages 发布分支。发布提交说明也记录完整源码 SHA。等目标成品齐备后再更新正式 Pages 分支。
5. 等待目标成品提交的 Pages 构建成功。访问正式 URL，核对 `release.json` 和浏览器入口，确认关键素材能加载。旧版没有 `release.json` 时可查当前部署对应的成品提交说明。回报版本、源码 SHA、成品 SHA 和试玩链接。若源码已推送但成品尚未上线，明确回报两处状态，下次可以从同一源码 SHA 继续发布。

## 2026-11-27 核对记录

| 版本 | 当时的本地源码 | 当时的远端源码 | 线上源码 | Pages 成品 |
| --- | --- | --- | --- | --- |
| 3D-World | `4466a9c` | `339548d` | `339548d` | `e858208` |
| Co-Work | `e3dca8c` | `791abd2` | `e3dca8c` | `114968a` |

Co-Work 首次独立部署从本地 `e3dca8c` 构建，发布记录可在 [线上 release.json](https://mylylka.github.io/dunhuang-co-work/release.json) 核对。下一次执行源码同步或发布时先确认待推送提交。
