# WorkBuddy 调研：腾讯全场景 AI 办公工作台

> 调研日期：2026-11-02
> 调研问题：WorkBuddy 是什么、能力边界在哪、与已在用的 MiniMax Code（mcode）是什么关系，以及它对 refine-factory 的克隆站工作流有没有可借鉴或可迁移的部分。
> 一手来源：workbuddy.cn 官方文档（构建批次 2026-11-02 16:48）、workbuddy.ai 国际站定价页、腾讯云开发者社区文章。社区来源在正文中单独标注，不与官方文档混为一谈。

## 一句话结论

WorkBuddy 是腾讯云 CodeBuddy 团队做的桌面 AI 办公工作台（官方文档页的描述是「腾讯云代码助手推出的 AI Agent 办公工具」；社区与第三方记录显示 2026-03-09 上线），闭源，圈内叫「腾讯龙虾」，与 OpenClaw 生态同源。它的差异化不在模型（内置 14 个模型，MiniMax-M3、MiniMax-m2.7 都在里面），而在**技能（SKILL.md）+ 连接器（MCP）+ 定时任务**这三件套加上腾讯办公生态打通——它能本地读写文件、能挂外部服务、能按计划自己开工。

对 refine-factory 的判断是：**不适合拿它替代 mcode 跑克隆站流水线**（它是办公向而非仓库向，定时任务在 UI 上只有固定频率没有 cron，本地任务还要求电脑在线），但**有两处约定值得直接搬**——技能的项目级落点（`.codebuddy/skills/<skill>/SKILL.md`，且「项目级 > 用户级」优先级），以及连接器的安全模型（每个连接器独立授权、不主动定时抓取、不越权）。另外它的积分体系里有官方口径的「每日活跃奖励」，这和你刚做完的 mcode 每日签到 hook 是同一类问题，但两边的自动化难度完全不同。

## 1. 产品定位与运行形态

官方对 WorkBuddy 的定位是「全场景职场 AI 智能体桌面工作台」，与 CodeBuddy 共用一套账号与积分池（官方定价页原文：「CodeBuddy 和 WorkBuddy 同一账号积分共享，无需分别订阅」）。产品形态是桌面客户端为主、网页与移动端为辅，但真正值得工程师注意的是它下面藏着 **CodeBuddy CLI 内核**——`codebuddy` / `cbc` 命令，和官方 CLI 文档同源。

这个 CLI 的无头能力是 WorkBuddy 自动化体系真正的底座：`-p` 非交互执行、`--output-format json` 机器可读输出、`--bg` 后台任务、`daemon start` 常驻 HTTP API + Web UI、`daemon install` 注册为系统服务（登录自启），并提供 `CronCreate` / `CronList` / `CronDelete` 三个工具用于脚本化定时任务（官方文档：https://www.workbuddy.cn/docs/cli/headless 、https://www.workbuddy.cn/docs/cli/cli-reference ）。Windows 上有一条容易被忽略的约束：只有 `daemon start` 启动的常驻进程能脱离终端存活，其他后台会话、shell 命令和 hooks 都会随宿主 CLI 退出而被终止。

运行位置分三档，官方称之为三种定时任务来源：本地（本机客户端执行）、项目（在对应项目内查看管理）、云端（云沙箱执行，电脑关机也能跑，产物留工作空间）。

## 2. 能力模型：技能 / 专家 / 自动化 / 连接器

社区里流传的「技能 = 说明书、插件 = 手脚、自动化 = 闹钟」这个类比是准确的，官方文档能对上：

- **技能（Skill）**：通过封装脚本与工作流扩展能力，核心载体是技能包里的 `SKILL.md`。技能市场分「推荐 / SkillHub / 套件」三类，支持一键安装、上传本地技能包、以及让 WorkBuddy 自动创建技能。技能可绑定到项目，项目的共享配置会「自动注入」到成员的任务里。
- **连接器**：官方内置 QQ 邮箱、腾讯文档、腾讯乐享、腾讯会议、TAPD、腾讯网盘，并支持自定义 MCP。实现形态有两种——「MCP + CLI（标准化协议）」和「Skill + CLI（内置脚本）」。授权模型写得很清楚：每个连接器独立授权、收集 OAuth 凭据或手填 API Key、不主动定时抓取、不超出你已有权限范围。
- **项目**：项目 + 任务两层结构，统一组织指令、连接器、专家、技能和资料库。资料库以 RAG 形式注入上下文。项目级代码配置目录是 `.codebuddy/rules/`、`.codebuddy/agents/`、`.codebuddy/skills/`（每个技能独立目录含 `SKILL.md`）、`.codebuddy/commands/`、`.codebuddy/CODEBUDDY.md`，生效优先级是「项目级 > 用户级」。
- **OpenClaw 兼容**：官方更新日志 4.5.12 与 4.6.1 明确写了「兼容 Vercel/OpenClaw 生态安装 Skill」，但技能市场页正文并未提及 OpenClaw——兼容性是被承认的事实，文档没有展开。

## 3. 定时任务：能用，但限制比想象的具体

官方 Automation 页面给出的信息比社区文章更严格，值得逐条记住：

重复规则**只有固定频率选项**——间隔、单次、每天、每周、每双周、每月、每年，**UI 层不支持 cron 表达式**（该页全文无 cron 字样）。社区教程里出现的 `FREQ=WEEKLY;BYDAY=MO,TU` 那类 cron 风格串来自 `~/.workbuddy/automations/<id>/automation.toml` 这类文件层配置或 CLI 的 Cron 工具，不是桌面端表单能填的东西（社区来源：https://agentskillhub.dev/u/bighardperson/sk/openclaw-assets-to-workbuddy ）。

执行权限分两档：完全访问权限下「任务无人值守执行，工具调用无需逐次确认」；默认权限下「敏感操作需要你确认；如果你不在电脑前，任务会停在等待确认状态」。结果交付三条路径——电脑端系统通知、手机端通知（标题以「定时任务：」开头）、企业微信推送（只支持 WebSocket 长连接，不支持 URL 回调；云端任务不支持推企微）。任务能否执行 shell 命令或本地脚本，官方页面没有正面回答，只在安全提醒里写了「请审慎设置涉及文件写入 / 删除 / 资金操作的提示词」。

对自动化最致命的一条是本地任务必须电脑在线：官方原文「本地定时任务在本机客户端中执行，执行期间请勿关闭电脑或退出客户端，否则任务可能中断」，失败原因里直接列了「电脑离线导致错过执行时间」。所以**要做到真正每天必达，只能选云端任务，或绕开桌面端走 CLI daemon + 系统计划任务**。

## 4. 积分与计费

国内个人版在 2026-07-01 之后是标准/高级/旗舰三档加一个体验版，加赠送积分后的每月实得分别是 4,000 / 9,000 / 50,000；旗舰版还捆绑腾讯会议专业版、腾讯文档超级会员 Plus 与 ima 共享积分和 1TB 存储。国际站是 Free 100 credits/月、Pro $10/月（2,000 credits）、Team $40/坐席/月。模型消耗有倍率标记，移动端模型面板给出的倍率里 Deepseek-V4-Flash 是 x0.06、**MiniMax-M3 是 x0.25**、MiniMax-m2.7 不标倍率，混元 Hy3 标注限时免费——这意味着在 WorkBuddy 里跑 MiniMax-M3 的积分成本大约是 Kimi-K3（x1.62）的六分之一，对以 MiniMax 模型为主力的人是个实打实的成本优势。

积分按月发放、当月有效不累积结转，赠送部分自到账日起 1 个月内有效；扣减顺序是先到期先用，同到期时先扣基础积分再扣赠送积分。加量包 1,000 积分 50 元、有效期 1 个月、一经购买不退款。企业版两条线：旗舰版（SaaS）198 元/人/月、1 坐席起购、2,000 Credits/人/月，专享版（专有云 VPC）316 元/人/月、100 坐席起购。

## 5. 每日奖励：官方口径与社区口径差距明显

这是本次调研里最需要谨慎表述的一点。

官方国际站定价页写得很明确：Free 计划「Daily active reward: 30 credits/day」、Pro「50 credits/day」，并且说明「当天在客户端至少发起一次对话即算活跃，积分次日到账」。国内这边，官方 Credits 文档**完全没有提及「每日签到」或任何每日奖励**（该页无「签到」字样），官方定价页也没有。而社区文章则普遍称国内是「左下角头像 → Buddy 加油站 → 领取今日礼包，每天约 100 积分，连签第 7 天有额外奖励」，甚至有文章在「不足与注意事项」里直接写「每日签到已关闭」。

所以结论只能这么写：**国内确有每日签到入口且发放约 100 积分是社区反复描述的事实，但官方文档没有成文，且当前是否仍开放存在互相矛盾的社区说法；国际站则以规则明确的「每日活跃奖励」形式存在（30/50 credits/天，次日到账，需至少一次对话）。** 想要稳态拿到，官方口径只覆盖国际站那一条。

自动化可行性上，WorkBuddy 没有公开的签到 API 文档。可行路径只有两条：一是走 CLI 无头模式在本地跑脚本，配合 `daemon install` 保证常驻；二是直接在 WorkBuddy 的自动化里建一个每天触发的任务去点签到——但本地任务要求电脑在线，云端任务能否操作客户端 UI 界面官方没说。相较之下，你昨天在 mcode 侧做的直连签名 API 方案反而是更彻底的解法。

## 6. 权限与安全模型

默认权限与完全访问两档之外，沙箱还有三层保护：命令优先在沙箱约束下执行、删除尽量走安全删除或回收站、修改已有文件前自动备份。默认权限以**工作空间**为边界，工作空间内的常规文件操作通常直接执行，越界或高风险操作则暂停并请求确认。会触发确认的四类操作写得很具体：写入受保护或敏感路径、删除受保护文件或批量删除、执行脚本命令或外部程序、网络访问或敏感能力。

安全中心里还有几个默认值值得注意：AI 安全防护（模型行为智能审查、工具内容注入防护、AI 智能审批）**默认全部关闭**；批量删除审批阈值默认为 50；工具管控可以禁用产品内置工具与 MCP。首次打开含 `.codebuddy` 等开发配置目录的工作区会弹信任确认，可选择「以受限模式打开」（不扫描、不运行该目录下的文件命令脚本）。完全访问权限只在当前客户端内生效、不跨设备，切换时会弹出明确确认并列出放开的三项：文件操作、终端命令、访问互联网。

## 7. 对 refine-factory 的适用性判断

**不建议用 WorkBuddy 承接克隆站流水线。** 理由有三：它是办公工作台而非仓库工程工具，代码理解与多文件重构不是它的主场；它的定时任务是「按提示词完成查询、汇总、文件处理」，产物落在工作空间，与 refine-factory 现在「每个被克隆的网站一个 app，通过 skill 手工驱动」的节奏不匹配；最关键的是本地自动化强依赖电脑在线，云端任务又不明确能否操作你的本地克隆产物。

**可以直接借鉴的三点。** 其一是技能的项目级落点约定——`.codebuddy/skills/<skill>/SKILL.md` 独立目录 + `SKILL.md` 单文件描述 + 「项目级 > 用户级」优先级，这套规则和 mcode 的 skill 分发逻辑同源，可以让 refine-factory 的 skills/ 目录同时被两个工具消费。其二是连接器的安全模型值得抄进你自己的 connector 封装：每个连接器独立授权、凭据与业务数据分离收集、不主动定时抓取、不越权。其三是官方 Skills 市场的「SkillHub」分类与「上传技能包 / 让 Agent 自动创建技能」两种入口，值得作为 refine-factory skill 产物的分发目标参考。

**最实际的一次性价值是拿它跑通一遍 mcode 上不好做的事**：WorkBuddy 打通腾讯文档、企微、会议、邮箱，如果你的克隆站交付物需要落到腾讯文档并推送到企微，这一段用 WorkBuddy 拼装比自己写连接器省事；而且 MiniMax-M3 在它是 x0.25 倍率，模型成本也低。

## 8. 未证实 / 需进一步核实

1. 桌面端定时任务 UI 是否支持 cron——官方页只给固定频率且未明文否定 cron，存在文件层与界面层不一致的可能。
2. 定时任务能否执行 shell 命令或本地脚本——官方页未正面回答，本报告的推断基于沙箱页「执行脚本、命令或外部程序需确认」的表述。
3. 各套餐可创建的定时任务数量上限——三处官方页面均无配额数字；定价页只写自动任务数（体验版 3、标准版 15、高级版 30、旗舰版 99，且多处标注「限免 99」）。
4. 国内「每日签到」当前是否仍开放、以及国内是否存在与国际站等价的「每日活跃奖励」——官方文档未覆盖，依赖相互矛盾的社区说法。
5. 用户自建 Skill 的确切磁盘路径——官方技能页只提到 `.agents` 等目录，未给出完整路径；`~/.workbuddy/skills/` 来自第三方迁移 skill 的描述，未在官方文档中验证。
6. Skill 是否可对外发布到市场——技能页无发布流程说明，仅更新日志 5.9.0 提到「技能分享落地页」。
7. 各模型的积分倍率——官方 Model 与 Credits 页均无费率表；倍率取自移动端模型选择页与 Pricing 页，可能随版本变动。
8. 海外版专属连接器（Gmail、Outlook）的适用范围——连接器页只列国内 6 个，海外连接器仅见于更新日志。

## 来源

官方文档（一手）：

- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide
- https://www.workbuddy.cn/docs/workbuddy/Credits
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Permission-Modes
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Connector
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Model
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Project
- https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Assistant-Guide
- https://www.workbuddy.cn/docs/workbuddy/Changelog（最新版本 5.9.3，2026-10-27）
- https://www.workbuddy.cn/docs/workbuddy/Pricing、https://www.workbuddy.cn/docs/workbuddy/Overview
- https://www.workbuddy.cn/docs/cli/headless、https://www.workbuddy.cn/docs/cli/cli-reference、https://www.workbuddy.cn/docs/cli/daemon
- https://www.workbuddy.cn/docs/workbuddyapp/features/Model、https://www.workbuddy.cn/docs/workbuddymini/features/Select-Model（模型积分倍率）
- https://www.workbuddy.ai/pricing（国际站「每日活跃奖励」规则）

社区与第三方（二手，用于补官方未覆盖处）：

- https://cloud.tencent.com.cn/developer/article/2757035（电脑端/手机端环境差异、定时任务行为）
- https://cloud.tencent.com.cn/developer/article/2761028（自动化 cron 写法、积分获取实测）
- https://m.toutiao.com/article/7693441454823375404（每日签到入口与连签奖励，与其他来源冲突）
- https://agentskillhub.dev/u/bighardperson/sk/openclaw-assets-to-workbuddy（`~/.workbuddy` 目录结构、automation.toml）
- https://github.com/CiferaTeam/awesome-agents-team/blob/main/products/workbuddy.md（上线时间、模型与集成概览）
- https://agents-quant.com/blog/workbuddy-codebuddy-cli-headless-mode-audit-usage（桌面版与 CLI 内核的关系、Windows 无头实测）
