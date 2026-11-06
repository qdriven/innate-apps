# innate-keepthem 文档

基于当前仓库代码整理的项目文档（2026-09）。旧版 `docs/`（含 archive / research / specs 等）已清空重建。

> 注：2026-10-31 工作区目录曾发生丢失，本文件随 reach-hub 设计文档一并恢复。
> 若下方链接指向的文件缺失，说明对应文档尚未随仓库一起恢复（可从 git 历史找回）。

## 文档索引

| 文档 | 说明 |
|------|------|
| [architecture.md](./architecture.md) | 整体技术架构、仓库布局、构建与运行入口 |
| [retry-mechanism.md](./retry-mechanism.md) | 下载重试与韧性机制（错误分类、自动降级重试、手动重试、启动恢复） |
| [modules/overview.md](./modules/overview.md) | 模块一览与依赖关系 |
| [modules/vytdl-cli.md](./modules/vytdl-cli.md) | vYtDL Go CLI（`vYtDL-standalone/`） |
| [modules/vytdl-desktop.md](./modules/vytdl-desktop.md) | vYtDL 桌面端（Tauri + Next.js） |
| [modules/vytdl-web.md](./modules/vytdl-web.md) | vYtDL Web / Docker 服务 |
| [modules/contentforge-cli.md](./modules/contentforge-cli.md) | ContentForge Go CLI |
| [modules/contentforge-core.md](./modules/contentforge-core.md) | ContentForge Python 核心 |
| [modules/contentforge-desktop.md](./modules/contentforge-desktop.md) | ContentForge 桌面端 |
| [modules/url-extractor.md](./modules/url-extractor.md) | Chrome URL 提取扩展 |
| [modules/shared-packages.md](./modules/shared-packages.md) | `@vytdl/ui` / `@vytdl/utils` |
| [modules/agent-reach.md](./modules/agent-reach.md) | agent-reach 子模块 |
| [modules/scripts.md](./modules/scripts.md) | 根目录构建 / 启动脚本 |
| [use-cases/cli-multi-platform-downloads.zh.md](./use-cases/cli-multi-platform-downloads.zh.md) | 用例：vYtDL CLI 多平台下载（中文） |
| [use-cases/cli-multi-platform-downloads.en.md](./use-cases/cli-multi-platform-downloads.en.md) | Use case: vYtDL CLI multi-platform downloads (English) |
| [research/wechat-content-acquisition-repos.md](./research/wechat-content-acquisition-repos.md) | 调研：微信视频号 / 公众号内容获取 GitHub Top 10 与技术路线 |
| [research/daily-checkin.md](./research/daily-checkin.md) | 每日签到自动化总览（mcode + WorkBuddy，Bun 脚本 + Windows 计划任务） |
| [research/workbuddy-checkin.md](./research/workbuddy-checkin.md) | WorkBuddy 每日签到实现说明（接口逆向、CDP 通道、调试端口与自动更新处理） |
| [research/workbuddy-research.md](./research/workbuddy-research.md) | 调研：腾讯 WorkBuddy 产品定位、能力模型与可借鉴点 |
| [design/reach-hub/](./design/reach-hub/) | 设计：基于 Agent-Reach 的最新内容获取与分发中枢（Reach-Hub，2026-10） |
| [design/innate-dev-factory.md](./design/innate-dev-factory.md) | 设计：轻量级个人开发工厂——DSH 桌面底座选型与两模块设计（2026-11） |
| [design/dsh-ui-seat-map.md](./design/dsh-ui-seat-map.md) | 参考：DSH Web UI 可替换座位全景图（103 座位清单 + 示意图 + 改造实战，2026-11） |

## 脚本目录

仓库根 `scripts/` 下的可执行脚本：

| 脚本 | 说明 |
|------|------|
| `scripts/validate-registry.mjs` | 校验 `registry/apps.json` 字段与 `local_path` 是否符合本地布局 |
| `scripts/daily-checkin.ts` | MiniMax Code（mcode）每日积分签到（Bun / Node 24 均可运行） |
| `scripts/mcode-sign-salt.ts` | mcode 签名盐交互式配置工具：探测客户端提取 / 写入环境变量 |
| `scripts/mcode-sign-salt-lib.ts` | 签名盐解析库（环境变量 > 客户端自动提取 > 兜底默认值） |
| `scripts/workbuddy-checkin.ts` | WorkBuddy（腾讯 Buddy 加油站）每日积分签到，驱动官方客户端走 IPC 领取 |
| `scripts/workbuddy-cdp.ts` | WorkBuddy 客户端 CDP 调试工具，用于排查签到通道 |
| `scripts/run-mcode-checkin.cmd` | 计划任务入口：定位 bun 可执行文件后调用 mcode 签到脚本 |
| `scripts/run-workbuddy-checkin.cmd` | 计划任务入口：定位 bun 可执行文件后调用 WorkBuddy 签到脚本 |

签到脚本的运行方式、环境变量与计划任务管理见
[research/daily-checkin.md](./research/daily-checkin.md)。

## 快速开始（最短路径）

```bash
# vYtDL 桌面
task desktop:dev

# vYtDL CLI（需本地 checkout）
git clone https://github.com/qdriven/innate-vytdl.git vYtDL-standalone
task cli:build

# Web（Docker）
task web:up

# ContentForge CLI
task contentforge:build
source packages/contentforge-core/scripts/cf-env.sh
```

更多任务见根目录 `Taskfile.yml`（`task --list`）。
