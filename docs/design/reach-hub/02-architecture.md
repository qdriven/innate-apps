# 02 — 总体架构：三层数据分离与模块划分

## 1. 顶层视图

```
┌─────────────────────────────────────────────────────────────────────┐
│  展示层 Display（零业务逻辑，只发查询）                                │
│  keepthem-desktop「Pulse」页面组 │ Web 前端（同一套组件静态导出）      │
│  Feed 流 / Digest 日报 / 订阅管理 / 条目详情 / 发布草稿                │
└──────────────▲──────────────────────────────────────────────────────┘
               │ view.query / store.query（统一只读查询 API，无直写）
┌──────────────┴──────────────────────────────────────────────────────┐
│  数据层 Store（唯一事实源）                                           │
│  SQLite：subscriptions / content_items / delivery_* / publish_records│
│  规范化 ContentItem ⇄ ContentUnit（处理后产物）⇄ ContentAsset（桌面） │
└──────────────▲──────────────────────────────────────────────────────┘
               │ 产出 ContentUnit / 读取待处理条目
┌──────────────┴──────────────────────────────────────────────────────┐
│  获取层 Source + 处理/发布（插件内核，业务唯一实现处）                  │
│  SubscriptionScheduler（常驻调度）                                    │
│   ├─ source:reach  → ReachBridge → agent-reach CLI（14 渠道）        │
│   ├─ source:rss    → 标准库直连（无外部依赖）                          │
│   ├─ processor:*   → summarize / tag / translate / xiaohongshu …     │
│   └─ publisher:*   → static_site / xhs_note / wechat_draft /         │
│                     rss_feed / telegram_notify / json_api            │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. 三层数据分离（本设计的核心不变量）

用户要求「source 和页面展示、数据分离」，落实为三条层间规则：

1. **Source 层不知道展示**：采集器只产出 `RawItem`（保留 agent-reach envelope 原文），
   写入数据层后即结束生命周期。换掉整个 UI 不影响任何一行采集代码。
2. **Store 层是唯一事实源**：展示与发布都只读这一份。数据层只认 `ContentItem`
   规范模型，不认渠道原始格式；渠道字段全部收进 `raw` JSON 列（schema-free 附加）。
   换渠道适配器不动存量数据，新增渠道不改任何表结构。
3. **Display 层零业务逻辑**：页面组件只调用 `store.query(filter)` 与
   `plugin.invoke(action)` 两类 API，不 import 任何采集/处理实现；
   「收藏」「已读」「标记处理」等状态是对数据层的字段写，不是本地私有状态
   （保证桌面/Web 双端状态一致）。

分离的收益矩阵：

| 变更场景 | 触碰范围 |
|----------|----------|
| 新增一个渠道订阅 | Source 层零改动（数据驱动，仅 manifest 配置） |
| 新增一个 agent-reach 新渠道（上游发版） | 更新 channels 目录缓存，零代码 |
| 重做 Feed UI | 只动 Display 层 |
| 更换存储引擎/加全文索引 | 只动 Store 层 |
| Web 版与桌面版并存 | 两套 Display，共享 Store schema |

## 3. 模块划分与代码归属

遵守收敛决策「业务逻辑只存在于 Python 核心；Rust/Go/TS 只做宿主与展示」。

```
packages/contentforge-core/python/contentforge/
├── reach/                          # ★ 新增包：Reach-Hub 核心
│   ├── bridge.py                   #   ReachBridge：CLI spawn + envelope 解析 + 错误码映射
│   ├── catalog.py                  #   渠道/动作目录（agent-reach channels 输出的缓存与降级表）
│   ├── scheduler.py                #   SubscriptionScheduler：asyncio 常驻调度（轮询+退避+限流）
│   ├── dedup.py                    #   指纹去重（url 规范化 + content_hash）
│   └── store.py                    #   Store 层 API：items/subscriptions/delivery 的读写门面
├── pipeline/plugins/
│   ├── sources/
│   │   ├── reach_source.py         # ★ 插件 source:reach（主路径）
│   │   └── rss_source.py           # ★ 插件 source:rss（从 ingest.py 拆出直连实现）
│   └── publishers/
│       ├── rss_feed.py             # ★ 插件 publisher:rss_feed（RSS/Atom 出口）
│       └── telegram_notify.py      # ★ 插件 publisher:telegram_notify（Bot 推送）
├── notifier/                       # ★ 新增包：投递通道适配（telegram/webhook/email/feishu）
│   └── base.py                     #   DeliveryTarget ABC：render(item|digest) + send()
└── ingestion/agent_reach.py        # 改造：直连实现降级为 bridge 的 fallback（见 04 §6）

apps/contentforge-desktop/          # 宿主（v2 中演进为 keepthem-desktop）
├── src/app/pulse/                  # ★ Pulse 页面组（Display 层，见 05）
├── src/components/pulse/           #   feed-stream / digest-view / subscription-manager / item-detail
├── src/store/pulseStore.ts         #   Zustand：查询缓存 + 乐观更新（状态真相仍在 Store 层）
└── src-tauri/src/commands/pulse.rs # ★ IPC 薄层：转发到 Python sidecar（无业务）

apps/reach-web/                     # ★ Web 形态（新 app，按 08 启动）
├── server/                         #   FastAPI：REST API + 静态前端托管 + scheduler 常驻
└── Dockerfile                      #   单进程容器
```

插件包归属：以上能力打包为**一个插件 `reach-pulse`**（manifest v2 风格），
声明 capabilities（`source:reach`、`source:rss`、`publisher:rss_feed`、
`publisher:telegram_notify`）+ views（`pulse-feed`、`pulse-subscriptions`、
`pulse-digest`）。装/卸它 = 侧栏出现/消失 Pulse 导航组 + 后台调度启停。

## 4. 语言选型（为什么是「Python 内核 + TS 展示 + Rust/Node 宿主」四件套）

| 层 | 语言/运行时 | 选择理由 | 明确不做的事 |
|----|------------|----------|--------------|
| 获取/处理/发布内核 | **Python 3.10+** | agent-reach 是 Python CLI；contentforge-core 插件内核已存在；AI 处理器（summarize/translate）生态在 Python | 不用 Go/Rust 重写任何 step（收敛原则） |
| 渠道桥 | **子进程 CLI** | agent-reach 官方契约是 CLI + JSON envelope；`uv tool install` 自带工具链管理 | 不 import agent_reach 包、不绑定其内部 API |
| 展示 | **TypeScript + React（Next.js）** | 双端复用（Tauri webview / 浏览器）；contentforge-desktop 与 vytdl-desktop 前端栈一致 | 展示层不写业务规则 |
| 桌面宿主 | **Rust（Tauri v2）** | 沿用 contentforge-desktop；sidecar 进程管理/系统集成成熟 | Rust 侧只做 IPC 转发与窗口 |
| Web 宿主 | **Python（FastAPI）+ Node 构建** | 与内核同语言单进程常驻，scheduler/插件/存储零桥接；前端仍是构建期产物 | 不做 Hono 双进程桥（vytdl-web 模式不复制到本模块，见 08 §2） |

## 5. 进程与运行时拓扑

### 5.1 桌面形态

```
keepthem-desktop（Tauri 主进程）
  ├─ WebView：Next.js 前端（Pulse 页面组）
  ├─ pulse.rs：IPC 命令薄层
  └─ Python sidecar（contentforge-core 常驻）
       ├─ PluginRegistry + PipelineEngine（既有）
       ├─ SubscriptionScheduler（★ 常驻 asyncio loop）
       │     └─ spawn → agent-reach CLI 子进程（按需，带超时）
       └─ Store（SQLite，WAL 模式）
```

- sidecar 与宿主间协议沿用 v2 计划的 `plugin.list / plugin.invoke / view.query / skill.execute`，
  本设计新增 `store.query / store.mutate / schedule.*` 三组（见 03 §5）。
- agent-reach 的安装/登录向导在桌面首启时引导执行 `agent-reach setup / add / login`
  （终端可见的交互命令由用户在宿主提供的向导里逐条确认，见 05 §5）。

### 5.2 Web 形态

```
Docker 容器（单进程）
  FastAPI（uvicorn）
  ├─ REST API（/api/subscriptions /api/items /api/digest …，见 08 §4）
  ├─ 托管 Next.js 静态导出前端（同一套 Pulse 组件）
  ├─ SubscriptionScheduler（同桌面，同一份代码）
  └─ SQLite（卷挂载持久化）
  ※ 仅无头渠道可用（web/rss/github/xueqiu/v2ex/reddit/bilibili/youtube…），
    浏览器登录渠道在订阅创建时被标注 desktop-only（D8）
```

## 6. 关键设计不变量（后续所有文档遵守）

1. **CLI 即契约**：ReachBridge 只依赖 `--json` envelope 与 `channels` 目录输出，
   不读 agent-reach 内部结构；上游升版只要 schema_version 不变即免改。
2. **错误码是一等公民**：envelope 的 8 个错误码映射为订阅状态机的显式状态
   （如 NEED_LOGIN→`needs_login`，RATE_LIMITED→退避并尊重 retry_after_seconds），
   绝不静默吞掉。
3. **降级路径永远可用**：agent-reach 缺失时，RSS/Web(Jina)/YouTube(yt-dlp) 直连兜底，
   Pulse 页面照常工作（渠道能力矩阵如实降级展示）。
4. **双端同构**：桌面与 Web 共享同一 Store schema、同一 scheduler、同一 REST 语义
   （桌面 IPC 命令名与 Web 路由一一对应，前端走 api-client 抽象，与 vytdl 同模式）。
