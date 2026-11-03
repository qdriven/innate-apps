# 03 — 数据模型与存储

## 1. 实体关系

```
Subscription 1───n ContentItem 1───n PublishRecord
     │                  │
     │                  └──（经 pipeline 处理后）关联 ContentUnit / ContentAsset
     │
     n───n DeliveryChannel     （经 DeliveryRule，带过滤条件）

DeliveryRun 记录每次投递结果（幂等去重的依据）
```

四个聚合：**Subscription**（订阅流）、**ContentItem**（收件箱条目）、
**DeliveryChannel + Rule + Run**（投递）、**PublishRecord**（发布审计）。

## 2. 表结构（SQLite DDL 草案）

### 2.1 `pulse_subscriptions` — 订阅（获取层的配置实体）

```sql
CREATE TABLE pulse_subscriptions (
  id            TEXT PRIMARY KEY,            -- uuid
  name          TEXT NOT NULL,               -- 用户命名，如 "AI 热点-小红书"
  kind          TEXT NOT NULL,               -- 'reach' | 'rss'
  -- kind='reach' 时：agent-reach 渠道动作
  channel       TEXT,                        -- bilibili/twitter/xiaohongshu/...
  action        TEXT,                        -- hot/tweets/search/subreddit/...
  params        TEXT,                        -- JSON：动作参数 {"query":"大模型","limit":10} / {"profile":"@somebody"}
  -- kind='rss' 时
  feed_url      TEXT,
  -- 调度
  interval_sec  INTEGER NOT NULL DEFAULT 3600,
  jitter_sec    INTEGER NOT NULL DEFAULT 300,
  -- 状态机
  status        TEXT NOT NULL DEFAULT 'active',
                -- active | paused | needs_login | needs_setup | rate_limited |
                -- error | desktop_only
  last_error    TEXT,                        -- 最近一次错误（code + message）
  last_run_at   TIMESTAMP,
  next_run_at   TIMESTAMP,
  -- 增量拉取游标 + 新条目处理策略
  deepen        INTEGER NOT NULL DEFAULT 0,  -- 是否对新条目自动 read/subtitle 深读
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

设计要点：

- **Subscription 即「持续内容流」定义**，不区分「源模板」与「用户订阅」两个实体——
  14 渠道 × 动作 × 参数的组合空间直接由 `channel+action+params` 表达，
  无需为每个渠道建表（数据驱动，加渠道零迁移）。
- `status` 与 agent-reach 错误码一一映射（04 §4 状态机）；
  `desktop_only` 是 Web 形态下对浏览器渠道的标注（D8）。
- `deepen` 控制两级拉取：列表动作先拿浅数据，命中订阅过滤规则的条目再补
  `read`/`subtitle` 深读——避免对热榜 50 条全部深读打爆渠道配额。

### 2.2 `pulse_items` — 收件箱（数据层核心表）

```sql
CREATE TABLE pulse_items (
  id              TEXT PRIMARY KEY,          -- uuid
  subscription_id TEXT NOT NULL REFERENCES pulse_subscriptions(id),
  fingerprint     TEXT NOT NULL,             -- 去重指纹（url 规范化 + 内容 hash，见 04 §5）
  platform        TEXT NOT NULL,             -- twitter/bilibili/rss/...
  url             TEXT,
  external_id     TEXT,                      -- 平台原生 id（tweet id / BV号 / guid）
  title           TEXT NOT NULL DEFAULT '',
  author          TEXT,
  published_at    TIMESTAMP,                 -- 平台发布时间（排序主键候选）
  summary         TEXT,                      -- 渠道提供的摘要或 AI 摘要（处理产物回写）
  text            TEXT,                      -- 正文/字幕（深读后回填）
  engagement      TEXT,                      -- JSON {likes,views,comments}
  raw             TEXT,                      -- agent-reach envelope 的 item 原文（schema-free）
  -- 用户状态（双端共享，非前端私有）
  status          TEXT NOT NULL DEFAULT 'new',
                  -- new | read | starred | processed | dismissed
  tags            TEXT,                      -- JSON array（processor:tag 产物）
  processed_unit_id TEXT,                    -- 关联生成的 ContentUnit（进入资产体系）
  fetched_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (subscription_id, fingerprint)
);
CREATE INDEX idx_items_published ON pulse_items (published_at DESC);
CREATE INDEX idx_items_status    ON pulse_items (status);
CREATE INDEX idx_items_platform  ON pulse_items (platform);
```

与既有模型的关系：

- `pulse_items` 是**原始收件箱**，`ContentUnit`（contentforge-core）是**处理产物**，
  `ContentAsset`（桌面 assets 表）是**桌面资产视图**。三者经
  `processed_unit_id` / 资产同步衔接：条目被 pipeline 处理后产出 ContentUnit →
  既有资产管理/发布链路接管。Reach-Hub 不重建资产体系。
- `raw` 列保留 envelope 原文是刻意的：渠道字段千差万别（雪球的股票代码、
  GitHub 的 stars），规范化模型只收编公共字段，长尾字段留在 raw，
  展示层详情页按需渲染——「数据层稳定，渠道长尾不侵入 schema」。

### 2.3 投递三表

```sql
CREATE TABLE pulse_delivery_channels (
  id        TEXT PRIMARY KEY,
  kind      TEXT NOT NULL,                   -- rss_out | telegram | webhook | email | feishu
  name      TEXT NOT NULL,
  config    TEXT NOT NULL,                   -- JSON：chat_id / webhook_url / smtp …
  secret    TEXT,                            -- 加密存储的 token（见 §4 安全）
  enabled   INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pulse_delivery_rules (
  id                  TEXT PRIMARY KEY,
  subscription_id     TEXT NOT NULL REFERENCES pulse_subscriptions(id),
  delivery_channel_id TEXT NOT NULL REFERENCES pulse_delivery_channels(id),
  item_filter         TEXT,                  -- JSON 过滤器（复用 AssetFilter 子集：platform/tag/keyword）
  digest_mode         TEXT NOT NULL DEFAULT 'instant',
                      -- instant（逐条推）| daily | weekly（定时汇总）
  last_item_at        TIMESTAMP,             -- 增量投递游标
  UNIQUE (subscription_id, delivery_channel_id)
);

CREATE TABLE pulse_delivery_runs (
  id                  TEXT PRIMARY KEY,
  rule_id             TEXT NOT NULL REFERENCES pulse_delivery_rules(id),
  delivered_item_ids  TEXT NOT NULL,         -- JSON array，幂等依据
  ok                  INTEGER NOT NULL,
  error               TEXT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- **RSS 出口是 DeliveryChannel 的一种**（kind=`rss_out`）：不是推给外部服务，
  而是让 `publisher:rss_feed` 按规则聚合生成 feed 文件（06 §3）。
- `digest_mode` 把「即时推送」与「日报/周报汇总」统一为同一个规则模型的参数，
  Bot 与邮件天然走 digest 语义。

### 2.4 `pulse_publish_records` — 发布审计

```sql
CREATE TABLE pulse_publish_records (
  id           TEXT PRIMARY KEY,
  item_id      TEXT NOT NULL REFERENCES pulse_items(id),
  publisher    TEXT NOT NULL,                -- publish_static_site / publish_xhs_note / publish_rss_feed…
  profile_id   TEXT,                         -- 关联 PublishProfile（既有模型）
  status       TEXT NOT NULL,                -- pending | approved | published | failed
  result       TEXT,                         -- JSON：产物路径/草稿 id/错误
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

与既有 `pipeline_runs` 表（冻结保留）互补：pipeline_runs 记 pipeline 执行历史，
publish_records 记**单条内容的发布去向**——发布审计面向内容维度，
支持「这条内容发过哪些平台」的查询（防重复发布）。

## 3. 存储位置与迁移

| 形态 | 数据库 | 路径 |
|------|--------|------|
| 桌面 | SQLite（WAL） | 沿用 contentforge-desktop 数据目录，同库新表（`pulse_*` 前缀隔离） |
| Web | SQLite（WAL） | 卷挂载 `/data/keepthem.db`，schema 与桌面完全一致 |

迁移策略：contentforge-core 内置轻量迁移器（`schema_version` 表 + 顺序 SQL 文件，
不引入 alembic——表少、演进频率低）。双端共用同一套迁移文件，
这是「双端同构」不变量的物理保证。

## 4. 安全

- DeliveryChannel 的 `secret`（bot token、SMTP 密码）以本机密钥加密后存库
  （桌面：操作系统 keychain 经 Tauri plugin；Web：`SECRET_KEY` 环境变量派生密钥）。
- `raw`/`text` 仅本地存储；投递渲染（RSS/Bot 消息）默认脱敏 URL 凭据
  （复用 agent-reach `scrub_url_credentials` 同义逻辑）。

## 5. 查询 API（Store 层门面，双端同一语义）

桌面 IPC 命令 = Web REST 路由（一一对应，前端经 api-client 抽象无感切换）：

| 语义 | IPC 命令 | REST |
|------|----------|------|
| 订阅 CRUD | `subscription_list/create/update/delete/run_now` | `GET/POST/PATCH/DELETE /api/subscriptions`、`POST /api/subscriptions/{id}/run` |
| 收件箱查询 | `item_query`（filter/sort/pagination，复用 AssetFilter 形状） | `GET /api/items` |
| 条目状态写 | `item_set_status`、`item_star` | `PATCH /api/items/{id}` |
| 深读单条 | `item_deepen` | `POST /api/items/{id}/deepen` |
| 触发处理 | `item_process`（挂 pipeline） | `POST /api/items/{id}/process` |
| 投递配置 | `delivery_*` | `/api/delivery/*` |
| 发布 | `publish_dispatch`（见 06） | `POST /api/publish` |
| 日报 | `digest_generate` | `POST /api/digest` |

`item_query` 的过滤器直接复用桌面 `types/asset.ts` 的 AssetFilter 形状
（platform/status/tag/keyword/timeRange/sort/pagination），
前端两套页面（桌面/Web）共用同一查询组件逻辑。
