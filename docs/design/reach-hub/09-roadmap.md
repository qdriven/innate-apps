# 09 — 实施路线图与风险

## 1. 阶段计划

排序逻辑沿用 v2 的「风险前置」：先用最小闭环证明 bridge + 调度 + 页面链路，
再横向铺渠道与投递，最后做 Web 形态。每阶段独立可验收、可停在半路不烂尾。

### R0（3–4 天）：ReachBridge 直通

| 项 | 内容 |
|----|------|
| 代码 | `reach/bridge.py` + `reach/catalog.py`（静态模板 14 渠道）+ 单测（mock envelope） |
| 验收 | 单测覆盖 8 错误码翻译、超时、并发闸门；真实环境对 bilibili/hot、v2ex/hot、github/search 冒烟通过 |
| 附带 | 修正 `ingestion/agent_reach.py` 的过时注释（「无 fetch」→ 指向 bridge） |

### R1（1 周）：最小闭环——一个订阅到页面

| 项 | 内容 |
|----|------|
| 代码 | store.py + `pulse_subscriptions/items` 表与迁移；`source:rss` + `source:reach` 插件（拉取→规范化→去重落库）；scheduler 骨架（tick 循环 + run_now，暂无退避）；桌面 `pulse.rs` IPC 薄层 + pulseStore + FeedStream 页面（只读流 + 已读/收藏） |
| 验收 | 桌面创建 1 个 RSS 订阅 + 1 个 bilibili/hot 订阅，scheduler 定时拉取，Feed 流展示新条目，收藏/已读持久化 |
| 刻意不做 | 深读、投递、digest、向导 UI（订阅先用 JSON 表单级 UI） |

### R2（1 周）：订阅管理 + 状态机 + doctor

| 项 | 内容 |
|----|------|
| 代码 | SubscriptionManager 页面 + 三步向导（catalog 驱动）；错误码状态机 + 退避全量；doctor 面板 + 首启向导（uv install / setup / add / login 引导）；i18n 三语言 |
| 验收 | needs_login/rate_limited/needs_setup 三种状态在 UI 正确呈现并可恢复；新用户从零安装到第一条 B站热榜进 Feed ≤ 10 分钟 |

### R3（1 周）：深读 + 处理链 + 发布闭环

| 项 | 内容 |
|----|------|
| 代码 | item_deepen（read/subtitle）；发布抽屉（DraftEditor + 处理链预览）；publish_dispatch + publish_records；平台渲染器（tweet/github/雪球/通用） |
| 验收 | 一条推文深读 → AI 摘要 → 改写 → 静态站点发布，全链路在页面内完成；发布历史可查 |

### R4（1 周）：RSS 出口 + 投递 + Digest

| 项 | 内容 |
|----|------|
| 代码 | publisher:rss_feed（RSS2/Atom）；DeliveryChannel/Rules/Runs 三表 + notifier（telegram 推送器 / webhook）；DigestView 页 + digest 定时任务（+email digest） |
| 验收 | 「小红书搜索」订阅 → rss_out 生成 feed → 外部阅读器（Miniflux）成功订阅并收到更新；Telegram 收到 instant 推送与每日 digest |

### R5（1–1.5 周）：Web 形态 + 交互 Bot

| 项 | 内容 |
|----|------|
| 代码 | apps/reach-web（FastAPI + 静态前端 + compose）；渠道 desktop_only 分级；Telegram 交互命令（/subs /latest /digest…）；CI 双产物（桌面三平台安装包 + Web 镜像） |
| 验收 | VPS 部署 docker compose 一条命令起服务；Bot 查询/暂停订阅可用；桌面与 Web 指向同一 /data 卷时数据一致 |

### R6（持续）：生态打磨

plugin init 模板适配 reach 类插件、新渠道渲染器众包、全文搜索（SQLite FTS5）、
更多投递通道（飞书卡片、Slack）、移动端 PWA（Web 形态天然支持）。

## 2. 里程碑与既有计划的关系

本路线图可直接嵌入 v2 计划（docs/refactor/05 §5）的 D 阶段序列：
R0–R1 ≈ D0 样板先行的 reach 版实例化（用真实插件证明 sidecar/IPC/回写闭环），
R2 的 views 挂载依赖 D2 View Registry（若 D2 未完成，R1–R2 以硬编码路由
先行、D2 落地后切声明式——两条路不冲突）。执行顺序建议：D0=R0+R1 合并跑。

## 3. 风险清单

| # | 风险 | 概率/影响 | 缓解 |
|---|------|-----------|------|
| 1 | agent-reach 上游 breaking change（envelope schema 变更） | 低/高 | 契约只有 envelope + schema_version；加 schema_version 守卫（≠1 即拒用并提示 update）；submodule 锁版本开发 |
| 2 | 平台风控升级导致渠道批量失效（UPSTREAM_BROKEN） | 中/中 | 错误码状态机如实降级；doctor 聚合呈现；降级路径保住 rss/web/youtube 基本盘 |
| 3 | CloakBrowser 在用户机器上安装/运行失败 | 中/中 | needs_setup 状态 + doctor 分步引导；无头渠道不受影响（分级设计 D8） |
| 4 | Python sidecar 打包体积/兼容性（mac 公证、win 杀软误报） | 中/中 | standalone Python 官方产物；预留「使用系统 Python」高级选项逃生舱 |
| 5 | 调度器在桌面休眠/关机期间漏拉 | 高/低 | 首启追赶 + next_run_at 重排（04 §3）；RSS 类天然可回补（feed 翻页） |
| 6 | 登录型渠道的账号安全（平台封号） | 低/高 | 文档明示建议小号（上游同建议）；PLATFORM_BLOCKED 绝不自动重试；投递默认摘要化 |
| 7 | 双端 schema 漂移 | 中/高 | 单一迁移器 + 双端共用 store.py（同构不变量的物理保证）；OpenAPI 契约测试 |
| 8 | 投递骚扰/失败风暴 | 中/低 | 速率限制 + 单轮合并 + 失败 2 次退避、3 次禁用通道并 doctor 告警 |

## 4. 立即可做的下一步

1. 合入 `services/agent-reach` submodule 指针更新（v1.5.0 → v1.6.0，
   2026-10-25 已完成 checkout，需 commit submodule 引用）。
2. R0 开工：bridge + catalog + 单测（纯新增代码，不触碰既有功能，可并行评审）。
3. 修正 `ingestion/agent_reach.py` 过时注释，避免后续开发者被误导。
