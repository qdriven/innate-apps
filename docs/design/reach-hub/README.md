# Reach-Hub 设计：基于 Agent-Reach 的最新内容获取与分发中枢

> 状态：设计稿（2026-10-25，2026-10-31 因目录丢失完整重建），未开始实施
> 上游依赖：[services/agent-reach](../../../services/agent-reach)（submodule，已更新至 v1.6.0）
> 战略对齐：[docs/refactor/05-desktop-first-analysis.md](../../refactor/05-desktop-first-analysis.md)（desktop 宿主 + 插件平台）
> 约束对齐：[docs/refactor/convergence-decision.md](../../refactor/convergence-decision.md)（业务逻辑只存在于 Python 核心）

## 一句话

把 Agent-Reach 的 14 个平台渠道变成 keepthem 的**持续内容流**：订阅 → 定时拉取 →
统一数据层 → 桌面/Web 页面展示 → RSS 出口 / 多平台发布 / Bot 推送。

## 核心结论（先读这个）

| # | 决策 | 理由摘要 |
|---|------|----------|
| D1 | Reach-Hub 是**插件族**（一个 `reach-pulse` 插件包），不是新应用 | 复用已落地的插件内核（manifest + registry + StepHandler），符合 v2 desktop-first 方向，避免平行系统 |
| D2 | **三层数据分离**：Source（采集）→ Store（数据）→ Display（展示），层间只经查询 API | 换渠道不动存量数据，换 UI 不动采集，展示层零业务逻辑 |
| D3 | agent-reach 以**子进程 CLI + JSON envelope** 接入，不 import 其 Python 包 | 上游明示「CLI 是唯一契约」；进程隔离避免依赖地狱与 CloakBrowser 冲突 |
| D4 | RSS **双向**：入（`source:rss` 直连）+ 出（`publisher:rss_feed` 静态生成） | 入口沿用现有直连实现；出口与静态站点发布器天然互补 |
| D5 | 多平台发布走**既有 publisher 扩展点**（static_site / wechat_draft / xhs_note 已有，新增 rss_feed / telegram_notify / json_api） | 发布闭环已存在，Reach-Hub 只补新 target，不重建 |
| D6 | 订阅 = 数据模型（Subscription + DeliveryChannel），Bot = 一种 DeliveryChannel | 订阅管理与投递通道解耦，RSS 出口 / Telegram / Webhook 是同一机制的三个实例 |
| D7 | 桌面 = Tauri 宿主 + Python sidecar；Web = FastAPI 单进程容器托管静态前端 | 遵守收敛决策（Rust/Go 不写业务）；Web 侧单语言栈避免双进程桥 |
| D8 | **渠道分级**：无头渠道（web/rss/github/xueqiu…）双端可用；浏览器登录渠道（xhs/twitter/ins…）**仅桌面** | CloakBrowser 无法进 Docker headless，这是部署硬约束 |

## 文档索引

| 文档 | 内容 |
|------|------|
| [01-context.md](01-context.md) | 现状盘点：agent-reach v1.6 能力面、keepthem 插件平台现状、差距分析 |
| [02-architecture.md](02-architecture.md) | 总体架构：三层数据分离、模块划分、语言选型、与插件内核的映射 |
| [03-data-model.md](03-data-model.md) | 数据模型：subscriptions / content_items / delivery / publish_records，存储与迁移 |
| [04-source-layer.md](04-source-layer.md) | Source 层：ReachBridge、渠道适配、调度器、去重、登录状态机 |
| [05-display-layer.md](05-display-layer.md) | Display 层：keepthem 桌面页面（Feed/Digest/订阅管理/详情）、views 声明 |
| [06-publish-rss.md](06-publish-rss.md) | 发布层：多平台 publisher 矩阵、RSS 出口、发布审批流 |
| [07-subscription-bot.md](07-subscription-bot.md) | 订阅与 Bot：投递通道、digest 定时、Telegram bot 命令面、桌面/Web 差异 |
| [08-packaging.md](08-packaging.md) | 打包与分发：桌面（Tauri sidecar）、Web（Docker + FastAPI）、双端共享策略 |
| [09-roadmap.md](09-roadmap.md) | 实施路线图：R0–R5 阶段、验收标准、风险清单 |
| [10-ecosystem-survey.md](10-ecosystem-survey.md) | 生态调研：同类项目 Top10、易用 Top10、许可地图、11 处设计修正、「收集→转换→发布」落地选型 |

## 与既有代码的关系（避免误解）

- `services/agent-reach` submodule **已存在**，2026-10-25 将其从 v1.5.0 更新到
  v1.6.0（含 `read <url>`、`browser` 管理命令与 `PLATFORM_BLOCKED` 错误码）。
- `packages/contentforge-core/python/contentforge/ingestion/agent_reach.py` 中的
  「上游没有 fetch 子命令」注释**已过时**——v1.6 已有 `<channel> <action>` 统一入口；
  该模块按本设计重构为 ReachBridge 的直连降级路径（见 04-source-layer.md §6）。
- 本设计**不新增第三个应用**：桌面宿主沿用 `apps/contentforge-desktop`
  （v2 计划中演进为 keepthem-desktop），Web 形态按收敛决策第四节延后重启，
  但本设计给出完整方案（08）使其随时可启动。

## 重建说明（2026-10-31）

原设计文档因工作区目录丢失而损坏，本目录 10 份文档依据设计原文完整重写，
内容与 2026-10-25 版本一致。若仓库其他部分（docs/refactor、packages、apps 等）
同样丢失，本设计中的相对链接需在仓库恢复后核对。
