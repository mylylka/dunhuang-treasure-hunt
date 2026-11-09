# 敦煌寻宝记

面向高中生的敦煌文化网页小游戏合集。v0.1 实现公共框架与找不同入门关，使用清楚标注的几何占位素材。全部正式美术由婧婧在 ChatGPT 网页端制作后接入。

技术：Phaser 4.2.1 + React + TypeScript + Vite。依赖版本由 package-lock.json 固定。

游戏采用一屏一个场景：首页、主题选关、游玩、结果通过按钮切换。两张游戏图与操作区按当前视口的宽和高共同适配；长文字说明在独立面板内阅读，不靠向下拉动网页完成游戏流程。

## 直接试玩

双击 `outputs/启动敦煌寻宝记.command`，打开 http://localhost:4186 。这个脚本使用已有 Node.js 服务 `outputs/web/`，无需再次安装依赖。关闭启动终端可结束该预览。

## 继续开发

先读 AGENTS.md。依赖缺失时运行 `npm ci`，随后 `npm run dev`。增加已支持玩法的关卡，在 `src/content/levels/` 加 JSON 和素材登记即可。玩法规则与主题、关卡内容分别维护。

## 验证

```sh
npm run validate:content
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run test:production
```

浏览器运行时放在项目 `work/browsers/`。当前 macOS 如已安装 Chrome，测试直接使用它；其他环境可先运行 `npm run test:browsers` 安装项目内浏览器运行时。WebKit 也由该命令准备。不安装全局包或修改系统设置。

构建输出 `outputs/web/`；构建工具不自动删除输出中的旧文件。交付时可将本项目自身产生的旧构建文件移至 `work/build-history/` 保留，用户原稿不覆盖或删除。

## 文档

- `docs/architecture.md`：代码、内容与进度边界。
- `docs/art-assets.md`：15 项素材、比例、切片和正式图替换。
- `art-source/README.md`：用户原稿及参考资料的版本约定。
- `outputs/使用说明.md`、`outputs/素材交付清单.md`：用户交付入口。

当前没有服务器账号、云同步或公开部署。每个设备浏览器独立保存记录。其余主题展示制作中说明，测试关不会出现在正式列表。
