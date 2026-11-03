# 04 — Source 层：渠道桥、调度、去重、登录状态机

## 1. ReachBridge（contentforge/reach/bridge.py）

**职责**：把 `agent-reach <channel> <action> --json` 的子进程调用封装为
同步语义的 Python API，负责 envelope 解析、错误码翻译、超时与并发控制。

```python
class ReachBridge:
    def __init__(self, binary: str = "agent-reach", timeout: int = 120): ...

    def channels(self) -> ChannelCatalog:
        """`agent-reach channels` 输出 → 渠道/动作/参数目录（缓存，TTL 1h + 手动刷新）"""

    def run(self, channel: str, action: str, params: dict) -> ReachResult:
        """spawn 子进程，返回结构化结果。

        ReachResult:
          ok: bool
          items: list[dict]          # envelope.items 原文
          error_code: str | None     # 8 错误码原样透传
          error_message: str
          retry_after: float | None  # RATE_LIMITED 时的 retry_after_seconds
          meta: dict
        """

    def read(self, url: str) -> ReachResult:
        """`agent-reach read <url>`：按链接自动选渠道（深读单条的便捷入口）"""
```

实现约束：

- 子进程用 `asyncio.create_subprocess_exec`（scheduler 是 asyncio 常驻循环）；
  超时后 kill 进程组，返回 `TIMEOUT`（与上游同义）。
- **并发闸门**：全局信号量（默认 2）+ 渠道级信号量（默认 1）——
  共享 CloakBrowser 的渠道（登录型）串行执行，避免 BUSY；
  无头渠道（API 类）只受全局闸门约束。
- stdout 只取最后一行 JSON 之外的完整对象：上游保证「恰好打印一个 JSON 对象」，
  解析失败按 `UPSTREAM_BROKEN` 处理并携带原始输出的前 500 字符入日志。
- **不做重试**：重试语义属于 scheduler 状态机（见 §4），bridge 保持纯调用。

## 2. 渠道目录与「订阅模板」（contentforge/reach/catalog.py）

`agent-reach channels` 的输出是动态事实源，但订阅创建 UI 需要静态的
「人类可读模板」先行渲染。catalog = 动态输出 + 内置静态元数据两层：

```python
# 内置静态层（随代码版本更新；上游加渠道而静态层未更时，动态层兜底显示）
CHANNEL_TEMPLATES = {
    "twitter": {
        "label": "X / Twitter",
        "desktop_only": True,                  # 浏览器登录渠道（D8）
        "requires_login": True,
        "actions": {
            "tweets":  {"label": "账号最新推文", "params": {"profile": "@handle"}},
            "search":  {"label": "关键词搜索",   "params": {"query": "...", "limit": 20}},
            "thread":  {"label": "读完整推文串", "params": {"target": "url"}},
        },
    },
    "bilibili": {
        "label": "哔哩哔哩", "desktop_only": False, "requires_login": False,
        "actions": {
            "hot":    {"label": "热门榜",       "params": {"limit": 20}},
            "search": {"label": "搜索",         "params": {"query": "..."}},
        },
    },
    # ... 14 渠道全量
}
```

catalog 启动时执行一次 bridge.channels() 做能力核对：
静态层声明了但动态层缺失的渠道（未 `add` 安装），模板显示为「需安装」状态并
给出 `agent-reach add <channel>` 引导；动态层多出的渠道以原始信息兜底展示。
**这套核对同时驱动 doctor 页面**（05 §4）。

## 3. SubscriptionScheduler（contentforge/reach/scheduler.py）

**职责**：常驻 asyncio 循环，按 `next_run_at` 驱动所有订阅的拉取。

```
loop（每 5s tick）:
  1. 从 store 取 next_run_at <= now 且 status ∈ {active, rate_limited(到期)} 的订阅（批量，限 N=5/轮）
  2. 对每个订阅（受渠道信号量约束）:
       raw_items = fetch(subscription)          # reach: bridge.run(...) | rss: 直连解析
       new_items = dedup.diff(subscription_id, raw_items)     # §5
       for item in new_items:
           normalize → 写 pulse_items            # 规范化 + raw 原文
           if subscription.deepen and matches_filter(item):
               enrich(item)                      # bridge.read/read/subtitle 深读，回填 text
       触发 delivery 检查（07 §2：instant 规则即时投递）
       更新 last_run_at / next_run_at = now + interval ± jitter
  3. 错误路径：按 §4 状态机更新 subscription.status，不中断循环
```

调度细节：

- **退避**：连续失败按 `interval × 1.5^n` 退避（上限 24h）；RATE_LIMITED 直接用
  `retry_after_seconds`（+10% 余量），不自行计算。
- **手动触发**：`subscription.run_now` 命令插入队首并立即唤醒循环
  （asyncio.Event，无需等 tick）。
- **首启追赶**：进程启动时把 `next_run_at` 在过去的 active 订阅按
  `last_run_at + interval` 重排，避免全部立刻齐跑（加 jitter 天然错峰）。
- **优雅停机**：桌面 sidecar 退出信号 → 停 tick、等待在飞任务（≤30s）、
  落盘 `next_run_at`。
- 复用性：Web 形态用同一 scheduler，挂在 FastAPI lifespan；
  桌面挂在 sidecar 主循环——**调度代码只有一份**。

## 4. 错误码 → 订阅状态机

| envelope 错误码 | subscription.status 变化 | 恢复动作 |
|-----------------|--------------------------|----------|
| （成功） | 保持 active，更新 next_run_at | — |
| NEED_SETUP | `needs_setup` | doctor 引导 `agent-reach add <channel>`；用户操作后手动/自动重试一次 |
| NEED_LOGIN | `needs_login` | 恢复动作二选一（05 §5 向导）：① `agent-reach login <channel> --import-existing`（从用户 Chrome 站点级导入已有登录，不弹窗）；② `agent-reach login <channel>`（打开专用浏览器窗口，用户本人登录）；成功后恢复 |
| RATE_LIMITED | `rate_limited`（带到期时间） | 到期自动恢复，绝不换 backend 硬闯（上游 FINAL_CODES 语义） |
| PLATFORM_BLOCKED | `paused` + 醒目警告 | 平台风控，只允许人工处理（保持 profile，不做任何自动重试） |
| TIMEOUT | 保持 active，退避 ×1.5 | 连续 3 次后转 `error` |
| UPSTREAM_BROKEN | 保持 active，退避；提示 `agent-reach update` | 连续 5 次转 `error` |
| NOT_FOUND / BAD_INPUT | `error`（终态，配置问题） | 只能编辑订阅参数；不重试 |

状态机保证了「订阅列表即健康面板」：每条订阅永远有一个可解释的状态，
UI 无需额外诊断逻辑。

## 5. 去重（contentforge/reach/dedup.py）

两级指纹：

```python
def fingerprint(platform, url, external_id, title) -> str:
    # 1) 首选 (platform, external_id)：tweet id / BV 号 / guid —— 稳定
    # 2) 次选 (platform, normalize_url(url))：去 utm/跟踪参数、统一 http(s)、
    #    去尾斜杠、小写 host —— 覆盖无外部 id 的渠道
    # 3) 兜底 sha1(platform + title) —— 仅当 url 也缺失（极端）
```

- 落库以 `UNIQUE(subscription_id, fingerprint)` 兜底：冲突即丢弃，
  scheduler 正常路径先查 seen-set（内存 LRU + 库查证）减少写放大。
- **跨订阅刻意不去重**：同一内容被两个订阅抓到是合法的（用户视角是两条线索），
  但展示层提供「合并同 url」的聚合开关（查询时 DISTINCT url）。

## 6. 与既有直连实现的关系（ingestion/agent_reach.py 改造）

`AgentReachIngestor` 的直连路径（Jina web / yt-dlp youtube / 标准库 rss）不删除，
改造为 `reach/fallback.py`——bridge 探活失败（二进制不存在/`--version` 超时）时：

| kind | 主路径（v1.6） | 降级路径（无 agent-reach） |
|------|----------------|---------------------------|
| reach 渠道 | bridge.run | ❌ 不可用 → 订阅标 `needs_setup`，doctor 引导安装 |
| rss | （走 source:rss，本就直连） | ✅ 标准库直连（现状保留） |
| web | bridge.run(web, read) | ✅ Jina 直连（现状保留） |
| youtube | bridge.run(youtube, read/subtitle) | ✅ yt-dlp 直连（现状保留） |

`ingest.py` 插件（pipeline 单步采集）继续工作，内部改为优先走 bridge——
**单次 pipeline 与常驻订阅两条路共享同一 bridge 与规范化代码**，
只是入口不同（pipeline step vs scheduler tick）。

## 7. 规范化（RawItem → ContentItem 公共字段）

| envelope item 常见字段 | pulse_items 列 | 备注 |
|------------------------|----------------|------|
| title / text / summary | title / text / summary | 各渠道命名不一，按渠道 normalize 映射表收编 |
| url / link | url | |
| id | external_id | |
| author / uploader / screen_name | author | |
| published / created / date | published_at | 多格式解析（ISO8601/Unix/相对时间） |
| likes / views / comments / stars | engagement JSON | |
| 其余全部 | raw JSON | 详情页按渠道渲染器展示 |

渠道 normalize 映射表放 `reach/normalize.py`，每渠道 ≤20 行纯函数，
新渠道接入 = 加一个映射函数 + catalog 模板条目（预计半天工作量）。
