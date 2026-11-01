# Copilot for Obsidian — 简体中文界面本地版

更新时间：2026-11-01 18:33（北京时间）

这是基于 [官方 Copilot 4.0.17](https://github.com/logancyang/obsidian-copilot/releases/tag/4.0.17) 的**非官方本地汉化版本**，并非官方发布。上游提交：`e11c33769ac2cc3066f1704f3cd395658eb7d7ff`。原作者及项目归属保持不变。

汉化源码分支：[Akizuki-Kanna-Official/obsidian-copilot · feat/zh-cn-ui](https://github.com/Akizuki-Kanna-Official/obsidian-copilot/tree/feat/zh-cn-ui)。

## 使用中文界面

1. 在 Obsidian 的“设置 → 常规（General）→ 语言”中选择“简体中文”，按应用提示重启（[官方语言设置说明](https://obsidian.md/help/User%2Binterface/Language%2Bsettings)）。
2. 本版本自动读取 Obsidian 的语言设置；简体中文显示已翻译文案，其他语言保留英文。
3. 插件设置、智能体配置、聊天操作等是界面翻译。笔记、用户输入、模型回答、系统提示词、命令参数、路径、模型和提供商名称不会被自动翻译。

## 安装（手动操作，本汉化未安装到你的电脑）

**先备份。** 关闭 Obsidian，将仓库中的 `.obsidian/plugins/copilot/` 整个文件夹复制到安全位置，尤其保留 `data.json`。如果使用自定义配置目录，以实际目录代替 `.obsidian`。

1. 解压交付包；`copilot/` 内的 `main.js`、`manifest.json`、`styles.css` 是插件运行文件。
2. 将这三个文件复制到现有 `.obsidian/plugins/copilot/`，替换同名文件。**不要删除或替换 `data.json`，也不要覆盖笔记和 Copilot 数据目录。**
3. 重新打开 Obsidian，在“第三方插件”中启用 Copilot；如已启用，禁用再启用，或重新启动应用。
4. 首先检查 Copilot 设置和智能体的“配置”窗口。授权/登录和运行智能体仍遵循官方插件流程，本汉化不提供任何 API 密钥、订阅或额外付费功能。

如果未安装过 Copilot，先通过 Obsidian 第三方插件市场安装官方版，再关闭应用并替换上述三个文件。此版沿用官方插件 ID `copilot`，**不能与官方版并行安装**。

官方更新可能覆盖汉化；请保留本安装包，不要为了保留汉化而长期忽视上游安全更新。

## 回滚

关闭 Obsidian，用之前备份的 `main.js`、`manifest.json`、`styles.css` 覆盖回去，然后重启。也可从官方 4.0.17 发布页重新下载这三个文件。通常无需恢复 `data.json`，因为本次汉化未修改设置数据结构；只有确实需要恢复设置时才使用自己的备份。不要删除整个插件目录或仓库来回滚。

## 覆盖与限制

主要覆盖设置导航与基本/高级设置、Agent Chat 操作和状态、Claude/Codex/OpenCode 配置与安装对话框、技能管理、BYOK/模型配置、常用弹窗、快捷对话和命令相关界面。

- 未承诺 100% 汉化。少量低频界面、底层诊断/日志、后端返回的权限选项及错误可能仍为英文。
- AI 生成内容、用户自定义命令名称、已有项目/对话名称及官方文档不会被自动翻译。
- 云端进行了构建和自动化检查；未在你的电脑安装。真实 Obsidian 桌面中的视觉布局、登录流程和真实模型调用不属于自动化单元测试的保证范围。
- 与上游一样，本软件不提供保证，使用前请备份重要数据。

详细的实际检查结果见交付包中的 `VALIDATION.zh-CN.md`。

## 开发与维护

需要 Node.js 和 npm。保留锁文件，使用：

```sh
npm ci
npm run build
npm test -- --runInBand
npm run lint
npm run format:check
npm run gallery:build
```

`npm run build` 包括 Tailwind 样式生成、TypeScript 类型检查和生产打包。不要直接修改生成的 `main.js` 或 `styles.css`。

文案采用 `src/lib/i18n.ts` 的 `t(英文原文, 简体中文)`，在界面调用点保留英文以方便与上游合并。只对展示文案调用，不对用户数据、工具协议值、模型返回或提示词使用自动替换。切换 Obsidian 语言后应重启，因为部分菜单定义在模块加载时建立。

## 开源许可与来源

上游：[logancyang/obsidian-copilot](https://github.com/logancyang/obsidian-copilot)，原作者 Logan Yang 及项目贡献者。保留原始 `LICENSE`、`README.md` 和原作者归属。本修改版继续以 **AGPL-3.0** 分发，不附加限制。

交付同时包含此修改版的对应源码压缩包及构建所需脚本和依赖锁文件；请连同运行文件、许可证和修改说明一起保存或再分发。依赖的法律声明保留在生产 bundle 中。修改清单见 `CHANGELOG.zh-CN.md`。
