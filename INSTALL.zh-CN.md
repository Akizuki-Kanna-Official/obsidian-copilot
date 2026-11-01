# Copilot 4.0.17 简体中文社区版：安装与回滚

更新时间：2026-11-01 18:33（北京时间）

这是非官方汉化构建，沿用插件 ID `copilot`，不能与官方版同时安装。未替你在电脑上安装。

## 安装

1. **关闭 Obsidian，备份整个 `.obsidian/plugins/copilot/` 文件夹，尤其是 `data.json`。** 自定义配置目录请使用实际路径。
2. 从此包的 `copilot/` 目录复制 **`main.js`、`manifest.json`、`styles.css`** 到上述插件目录，替换同名文件。**不要删除/覆盖 `data.json` 或笔记。**
3. 重启 Obsidian，启用 Copilot。将 Obsidian“设置 → 常规（General）→ 语言”设为“简体中文”，按提示再次重启。
4. 查看 Copilot 设置和智能体“配置”窗口。API 密钥、登录和订阅仍需你自己按官方流程配置。

若尚未安装 Copilot，先在第三方插件市场安装官方版，然后关闭应用并按上述步骤替换三个文件。

## 回滚

关闭 Obsidian，将备份的三个运行文件覆盖回原目录，再重启。也可从 [官方 4.0.17 发布页](https://github.com/logancyang/obsidian-copilot/releases/tag/4.0.17) 下载原版三个文件。一般不需要恢复设置数据；不要删除整个插件目录来回滚。

## 请注意

- 官方更新可能覆盖汉化；不要为保留汉化长期忽视安全更新。
- 不是 100% 翻译：原始服务错误、部分低频界面及日志可能仍是英文；你的内容、AI 回答、提示词、路径与模型标识保持原样。
- 全仓库自动化测试通过，但真实 Obsidian 视觉、主题、登录和模型调用未实机验证。
- 上游锁定依赖审计存在 moderate/high 风险，详见 `VALIDATION.zh-CN.md`；本汉化未升级依赖。
- `source/` 中是对应修改源码；许可为 AGPL-3.0，见 `LICENSE`。详细说明见 `README.zh-CN.md`。
