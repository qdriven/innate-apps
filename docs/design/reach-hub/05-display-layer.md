# 05 — Display 层：keepthem 页面设计

## 1. 信息架构：Pulse 页面组

宿主为 `apps/contentforge-desktop`（v2 中演进为 keepthem-desktop）。
`reach-pulse` 插件贡献一组 views，经 View Registry 挂进侧栏「收集」分区：

```
侧栏
├─ 收集 (Collect)
│  ├─ ▶ Pulse 情报流          ← pulse-feed       （默认落地页：全量 Feed 时间线）
│  ├─ ▶ 我的订阅              ← pulse-subscriptions
│  └─ ▶ 日报 Digest           ← pulse-digest
├─ 资产 (Assets)               （既有）
├─ 发布 (Publishing)           （既有 + 06 扩展）
└─ Agent                       （既有）
```

views 声明（manifest v2 风格，插件不写 React，声明数据源与宿主原语）：

```json
{
  "id": "reach-pulse",
  "views": [
    {"id": "pulse-feed",          "titleKey": "pulse.feed.title",    "icon": "Rss",          "section": "collect", "component": "FeedStream"},
    {"id": "pulse-subscriptions", "titleKey": "pulse.subs.title",    "icon": "BookmarkPlus", "section": "collect", "component": "SubscriptionManager"},
    {"id": "pulse-digest",        "titleKey": "pulse.digest.title",  "icon": "Newspaper",    "section": "collect", "component": "DigestView"}
  ]
}
```

三个视图原语中 `DigestView` 已在 v2 计划的内置原语清单里（直接复用）；
`FeedStream` 与 `SubscriptionManager` 作为本插件催生的新原语**沉淀给宿主**
（后续其他信息源插件也能用）。Web 前端复用同一组组件（静态导出，08）。

## 2. pulse-feed：Feed 流（主页面）

布局三栏（窄屏折叠为单栏 + 抽屉）：

```
┌────────────┬──────────────────────────────┬───────────────────┐
│ 订阅过滤侧栏 │  条目流（虚拟滚动）             │  条目详情 / 快捷面板 │
│ □ 全部      │  ┌────────────────────────┐  │  标题 / 平台徽标    │
│ □ AI 热点   │  │ [twitter] @somebody     │  │  作者 / 时间       │
│   -小红书   │  │ 关于 xxx 的推文…          │  │  正文（深读后）    │
│ □ B站热榜   │  │ 2h · ♥123 · ↗原文       │  │  ─────────────   │
│ □ V2EX     │  └────────────────────────┘  │  [★收藏] [✓已读]   │
│ …          │  ┌────────────────────────┐  │  [AI 摘要] [翻译]  │
│            │  │ [bilibili] 热门：…       │  │  [→ 发布草稿]     │
│ 筛选：      │  └────────────────────────┘  │  [→ 推送到 TG]    │
│ 状态/标签/  │  （卡片：平台徽标 + 标题 +     │                   │
│ 关键词      │    摘要 + 时间 + 互动数 +      │                   │
│            │    hover 快捷：收藏/已读/发布） │                   │
└────────────┴──────────────────────────────┴───────────────────┘
```

交互要点：

- **查询**：全部走 `item_query`（AssetFilter 形状）；分页游标滚动加载；
  侧栏选中即 filter（store 里是查询参数，不是本地状态）。
- **快捷动作**：收藏/已读 = `PATCH`（乐观更新 + 失败回滚）；「→ 发布草稿」
  打开 06 §4 的发布抽屉；「AI 摘要/翻译」= `item_process` 挂 processor pipeline。
- **平台渲染器**：卡片与详情按 platform 选渲染器（tweet 渲染 @/话题高亮、
  GitHub 渲染 stars/language、雪球渲染股票代码）——渲染器读 `raw` 字段，
  注册表模式，新渠道可后补渲染器（无则通用渲染）。
- **深读指示**：`text` 为空的条目显示「深读全文」按钮（`item_deepen`），
  有则直接展示；字幕类（youtube/bilibili）折叠展示。

## 3. pulse-subscriptions：订阅管理

```
┌──────────────────────────────────────────────────┐
│ [+ 新建订阅]  [渠道健康 doctor]                     │
├──────────────────────────────────────────────────┤
│ 订阅列表（分组：全部 / 异常 / 已暂停）               │
│ ┌──────────────────────────────────────────────┐ │
│ │ 🔴 AI 热点·小红书   xiaohongshu/search         │ │
│ │    状态：需登录    上次：10-24 18:00            │ │
│ │    [立即拉取] [编辑] [暂停] [删除]              │ │
│ ├──────────────────────────────────────────────┤ │
│ │ 🟢 B站热榜         bilibili/hot  每 1h        │ │
│ │    新增 12 条/今日  上次：10-25 09:00          │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

状态徽标直接映射 04 §4 状态机（active 绿 / needs_login 橙 / error 红 /
desktop_only 灰紫 等），异常订阅给出**具体恢复动作按钮**
（「去登录」「安装渠道」「查看错误」）。

### 新建订阅向导（三步）

1. **选渠道**：catalog 驱动的渠道卡片墙（14 渠道 + RSS），标注登录要求与
   desktop_only；未安装的渠道显示「需先安装」。
2. **配动作与参数**：按选中渠道渲染动作表单（模板驱动：`hot` 无参数、
   `tweets` 填 profile、`search` 填 query）；底部实时预览
   「立即试拉一次」（run_now + 只取 3 条预览卡片，写库前丢弃或标记 preview）。
3. **配调度与投递**：interval 预设（15m/1h/6h/1d）+ jitter、是否深读、
   关联投递通道（多选：RSS 出口 / Telegram / Webhook…，见 07）。

RSS 订阅走同一向导（第 1 步选「RSS」，第 2 步填 feed_url + 试拉校验）。

## 4. pulse-digest：日报/周报

- 复用 v2 计划的 `DigestView` 原语：按日期聚合当日新条目，分组渲染
  （按订阅/按平台/按标签），每条含标题 + 一句摘要 + 链接。
- 顶部操作：`digest_generate`（把当日 starred/全部 条目跑 AI 汇总成
  「今日情报」短文——走 processor:summarize）、导出 Markdown、
  「作为草稿发布」（进入 06 发布流，可发 static_site / rss_feed）。
- 定时生成的 digest（07 §3）在此页面留档可查。

## 5. doctor 与登录向导（订阅管理的支撑页）

- **doctor 面板**：聚合展示 bridge 探活（agent-reach 是否安装/版本）、
  catalog 动态层 vs 静态层差异（哪些渠道未 add）、各渠道登录态
  （`login`/`logout` 状态来自 agent-reach state）。
  每项附「一键执行」按钮，由宿主以受控终端面板运行对应命令
  （`agent-reach add twitter`、`agent-reach login twitter`——
  登录类命令必须用户亲手在可见终端完成，应用绝不代输凭据，
  与 agent-reach「不问密码」安全模型一致）。
- **登录态恢复的两条路径**（needs_login 订阅的恢复按钮，按优先级排列）：
  ① 「从 Chrome 导入登录」= `agent-reach login <channel> --import-existing`
  （站点级一次性复制该站 Cookie 到专用浏览器，不弹窗；要求用户 Chrome
  已连接 OpenCLI 扩展；多浏览器多账号时先 `browser profiles` + `browser use <ID>` 让用户选定来源）；
  ② 「打开登录窗口」= `agent-reach login <channel>`（专用浏览器显示登录页，用户本人登录）。
  向导文案需明示：导入的通常是用户主账号，自动化操作发生在该账号上，
  存在平台风控风险，建议改用小号（本人登录过一次后不再自动导入）。
- 桌面首启流程（首次打开 Pulse）：探活 → 引导 `uv tool install`（或检测已有）
  → `agent-reach setup` → 按需 add 渠道 → 创建第一个订阅（预填示例：B站热榜）。

## 6. i18n 与无障碍

- 所有文案走 `src/i18n/locales/{en,ja,zh}.json`，新增 `pulse.*` 命名空间
  （遵循 AGENTS.md 的加语言流程）。
- Feed 虚拟滚动键盘导航（j/k 或 ↑↓ 翻卡片，s 收藏，m 已读——键盘流是
  RSS 阅读器用户的核心习惯）。

## 7. 组件与 store 归属

```
apps/contentforge-desktop/src/
├── app/pulse/
│   ├── page.tsx                 # pulse-feed（默认）
│   ├── subscriptions/page.tsx
│   └── digest/page.tsx
├── components/pulse/
│   ├── feed-stream.tsx          # 原语：FeedStream（注册进 View Registry）
│   ├── feed-card.tsx            #   卡片（平台渲染器分派）
│   ├── subscription-manager.tsx # 原语：SubscriptionManager
│   ├── subscription-wizard.tsx  #   三步向导
│   ├── digest-panel.tsx
│   ├── item-detail.tsx
│   ├── platform-renderers/      # tweet.tsx / github.tsx / xueqiu.tsx / generic.tsx …
│   └── doctor-panel.tsx
└── store/pulseStore.ts          # 查询缓存 + 乐观更新；真相在 Store 层（SQLite）
```

`pulseStore` 只做两件事：缓存 `item_query` 结果（keyed by filter）与
乐观更新的 rollback；刷新统一走 IPC 事件（sidecar 拉取完成后 emit
`pulse:items_changed`，桌面走 Tauri event，Web 走 WebSocket——api-client 抽象）。
