# 07 — 订阅投递与 Bot

## 1. 概念澄清

「订阅」在本设计里有**两个不同方向的含义**，数据模型刻意分开：

| 概念 | 方向 | 模型 | 例子 |
|------|------|------|------|
| 内容订阅（Subscription） | Keepthem ← 平台 | `pulse_subscriptions` | 订阅 B站热榜、某人的推特 |
| 读者投递（Delivery） | Keepthem → 人/机器 | `pulse_delivery_channels` + rules | RSS 出口、TG bot 推送、邮件日报 |

本文档讲第二个方向：**把已获取的内容送到用户/读者手上**。

## 2. 投递通道（DeliveryChannel）矩阵

| kind | 实现 | instant | daily/weekly digest | 桌面 | Web | 备注 |
|------|------|---------|---------------------|------|-----|------|
| `rss_out` | publisher:rss_feed（06 §3） | ✅（feed 常新） | ✅（digest 条目） | ✅ | ✅ | 无第三方依赖 |
| `telegram` | Bot API sendMessage | ✅ | ✅ | ⚠️ 手动/前台触发 | ✅ 常驻 | 桌面无公网回调也能主动推（长轮询 getUpdates 仅 Web） |
| `webhook` | POST JSON（飞书/企业微信/Slack 兼容格式） | ✅ | ✅ | ⚠️ 需应用在运行 | ✅ | 通用逃生舱 |
| `email` | SMTP（Markdown → HTML） | ❌ | ✅ | ⚠️ | ✅ | 只做 digest 语义，防骚扰 |
| `feishu` | 飞书机器人 webhook（卡片消息） | ✅ | ✅ | ⚠️ | ✅ | webhook 的预置渲染 |

实现统一为 `notifier/base.py` 的 `DeliveryTarget`：

```python
class DeliveryTarget(ABC):
    kind: str
    async def send_items(self, items: list[ContentItem], rule) -> DeliveryOutcome   # instant
    async def send_digest(self, digest: Digest, rule) -> DeliveryOutcome            # digest
    def render(self, item_or_digest) -> str    # 平台消息格式化（含链接脱敏）
```

**幂等**：每条投递写 `pulse_delivery_runs`（rule + item_ids），重发前查重；
失败重试最多 2 次（指数退避），仍失败标记 channel disabled 并在 doctor 告警。

## 3. 投递时机与 scheduler 集成

```
SubscriptionScheduler 每轮拉取落库后:
  for rule in delivery_rules(涉及本轮订阅):
    if rule.digest_mode == 'instant':
        pending = items_since(rule.last_item_at) 匹配 rule.item_filter
        channel.send_items(pending) → DeliveryRun 落库 → 推进 last_item_at
Digest 定时任务（独立 cron tick，挂在同一 scheduler）:
  daily 09:00 / weekly 周一 09:00（用户可配时区与时刻）
  for rule in digest_rules:
    digest = 聚合窗口内条目 (+ 可选 AI 摘要, processor:summarize)
    channel.send_digest(digest) → DeliveryRun 落库
```

桌面休眠的处理：唤醒时 scheduler 首轮补算错过的 digest 窗口
（错过 ≤2 个窗口补发，更多则合并为一个「N 天汇总」）。

## 4. Telegram Bot（唯一的一等 Bot 设计）

**为什么选 Telegram 做唯一一等 Bot**：API 免费、无需公网即可长轮询、
消息格式（MarkdownV2/HTML）适合内容卡片、国内经自建代理可达
（bot config 支持 baseUrl 覆盖，兼容自托管 Bot API server）。
飞书/企业微信经 webhook 通道覆盖，不再单独建 bot 框架。

### 4.1 两种运行姿态

| 姿态 | 环境 | 机制 |
|------|------|------|
| 推送器（默认） | 桌面/Web | 仅 sendMessage：按规则推送/Digest。零端口需求 |
| 交互 Bot（Web 形态开启） | Web 常驻 | getUpdates 长轮询，命令交互（下表） |

桌面形态只做推送器——**不在桌面开长轮询**（应用关闭即 bot 下线，体验破碎）；
交互能力留给 Web 形态（或用户自建的 Bot API server）。

### 4.2 交互命令面（Web 形态）

```
/start        绑定聊天（生成绑定码，Web 端输入后关联 delivery_channel）
/subs         列出我的订阅（含各订阅健康状态）
/latest [n]   最新 n 条（默认 5），inline 按钮翻页
/starred      收藏夹
/digest       立即生成今日 digest
/mute /unmute 暂停/恢复推送
/pause <sub>  暂停某订阅拉取（写回 pulse_subscriptions——Bot 是 Display 的等价物）
/help
```

命令处理直接调用 Store 层 API（与 REST/IPC 同一门面），
**Bot 是第三个 Display 端**（对话式），复用全部业务规则，零新逻辑。

### 4.3 消息格式

- 条目卡片：平台 emoji + 标题（链接）+ 一句摘要 + 时间/互动数；
  inline 按钮：★ 收藏 / ✓ 已读 / 🔍 深读。
- 按钮回调同样走 Store API；每卡片带 item_id，回调幂等。
- 长文（>4096 字符）自动截断 +「阅读全文」深链（Web 形态带 `/items/{id}` 路由；
  桌面-only 部署则附原文链接）。

## 5. 隐私与反滥用边界

- 投递内容默认只含**公开元数据 + 摘要**；`full_text` 仅 RSS 出口可配
  （个人阅读器场景），Bot/邮件默认摘要 + 链接（尊重来源平台）。
- Webhook/email 通道限制发送速率（默认 30 条/分钟/通道），
  instant 规则单轮批量合并为一条消息（Telegram album 语法）。
- delivery channel 的 secret 加密存储（03 §4）；doctor 页面可一键吊销
  （删除 channel + 提示外部侧解除绑定）。
