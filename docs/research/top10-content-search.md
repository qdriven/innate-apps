# 内容检索与采集同类项目调研：Top 10 榜单与媒体内容工具构建分析

> 状态：调研报告（2026-11-01）
> 基准项目：[references/agent-reach](../../references/agent-reach)（Panniantong/Agent-Reach v1.6.x，107k+ ★）
> 战略衔接：[docs/design/reach-hub/](../design/reach-hub/README.md)（基于 Agent-Reach 的内容获取与分发中枢设计）
> 数据说明：Star 数、语言、License、最近推送时间均于 **2026-11-01** 通过 GitHub API（gh CLI）实测获取。

---

## 1. 调研背景与基准

### 1.1 Agent-Reach 是什么

Agent-Reach 的定位是「**让 AI Agent 够得着它自己上不去的互联网**」：

- **登录墙平台**：小红书、X/Twitter、Reddit、LinkedIn、Boss 直聘等，用专用浏览器复用登录态；
- **视频内容**：B站/YouTube 字幕、YouTube 视频/小宇宙播客的语音转文字；
- **中文平台**：B站、小红书、V2EX、雪球，补齐通用搜索的盲区；
- **干净的结构化数据**：统一 JSON envelope（`{schema_version, ok, channel, action, backend, items, meta, error}`），一条命令 `agent-reach <channel> <action>` 拿到结果。

它的核心设计是「**每个平台 = 首选 + 备选的有序工具列表**」（降级链），CLI 是唯一契约。

### 1.2 「相同类型」的界定

本报告把与 Agent-Reach 同类型的项目界定为：**为 AI Agent / 开发者提供「互联网内容检索、读取、采集」能力的工具**。据此将候选池划分为八类：

| # | 类别 | 代表 | 与 Agent-Reach 的关系 |
|---|------|------|----------------------|
| A | Agent 联网统一入口（CLI/MCP） | OpenCLI、Firecrawl、Crawl4AI、Jina Reader | **直接同类**：统一入口 + 标准化输出 |
| B | 浏览器自动化（登录墙兜底） | browser-use、Stagehand、Skyvern | 能力重叠：Agent 操作真实浏览器 |
| C | 中文社媒深度采集 | MediaCrawler、xiaohongshu-mcp、TikTokDownloader | 平台深度更强，但无统一入口 |
| D | 媒体下载与转写 | yt-dlp、gallery-dl、Douyin_TikTok_Download_API、faster-whisper | Agent-Reach 的底层工具，向上封装 |
| E | 免登录订阅化（RSS） | RSSHub、newsnow、Folo | 免登录内容流的另一条路线 |
| F | 搜索 API / 元搜索 | SearXNG、Exa、Tavily | Agent-Reach `web` 渠道的上游 |
| G | 格式转换（内容加工） | markitdown、docling、trafilatura、doocs/md | 流水线「转换」环节 |
| H | 发布与编排 | Wechatsync、social-auto-upload、biliup、n8n、Easel | 流水线「发布」环节 |

> 范围说明：纯阅读器（Folo/FreshRSS/Miniflux）与纯编排平台（n8n/Huginn）属于上下游邻接形态，不进同类 Top 10，但在第 6 章构建分析中参与选型。

### 1.3 调研方法

1. 以 Agent-Reach 的渠道 × 动作矩阵（见 `01-context.md` §1.3）为能力基准；
2. GitHub API 实测 40+ 候选仓库的 Stars / License / 活跃度 / 归档状态；
3. 网络调研 2026 年同类项目生态与对比文章，补充新项目（Easel、chubbyskills 等）；
4. 双榜打分：**综合榜**看同类契合度 + 能力覆盖 + 社区活跃 + 工程成熟度；**易用榜**看安装 / 配置 / 登录 / 输出即用性 / 维护负担（5 分制 × 5 维度）。

---

## 2. 同类项目 Top 10（综合榜）

> 排序综合考虑：与 Agent-Reach 的同类契合度、能力覆盖面、社区规模与活跃度、工程成熟度。Star 数为 2026-11-01 实测。

| 排名 | 项目 | Stars | 语言 | License | 类型 | 核心能力一句话 |
|---|------|-------|------|---------|------|----------------|
| 1 | [Firecrawl](https://github.com/firecrawl/firecrawl) | 197.4k | TypeScript | AGPL-3.0 | A/F | 网页→LLM 数据的事实标准：搜索、抓取、提取、MCP，云 + 自托管双形态 |
| 2 | [Crawl4AI](https://github.com/unclecode/crawl4ai) | 86.7k | Python | Apache-2.0 | A | 开源 LLM 友好爬虫：任意网站→干净 Markdown，Docker/API/库三形态 |
| 3 | [browser-use](https://github.com/browser-use/browser-use) | 119.7k | Python | MIT | B | Agent 浏览器自动化标杆：登录墙平台的通用兜底方案 |
| 4 | [MediaCrawler](https://github.com/NanmiCoder/MediaCrawler) | 69.3k | Python | 自定义（非商用） | C | 中文社媒深采事实标准：小红书/抖音/快手/B站/微博/贴吧/知乎的笔记+评论 |
| 5 | [OpenCLI](https://github.com/jackwener/OpenCLI) | 30.8k | JavaScript | Apache-2.0 | A | 任意网站→CLI，复用本机已登录浏览器（Agent-Reach 的上游内核） |
| 6 | [RSSHub](https://github.com/DIYgod/RSSHub) | 46.7k | TypeScript | AGPL-3.0 | E | 「万物皆 RSS」：1000+ 路由把中文平台免登录转成订阅源 |
| 7 | [Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) | 21.0k | Python | Apache-2.0 | D | 抖音/TikTok/B站自托管 API：无水印下载 + MCP + 离线语音转文字，Docker 一键 |
| 8 | [xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) | 16.7k | Go | Apache-2.0 | C | 小红书 MCP：搜索、读笔记/评论，且支持**发布**（读发一体） |
| 9 | [Jina Reader](https://github.com/jina-ai/reader) | 12.2k | TypeScript | Apache-2.0 | A/F | URL 加前缀 `r.jina.ai/` 即得 LLM 友好 Markdown，最轻的标准件 |
| 10 | [TikTokDownloader](https://github.com/JoeanAmier/TikTokDownloader) | 17.3k | Python | GPL-3.0 | D | 抖音/TikTok 作品下载与数据采集 CLI，交互式配置向导 |

### 2.1 逐项点评（为什么进榜、定位、注意点）

**1. Firecrawl** — 同类天花板。`search / scrape / crawl / extract / map` 五个原语覆盖了 Agent-Reach `web` 渠道的全部语义，且输出直接是 LLM-ready Markdown/JSON；MCP server（7.7k ★）+ Python/Node SDK + 自托管 Docker，生态最完整。注意：核心 AGPL-3.0，自托管后对外提供服务需开源；云版按量计费（免费额度有限）。

**2. Crawl4AI** — 开源自托管路线的第一名。与 Firecrawl 的差别是「本地优先」：pip 安装、浏览器池管理、结构化抽取（CSS/XPath/LLM）都在自己机器上，无 API 费。Apache-2.0 对商业集成最友好。与 Agent-Reach 的 `web` 渠道构成「云（Jina/Exa）→ 本地（Crawl4AI）」降级链的自然备选。

**3. browser-use** — 登录墙兜底的标准方案。Agent-Reach 的浏览器渠道（xhs/twitter/instagram…）本质上是「固定脚本的浏览器自动化」，browser-use 则是「Agent 自由决策的浏览器自动化」。当某平台没有现成渠道时，它是最短的补位路径。注意：需要 LLM 驱动，单次任务成本与耗时高于固定脚本；同样面临平台风控。

**4. MediaCrawler** — 中文平台深度第一。七平台 × 笔记/视频/评论三种对象，基于 Playwright 真实登录抓取，数据字段最全（含评论树、点赞、话题标签）。Agent-Reach 的 xiaohongshu 渠道只读正文+评论，MediaCrawler 能做**批量关键词矩阵采集**。注意：License 为自定义非商用条款（仅学习研究）；需扫码登录 + Playwright 环境；「仅供学习」定位，生产使用需自行评估合规。

**5. OpenCLI** — 同形态最直接的项目，Agent-Reach 的公开致谢与上游依赖。理念完全一致：把网站变成 CLI、复用已登录浏览器、JSON 输出给 Agent。差异在于 Agent-Reach 在其上做了「渠道封装 + 降级链 + 中文平台适配」的产品化。适合作为通用底座研究其「网站→CLI」的抽象方式。

**6. RSSHub** — 免登录内容流的最广覆盖。对「不需要登录墙内数据、只要公开动态」的场景，RSS 轮询比浏览器方案稳定一个数量级（无登录态过期、无风控）。B站/微博/知乎/B站 UP 主/播客等均有路由。AGPL-3.0；公共实例限流，生产建议自托管。

**7. Douyin_TikTok_Download_API** — 媒体（音视频）采集向最完整的自托管方案：异步 REST API + MCP server + CLI + Web 控制台 + 离线语音转文字 + Docker compose 一键。与 Agent-Reach 无抖音渠道正好互补（Agent-Reach 覆盖 B站/YouTube 但无抖音）。

**8. xiaohongshu-mcp** — 单平台做深 + 读写双能力的代表。Go 实现、MCP 接入对 Agent 最友好；Agent-Reach 只读不写，本项目补齐「发布」能力，是第 6 章发布环节的重要候选。注意：发布动作有账号风控风险，务必走人工确认。

**9. Jina Reader** — 最轻的标准件。零部署、零代码，URL 前缀即用；Agent-Reach 的 `web` 渠道首选 backend 就是它。作为「保底阅读器」与 Exa/Crawl4AI 组成降级链。注意：免费额度有限、重 JS 页面偶发解析失败；开源仓 2026-05 后更新放缓，但线上服务持续可用。

**10. TikTokDownloader** — 抖音/TikTok 单平台数据采集的成熟 CLI：作品下载、元数据、批量任务、交互式向导。与 #7 的差别是「CLI 工具形态 vs API 服务形态」。GPL-3.0。

### 2.2 落选说明（有意的取舍）

| 项目 | Stars | 不进同类 Top 10 的原因 |
|------|-------|----------------------|
| yt-dlp | 204.2k | 定位是纯下载器，无检索/结构化语义；但它是媒体流水线的地基，见易用榜与构建篇 |
| markitdown | 193.2k | 纯格式转换（文件→Markdown），无采集能力；进构建篇「转换」层 |
| docling | 69.9k | 同上，文档（PDF/Office）→Markdown/JSON，构建篇转换层 |
| ScrapeGraphAI | 32.4k | LLM 图谱爬虫方向重叠，但社区活跃度与产出质量近一年下滑 |
| Stagehand / Skyvern | 25.9k / 23.3k | 浏览器自动化方向与 browser-use 重叠，生态位靠后 |
| newsnow | 22.2k | 热榜聚合阅读形态，无采集 API；进易用榜与构建篇 |
| wechat-article-exporter | 13.1k | 单平台专项（公众号批量下载）；构建篇专项方案 |
| SearXNG | 39.1k | 元搜索引擎，需自部署；构建篇搜索层组合件 |
| Exa MCP / Tavily MCP | 5.2k / 2.5k | 云搜索 API，无采集面；进易用榜与构建篇搜索层 |
| Folo / FreshRSS / Miniflux | 39.2k / 16.5k / 9.9k | 阅读器形态，非采集工具 |
| Easel | 4.2k | 全流程（发现→策划→创作→发布→归因）运营助手，非「检索采集」同类；构建篇重点参考 |
| chubbyskills | 1.3k | 14 个中文全渠道采集 Skill 集（视频/播客转 Markdown + 知识库），形态是 Skill 包非服务；构建篇参考 |
| n8n / Huginn | 209.2k / 50.2k | 编排平台，非检索采集同类；构建篇编排层对比 |
| wewe-rss | 9.6k | **已归档（2026-03）**，公众号 RSS 需求转向 wechat-article-exporter |
| bilibili-API-collect | 20.2k | **已归档（2026-01）**，API 文档资料库，非工具 |

---

## 3. 易用性 Top 10（使用方便简单榜）

> 评分维度（各 1–5 分，5 = 最省心）：**安装**（依赖与步骤）、**配置**（参数/环境变量）、**登录**（是否需要账号/扫码）、**输出**（是否拿到即用）、**维护**（失效概率与升级负担）。

| 排名 | 项目 | 安装 | 配置 | 登录 | 输出 | 维护 | 总分 | 一句话理由 |
|---|------|:---:|:---:|:---:|:---:|:---:|:---:|------|
| 1 | [Jina Reader](https://github.com/jina-ai/reader) | 5 | 5 | 5 | 5 | 5 | 25 | 零安装：URL 加前缀 `https://r.jina.ai/<url>` 直接返回 Markdown |
| 2 | [Firecrawl（云 API / MCP）](https://github.com/firecrawl/firecrawl) | 5 | 5 | 5 | 5 | 4 | 24 | 拿 API key 后 `npx firecrawl-mcp` 一行接入 Claude/Cursor；自托管才变重 |
| 3 | [Tavily](https://github.com/tavily-ai/tavily-mcp) | 5 | 5 | 5 | 4 | 5 | 24 | `pip install tavily-python` + key 即搜索/提取/爬取；为 Agent 搜索而生 |
| 4 | [Exa MCP](https://github.com/exa-labs/exa-mcp-server) | 5 | 5 | 5 | 4 | 5 | 24 | `npx exa-mcp-server` + key；神经搜索语义质量高 |
| 5 | [markitdown](https://github.com/microsoft/markitdown) | 4 | 5 | 5 | 5 | 5 | 24 | `pip install markitdown` → `markitdown x.pdf > x.md`，零配置转换 |
| 6 | [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 4 | 5 | 5 | 4 | 5 | 23 | 单文件 CLI 覆盖 1000+ 站点，`yt-dlp <url>` 即下载；偶需升级到最新版 |
| 7 | [RSSHub](https://github.com/DIYgod/RSSHub) | 5 | 4 | 5 | 4 | 4 | 22 | 公共实例零部署（URL 即 RSS）；自托管 Docker 一键但路由质量参差 |
| 8 | [newsnow](https://github.com/newsnext/newsnow) | 4 | 4 | 5 | 5 | 4 | 22 | Docker 一键部署的实时热榜阅读应用，开箱即用（阅读形态，非 API） |
| 9 | [wechat-article-exporter](https://github.com/wechat-article/wechat-article-exporter) | 5 | 4 | 3 | 5 | 4 | 21 | 在线网站直接用 / Docker，微信扫码即可批量导出公众号文章 |
| 10 | [Crawl4AI](https://github.com/unclecode/crawl4ai) | 3 | 4 | 5 | 5 | 4 | 21 | `pip install crawl4ai && crawl4ai-setup` 后 Python API 简洁；需 Playwright 初始化 |

> 注：newsnow 总分 22 与 RSSHub 相同，因「阅读形态、无 API 输出」在流水线中适配性略低，故排后。

**基准对照 —— Agent-Reach 本身约 17/25**：安装（3，需 Agent 代为执行 install.md）、配置（3，渠道分级管理但概念多）、登录（2，浏览器渠道需本人扫码）、输出（5，统一 JSON envelope 全场最佳）、维护（4，`doctor/check/update` 齐备）。**它牺牲了「零配置」，换来的是 15 渠道统一契约——这正是自建工具要保留的核心价值。**

**复杂度梯度总览**（从简到繁）：

```
Jina Reader（零安装）
  < Firecrawl/Tavily/Exa 云 API（一个 key）
  < markitdown / yt-dlp（单机 CLI）
  < RSSHub / newsnow / wechat-article-exporter（一个 Docker）
  < Crawl4AI / Agent-Reach（CLI + 浏览器 + 部分扫码登录）
  < xiaohongshu-mcp / social-auto-upload（Playwright + 扫码）
  < MediaCrawler（Playwright + 多账号 + 非商用限制）
  < 自托管 Firecrawl 全功能 / Easel 全流程
```

---

## 4. 对比矩阵：核心候选 × 关键维度

| 项目 | 免登录可用 | 中文平台 | 登录墙平台 | 音视频/转写 | 结构化输出 | 部署形态 | License 风险 | 主要短板 |
|------|:---:|:---:|:---:|:---:|:---:|------|------|------|
| Agent-Reach（基准） | 部分 | ★★★ | ★★★（浏览器） | ★★★（字幕+转写） | ★★★ JSON envelope | CLI | MIT | 实验渠道易碎；只读 |
| Firecrawl | ✔ | ☆ | ☆ | ✗ | ★★★ | 云/自托管/MCP | AGPL | 中文社媒不覆盖 |
| Crawl4AI | ✔ | ☆ | ☆ | ✗ | ★★★ | 本地库/Docker | Apache-2.0 | 无登录墙渠道 |
| browser-use | ✗ | ☆ | ★★★ | ✗ | ★★（自定 schema） | Python 库 | MIT | 慢、贵、需 LLM |
| MediaCrawler | ✗ | ★★★ | ★★★（Playwright） | ✗ | ★★（SQLite/CSV/DB） | Python 脚本 | 非商用 | 学习定位；风控 |
| OpenCLI | 部分 | ★★ | ★★（复用登录） | ☆ | ★★ CLI | CLI | Apache-2.0 | 单站适配广度有限 |
| RSSHub | ✔ | ★★★ | ☆ | ☆ | ★★（RSS） | 云/Docker | AGPL | 登录墙内拿不到 |
| Douyin_TikTok_Download_API | ✔ | ★★ | ☆ | ★★★（含转写） | ★★★ REST/JSON | Docker/API/MCP | Apache-2.0 | 平台面窄（抖/B站） |
| xiaohongshu-mcp | ✗ | ★★★（小红书） | ★★（扫码） | ✗ | ★★ JSON/MCP | Go 服务 | Apache-2.0 | 单平台 |
| Jina Reader | ✔ | ☆ | ☆ | ✗ | ★★★ Markdown | 云（前缀即用） | Apache-2.0 | 免费额度；重页面偶失败 |
| TikTokDownloader | ✗ | ★★ | ★（扫码） | ★★（下载） | ★★ CSV/SQLite | CLI | GPL-3.0 | 单平台；配置项多 |
| yt-dlp | ✔ | ★★ | ☆（部分需 cookie） | ★★★（下载/抽流） | ★★（元数据 JSON） | CLI | Unlicense | 无检索语义 |

---

## 5. 构建分析：用这些项目搭「媒体内容收集 → 转换 → 发布」工具

### 5.1 总体流水线

结合调研结论与 [reach-hub 设计](../design/reach-hub/README.md)（订阅 → 定时拉取 → 统一数据层 → 展示 → RSS 出口/多平台发布/Bot 推送），推荐四段式流水线：

```
┌─ 收集层 ────────────┐   ┌─ 转换层 ───────────┐   ┌─ 存储调度 ─┐   ┌─ 发布层 ──────────┐
│ L1 免登录通道        │   │ 网页/文档→Markdown │   │ content_item│   │ RSS 出口          │
│  RSSHub / Exa /     │ → │  Jina/Crawl4AI/    │ → │ SQLite/     │ → │ 图文：Wechatsync/ │
│  Tavily / SearXNG   │   │  markitdown/docling│   │ 统一 schema │   │  doocs-md/xhs-mcp │
│ L2 统一契约通道      │   │ 音视频→文字        │   │ 订阅轮询+去重│   │ 视频：social-auto- │
│  agent-reach CLI    │   │  yt-dlp+ffmpeg+    │   │ 限速退避     │   │  upload / biliup  │
│ L3 深采/媒体兜底     │   │  faster-whisper    │   │             │   │ 投递：TG Bot/      │
│  MediaCrawler/xhs-  │   │ 发布格式适配       │   │             │   │  Webhook/静态站   │
│  mcp/yt-dlp/DouyinAPI│  │  doocs-md          │   │             │   │ （审批流前置）     │
└─────────────────────┘   └────────────────────┘   └─────────────┘   └───────────────────┘
```

设计原则（与 reach-hub D2/D3/D8 一致）：**三层数据分离**（Source→Store→Display，层间只过查询 API）；**agent-reach 以子进程 CLI + JSON envelope 接入**（不 import 其 Python 包）；**渠道分级**（无头渠道双端可用，浏览器登录渠道仅桌面宿主）。

### 5.2 收集层：三级通道组合

| 通道 | 选型 | 何时用 | 依据 |
|------|------|--------|------|
| L1 免登录 | **RSSHub**（自托管）+ **Exa/Tavily MCP** + **SearXNG** | 公开动态、热榜、搜索发现；占日常流量的大头 | 最稳：无登录态过期、无风控；RSS 轮询 = reach-hub 的 `source:rss` 直连 |
| L2 统一契约 | **agent-reach CLI**（15 渠道） | B站/YouTube/小红书/V2EX/雪球/GitHub/Reddit 等；`hot/search/tweets/posts/subreddit/node` 六类动作即轮询原语，`read/subtitle/transcribe` 即深读原语 | CLI 是唯一契约，JSON envelope 已统一 schema 与错误码（NEED_LOGIN/RATE_LIMITED 等可直接驱动状态机） |
| L3 深采兜底 | **MediaCrawler**（批量矩阵）+ **xiaohongshu-mcp** + **Douyin_TikTok_Download_API**（抖音）+ **yt-dlp/gallery-dl**（媒体文件）+ **browser-use/OpenCLI**（无渠道平台） | 需要全量评论树、批量关键词历史采集、抖音（agent-reach 无此渠道）、或全新平台 | 单平台深度 + 通用兜底；`read <url>` 识别不了的链接落到这里 |

**降级链设计**（借鉴 Agent-Reach「首选+备选」理念）：每个平台的抓取配置为一个有序列表，如

```yaml
xiaohongshu: [agent-reach, xiaohongshu-mcp, MediaCrawler]
douyin:      [Douyin_TikTok_Download_API, TikTokDownloader]
web_read:    [jina_reader, exa_extract, crawl4ai_local]
```

后端返回 `RATE_LIMITED` / `UPSTREAM_BROKEN` 时自动切换，`FINAL_CODES` 类错误（NOT_FOUND/BAD_INPUT/PLATFORM_BLOCKED）不重试。自建渠道（如抖音）用 L3 项目的 API 包一层同款 envelope 即可无缝并入。

### 5.3 转换层：一切归一为 Markdown + 附件

| 输入 | 工具链 | 产物 |
|------|--------|------|
| 网页 URL | Jina Reader → Crawl4AI（本地降级） | 正文 Markdown + 元数据（标题/作者/发布时间/源 URL） |
| PDF / Office / HTML | **markitdown**（轻）→ **docling**（重，含表格/版面解析） | Markdown + 图片抽出 |
| 视频（B站/YouTube/抖音） | **yt-dlp** 下载 → **ffmpeg** 抽音频 → **faster-whisper**（本地 GPU/CPU）或 Groq/OpenAI Whisper API（快） | 字幕优先（B站/YouTube 直接拿字幕，零转写成本）→ 无字幕才转写；产出带时间戳文字稿 |
| 播客（小宇宙） | agent-reach `xiaoyuzhou transcribe`（Groq key） | 文字稿 |
| 图片 | gallery-dl / yt-dlp 抽封面 | 本地附件 + 相对路径引用 |
| 发布适配 | **doocs/md**（公众号排版主题） | 平台特定格式（公众号 HTML、小红书卡片文案） |

**转换统一约定**：所有产物 = `content.md`（YAML front-matter 携带 source_url/channel/author/published_at/channel_item_id，用于去重与回链）+ `assets/` 附件目录。这就是 reach-hub `content_items` 数据模型在文件层的投影，采集与展示层都不再关心来源差异。

### 5.4 存储与调度

- **存储**：SQLite 单文件（content_items / subscriptions / delivery_channels / publish_records 四张表，模型见 `03-data-model.md`）；Markdown 原文落盘（Obsidian/任意编辑器可直接读）。
- **去重**：`source_url` 唯一索引 + 内容指纹（标题+发布时间哈希）；轮询原语天然产生增量。
- **调度**：cron/定时器按订阅驱动 L1/L2 通道；错误码驱动状态机（`NEED_LOGIN` → 通知用户人工登录；`RATE_LIMITED` → 按 `retry_after_seconds` 退避）。
- **合规节奏**：默认限速（同平台请求间隔 ≥ 数秒）、只读优先、发布动作全部走人工审批（见 5.5）。

### 5.5 发布层：按内容形态选 target

| 形态 | 工具 | 说明 |
|------|------|------|
| RSS 出口 | 静态生成（reach-hub `publisher:rss_feed`） | 自有订阅产物，零风控零依赖，第一个落地 |
| 图文 → 微信公众号 | **doocs/md**（排版）+ 人工粘贴；或公众号草稿 API（wechat_draft publisher） | 公众号无开放自动发布，草稿箱 + 群发确认是安全边界 |
| 图文 → 多平台同步 | **Wechatsync**（浏览器插件：知乎/头条/WordPress/掘金/CSDN…） | 插件形态复用真实登录，风控风险最低 |
| 图文 → 小红书 | **xiaohongshu-mcp**（发布笔记） | ⚠️ Easel 实测结论：小红书会检测自动化，建议预览后**人工确认发布** |
| 视频 → 抖音/视频号/B站/YouTube/TikTok | **social-auto-upload**（Playwright 批量上传） | MIT；账号配 cookie，定时发布 |
| 视频 → B站投稿 | **biliup**（命令行投稿，多 P、边录边传） | Rust，稳定 |
| 通知投递 | Telegram Bot / Webhook / 邮件（reach-hub DeliveryChannel） | 订阅摘要 digest 的推送面 |
| 全流程参考 | **Easel**（发现→策划→创作→发布→归因，113 个 Skill） | 直接发布到各平台的工程细节与风控处理值得抄；其「归因」闭环是增强方向 |

**发布审批流**（强制）：所有写操作（发布/上传/发帖）一律 `生成 → 预览 → 人工确认 → 执行 → 记录 publish_records`。风险从低到高排序：RSS 出口 < TG Bot < 知乎/头条同步 < 公众号草稿 < 小红书发布；平台账号一律用小号。

### 5.6 编排层：三种路线

| 路线 | 代表 | 适合 | 代价 |
|------|------|------|------|
| 低代码编排 | **n8n**（400+ 集成，RSS/HTTP/Telegram 节点齐全） | 一周内跑通 MVP、验证订阅源与投递链 | 复杂转换/降级链逻辑在低代码里很快失控 |
| Python 自研核心 | **reach-hub 方案**（插件族：manifest + registry + StepHandler） | 长期主线：业务逻辑收敛在 Python 核心，桌面（Tauri sidecar）+ Web（FastAPI）双宿主 | 前期工程量 |
| Agent 驱动 | **Easel** / **chubbyskills**（Skill 包 + Agent 调度） | 语义级任务（选题、摘要、改写、归因） | 非 Agent 场景无解；成本高 |

**推荐**：MVP 用 n8n 串「RSSHub/agent-reach → markitdown → Telegram」验证价值（2–3 天）；主线按 reach-hub 设计自研，把 n8n 阶段验证过的订阅/去重/投递规则平移成插件；Agent 层作为「语义加工」插件挂在转换层之后（调 chubbyskills 类 Skill 做摘要/选题）。

### 5.7 风险与合规清单

1. **License**：AGPL（Firecrawl/RSSHub/Folo）自托管并对外提供服务需开源修改；MediaCrawler 为**非商用自定义条款**；GPL 系（TikTokDownloader/gallery-dl）以独立进程调用可规避传染。对外发布产物时统一走 MIT/Apache 自研层。
2. **平台风控**：浏览器登录渠道（xhs/twitter/ins/抖音）全部存在风控；缓解 = 小号 + 限速 + 随机化间隔 + 发布走人工 + 平台告警即停。Agent-Reach 的 `PLATFORM_BLOCKED` 错误码应直接触发「停轮询、通知用户」。
3. **上游易碎性**：中文平台改版频繁。应对 = 降级链 + `doctor/check` 巡检（Agent-Reach 已内建）+ L1 RSS 通道作为大盘兜底。
4. **内容版权**：采集内容默认私域存储/摘要引用，全文转发布前确认授权；RSS 出口只含自产或授权内容。
5. **隐私**：登录态/Cookie 只存本机 `~/.agent-reach/` 同类目录；Key 走配置文件不进聊天与代码库。

---

## 6. 结论

1. **综合榜口径**：Firecrawl / Crawl4AI / browser-use 是「通用网页→Agent 数据」三强，MediaCrawler / xiaohongshu-mcp / TikTokDownloader / Douyin_TikTok_Download_API 是「中文平台深度」四件套，OpenCLI 是同形态上游，RSSHub + Jina Reader 是免登录保底——十项拼起来恰好覆盖 Agent-Reach 的全部能力面并补齐其缺口（抖音、发布、批量矩阵）。
2. **易用榜口径**：云 API（Jina/Firecrawl/Tavily/Exa）与单机 CLI（markitdown/yt-dlp）构成「十分钟可用」的第一梯队；凡是要扫码登录、跑 Playwright 的都掉到第二梯队。Agent-Reach 本身易用性中等，但它的**统一 JSON envelope + 渠道分级 + 降级链**是自建工具必须继承的三件套。
3. **构建路线**：收集层用「L1 免登录 RSS/API + L2 agent-reach 统一契约 + L3 深采兜底」三级通道；转换层一切归一 Markdown（字幕优先、转写兜底）；发布层按形态选 target 且强制人工审批；MVP 用 n8n 验证、主线按 reach-hub 插件族自研。该结论与 `docs/design/reach-hub/` 的 D1–D8 决策互相印证，未发现需要推翻的设计点；新增结论主要是 L3 兜底候选（MediaCrawler/Douyin_API/xiaohongshu-mcp）与发布层工具矩阵（Wechatsync/social-auto-upload/biliup/doocs-md/Easel）。

## 附：数据来源

- GitHub API（gh CLI，2026-11-01 实测）：各项目 Stars/License/最近推送/归档状态
- [Agent-Reach README](https://github.com/Panniantong/agent-reach) 与 `references/agent-reach/llms.txt`
- [Nocobase：开源 AI Agent 工具对比（2026-10）](https://www.nocobase.com/blog/github-open-source-ai-agent-tools-16)
- [Easel README](https://github.com/ZJU-REAL/Easel)（发布风控实测结论：小红书自动发布存在验证/限流风险）
- [Chubby Skills README](https://github.com/chubbyguan/chubbyskills)（中文全渠道采集 → Markdown 知识库的 Skill 形态参考）
- 本仓库关联设计：[reach-hub 设计稿](../design/reach-hub/README.md)
