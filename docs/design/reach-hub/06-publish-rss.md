# 06 — 发布层：多平台发布与 RSS 出口

## 1. 发布矩阵

发布走插件内核既有的 publisher 扩展点 + `PublishProfile`（凭据配置），
Reach-Hub 新增两个 publisher，其余复用：

| publisher 插件 | 状态 | 输入 | 产出 | 说明 |
|----------------|------|------|------|------|
| `publish_static_site` | 既有 | ContentUnit | 本地 md/html 站点 | 复用；digest 可发布为静态日报站 |
| `publish_xhs_note` | 既有 | ContentUnit | 小红书草稿 | 复用；processor:xiaohongshu 改写后接发布 |
| `publish_wechat_draft` | 既有 | ContentUnit | 公众号草稿 | 复用 |
| `publish_rss_feed` | **新增** | ContentItem/Unit 聚合 | RSS/Atom XML 文件 | §3 |
| `publish_telegram_notify` | **新增** | ContentItem/Digest | Bot 消息 | 07 §4（投递通道复用同一实现） |
| `publish_json_api` | 规划（低优） | 条目/资产 | JSON 导出 | 供第三方消费 |

**两条发布语义并存，模型统一**：

- **内容发布**（xhs/wechat/static_site）：ContentItem → processor 改写 →
  ContentUnit → publisher → publish_records 记录。面向「我把这条内容改编后发出去」。
- **投递分发**（rss_feed/telegram/webhook/email）：ContentItem/Digest →
  DeliveryRule 过滤 → DeliveryChannel。面向「我把信息流转发给自己/读者」。

两者在数据层由 `pulse_publish_records`（前者）与 `pulse_delivery_runs`（后者）
分别审计，UI 上分别是「发布抽屉」与「推送动作」，不互相混淆。

## 2. 发布流（内容发布）

```
Feed 卡片 / 条目详情
  └→ [→ 发布草稿]
       打开发布抽屉（DraftEditor 原语）
        ├ 1. 选 target：小红书笔记 / 公众号草稿 / 静态站点 / RSS 出口
        ├ 2. 选处理链（可选预设）：translate → summarize → processor:xiaohongshu …
        │    实时预览改写结果（processor 都是纯函数式步骤，可预览）
        ├ 3. 人工终审（编辑器内可直接改文字/配图）
        └ 4. [发布] → publish_dispatch
             ├ create ContentUnit（快照自 ContentItem + 编辑内容）
             ├ 挂 pipeline 执行（processor 链 + publisher step）
             ├ 写 pulse_publish_records（status: pending → published/failed）
             └ 回写 item.status = processed
```

防重复发布：dispatch 前检查 `pulse_publish_records` 中同 item + 同 publisher
已有 `published` 记录时，弹确认（允许强制，如内容改版重发）。

## 3. RSS 出口（publisher:rss_feed）

**形态**：静态 XML 文件生成器 +（Web 形态）HTTP 路由直读。

```
配置（PublishProfile 或 DeliveryChannel.config）:
  output_dir   # 桌面：本地目录；Web：/data/feeds（由 FastAPI /feeds/{slug}.xml 托管）
  slug         # feed 标识，如 "ai-daily"
  title / link / description
  item_source  # 规则：{subscription_ids: [...], filter: {status: starred|all, tags: […]}} 
               # 或 digest 模式（每日聚合一条）
  max_items    # 默认 50
  full_text    # true 时含 content:encoded 全文，false 仅摘要
```

- 生成时机：scheduler 每轮投递检查时顺带重算（文件小，成本低）+
  手动「重新生成」。RSS 2.0 与 Atom 双格式（`.xml` / `.atom.xml`）。
- **闭环意义**：Keepthem 既是 RSS 消费者（source:rss 入）也是 RSS 生产者
  （publisher:rss_feed 出）——用户可以把「小红书 AI 热点」这类无法订阅的平台
  转换为标准 RSS feed，接入任意阅读器（Reeder/Follow/Miniflux）。
  这是 Reach-Hub 最有复利的一个能力：**登录墙后的平台 → 开放 RSS**。
- 静态站点联动：`publish_static_site` 已渲染 md/html 索引，
  rss_feed 可共享同一 output_dir，构成「自托管迷你内容站」。

## 4. 发布抽屉（DraftEditor 原语复用）

v2 计划的 `DraftEditor`（编辑器+预览+发布按钮）直接承载发布流；
Reach-Hub 增量仅为 target 选择器与处理链预览。发布历史入口：
条目详情显示该条的全部 publish_records（平台徽标 + 状态 + 时间 + 产物链接）。

## 5. 发布凭据与安全

- 各 target 的凭据存 `PublishProfile.credentials`（既有模型），
  桌面经 keychain 加密、Web 经 SECRET_KEY（同 03 §4）。
- xhs/wechat 等平台的登录态依赖浏览器会话——与 agent-reach 的登录渠道一样
  归入 desktop_only 能力（Web 形态的发布 target 只显示静态类/rss/json）。
- publish 失败的错误码沿用 pipeline step 错误透传，UI 显示原始 message +
  渠道 doctor 跳转。
