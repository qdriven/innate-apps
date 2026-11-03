# 01 — 现状盘点与能力面

## 1. Agent-Reach v1.6.0（services/agent-reach submodule）

### 1.1 命令面（CLI 是唯一契约）

```
agent-reach channels                                  # 渠道/动作/参数目录（JSON，实时事实源）
agent-reach <channel> <action> [args] [--json]        # 统一动作入口，如 bilibili search "大模型"
agent-reach read <url>                                # 按链接自动选渠道
agent-reach add|remove <channel>                      # 安装/卸载渠道及其工具链
agent-reach login|logout <channel>                    # 登录态管理（用户亲自登录，不碰密码）
agent-reach browser setup|status|stop|profiles|use    # 共享 CloakBrowser 管理
agent-reach doctor | check | skill | update | configure | uninstall
```

### 1.2 输出 envelope（所有命令打印恰好一个 JSON 对象）

```json
{
  "schema_version": 1,
  "ok": true,
  "channel": "bilibili",
  "action": "search",
  "backend": "bili-cli",
  "items": [ ... ],
  "meta": { "update": {"current": "1.6.0", "latest": "1.6.1"} },
  "error": null
}
```

错误码（`error.code`，agent 分支依据）：`NEED_SETUP` / `NEED_LOGIN` /
`UPSTREAM_BROKEN` / `TIMEOUT` / `RATE_LIMITED` / `PLATFORM_BLOCKED` /
`NOT_FOUND` / `BAD_INPUT` / `BUSY`。
其中 `RATE_LIMITED` 携带 `retry_after_seconds`；`FINAL_CODES`
（NOT_FOUND/BAD_INPUT/PLATFORM_BLOCKED/RATE_LIMITED/NEED_LOGIN/BUSY）换 backend 无意义。

### 1.3 渠道 × 动作矩阵（v1.6.0 实测源码提取）

| 渠道 | 动作 | 「最新内容」语义 | 登录要求 |
|------|------|------------------|----------|
| bilibili | search / read / hot / subtitle | hot=热榜，search=关键词最新 | 免登录（subtitle 或需登录） |
| boss | search / read | 职位搜索/详情 | 需登录 |
| facebook | search / profile | 账号动态 | 需登录（浏览器） |
| github | search / read | 仓库/issue 搜索 | 免登录（API） |
| instagram | search / profile / posts | posts=账号最新帖 | 需登录（浏览器） |
| linkedin | jobs / read | 职位 | 需登录（浏览器） |
| reddit | search / read / subreddit | subreddit=版块最新 | 免登录 |
| twitter | search / profile / tweets / thread | tweets=账号最新推文 | 需登录（浏览器） |
| v2ex | hot / node / read / user | hot=热榜，node=节点最新 | 免登录 |
| web | search / read | 通用网页/搜索 | 免登录 |
| xiaohongshu | search / read / comments | search=关键词最新笔记 | 需登录（浏览器） |
| xiaoyuzhou | transcribe | 播客转写 | 免登录 |
| xueqiu | quote / search / hot_posts / hot_stocks | hot_posts=热帖 | 免登录 |
| youtube | read / search / subtitle / transcribe | search=最新视频 | 免登录（字幕/转写耗时） |

**关键结论**：`hot` / `tweets` / `posts` / `subreddit` / `node` / `search` 六类动作
天然构成「持续拉取最新内容」的轮询原语；`read` / `subtitle` / `transcribe` 构成
「深读单条内容」的补全原语。Reach-Hub 的 Source 层就是围绕这两组原语建模。

### 1.4 会话与浏览器模型（部署约束的根源）

- 需登录渠道共享一个 CloakBrowser 实例（`~/.agent-reach/browser/profile`），
  后台运行不弹窗，闲置 10 分钟自动关闭；首次使用从 Chrome 复制站点登录（不读密码库）。
- `add <channel>` 会安装该渠道全部工具链（Node.js / OpenCLI / CloakBrowser / ffmpeg），
  无需管理员密码。
- **推论**：浏览器依赖决定了登录型渠道只能在「有桌面环境的机器」上运行——
  Docker 容器内无 CloakBrowser。这直接推导出决策 D8 的渠道分级。

## 2. keepthem 插件平台现状（已落地部分）

### 2.1 插件内核（packages/contentforge-core，P1 已完成）

- `pipeline/base.py`：`StepHandler` ABC（`execute(step, inputs, context) -> List[ContentUnit]`）。
- `pipeline/plugins/manifest.py`：Manifest v1（`id / stage(source|processor|publisher) /
  provides / entry("module:ClassName") / config_schema`），宽松校验。
- `pipeline/plugins/registry.py + loader.py + manager.py`：注册/装载/管理。
- 内置插件：sources（ingest / transcribe）、processors（analyze / filter / rewrite /
  summarize / tag / translate / xiaohongshu / custom）、publishers（static_site /
  wechat_draft / xhs_note）。
- 数据模型 `models.py`：`ContentUnit / SourceInfo / ContentType / PipelineStep /
  Pipeline / PipelineRun / PublishProfile`。

### 2.2 桌面宿主（apps/contentforge-desktop）

- 前端：Next.js + Zustand（agentStore / assetStore / chatStore），布局组件
  app-shell / app-sidebar / main-content；资产类型 `types/asset.ts` 已有
  filter / sort / pagination / group / selection 全套查询类型。
- Rust 侧：commands/{agent, ai, asset, chat, download, settings, video}，
  db/{assets, downloads, messages, pipeline_runs, sessions, settings}。
  `pipeline_runs` 表按收敛决策冻结保留，是桌面 run 历史的现成存储。

### 2.3 既有 agent-reach 集成（需要修正的认知）

`ingestion/agent_reach.py` 的 `AgentReachIngestor`：
- 注释断言「上游没有 fetch 子命令」——对 v1.5 及更早成立，**对 v1.6 不成立**。
- 现实路径：web→Jina、youtube→yt-dlp、rss→标准库直连，agent-reach 仅做体检。
- 设计处置：直连实现**保留为降级路径**（无 agent-reach 环境时 RSS/Web/YouTube 仍可用），
  v1.6 的渠道动作成为主路径（见 04-source-layer.md）。

### 2.4 Web 形态现状

`apps/vytdl-web`（Hono + better-sqlite3 + ws）是 vYtDL 产品线的 Web 宿主，
与 ContentForge 无共享。ContentForge 的 Server 形态按收敛决策**延后**，
触发条件：多端共享 / 远程调用 / 团队协作——Reach-Hub 的订阅/Bot/远程阅读需求
正是该触发条件的实例（见 08）。

## 3. 差距分析（Gap = 本设计要补的东西）

| # | 缺口 | 现状 | 目标 | 对应文档 |
|---|------|------|------|----------|
| G1 | 渠道动作主路径 | 仅 web/youtube/rss 直连 | 14 渠道经 CLI envelope 接入 | 04 |
| G2 | 持续订阅模型 | 无（pipeline 单次运行） | Subscription 常驻调度 + 去重 | 03/04 |
| G3 | 收件箱数据层 | ContentUnit 即产物，无原始层 | content_items 原始收件箱 + 产物关联 | 03 |
| G4 | 展示页面 | 无 Feed/订阅管理页 | Pulse 页面组（views 声明挂载） | 05 |
| G5 | RSS 出口 | 无 | publisher:rss_feed | 06 |
| G6 | 投递/订阅推送 | 无 | DeliveryChannel（rss/telegram/webhook/email） | 07 |
| G7 | 常驻进程模型 | 按需 spawn | 桌面 sidecar / Web 单进程常驻 | 08 |
| G8 | 双端打包 | 仅桌面 | 桌面安装包 + Web Docker 镜像 | 08 |
