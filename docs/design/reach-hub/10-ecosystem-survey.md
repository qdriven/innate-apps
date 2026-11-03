# 10 — 生态调研与落地选型：同类项目 Top10、易用榜与「收集→转换→发布」工具构建

> 状态：调研稿（2026-11-01）
> 参考项目：[Agent-Reach](../../references/agent-reach)（MIT，★107,213）
> 关联文档：[01-context.md](01-context.md) ~ [09-roadmap.md](09-roadmap.md) 本目录 9 份既有设计
> 数据来源：GitHub REST API（`gh api repos/...`）逐仓库实测；许可证取仓库 `LICENSE` 原文；
> 平台 API 门槛取各平台官方文档；正文抽取质量引 SIGIR 2025 多语言抽取器评测

---

## 0. 调研口径与免责

| 维度 | 口径 |
|------|------|
| 「同类型」 | 与 Agent-Reach 解决**同一问题域**：让 AI Agent / 自动化程序获得「受登录墙与反爬保护的媒体内容」并结构化输出；含**强同类**（可直接替代/补齐 Reach-Hub 某个渠道或层）与**邻接**（可借鉴或可作为服务调用） |
| Top10 排序权重 | 同类型相关性 40% + 社区规模与活跃度 25% + 对 Reach-Hub 的可集成性 20% + 许可友好度 15% |
| 易用榜排序 | 只按「从零到跑起来」的人力成本升序：安装步骤数 × 必需凭据数 × 是否需外部服务 × 是否需人工过审 |
| 星标数 | 2026-11-01 实测；★ 值为量级，非精确计数用途 |
| 未确认项 | 仓库 404 / 闭源 / 无法核实的结论一律标「未确认」，**不参与排序打分** |

---

## 1. Top 10 同类型项目

### 1.1 总表（按同类型相关性排序）

| # | 项目 | ★ | 许可 | 语言 | 最近推送 | 它解决 Reach-Hub 的哪一环 | 同类型度 |
|---|------|---|------|------|---------|--------------------------|--------|
| 1 | **Agent-Reach** | 107,213 | MIT | Python | 2026-10-25 | 基准本身：14 平台统一 CLI + JSON envelope | 基准 |
| 2 | **yt-dlp** | 204,219 | Unlicense | Python | 2026-10-29 | 媒体源底座：1700+ 站点元数据/字幕/音频；`--cookies-from-browser` 破登录墙 | 强同类 |
| 3 | **OpenCLI** | 30,798 | Apache-2.0 | JavaScript | 2026-10-26 | Agent-Reach 的浏览器层底座（`agent_reach/backends/opencli.py` 直接依赖） | 强同类 |
| 4 | **MediaCrawler** | 69,280 | **非商用学习许可** | Python | 2026-10-27 | 中文平台采集最强：小红书/抖音/B站/快手，笔记详情 + 评论树 | 强同类 |
| 5 | **RSSHub** | 46,742 | **AGPL-3.0** | TypeScript | 2026-10-31 | 源接入：实测 **998 个路由命名空间**（`lib/routes/` 目录数），含 `wechat/`(12)、`xiaohongshu/`(5)、`bilibili/`、`douyin/`、`zhihu/` | 强同类 |
| 6 | **xiaohongshu-mcp** | 16,689 | Apache-2.0 | Go | 2026-10-26 | 单平台 MCP 形态：证明「登录态平台 → MCP」这条路可行且许可干净 | 强同类 |
| 7 | **TrendRadar** | 63,331 | GPL-3.0 | Python | 2026-10-29 | **中文最完整的情报管线参照**：热榜+RSS 采集 → 关键词/AI 打分筛选 → 存储 → HTML/Markdown 报告 → 9 通道推送 → AI 分析，附 17 工具 MCP | 强同类 |
| 8 | **Crawl4AI** | 86,661 | Apache-2.0 | Python | 2026-10-30 | 通用网页层：LLM 友好的 Markdown 输出，许可干净 | 邻接 |
| 9 | **Firecrawl** | 197,402 | **AGPL-3.0** | TypeScript | 2026-10-31 | 抓取即服务 + MCP + 自托管；适合「不想自己维护浏览器」的外部服务 | 邻接 |
| 10 | **newsnow** | 22,200 | MIT | TypeScript | 2026-10-13 | 中文热榜 API，TrendRadar 的上游数据源；MIT 许可、极轻 | 邻接 |

### 1.2 榜单外但必须知道的候选

| 项目 | ★ | 许可 | 为什么在榜外 |
|------|---|------|-------------|
| **Easel** | 4,243 | Apache-2.0 | **唯一覆盖「发现→策划→创作→发布→归因」全链路的中文开源实现**，113 个 Skills，真实发布到小红书/抖音/快手/知乎/B站/视频号/公众号（详见 §5.0） |
| **social-auto-upload** | 15,974 | MIT | 发布层专用：抖音/小红书/视频号/TikTok/YouTube/B站 浏览器自动化上传 |
| Douyin_TikTok_Download_API | 21,030 | Apache-2.0 | 自托管 REST + MCP + CLI + 离线 ASR，一条 `docker compose up`，身份池自愈 |
| Scrapling | 90,866 | BSD-3 | 自适应反爬 + 浏览器指纹伪装，**可替代 CloakBrowser** |
| CloakBrowser | 32,654 | MIT | Agent-Reach 同款隐身 Chromium（Playwright 替身），同一浏览器层 |
| chubbyskills | 1,290 | MIT | 14 个 Skill：抖音/B站/小红书/公众号/X/播客 → 知识库 + KB MCP |
| qiaomu-opencli-skills | 997 | MIT | OpenCLI 适配器技能集：知乎/雪球/BOSS/V2EX 等，补齐 Agent-Reach 平台缺口 |
| bilibili-mcp | 45 | Apache-2.0 | B站字幕/评论/UP主/收藏夹，无字幕时本地 faster-whisper 转写（项目很新） |
| Spider_XHS | 8,332 | **无 LICENSE** | 小红书逆向（笔记/评论/私信/直播），**默认保留所有权利，商用不可用** |
| wx_channels_download | 10,282 | MIT + **Commons Clause** | 微信视频号无水印下载；Commons Clause 禁止转售为服务 |
| wechatDownload | 9,931 | **无 LICENSE** | 公众号文章批量下载（md/pdf/docx/csv）+ 评论，支持 MCP/Skill |
| x-twitter-scraper | 225 | MIT | X 推文/主页抓取 + Twitter MCP，非官方、条款风险 |
| Stagehand | 25,891 | MIT | Browserbase 的 AI 浏览器驱动，工程价值高但属通用浏览器层 |
| Skyvern | 23,324 | AGPL-3.0 | 视觉驱动的浏览器自动化，部署重 |
| Crawlee | 26,304 | Apache-2.0 | 爬虫框架底座，与 Crawl4AI 重叠 |
| Scrapy | 65,140 | BSD-3 | 经典爬虫框架，但已非 AI Agent 首选路径 |
| Folo (RSSNext) | 39,204 | AGPL-3.0 | 现代 RSS 阅读器，消费端而非采集端 |
| Miniflux | 9,863 | Apache-2.0 | 聚合器，Collect 层底座候选（见 §5.2） |
| Postiz | 40,362 | AGPL-3.0 | 发布层最优基座，但**不支持任何中国平台**（见 §4.2） |
| n8n | 209,211 | fair-code（**非 OSI**） | 编排层，规模化后许可会成为产品化障碍 |
| Fabric | 44,516 | MIT | 提示词即插件的 AI 转换层，MIT 许可最友好 |
| Quivr | 39,624 | MIT | 插件协议设计最贴题（HTTP 契约 + Go/Python 双 SDK） |
| Horizon | 11,122 | MIT | AI 新闻雷达，`uv` + 交互式向导，上手体验最好的一档 |
| TikTokDownloader | 17,258 | GPL-3.0 | 单平台下载器，已被 yt-dlp 生态部分覆盖 |
| lux | 31,814 | MIT | 视频下载库，**最后 release v0.24.1 = 2024-05，维护停滞** |
| you-get | 56,864 | **无 LICENSE** | 老牌通用下载器，release 停在 2025-01 |
| gallery-dl | 20,300 | GPL-2.0 | 图集批量下载，图源专用 |
| Autoclip | 9,898 | MIT | 长视频 → 短视频 + 字幕 + 发布文案（转换层） |
| biliup | 5,572 | MIT | B站投稿 + 直播录制（Rust） |
| TikHub SDK | 930 | Apache-2.0 | 抖音/TikTok/小红书/快手/微博/IG/YT/X 统一 API；**SDK 开源 ≠ 服务开源，服务闭源收费** |

### 1.2.1 已失效 / 不可列入选型的项（2026-11-01 实测）

| 项目 | 状态 |
|------|------|
| **SocialDL**（原 `Soongyu/SocialDL`） | **404，疑似删库或改名**；账号 `Soongyu` 仓库列表为空，同名仅剩 3★ 以内的 fork |
| **bilibili-API-collect** | **已 archived（2026-01）**，仅作参考 |
| **lux** | 最后 release 2024-05，近乎停滞 |
| **you-get** | release 停在 2025-01，且无 LICENSE |
| **MediaCrawler_MCP_Server** | 停在 2025-08，不建议依赖 |
| **ScrapingBee 官方 MCP** | **不存在**，只有 n8n/Scrapy/Amazon 等 recipe 仓库 |
| **FiveFilters Full-Text RSS** | 2016 年停更 |
| **Mercury Parser** | 2024-07 停更 |
| **reor / Onyx(Danser)** | reor 2025-05 后停更；Onyx 需 PG+ES+Redis，索引膨胀过重 |


### 1.3 榜单读法：三类「同类型」

```
        同类型项目
   ┌──────────┼──────────┐
   ▼          ▼          ▼
强同类       邻接       已被 Reach-Hub 覆盖
(可补位)    (可借鉴/     (只需知道存在)
            可当服务)
```

- **可补位**：MediaCrawler（中文平台深度）、xiaohongshu-mcp（MCP 形态）、RSSHub（源接入广度）。
  这些是 Reach-Hub **不必自研**的能力——但各有许可约束（见 §4.1）。
- **可借鉴**：TrendRadar（管线范式 + 推送通道）、Crawl4AI（抽取质量）。
- **可当服务**：newsnow / Firecrawl / Jina Reader——HTTP 调用，不进代码库。

---

## 2. Top 10 最易用项目（上手成本升序）

| # | 项目 | ★ | 许可 | 起步动作 | 必需凭据 | 外部依赖 | 上手成本 |
|---|------|---|------|---------|---------|---------|---------|
| 1 | **Jina Reader** | 12,216 | Apache-2.0 | `curl https://r.jina.ai/<url>` | 无（免 key 约 20 RPM） | 无（也可自托管） | ★☆☆☆☆ |
| 2 | **yt-dlp** | 204,219 | Unlicense | `brew install yt-dlp` 后直接跑 | 无 | 无 | ★☆☆☆☆ |
| 3 | **newsnow** | 22,200 | MIT | 调公开 API / 一条 `docker run` | 无 | 无 | ★☆☆☆☆ |
| 4 | **Miniflux** | 9,863 | Apache-2.0 | `docker compose up`（含 Postgres） | 无 | Postgres | ★★☆☆☆ |
| 5 | **FreshRSS** | 16,470 | AGPL-3.0 | 一条 `docker run` | 无 | 无（内置 SQLite） | ★★☆☆☆ |
| 6 | **RSSHub** | 46,742 | AGPL-3.0 | 一条 `docker run -p 1200:1200 diygod/rsshub` | 无（部分路由要 cookie） | 无 | ★★☆☆☆ |
| 7 | **kill-the-newsletter** | 3,117 | MIT | 邮件转发地址 → Atom | 一个邮箱 | 无 | ★★☆☆☆ |
| 8 | **Horizon** | 11,122 | MIT | `uv sync` → `uv run horizon-wizard` 交互向导 | 无（AI 分析可选配 key） | 无 | ★★★☆☆ |
| 9 | **TrendRadar** | 63,331 | GPL-3.0 | `docker compose up -d` 或直接用 GitHub Actions | 无（AI 分析/推送可选） | 无（Actions 方案需 R2 存历史） | ★★★☆☆ |
| 10 | **Karakeep** | 30,201 | AGPL-3.0 | `docker compose up -d` | 无 | Postgres + Meilisearch | ★★★☆☆ |

**榜单之外但请注意**：

- **n8n**（209,211★）：`docker run` 本身很轻，但每个社交渠道都要配 OAuth + 过审，**真实成本在凭据不在部署**。
- **Postiz**（40,362★）：`docker-compose.yaml` 实测含 **9 个容器**（postiz + postgres:17 + redis:7.2 + temporal server/postgres/elasticsearch/admin-tools/ui + spotlight），再叠加**每个平台各自注册 App 并过审**（Meta / YouTube / TikTok 可达数周）——**部署容易、启用极难**，是「上手成本」的反面教材。
- **MediaCrawler**（69,280★）：非商用许可 + 需要扫码登录 + Cookie 有效期短，**研究友好、生产受限**。
- **Firecrawl**（197,402★）：自托管要 Docker + Redis，自带云端版按量计费；本地起一份能跑，但要接 API key。
- **Easel**（4,243★）：`bash setup.sh` 需 Node + FFmpeg + Playwright Chromium + OpenClaw，**但有 `easel doctor` / `easel ping` 自检与非交互安装模式（适合 CI）**，上手体验在同类里属上乘。

---

## 3. 六个关键结论（决定了 §5 的选型）

### 3.1 许可地图：AGPL 是「只调服务，不抄代码」的红线

| 许可 | 项目 | 对 Reach-Hub 的含义 |
|------|------|-------------------|
| **AGPL-3.0** | RSSHub、Firecrawl、Postiz、FreshRSS、Karakeep、Folo、Linkwarden、SingleFile、Omnivore、Skyvern | 网络服务传染：**只允许 HTTP 调用，禁止 fork/抄代码/改后闭源分发**。作为独立服务部署在用户自己机器上是安全的 |
| **非商用学习许可** | MediaCrawler | 明确「仅学习与研究」「不得大规模爬取」「未经书面同意不得商用」→ **商业路径完全不可用**，只能做技术参照 |
| **Commons Clause** | wx_channels_download（MIT + Commons Clause） | 禁止把软件作为服务转售 → 不可进任何对外提供服务的路径 |
| **SSPL-1.0** | browserless | 闭源商用需购买商业许可；可自托管但不可对外提供服务 |
| **GPL-3.0** | TrendRadar、TikTokDownloader、tt-rss、biliup | 同源分发即传染；**只借鉴设计、不复制代码** |
| **fair-code（非 OSI）** | n8n（Sustainable Use License） | 内部自用免费，**对外做 SaaS 受限**；产品化需换 Activepieces(MIT) 或纯自研 |
| **无 LICENSE（默认保留所有权利）** | you-get、Spider_XHS、wechatDownload、videodl、bilibili-API-collect、firecrawl/cli、crawlbase-mcp | **GitHub 视为「保留所有权利」，默认无使用授权**，商用前须向作者取得书面许可 |
| **宽松** | Agent-Reach(MIT)、OpenCLI(Apache-2.0)、yt-dlp(Unlicense)、RSS-Bridge(Unlicense)、Fabric(MIT)、Quivr(MIT)、Miniflux(Apache-2.0)、Crawl4AI(Apache-2.0)、trafilatura(Apache-2.0)、Jina Reader(Apache-2.0)、xiaohongshu-mcp(Apache-2.0)、Douyin_TikTok_Download_API(Apache-2.0)、Scrapling(BSD-3)、CloakBrowser(MIT)、Easel(Apache-2.0)、social-auto-upload(MIT)、newsnow(MIT)、Horizon(MIT)、wallabag(MIT)、kill-the-newsletter(MIT)、gpt-researcher(Apache-2.0) | 可自由依赖 |


> **给设计的硬约束**：Reach-Hub 若要闭源产品化，AGPL 项目只能出现在「用户自建服务的 URL」配置项里，绝不能进 `packages/contentforge-core` 的依赖树。

### 3.2 中文正文抽取：trafilatura 在中文场景反而落后

SIGIR 2025 多语言主内容抽取评测（400 篇中文语料）：

| 抽取器 | 英文 | 中文 |
|--------|------|------|
| Readability | ~0.90 | **0.672** |
| trafilatura | 0.883 | **< 0.56** |

中文 F1≤0.5 时 99% 的页面至少被一个抽取器判为失败（英文仅 40%）。根因：中文无空格、段落文本密度低于启发式阈值，正文被误判成侧栏。

**微信公众号的三层额外防御**（必须浏览器渲染，静态抽取拿不到正文）：

1. `robots.txt` 禁止外部索引；
2. **渲染环境隔离** —— 文章不存在于公网公开 URL，只在微信 App 内 WebView 可访问；
3. UA + Referer 校验 —— 非微信内置浏览器 UA 或非 App 内跳转 Referer 直接拒绝；
4. **正文懒加载** —— 服务端 HTML 正文区是空骨架，滑到哪段才请求哪段。

小红书同理：前端渲染 + 登录态双重门槛。

**结论**：分层降级是唯一解 —— `trafilatura`（本地主力）→ `readability-lxml`（中文离线兜底）→ `Jina Reader`（浏览器渲染兜底，可自托管）→ 公众号/小红书专用 Playwright 带登录态通道。

### 3.3 去重必须三层，单靠 URL 指纹不够

| 层 | 方法 | 阈值 | 规模 | 成本 |
|----|------|------|------|------|
| Tier 1 | URL 规范化 + SHA1 精确哈希 | 相等 | 任意 | ≈0 |
| Tier 2a | SimHash 64bit | **Hamming ≤ 3** | 10 万~百万级 | CPU，O(n) |
| Tier 2b | MinHash-LSH | **Jaccard ≥ 0.7** | 同上 | CPU，略慢于 SimHash |
| Tier 3 | Embedding 余弦 | 0.98 / 0.95 | 语义级 | CPU 上比 MinHash 慢约 20× |

关键工程手法：

- **SimHash 用「核心片段」而非全文**：前 1000 字符 + 中间 500 字符 + 后 1000 字符拼块再算，避免导航/页脚噪声稀释特征。
- **SimHash 必须配倒排索引**：按 64 位分段建索引，把 O(n²) 两两比较转为索引查询。
- **Embedding 只在跨源同事件不同表述时才开**；本地 GPU 在 >200 万 token/天 时回本。
- **URL 规范化要扩展**：Wallabag 的做法是 `sha1(urldecode(url))` + `hashed_given_url` 双列、(user_id, hash) 复合索引——但它只做 urldecode，**不处理 utm 剥离、AMP 后缀、尾斜杠、微信的 `&chksm`/`&scene=` 噪声**，自研时必须扩展。

### 3.4 AI 转换层：本地模型已经够用，Provider 抽象是唯一必须

- 云 API（GPT-4o 输入 $2.50/M、Claude 3.5 Sonnet $3/M）：月 5000 万 token ≈ 年 $125k~200k。
- 本地 RTX 4090 跑 70B-4bit ≈ 30 tok/s，硬件 ≈$1,800 + 电费 $20-30/月 → 有效 **$0.10~0.50/M token**。
- **盈亏平衡：月 >1000 万 token，6~12 个月回本**。
- 2026 年可用性：Qwen3.8-27B（Apache-2.0）4-bit ≈ 17GB 塞进 24GB 显存；**量化从 Q8_0 降到 2-bit 仅损失 2.9 个百分点**，无断崖。
- 质量：70B 级模型做「摘要/改写/打标」，与顶级闭源的差距**在生产中往往难以察觉**——摘要任务本身不需要旗舰模型。

→ **唯一必须做对的事**：统一 Provider 接口（OpenAI 兼容端点即可覆盖绝大多数本地推理框架），本地与云只差 `base_url`，同一 pipeline 双跑。

### 3.5 中国平台的「自动发布」是结构性问题，不是技术问题

| 平台 | 官方发布 API 现状 | 结论 |
|------|------------------|------|
| **小红书** | `post_note` 存在，但面向笔记/视频发布的接口**不对普通第三方自助开放**，能力以电商/品牌服务为主 | **结构性不可行** |
| **知乎** | 开放平台全量审计中，唯一带 POST 语义的 4 个接口均与发布无关；发布 API **仅对内侧用户开放** | **结构性不可行** |
| **即刻** | 未查到公开发布 API | 不可行（未确认） |
| **微信公众号** | 服务号草稿箱 API **完整可用**（`draft/add,update,get,batchget,delete,count,switch`）；群发需已认证企业主体 + IP 白名单 + 发布前内容安全检测；订阅号 1 次/天、服务号 4 次/月，额度不可撤回 | **草稿全自动；群发必须人工点** |
| **B站** | `arcopen/fn/archive/add-by-utoken`（scope `ARC_BASE`，HMAC-SHA256 签名 2.0）；非正式会员单日最多 5 个稿件 + 审核期 | 可控但受限 |
| **微博** | `statuses/update`、`statuses/upload` 存在；需审核（80×80 图标 + 3 张截图 + 授权用户 >10 人 + 接口调用 >500 次） | 审核通过后可自动 |
| **抖音** | 发布接口有，但未审核应用仅私密发布；需企业主体资质并逐项开权限 | 高门槛 |

海外限额（2026-10 官方文档）：X API v2 已转按量计费（发帖 $0.015、带链接 $0.20——链接贵 13 倍，建议放首条回复）；IG 仅专业号（100 API 帖/24h）；Threads 250 帖/24h；LinkedIn 必须带 `LinkedIn-Version` 头且版本会 sunset；Reddit 仅 OAuth app、商用需签合同；YouTube Data API 10,000 units/天；**Bluesky 无需审核、300 字，最易自动化**。

### 3.6 关键澄清：「无公开 API」≠「不能自动发布」

上面的结论只针对**官方 API**。但生态里已有一类**浏览器自动化发布**（Playwright + 已登录账号 Cookie），它绕开 API 门槛，代价是账号风控风险：

| 项目 | ★ | 许可 | 做法 | 平台覆盖 |
|------|---|------|------|---------|
| **Easel** | 4,243 | Apache-2.0 | Playwright Chromium 驱动已登录账号 | 小红书、抖音、快手、知乎、B站、微信视频号、微信公众号（7 个） |
| **social-auto-upload** | 15,974 | MIT | 浏览器自动化上传 | 抖音、小红书、视频号、TikTok、YouTube、B站 |

Easel 官方 README 的使用提示值得逐字抄进 Reach-Hub 的设计：

> ⚠️ **谨慎自动发布到小红书**：小红书平台可能检测自动化操作，存在验证、限流或账号风控风险；
> 建议使用预览与发布前检查，并由用户确认后手动发布，其他平台正常。

**结论**：Reach-Hub 的 Publish 层必须分**两档**，而不是一刀切：

| 档 | 手段 | 适用平台 | 风险 | 默认 |
|----|------|---------|------|------|
| **Tier-A 官方 API 自动发布** | 平台开放 API | X/Threads/LinkedIn/Reddit/Bluesky/YouTube/微博(过审后)/B站/公众号草稿 | 低（额度/审核可控） | 可全自动 |
| **Tier-B 浏览器自动化发布** | Playwright + 已登录账号 | 小红书/知乎/快手/视频号/公众号群发 | **高（风控、封号、平台条款）** | **默认人工确认，需显式开启** |
| **Tier-C 草稿导出** | 生成内容 + 人工提交到官方发布页 | 全部国内平台 | 最低 | 兜底 |

这与 agent-reach 上游「建议用小号登录」的立场一致，也与 Easel 的 `EASEL_PUBLISH_MODE=manual` 开关设计一致（人工路径 = AI 排版 → 人工审核 → 复制/导出 → 官方发布页亲自提交）。


---

## 4. 对标分析：Reach-Hub 现状与生态位

### 4.1 Reach-Hub 现有设计的 11 处修正建议（C5′ 为 C5 的细化）

| # | 现状（见 01~09） | 生态事实 | 建议 |
|---|----------------|---------|------|
| **C1** | `source:rss` 仅「标准库直连」（04 §6） | 中文平台的 RSS 化已由 RSSHub 解决（998 个路由命名空间，含 `wechat/` 12 条、`xiaohongshu/` 5 条、`bilibili/`、`douyin/`、`zhihu/`） | 保留标准库直连作零依赖保底，**新增 `source:rsshub` 插件**（HTTP 拉用户自建 RSSHub 实例）；AGPL 约束下只能以 URL 配置形式接入 |
| **C2** | `deepen` 只走 `bridge.read/subtitle`，**无通用正文抽取层** | agent-reach 的 `read` 返回平台正文，不是网页全文；公众号/小红书还需浏览器渲染 | 新增 `processor:extract`：trafilatura → readability-lxml → Jina Reader 三层降级；公众号/小红书走 Playwright 带登录态专用通道 |
| **C3** | 去重仅一级 fingerprint（external_id → normalized url → title hash） | 只能去「同一 URL」；跨源同事件、改写稿去不掉 | 补 SimHash（核心片段法 + 倒排索引，Hamming ≤ 3）与可选 Embedding 层；URL 规范化需扩展 utm/AMP/chksm/scene |
| **C4** | processor 层提到 summarize/translate，但**无统一 LLM Provider 抽象** | 本地 70B 已够用（量化到 2-bit 仅损失 2.9 个百分点） | 定义 OpenAI 兼容 Provider 接口 + `base_url` 切换；默认本地 Qwen3.8-27B，云端按需切换；**同一 pipeline 双跑** |
| **C5** | 06 假设 `publish_xhs_note` / `publish_wechat_draft` 复用既有 publisher | 小红书**无公开发布 API**；公众号**群发**受额度/认证/白名单限制 | Publish 层对国内平台**统一降级为「生成草稿 → 人工确认 → 发布」**；全自动只给海外平台与 RSS/静态站点出口。此约束必须写死进数据模型与 UI |
| **C5′** | 未区分「官方 API 发布」与「浏览器自动化发布」 | Easel/social-auto-upload 证明浏览器自动化能发小红书/知乎/视频号，但平台会检测 | Publish 层分 **Tier-A 官方 API / Tier-B 浏览器自动化 / Tier-C 草稿导出** 三档（见 §3.6）；Tier-B 默认关闭，需用户显式开启并接受风控提示 |
| **C9** | 数据模型（03 §2）**没有「账号画像 / Profile」实体** | Easel 的核心资产是账号画像：定位、风格、受众、平台、偏好与红线、长期记忆，六维目录 `profiles/<name>/`；同一画像跨平台跨会话复用 | 新增 `pulse_profiles` 表（用户 × 平台 × 定位/风格/受众/红线/记忆），改造链的 prompt 按 profile 渲染，产出物归档到 profile 而非全局 |
| **C10** | 发布流程（06 §2）只有「人工终审」一步编辑器内改字 | Easel 有独立的 **`quality-gate` 质量门禁** skill：敏感词/版权风险/平台格式/搜索优化检查 + 发布 Checklist；且提供 `EASEL_PUBLISH_MODE=manual` 全局开关 | 拆出 `processor:quality_gate` 步骤（可复用、可跳过、可作为发布前必跑项）；发布器支持 `auto` / `manual` 两种模式且可全局降级 |
| **C11** | 能力组织用 plugin manifest（stage/provides/entry） | 生态另一条路线是 **Skill 包**（`SKILL.md` + 可运行脚本）：chubbyskills(14 Skills)、Easel(113 Skills)、qiaomu-opencli-skills。特点是把「一组步骤 + 提示词 + 脚本」打包成 Agent 可直接装载的能力 | 插件内核保留（业务唯一实现处），但**每个 plugin 额外产出同名 Skill 描述文件**，让外部 Agent（Claude Code/Codex/OpenClaw）能直接装载本工具的能力 —— 与 agent-reach 的 `agent-reach skill link` 机制同构 |

| **C6** | 未讨论与 Postiz 的关系 | Postiz（40,362★）官方 34 平台清单**不含任何中国平台**（实测其代码库对 `xiaohongshu`/`weibo`/`bilibili`/`douyin`/`zhihu`/`wechat` 的全文搜索命中数均为 **0**）；Public API 限 30 req/h；AGPL；compose 实测 9 个容器 | 出站策略：**海外出站接 Postiz（或自写 Adapter），国内自写 Provider**。Postiz 只能作为可选外部适配器，不能是内核依赖 |
| **C7** | `pulse_publish_records` 有 status/result，但字段较薄 | Postiz 的 `state`(QUEUE/PUBLISHED/ERROR/DRAFT) + `error`（**平台原始拒绝原因**）+ `releaseURL` + **`releaseId="missing"` 反查回填**机制 | 补 `state` 枚举 + `error_raw`（存平台原话）+ `release_id` + `release_url`；实现「平台未返回帖子 ID → 拉平台近期内容反向匹配回填」，解决「发成功但拿不到 ID → 无法去重/统计」 |
| **C8** | 依赖策略未提许可 | AGPL 系（RSSHub/Firecrawl/Postiz/FreshRSS/Karakeep/Folo）、MediaCrawler 非商用、n8n fair-code | 在设计里加**依赖许可登记表**：哪些可 fork、哪些只能 HTTP 调用、哪些绝对不可进商业路径 |

### 4.2 Reach-Hub vs TrendRadar：各自的强与弱

| 维度 | TrendRadar（63,331★，中文） | Reach-Hub（设计稿） |
|------|---------------------------|------------------|
| 源覆盖 | 热榜（依赖 newsnow API）+ RSS 订阅 | 14 平台登录墙深读 + RSS + 字幕/转写 |
| 内容深度 | **标题级**（热榜标题 + 链接 + 排名轨迹） | **正文级**（read/subtitle → 全文回填） |
| 筛选 | 关键词 + **AI 兴趣描述打分**（v6.5 起，AI 失败自动回退关键词） | 无（设计里是 processor 链的 filter/tag） |
| 调度 | `timeline.yaml` 时段调度，5 套预设（早晚报/办公/夜猫/全天），跨午夜、工作日/周末差异化 | `interval_sec + jitter` 的固定间隔轮询 |
| 存储 | 本地 `output/` 或 S3/R2（Actions 场景必配） | SQLite（桌面同库 / Web 卷挂载） |
| 输出 | HTML 报告（暗色模式/搜索/全屏/导出）+ Markdown + 邮件 | Feed 流 / Digest 页 / RSS 出口 / Bot 推送 |
| 推送通道 | **9 个**：飞书、钉钉、企微、Telegram、邮件、ntfy、Bark、Slack、通用 Webhook | 5 个：RSS 出口、Telegram、webhook、email、feishu |
| 发布 | **无内容发布**（只推给自己） | 多平台内容发布（草稿/改写/发布审计） |
| 服务化 | MCP Server，17 个工具，STDIO + HTTP 双模式 | 插件内核 + 桌面/Web 双端 |
| 部署 | Docker 或 GitHub Actions（**零服务器**） | Tauri 桌面 + Docker Web |

**结论：两者是互补而非替代。**

- Reach-Hub 的**增量**在：正文深度（可改写可发布）、内容发布闭环、开放 RSS 出口（登录墙平台 → 标准 feed）、双端同构。
- Reach-Hub 应**直接抄**的：AI 兴趣打分筛选（比关键词强得多，且有自动回退）、时段化调度预设、9 通道推送的**实现成本极低**（ntfy/Bark/钉钉/企微/Slack 本质都是 webhook）、MCP 服务化（把 Store 层查询暴露成工具）、GitHub Actions 零服务器部署档。
- TrendRadar 的**软肋**正是 Reach-Hub 的设计点：只到标题级 → 不能改写；依赖 newsnow 单一上游（作者已明说"无需担心服务器压力"是基于善意）→ 应支持自建（v6.9 已加 `api_url` 配置）。

### 4.3 三份「最值得直接抄」的设计

| 来源 | 抄什么 | 为什么 |
|------|--------|--------|
| **RSSHub 的 route 模型** | `route` 元数据 + `handler` 二元组；**声明式能力开关** `features: {requireConfig, requirePuppeteer, antiCrawler, supportBT}`；`DataItem` 标准字段（title/link/description/pubDate/author/category/guid/media）；`maintainers` 归属；命名空间目录懒加载 | 声明式 `features` 让「这个源要不要浏览器/要不要 cookie/有没有反爬」在**注册时就说清**，调度器据此路由到不同执行池——正好对接 Reach-Hub 的 D8 渠道分级 |
| **Karakeep 的 tag 模型** | `tagStyle`（`lowercase-hyphens`/`as-generated`）+ `inferredTagLang` + **curatedTags 人工词表** + **potentialRelevantTags 候选集注入**；prompt 资产化（`prompts.ts` 用户可编辑） | 把现有标签喂回提示词以**防标签通胀**，比自写提示词成熟得多；且提示词可被用户编辑 = 产品化 Transform 层 |
| **Postiz 的发布记录** | `state` 枚举 + `error` 存平台原话 + `releaseId="missing"` 反查回填 + `/posts/settings` 合并**不重启在跑流程** | 直接对应 Reach-Hub `pulse_publish_records` 的字段设计（见 C7） |

---

## 5. 「收集 → 转换 → 发布」工具的构建分析

### 5.0 先看答案：这件事已经有开源实现，Reach-Hub 不必从零开始

生态里已有**两个直接可对标的完整实现**，做第三方分析（2026-11-01 实测）：

| | **Easel**（ZJU-REAL/Easel） | **social-auto-upload**（dreammis/social-auto-upload） |
|---|---|---|
| ★ / 许可 | 4,243 / **Apache-2.0** | 15,974 / **MIT** |
| 覆盖 | **发现 → 策划 → 创作 → 发布 → 归因** 五层，113 个 Skills | 单点：**浏览器自动化上传** |
| 平台 | 小红书、抖音、快手、知乎、B站、微信视频号、微信公众号（7 个，**真实发布**） | 抖音、小红书、视频号、TikTok、YouTube、B站 |
| 采集 | 全网热搜聚合、垂类趋势、竞品分析、RSS 聚合、UGC 发现 | 无（只发不收） |
| 转换 | 文案/卡片/海报/信息图/视频/短剧/配音/字幕/去 AI 感改写/风格迁移 | 无 |
| 账号资产 | **账号画像**（定位/风格/受众/平台/偏好红线/长期记忆），目录 `profiles/<name>/` | 仅存登录 Cookie |
| 质量控制 | `quality-gate` skill：敏感词 + 版权风险 + 平台格式 + 搜索优化 + Checklist；`EASEL_PUBLISH_MODE=manual` 全局降级开关 | 无 |
| 部署 | `bash setup.sh` 引导式（Python 3.10+ / Node / FFmpeg / Playwright Chromium），FastAPI + React 工作台（:7860） | 一条命令 |
| 宿主 | **OpenClaw Agent**（独立 `easel` profile） | 无 |

**这个发现改变了 Reach-Hub 的定位判断：**

1. **Reach-Hub 不该再造一个「采集→发布」工具**——Easel 已经把发布端的中国平台硬问题（浏览器自动化、风控、格式适配）趟了一遍，Reach-Hub 的增量价值在**采集深度（正文级 + 字幕/转写）与开放 RSS 出口**，不在发布端。
2. **Reach-Hub 与 Easel 是互补的**：Easel 强在「创作与发布」，弱在「原始内容收集」（它的发现层是热榜聚合 + RSS，**没有登录墙平台的正文级采集**）；Reach-Hub 强在「持续订阅 + 正文深读 + 双端同构 + 标准 feed 出口」。
3. **最省事的组合拳**：把 Reach-Hub 做成「内容供给侧」，把 Easel（或 social-auto-upload）当「发布侧适配器」——但 Easel 是 OpenClaw 宿主、Apache-2.0 许可干净，**可借鉴/可集成；social-auto-upload 是 MIT，许可最自由**。
4. **Easel 的架构印证了 Reach-Hub 的方向**：Agent + Skills + 账号画像 + 质量门禁 + 人工审核双路径 + 产物按项目归档，与 Reach-Hub 的「三层分离 + 插件内核 + 发布抽屉 + publish_records 审计」是同一套思路的两种表达。差异只在 Reach-Hub 把展示层做成了桌面/Web 双端同构。

### 5.1 三层定位与 Reach-Hub 的对应

```
┌─ Collect 收集 ────────────────────────────────────────────────┐
│  平台登录墙源        RSS/热榜源          通用网页源
│  agent-reach CLI  ┐  ┌──────────────┐  ┌─────────────────────┐ │
│  (14 渠道 envelope)│  │ RSSHub 实例 │  │ trafilatura →      │ │
│  yt-dlp 降级路径 ┘  │ (HTTP 调用)  │  │ readability → Jina  │ │
│                     └──────┬───────┘  └──────────┬──────────┘ │
│                            │  Standard RSS      │             │
│                            └────────┬───────────┘             │
│                             source:rss / source:rsshub         │
│                                     ▼                          │
│  去重三层：URL 规范化+SHA1 → SimHash → (可选) Embedding        │
│                                     ▼                          │
│                    Store：content_items（规范化 + raw 原文）    │
└───────────────────────────────────────────────────────────────┘
┌─ Transform 转换 ─────────────────────────────────────────────┐
│  processor:extract   正文抽取（分层降级）                      │
│  processor:summarize / translate / tag   ← 统一 LLM Provider   │
│  processor:xiaohongshu / wechat   平台风格改写（prompt 资产化）│
│  processor:transcribe  yt-dlp → faster-whisper → SRT           │
└───────────────────────────────────────────────────────────────┘
┌─ Publish 发布 ────────────────────────────────────────────────┐
│  投递（给自己/读者）        内容发布（发出去）                   │
│  RSS 出口 / Telegram       海外：Postiz 适配器 或 自写 Adapter   │
│  webhook / email / feishu  国内：自写 Provider                   │
│                            ↑ 一律「草稿 → 人工确认 → 发布」       │
│  publish_records 审计（state / error_raw / release_id）         │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 各层技术选型（明确「用什么」与「不做什么」）

**Collect 层**

| 角色 | 选择 | 不做什么 |
|------|------|---------|
| 平台登录墙源 | 保持 **agent-reach CLI + JSON envelope**（D3 不变，CLI 即契约） | 不 import 其 Python 包；不 fork |
| 媒体元数据降级 | **yt-dlp**（Unlicense，许可最干净） | 不自研站点适配 |
| RSS 生成 | **RSSHub 作为外部 HTTP 服务**（用户自建，填 URL） | **不 fork、不抄路由代码**（AGPL）；不自建路由体系 |
| RSS 消费底座 | 若要做通用聚合能力，**Miniflux**（Apache-2.0）已内置去重/抓原文/CSS 规则/REST API | 不自建 RSS 聚合器 |
| 正文抽取 | **trafilatura**（主力）→ **readability-lxml**（中文兜底）→ **Jina Reader**（渲染兜底，可自托管） | 不用 Mercury Parser（2024-07 停更） |
| 公众号/小红书 | **Playwright 带登录态专用通道**（静态抽取必然失败） | 不用通用抽取器硬扛 |

**Transform 层**

| 角色 | 选择 | 说明 |
|------|------|------|
| LLM 调用 | **统一 Provider 接口**（OpenAI 兼容端点）+ `base_url` 切换 | 本地默认 Qwen3.8-27B 4-bit；云端按需切换；同一 pipeline 双跑 |
| 提示词资产 | 抄 Karakeep：`system.md / user.md` 分离 + `tagStyle` + curatedTags + 候选标签注入 | 防标签通胀；用户可编辑 |
| 转写 | **yt-dlp -x → faster-whisper**（MIT, CTranslate2, CPU 可跑）→ SRT | 不用 WhisperX（需 GPU、依赖重）；不用 autocut（2024-10 停更） |
| 幂等 | `content_hash(prompt_version + model + content)` | 换模型/换提示词需能识别为不同产物 |

**Publish 层**

| 角色 | 选择 | 说明 |
|------|------|------|
| 海外出站 | **Postiz 适配器**（可选外部服务）或自写 Adapter | Postiz **无中国平台**；Public API 30 req/h，量大会顶限 → 生产需评估 fork 或直连其内部服务（fork 受 AGPL 约束） |
| 国内出站（Tier-A 官方 API） | **自写 Provider**：微信草稿（`draft/add` + 素材上传）、微博（`statuses/update` + `statuses/upload`）、B站（`archive/add-by-utoken`，自实现 HMAC-SHA256 签名） | 公众号**群发永远人工点**（额度不可撤回）；微博/B站需过审 |
| 国内出站（Tier-B 浏览器自动化） | 可选接入 **social-auto-upload（MIT）** 或借鉴 Easel（Apache-2.0）的 Playwright 方案 | **默认关闭**，需用户显式开启；UI 必须显示「平台可能检测自动化，存在验证/限流/封号风险」；建议小号 |
| 国内出站（Tier-C 草稿导出） | 生成内容 + 导出（md/html/富文本）→ 用户到官方发布页亲自提交 | 兜底路径，Easel 的 `manual` 模式即此 |
| 发布质量门禁 | 新增 `processor:quality_gate`（敏感词 / 版权 / 平台格式 / Checklist），抄 Easel 的 `quality-gate` skill | 可跳过但默认必跑；提供全局 `publish_mode` 开关降级到 manual |
| 人工闸门 | 复用 Postiz 的 approvals 分享链接设计 | 国内渠道一律先落草稿；公众号群发永远人工点 |
| 编排（可选） | **n8n 自托管** 做编排 + AI 改写 | ⚠️ fair-code：对外 SaaS 受限，产品化需换 Activepieces(MIT) 或纯代码 |
| 推送通道 | 补齐 TrendRadar 式低成本通道：**ntfy / Bark / 钉钉 / 企微 / Slack** 本质都是 webhook | 实现成本极低，但 Reach-Hub 07 只列了 5 个通道 |

### 5.3 Publish 记录表需要补的字段（对 C7 的展开）

```sql
-- pulse_publish_records 增补（对应 Postiz 语义）
ALTER TABLE pulse_publish_records ADD COLUMN state TEXT NOT NULL DEFAULT 'pending';
    -- queued | draft | approved | publishing | published | failed | missing_release
ALTER TABLE pulse_publish_records ADD COLUMN error_raw TEXT;
    -- 平台返回的原始拒绝原因（不加工，原话入档，UI 直接显示）
ALTER TABLE pulse_publish_records ADD COLUMN release_id TEXT;
    -- 平台侧帖子 ID；平台未返回时置 'missing' 并触发反查回填
ALTER TABLE pulse_publish_records ADD COLUMN release_url TEXT;
ALTER TABLE pulse_publish_records ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pulse_publish_records ADD COLUMN next_retry_at TIMESTAMP;
CREATE UNIQUE INDEX idx_publish_idem ON pulse_publish_records(item_id, publisher, idempotency_key);
```

「release_id='missing' 反查回填」是这里最值得抄的一条：平台发成功但没返回帖子 ID 是通用难题（Instagram / Threads 常见），解法是发完立刻拉平台近期内容反向匹配回填，否则这条内容永远无法去重、无法统计。

### 5.4 落地顺序建议

| 阶段 | 动作 | 验收 |
|------|------|------|
| **P0（对标 TrendRadar 补短板）** | ① AI 兴趣打分筛选（带关键词回退）② 时段化调度预设 ③ 补 ntfy/Bark/钉钉/企微通道 ④ GitHub Actions 免服务器档 | 一条订阅产出一份日报，四通道收到同一内容 |
| **P1（补正文深度）** | ⑤ `processor:extract` 三层降级 ⑥ SimHash 去重 + 扩展 URL 规范化 ⑦ 统一 LLM Provider（含本地模型） | 一条 B站/小红书内容能拿到正文并摘要 |
| **P2（补发布闭环）** | ⑧ publish_records 字段增补 + release_id 回填 ⑨ `processor:quality_gate` 质量门禁 ⑩ 海外 Postiz 适配器 ⑪ 国内 Tier-A 自写 Provider（微信草稿 → 微博 → B站） | 一条推文 → 改写 → 门禁 → 草稿 → 人工确认 → 发布 → 审计可查 |
| **P3（补账号资产与生态）** | ⑫ `pulse_profiles` 账号画像实体 + prompt 按 profile 渲染 ⑬ MCP Server（抄 TrendRadar 17 工具模式，暴露 Store 查询） ⑭ RSSHub 实例接入 ⑮ 公众号/小红书 Playwright 通道（Tier-B，默认关闭） | 同一 profile 产出的内容跨平台风格一致；外部 AI 客户端可查询已收集内容 |
| **P4（生态整合）** | ⑯ Skill 描述文件产出（让 Claude Code/Codex/OpenClaw 装载本工具能力） ⑰ 评估与 Easel/social-auto-upload 的发布侧集成 | 外部 Agent 可直接调用本工具的采集与查询能力 |

### 5.5 明确不做的（避免把工具做成大杂烩）

- ❌ 不自建 RSS 路由体系（RSSHub 998 个路由命名空间已覆盖，自维护成本极高且 AGPL）。
- ❌ 不自建通用爬虫框架（Crawl4AI/Crawlee/Firecrawl 已足够）。
- ❌ 不 fork Postiz 做内核（AGPL + 无中国平台 + Public API 限流）。
- ❌ 不引入 MediaCrawler 代码路径（非商用学习许可）。
- ❌ 不做自建 LLM 推理服务（本地推理用 Ollama/vLLM 现成）。
- ❌ **不重造发布端的浏览器自动化**（Easel / social-auto-upload 已趟平；Reach-Hub 保留 Tier-A 自写 Provider + Tier-B 可选适配器）。
- ❌ 不做账号画像体系之外的多租户/协作（YAGNI，与 08 §4 单租户定位一致）。
- ❌ 不在 Source 层写业务规则（保持 D2 三层分离不变）。


---

## 6. 风险清单（补充 09 §3）

| # | 风险 | 概率/影响 | 缓解 |
|---|------|-----------|------|
| 9 | **许可污染**：AGPL/非商用依赖误入内核依赖树 | 中/高 | 建立依赖许可登记表 + CI 许可扫描；AGPL 项目一律降级为「用户自建服务 URL」配置项 |
| 10 | **单一上游依赖**：RSSHub/newsnow 若停更或限流，源接入面断裂 | 中/中 | RSSHub 支持自建（TrendRadar v6.9 已加 `api_url`）；source:rss 标准库直连作为永不被 AGPL 污染的保底 |
| 11 | **本地模型算力不足**：普通桌面机跑不动 27B | 高/低 | Provider 双跑：默认云端轻量模型或降级到 7B/8B，本地 27B 作为可选项 |
| 12 | **中国平台资质是商务问题**：官方 API 路径的前置是企业主体与类目资质 | 高/高 | Tier-A 只做能拿到资质的平台；其余走 Tier-B/Tier-C；UI 明示"草稿 + 人工" |
| 13 | **公众号群发额度不可撤回**：脚本误发会消耗真实额度 | 低/高 | 群发永久人工；草稿全自动；发布器加额度探测与二次确认 |
| 14 | **抽取质量在中文上不稳定** | 中/中 | 三层降级 + 站点级 CSS 规则覆盖（抄 Miniflux scrape rules）；正文过短(<500 字)自动升级到渲染兜底 |
| 15 | **浏览器自动化发布的账号风控**（Tier-B）：小红书/知乎会检测自动化，可能验证/限流/封号 | **高/高** | Tier-B 默认关闭、需显式开启 + 风险告知；建议小号（与 agent-reach 上游建议一致）；提供「发布后被限制」的诊断与暂停入口；永不自动重试 PLATFORM_BLOCKED 类失败 |
| 16 | **与 Easel / social-auto-upload 的功能重叠**导致内部重复建设 | 中/中 | 明确分工：Reach-Hub 只做「供给侧」（采集+正文+存储+开放 feed），发布侧优先适配而非重造（§5.0） |


---

## 7. 未确认项（不参与结论）

以下为本次调研中**未能一手核实**的项，列出以免被误当作结论：

- 仓库 404 或改名：apify/apify（主仓）、morss、OfficialRSSProxy、resiliparse、boilerpy3、MediaHarvester、SocialDL（原 `Soongyu/SocialDL` 已 404）、TikHub 主仓。
- 闭源商业产品（仅可借鉴交互，无法作为依赖）：Readwise Reader、Ghostreader、Summly、tana、Feed43、CommaRSS、Hypefury、Typefully、Taplio、Postpone、Metrical。
- 「Socioboard 6」未找到任何证据；实际在维护的是 **Socioboard 5.0**（GPL-3.0，最后 GitHub Release 2019-11，代码陈旧）。
- Mixpost：Lite 版 **MIT** 但仅支持 FB Pages/X/Mastodon；Pro/Enterprise 为 source-available（**需付费 $299 一次性**）才有主力平台与 API；最后推送 2026-03-16。
- 即刻平台是否有公开发布 API —— 未查到证据，按不可行处理。
- Jina Reader 自托管版的商用条款原文未逐条核对；SaaS 免费档标注 **CC-BY-NC（非商用）**，**建议直接自托管规避**。
- Karakeep 为 AGPL-3.0：**借鉴其 prompt 设计思路（思想不受版权保护）无风险，直接复制 `prompts.ts` 代码需注意许可**。
- 各商业聚合服务的实时定价与额度未逐一核实：Apify Social Scraper actor、TikHub、Bright Data、ScrapingBee、Crawlbase、Upload-Post、Ayrshare、bundle.social、Zernio、Buffer API、Typefully、Taplio。
- Postiz Public API 的 30 req/h 限流为官方文档数值，但未做压测验证。
- `chubbyskills` / `qiaomu-opencli-skills` / `bilibili-mcp` 的实际可用性未做本机实测，依赖各自上游工具链可用性。
- Jina Reader 仓库最后推送 2026-05-22（近 5 个月无更新），是否仍在积极维护未确认。

