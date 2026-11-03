# DSH 插件生态七主题 Top 10 GitHub 调研

> 状态：调研报告（2026-11-03）
> 背景：[docs/research/dsh-skill-management.md](./dsh-skill-management.md)（DSH skill 管理能力盘点）的外延调研——为 dsh-innate-agent 的插件生态设计找同类开源参考。
> 数据说明：七个主题各自独立调研（WebSearch 多关键词检索 + `gh api` 实测），候选池合计 **140+ 仓库**；Stars / 语言 / License / 最近推送 / 归档状态均为 **2026-11-03** GitHub API 实测值。
> 排序口径：对 DSH 该主题的参考价值 > 活跃度 > 社区规模。

## 主题总览

| # | 主题 | 首选参考 | 一句话结论 |
|---|------|---------|-----------|
| 1 | Plugin/Skill 管理 | anthropics/skills + vercel-labs/skills | SKILL.md 事实标准 + 官方安装 CLI；评测维度看 skillsbench |
| 2 | Plugin 侧边栏 UI | shadcn sidebar + dockview | 抄 VS Code 的面板注册机制、shadcn 的折叠交互、LobeChat 的插件商店页 |
| 3 | 多 Plugin/MCP 管理 | anthropics/claude-plugins-official + IBM mcp-context-forge | 市场索引 schema 抄官方目录；冲突/版本治理抄 IBM 网关 |
| 4 | Workspace 管理 | worktrunk + mise | 「为并行 agent 设计的 worktree」+「配置分层合并」两件套最对口 |
| 5 | 项目管理 | github/spec-kit + Backlog.md | spec 驱动流程抄 spec-kit；agent 可读写的任务源抄 Backlog.md |
| 6 | Browser 插件 | playwright-mcp + browser-use | 工具协议层抄官方 MCP；agent 循环抄 browser-use；登录态复用两条路线 |
| 7 | Desktop 插件 | openclaw + UI-TARS-desktop | 宿主插件体系抄 openclaw/vscode Extension Host；GUI 控制原语抄 UI-TARS |

---

## 1. 主题：DSH Plugin/Skill 管理 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [anthropics/skills](https://github.com/anthropics/skills) | 186,768 | Python | 无 | 2026-10-28 | Anthropic 官方 Agent Skills 仓库：SKILL.md 事实标准 + 官方内容包 + skill-creator 脚手架 |
| 2 | [obra/superpowers](https://github.com/obra/superpowers) | 311,237 | Shell | MIT | 2026-11-02 | 最流行的 agent skill 框架与开发方法论，可组合技能库 + 配套 plugin marketplace |
| 3 | [vercel-labs/skills](https://github.com/vercel-labs/skills) | 37,808 | TypeScript | MIT | 2026-11-03 | `npx skills` 开源 skill 安装/分发/管理 CLI（Vercel 官方），跨 Claude Code/Codex/Cursor 等 |
| 4 | [iflytek/skillhub](https://github.com/iflytek/skillhub) | 5,358 | Java | Apache-2.0 | 2026-11-02 | 企业自托管 agent skill registry：发布/版本化/RBAC/审计，Docker/K8s 部署 |
| 5 | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | 112,829 | JavaScript | MIT | 2026-11-01 | Addy Osmani 出品的生产级工程 skill 内容包，frontmatter 与结构化工程范本 |
| 6 | [mattpocock/skills](https://github.com/mattpocock/skills) | 310,212 | Shell | MIT | 2026-11-01 | Matt Pocock「.agents 目录直出」的极简高质量 skill 集合，小而精范式 |
| 7 | [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 78,601 | Python | 无 | 2026-09-18 | 最大的 Claude Skills 策展索引（awesome list），skill 发现/目录入口 |
| 8 | [tech-leads-club/agent-skills](https://github.com/tech-leads-club/agent-skills) | 7,124 | TypeScript | 自定义 | 2026-11-02 | 主打「安全校验」的 skill registry，强调对第三方 skill 的审查与信任链 |
| 9 | [xingkongliang/skills-manager](https://github.com/xingkongliang/skills-manager) | 7,184 | Rust | MIT | 2026-11-01 | 跨 50+ 编码工具的 skill 桌面端管理/同步器（Git 仓库一键装技能） |
| 10 | [benchflow-ai/skillsbench](https://github.com/benchflow-ai/skillsbench) | 1,893 | PDDL | Apache-2.0 | 2026-10-24 | 首个 skill 增益评测框架：87 任务 × 8 域 + 配对 skill + 确定性 verifier |

### 逐项点评

1. **anthropics/skills** — SKILL.md 规范的定义者，目录结构（skill 文件夹 + 渐进式披露）、官方 `skill-creator` 元技能（创建/优化/度量 skill）以及「注册为 plugin marketplace」的用法，几乎就是 DSH 的同构参考。注意：**仓库无 License**，直接搬运 skill 内容有版权风险，参考格式与机制即可。
2. **obra/superpowers** — 社区规模最大的 skill 框架（31 万星），证明了「skill 组合 + 方法论」的产品形态；配套的 [obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)（1,316 星，MIT）就是 Claude Code 式 plugin market 索引的活样本，对 DSH plugin market 设计直接可抄。MIT 友好，极活跃。
3. **vercel-labs/skills** — 大厂官方的 skill 安装/分发工具，一条命令装/更新/同步 skill，实测当天（2026-11-03）仍在推送。对 DSH 的 skill CLI（安装源解析、跨工具落盘、版本更新）是最直接的工程参考。MIT。
4. **iflytek/skillhub** — 与 DSH plugin market 契合度最高的 registry 实现：skill 包发布、版本管理、RBAC、审计日志、私有化部署，企业级治理一整套，国内场景对口。Apache-2.0 友好；Java 技术栈与前端产品不同，但协议与数据模型可借鉴。
5. **addyosmani/agent-skills** — 11 万星的生产级工程 skill 内容包，胜在质量与规范化（统一 frontmatter、跨 agent 兼容），是「官方/头部作者内容包如何做 QA」的范本。MIT，活跃。
6. **mattpocock/skills** — 31 万星但只有十几个 skill，走「个人目录直出、每个 skill 解决一个失败模式」的极简路线，展示了 skill 集合的另一种产品哲学（少而准 vs 多而全），对 DSH 默认技能集设计有启发。MIT。
7. **ComposioHQ/awesome-claude-skills** — 7.8 万星的发现/索引入口，其分类法（按工具/领域/用途）可直接映射到 DSH plugin market 的目录与标签体系。注意：**无 License**，且 2026-09-18 后未见推送，活跃度回落，建议只借鉴目录学。
8. **tech-leads-club/agent-skills** — 差异化在「安全校验的 registry」：第三方 skill 未审计是当前最大痛点（社区热议 unvetted skills），其校验/信任机制对 DSH market 的上架审核有直接参考。注意 License 为 NOASSERTION（自定义条款），商用集成前需审读。
9. **xingkongliang/skills-manager** — Rust 桌面端管理器，解决「一个 skill 同步到 50+ 工具」的落盘/冲突/更新问题，对 DSH 桌面端的 skill 管理面板与同步引擎是现成参考。MIT，活跃。
10. **benchflow-ai/skillsbench** — 评测维度的唯一进榜者（也是该细分最成型的项目）：用配对任务 + 确定性 verifier 度量「装了 skill 到底有没有变好」，正是 DSH skill 评测体系（对应 [dsh-skill-management.md](./dsh-skill-management.md) 方案二）需要的形态。Apache-2.0；规模尚小（1.9k），学术味较浓。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [wshobson/agents](https://github.com/wshobson/agents) | 42,117 | 主体是 subagent 集合（约 200 个 agent），skills 只是附属（约 150 个），主题偏「agent 管理」而非 skill 管理 |
| [K-Dense-AI/scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 55,832 | 契合但垂直于科研领域，通用 skill 管理参考价值低于进榜内容包 |
| [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) | 50,649 | 垂直 Obsidian 单一工具的 skill 包，主题面窄 |
| [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills) | 49,052 | 聚合抓取 2,884+ skills，量大但策展与治理信息弱，与第 7 名 awesome 索引定位重叠 |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | 40,731 | 「repo 即 skill 源」的分发机制可参考，但生态绑定 Copilot，主题偏移 |
| [obra/superpowers-skills](https://github.com/obra/superpowers-skills) | 756 | **已归档**（2025-10 停更），内容已并入 superpowers 主仓库 |

> 另注：宣称「最大 open skill marketplace」的 EthicalML/agent-skills-marketplace 实测仅 3 星（SEO 文章夸大）；travisvn/awesome-claude-skills（15,678 星）与第 7 名同名同定位但更小、6 个多月未推送且无 License，均不建议作为参考。

---

## 2. 主题：DSH Plugin 侧边栏（Sidebar/Panel UI）Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [microsoft/vscode](https://github.com/microsoft/vscode) | 194,506 | TypeScript | MIT | 2026-11-03 | Activity Bar + Side Bar + Panel 的原版 IDE shell，插件面板注册机制的鼻祖 |
| 2 | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | 127,202 | TypeScript | MIT | 2026-11-02 | Sidebar 组件：`collapsible="icon"` 折叠 rail + SidebarProvider 状态管理 |
| 3 | [dockview/dockview](https://github.com/dockview/dockview) | 3,506 | TypeScript | MIT（GitHub 标记 NOASSERTION） | 2026-10-31 | 零依赖 TS dock 布局引擎，VS Code 风格可停靠/拖拽成组面板 |
| 4 | [lobehub/lobe-chat](https://github.com/lobehub/lobe-chat) | 83,718 | TypeScript | MIT + 附加条款 | 2026-11-02 | 插件商店 + 侧栏导航 + 面板折叠的产品级 agent 应用 |
| 5 | [continuedev/continue](https://github.com/continuedev/continue) | 36,399 | TypeScript | Apache-2.0 | 2026-11-02 | VS Code/JetBrains 双端侧栏 chat + 配置 GUI 的完整工程实现 |
| 6 | [cline/cline](https://github.com/cline/cline) | 71,228 | TypeScript | Apache-2.0 | 2026-11-03 | VS Code 侧栏 autonomous agent 面板（webview UI） |
| 7 | [Mintplex-Labs/anything-llm](https://github.com/Mintplex-Labs/anything-llm) | 67,866 | JavaScript | MIT | 2026-11-03 | Electron 桌面 AI 应用，左侧栏 + 工作区管理 |
| 8 | [bvaughn/react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) | 5,446 | TypeScript | MIT | 2026-11-02 | Headless 分割面板组件（shadcn Resizable 的底层） |
| 9 | [jupyterlab/lumino](https://github.com/jupyterlab/lumino) | 764 | TypeScript | BSD-3（GitHub 标记 NOASSERTION） | 2026-11-01 | JupyterLab 的 IDE 布局引擎：DockPanel/SplitPanel/TabBar + 命令注册 |
| 10 | [obsidianmd/obsidian-api](https://github.com/obsidianmd/obsidian-api) | 2,349 | TypeScript (d.ts) | MIT | 2026-10-05 | Obsidian 官方插件 API：ItemView/WorkspaceLeaf 侧边栏面板注册设计 |

### 逐项点评

1. **microsoft/vscode** — DSH 的「activity bar + 侧边栏面板」形态即源于此，直接读 `src/vs/workbench/browser/parts/`（activitybar、sidebar、panel 布局）和扩展清单的 `contributes.viewsContainers` / `contributes.views`——插件如何声明并注册一个侧边栏视图，是最值得抄的面板注册机制。注意：代码量巨大，只取 shell 布局部分参考；产品名称/扩展市场受微软商标约束，不可整体 fork 商用。
2. **shadcn-ui/ui** — 其 `sidebar` 组件是 React 技术栈下最直接可复用的实现：图标折叠模式（折叠成 activity bar 式窄 rail）、SidebarProvider/SidebarTrigger 状态、键盘快捷键、移动端 Drawer 适配一应俱全。注意它是「复制源码」而非 npm 依赖，与 Tailwind 深度绑定；DSH 若非 Tailwind 栈则主要参考其状态机与折叠交互设计。
3. **dockview/dockview** — 若 DSH 插件面板要支持拖拽 dock、拆分、成组、浮动，这是目前最现代的 TS 引擎（React/Vue 组件内建），官方文档有「Edge Groups」专章演示如何做出 VS Code 式 sidebar/panel。注意：License 文件为非标准 MIT（GitHub 显示 NOASSERTION，商用前核对）；若只需简单分割面板可降级用第 8 名。
4. **lobehub/lobe-chat** — 与 DSH 产品形态最接近的完整应用：左侧栏（会话/助手/文件/设置导航）+ 插件商店页面 + 侧栏宽度/折叠交互，其 Plugins 商店的分类、启停、详情面板实现可直接对照 DSH Plugins 页面。注意：License 为 MIT 附加条款（限制多租户 SaaS 等商用场景）。
5. **continuedev/continue** — IDE 侧栏 chat 的真实工程范本：webview 内自绘整套侧栏 UI（会话流、代码块 diff、配置 GUI 面板），且同时适配 VS Code 与 JetBrains 两套宿主 shell。注意：布局受宿主 IDE 约束，侧重复 chat 面板内容区实现。
6. **cline/cline** — 侧栏 agent 面板的交互密度标杆：任务计划、工具调用折叠条、human-in-the-loop 批准按钮、上下文文件列表全塞进窄侧栏且不显拥挤，这套「窄面板信息架构」值得 DSH 插件面板借鉴。同为 VS Code webview 形态，参考侧重内容区而非布局引擎。
7. **Mintplex-Labs/anything-llm** — Electron 桌面形态与 DSH 相同：左侧栏工作区切换 + 折叠 + 设置面板，还有内嵌「Agent 技能/插件配置」页，是桌面打包（Electron 侧栏跨平台表现）的现成参照。侧栏本身实现相对朴素，组件化程度不如 LobeChat。
8. **bvaughn/react-resizable-panels** — 侧边栏宽度拖拽、面板折叠（collapsible + min/max 约束）、嵌套分割的 headless 实现，作者为 React 前核心成员，v4 迭代活跃；shadcn 的 Resizable 组件就是封装它。只管分割不管 dock/tab，需配合布局引擎使用。
9. **jupyterlab/lumino** — 框架无关的 widget 体系 + DockPanel，JupyterLab 全部面板跑在它上面，经过最重的生产验证；其「命令面板 + 插件注册 widget」模式对 DSH 面板注册机制有启发。Star 数不能反映其地位；API 偏底层，React 项目通常先看 dockview。
10. **obsidianmd/obsidian-api** — Obsidian 是「插件化桌面应用」最成功范例，其 API 设计（插件声明 `viewtype` → `registerViewItem` → 挂到 WorkspaceLeaf → 左右侧栏 dock）是独立于 VS Code 之外的另一套插件面板注册思路，证明了第三方插件可往侧边栏无限添加面板。仓库只有 .d.ts 类型定义，仅作 API 设计参考。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [open-webui/open-webui](https://github.com/open-webui/open-webui) | 157,584 | Svelte + Python 栈，侧栏仅是会话列表，无 activity bar/插件面板概念，与 DSH 的 React 桌面栈不匹配 |
| [ChatGPTNextWeb/NextChat](https://github.com/ChatGPTNextWeb/NextChat) | 88,940 | 侧栏是极简会话列表，无 dock/插件面板可参考，且推送节奏放缓 |
| [danny-avila/LibreChat](https://github.com/danny-avila/LibreChat) | 46,652 | 与 LobeChat 定位高度重叠，侧栏/插件 UI 完成度弱于 LobeChat，让位避免重复占榜 |
| [golden-layout/golden-layout](https://github.com/golden-layout/golden-layout) | 6,722 | 老牌 dock 引擎但近两月推送稀疏、无原生 React 绑定，已被更现代的 dockview 取代 |
| [react-grid-layout/react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) | 22,478 | 场景是 dashboard 网格拖拽，非 IDE 侧边栏/dock 布局，主题不符 |
| [phibr0/obsidian-customizable-sidebar](https://github.com/phibr0/obsidian-customizable-sidebar) | 86 | **已归档**（2022-07 停更）；Obsidian 侧栏机制参考改用官方 obsidian-api |

> 另有 ticlo/rc-dock（814★）、caplin/FlexLayout（1,383★）、johnwalley/allotment（1,262★）功能对口但社区小、多为单人维护；eclipse-theia（21,732★）的 shell 布局与 vscode 参考重叠且 EPL-2.0 商用需注意，均未进榜。

---

## 3. 主题：DSH 多 Plugin/MCP 管理 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [anthropics/claude-code](https://github.com/anthropics/claude-code) | 154,298 | TypeScript | 无（专有源码） | 2026-11-02 | Claude Code 官方 CLI，/plugin 命令 + marketplace.json 机制正是 DSH 插件体系的原型 |
| 2 | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | 45,850 | Python | Apache-2.0 | 2026-11-02 | Anthropic 官方插件目录与市场索引，plugin bundle 分发/收录治理的范本 |
| 3 | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | 91,751 | TypeScript | NOASSERTION | 2026-10-29 | MCP 官方 server 集合与生态索引，含 .mcpb 打包分发规范 |
| 4 | [modelcontextprotocol/registry](https://github.com/modelcontextprotocol/registry) | 7,429 | Go | NOASSERTION | 2026-10-31 | MCP 官方 registry 服务端：命名空间、版本、发布/发现 API |
| 5 | [modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) | 11,216 | TypeScript | NOASSERTION | 2026-10-29 | 官方 MCP server 可视化测试/调试面板 |
| 6 | [IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge) | 4,740 | Python | Apache-2.0 | 2026-11-02 | IBM 开源 MCP 聚合网关：统一端点、虚拟 server、多版本路由与工具名冲突治理 |
| 7 | [samanhappy/mcphub](https://github.com/samanhappy/mcphub) | 2,620 | TypeScript | Apache-2.0 | 2026-11-02 | MCP server 聚合管理器：启停、OAuth 授权管理、统一 /mcp 端点 + Web UI |
| 8 | [docker/mcp-gateway](https://github.com/docker/mcp-gateway) | 1,620 | Go | MIT | 2026-10-26 | Docker 官方 MCP Toolkit：catalog + gateway + runtime 三层，支持版本 pin |
| 9 | [pathintegral-institute/mcpm.sh](https://github.com/pathintegral-institute/mcpm.sh) | 1,021 | Python | MIT | 2026-10-25 | MCPM，「MCP 界的 npm」：跨 client 安装/启停/版本管理 |
| 10 | [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates) | 33,075 | Python | MIT | 2026-11-02 | 交互式 agent/命令/MCP 组件市场 CLI 与 Web 目录 |

### 逐项点评

1. **anthropics/claude-code** — DSH 机制的直系参照：marketplace.json 格式、`/plugin marketplace add`、多 market 并存、profiles 启停，几乎可逐条对照设计 DSH 的 plugin-market 与 Discover。注意：仓库无开源 License（专有源码，仅可阅读借鉴，不可抄代码）。
2. **anthropics/claude-plugins-official** — 官方市场索引的目录结构、插件收录标准与清单字段（含版本、分类、安装来源）可直接作为 DSH plugin-market 索引 schema 的蓝本。Apache-2.0 友好，极活跃，第一手参考。
3. **modelcontextprotocol/servers** — 除了 server 参考实现，更重要的是其生态索引组织方式（官方/社区分流、归档治理）与 .mcpb bundle 分发格式，DSH 若要兼容 MCP 插件分发必须对齐。License 为 NOASSERTION，复用前需逐目录确认。
4. **modelcontextprotocol/registry** — 官方 registry 的服务端实现（Go），命名空间防抢注、版本化发布、下载统计正是 DSH 市场后端要做的事；可评估直接兼容其 API 而非自建协议。同样 NOASSERTION，需注意。
5. **modelcontextprotocol/inspector** — 给 DSH 做「插件质量门禁/诊断页」的最佳范本：连接任意 MCP server 后枚举 tools/resources、试运行、看日志，集成成本低（Node CLI 即起）。
6. **IBM/mcp-context-forge** — 多 MCP server 场景的编排/治理最完整的开源实现：虚拟 server 统一暴露、按 server 前缀消除工具名冲突、灰度多版本——直击 DSH 的「冲突处理/版本」痛点。Apache-2.0，但 Python 栈，与 DSH 的 TS/pnpm 生态不同构。
7. **samanhappy/mcphub** — 启停粒度到单个 server、OAuth 授权集中管理、Docker 一键部署，UI 信息密度适合 DSH 的 Discover/管理页参考。规模中等但周更，健康。
8. **docker/mcp-gateway** — catalog（数百 server 目录）+ 网关 + 运行时的分层与 `owner/repo@version` 版本 pin 语义，对 DSH「安装来源 + 版本锁定 + 冲突」设计很有参考价值；Go 实现、Docker 交付。
9. **pathintegral-institute/mcpm.sh** — 安装/启停/升级/跨 client 配置同步的完整 CLI 语义（含 registry 与版本语义），与 DSH「pnpm 安装 plugin bundle」的流程同构度最高，值得逐命令对照。1k 星但活跃。
10. **davila7/claude-code-templates** — 交互式组件市场（CLI + Web 双入口、按组件类型过滤、一键安装到项目）是 Discover 页 UX 最现成的模仿对象。注意它偏「模板/组件」分发，权限与安全治理较弱。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [microsoft/vscode](https://github.com/microsoft/vscode) | 194,506 | 扩展启停/版本/marketplace 是工业标准，但仓库是完整 IDE 体量过大；宜按需读其扩展管理子系统 |
| [fastify/fastify](https://github.com/fastify/fastify) | 37,336 | 封装式插件内核（avvio 加载序、作用域隔离）成熟，但属 Web 框架场景 |
| [webpack/tapable](https://github.com/webpack/tapable) | 3,866 | hooks 内核库，可作 DSH 插件生命周期 hooks 的底层依赖，但本身不做「管理」 |
| [vercel-labs/open-plugin-spec](https://github.com/vercel-labs/open-plugin-spec) | 1,422 | 跨平台插件清单规范提案，方向契合但尚处早期且 License 为 NOASSERTION |
| [open-webui/mcpo](https://github.com/open-webui/mcpo) | 4,414 | MCP→OpenAPI 代理，定位是协议转换而非管理，且约半年未更新 |
| [cline/mcp-marketplace](https://github.com/cline/mcp-marketplace) | 795 | 市场数据源优质，但约 16 个月未更新；ravitemer/mcp-hub、supercorp-ai/supergateway 同因契合度/活跃度落选 |

---

## 4. 主题：DSH Workspace 管理 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands) | 92,517 | TypeScript | MIT | 2026-11-03 | 开源 agent 平台，含完整 runtime/sandbox workspace 架构 |
| 2 | [NanmiCoder/cc-haha](https://github.com/NanmiCoder/cc-haha) | 15,271 | TypeScript | Community Source 1.0 | 2026-11-03 | 本地优先的 AI Agent 桌面工作台（多 agent + worktree + 技能市场） |
| 3 | [max-sixty/worktrunk](https://github.com/max-sixty/worktrunk) | 10,025 | Rust | MIT OR Apache-2.0 | 2026-11-02 | 专为并行 AI agent 设计的 git worktree 管理 CLI |
| 4 | [coder/coder](https://github.com/coder/coder) | 17,257 | Go | AGPL-3.0 | 2026-11-03 | 自托管远程开发 workspace 控制平面（Terraform 模板化） |
| 5 | [openai/codex](https://github.com/openai/codex) | 132,883 | Rust | Apache-2.0 | 2026-11-03 | 开源 agent CLI，含精细的 workspace 隔离与 sandbox 设计 |
| 6 | [jdx/mise](https://github.com/jdx/mise) | 35,691 | Rust | MIT | 2026-11-03 | polyglot 版本管理器 + 任务运行器，配置分层典范 |
| 7 | [zellij-org/zellij](https://github.com/zellij-org/zellij) | 35,919 | Rust | MIT | 2026-11-02 | 现代终端多路复用器，KDL 声明式 layout + 会话恢复 |
| 8 | [jetify-com/devbox](https://github.com/jetify-com/devbox) | 12,441 | Go | Apache-2.0 | 2026-11-01 | per-project `devbox.json` 可复现开发环境（Nix 内核） |
| 9 | [tmuxinator/tmuxinator](https://github.com/tmuxinator/tmuxinator) | 13,740 | Ruby | MIT | 2026-10-10 | 用 YAML 声明式定义 tmux workspace 布局的鼻祖 |
| 10 | [joshmedeski/sesh](https://github.com/joshmedeski/sesh) | 2,920 | Go | MIT | 2026-11-02 | git 仓库感知的智能 tmux 会话管理器 |

### 逐项点评

1. **OpenHands** — 与 DSH 同为平台型 agent 产品，其「每个会话绑定一个 Docker sandbox runtime、workspace 状态独立快照」的架构是 DSH 多 workspace 隔离最完整的参照。MIT 宽松，但它是重云端方案，DSH 本地场景需裁剪。
2. **cc-haha** — 场景与 DSH 重合度最高：多 agent 协作、每任务独立 git worktree、技能市场、多模型切换、飞书/钉钉远程接入，几乎是「中文社区的 DSH 同类产品」。注意其 License 为自定的 Community Source License 1.0（source-available 非 OSI），只可借鉴思路，不可直接复制代码。
3. **worktrunk** — 明确「为并行 AI agent 工作流而生」的 worktree 管理器：分支目录命名规范、依赖树拓扑 sync、生命周期 hooks、一键并行拉起多个 agent，直接可抄到 DSH 的多 workspace 目录规划。双许可宽松；较新，API 可能仍在演进。
4. **coder/coder** — workspace 即模板产物：Terraform 模板定义 workspace 形态、按需启停、workspace 级参数覆盖，这套「模板 + 实例 + 生命周期状态机」抽象对 DSH 的 workspace 类型化很值得借鉴。注意 AGPL-3.0 传染性，架构参考无妨但不可混入代码。
5. **codex** — 活跃度最高的 agent CLI（13.3 万星），其每会话独立 cwd、workspace-trust 分级、seatbelt/landlock 双平台沙箱、多会话并行模型，是 DSH「每 workspace 会话与终端隔离」的直接工程范本。workspace 管理只是其子模块。
6. **mise** — 「global > project > local」三层配置合并 + `.mise.toml` per-directory 激活 + 环境变量注入，这套配置分层与 workspace 绑定机制几乎可以平移到 `.dsh` 配置体系。Rust 实现，极活跃，MIT 友好。
7. **zellij** — KDL layout 文件把「会话布局」变成可版本化的声明式配置，加上 session resurrection（布局+环境自动恢复），对应 DSH 的会话快照与终端编排需求；其「layout 模板 + 项目绑定」插件化思路也契合 DSH 插件平台定位。
8. **devbox** — 单文件 `devbox.json` 锁定整个项目环境（包+脚本+钩子），`devbox shell` 进入即得隔离环境，是 `.dsh` 做环境复现（per-workspace 依赖清单）的最佳模板。底层依赖 Nix，学习曲线较陡。
9. **tmuxinator** — 用一份 YAML 声明一个完整工作区（窗口/窗格/启动命令），「workspace as config file」理念与 DSH 每个 workspace 的会话+终端配置持久化完全同构，实现简单可快速落地。Ruby 生态，性能与嵌入式场景参考价值有限。
10. **sesh** — 会话自动以 git remote/仓库名命名、从目录反查会话、zoxide 式模糊切换，解决了「session 与 project workspace 的映射」这一 DSH 多项目切换的痛点；Go 单二进制，代码量小易读。规模尚小是唯一短板。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [daytonaio/daytona](https://github.com/daytonaio/daytona) | 71,392 | 2026-06 起核心开发转入私有代码库，**仓库已归档**（README 官方声明），不可持续参考 |
| [loft-sh/devpod](https://github.com/loft-sh/devpod) | 15,307 | client-only dev environment 理念很好（provider 插件化架构值得一看），但最后推送 2025-11、release 停在 2025-06 alpha，近一年停滞 |
| [coder/code-server](https://github.com/coder/code-server) | 79,759 | 活跃且星数高，但本质是「浏览器里的 VS Code」访问层，对 agent workspace 管理参考偏间接 |
| [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) | 108,682 | 活跃度极高，但定位是 agent CLI 本体，workspace/多项目管理非核心卖点，参考面窄于 codex |
| [raine/workmux](https://github.com/raine/workmux) | 2,986 | worktree + tmux window 组合与 DSH 终端编排对口，但社区小且与 worktrunk/sesh 定位重叠 |
| [direnv/direnv](https://github.com/direnv/direnv) | 15,533 | per-directory 环境加载是 `.dsh` 激活机制的参考之一，但功能单一，被 mise（已含 env 管理）覆盖 |

> 补充：tmux 本体（50,126★）是基础设施级多路复用器而非管理层；letta（25,321★）偏 memory 层；asdf（25,623★）作为 mise 前驱已让位。五类覆盖：远程/云端（coder）、环境管理器（mise、devbox）、worktree（worktrunk）、终端会话（zellij、tmuxinator、sesh）、agent workspace（OpenHands、cc-haha、codex）。

---

## 5. 主题：DSH 项目管理 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [github/spec-kit](https://github.com/github/spec-kit) | 145,506 | Python | MIT | 2026-11-02 | GitHub 官方 spec 驱动开发工具包，`/specify→/plan→/tasks→/implement` 全流程 |
| 2 | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | 73,722 | TypeScript | MIT | 2026-11-02 | 轻量、brownfield 友好的 spec 增量变更提案 + 任务追踪框架 |
| 3 | [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 54,906 | Python | NOASSERTION | 2026-11-02 | 用 AI agent 模拟完整敏捷团队（PM/架构师/Dev）的方法论引擎 |
| 4 | [makeplane/plane](https://github.com/makeplane/plane) | 61,887 | TypeScript | AGPL-3.0 | 2026-11-02 | 面向人类与 agent 协作的 AI 原生自托管 PM（Jira/Linear 替代） |
| 5 | [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | 28,293 | JavaScript | NOASSERTION | 2026-04-28 | PRD→任务依赖图→上下文管理的 MCP 任务编排器 |
| 6 | [hcengineering/platform](https://github.com/hcengineering/platform)（Huly） | 28,044 | TypeScript | EPL-2.0 | 2026-11-02 | Linear/Jira/Notion/Slack 全合一的自托管 PM 套件 |
| 7 | [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) | 7,248 | TypeScript | MIT | 2026-10-29 | git 生态内 markdown backlog，人与 AI agent 共用的任务管理 CLI |
| 8 | [opf/openproject](https://github.com/opf/openproject) | 16,942 | Ruby | GPL-3.0 | 2026-11-03 | 老牌全功能自托管 PM（看板/甘特/敏捷/backlog） |
| 9 | [AppFlowy-IO/AppFlowy](https://github.com/AppFlowy-IO/AppFlowy) | 78,122 | Dart | AGPL-3.0 | 2026-11-02 | 内置 AI 的 Notion 开源替代（知识库 + 项目视图） |
| 10 | [wekan/wekan](https://github.com/wekan/wekan) | 21,150 | JavaScript | MIT | 2026-11-02 | 老牌开源看板（Trello 替代），MIT 宽松许可 |

### 逐项点评

1. **spec-kit** — SDD 事实标准，spec/plan/tasks 产物链与 constitution（工程约束注入）机制与 DSH 的「计划-执行闭环」直接同构，可作为 DSH 项目管理插件的流程蓝本。MIT 无风险；流程较重（多阶段门禁），宜做裁剪。
2. **OpenSpec** — 主打既有代码库的增量 change proposal（spec → tasks → implement），比 spec-kit 更轻，适合 DSH 做轻量迭代式任务管理；MIT，活跃度极高。
3. **BMAD-METHOD** — 把 PM/架构师/Dev 角色做成 agent，含 story 拆分、冲刺规划、sharding，是「agent 当项目经理」最完整的参考。注意 License 为 NOASSERTION（自定义许可，商用前需审读）。
4. **plane** — 官方定位「projects for teams and agents」，issue/cycles/看板/AI 工作流一应俱全，是 DSH 内置可视化 PM 层最直接的平台级参考。AGPL-3.0 有传染性——借鉴数据模型可以，抄代码需谨慎。
5. **claude-task-master** — PRD 解析→任务依赖→逐任务喂上下文的 MCP 模式与 DSH 任务编排高度对标，可参考其任务文件格式与上下文裁剪策略。注意：License 为 NOASSERTION，且已约 6 个月未推送，依赖前需评估维护状态。
6. **Huly（hcengineering/platform）** — 原 hcengineering/huly 已迁移至此仓；issue tracker + wiki + chat 一体化，实时协作架构值得研究。EPL-2.0 对商用相对友好，但自托管部署较重。
7. **Backlog.md** — 将 backlog 以 markdown 存进 git、人机共用，含决定论任务 ID、依赖与子任务，正是 DSH「agent 可读写的任务源」形态；MIT + 活跃，星数少但参考价值密度高。
8. **OpenProject** — 企业级功能全集（甘特、敏捷、backlog、时间线）可当 DSH 功能对照清单；GPL-3.0 + Ruby 单体，重，只宜参考功能设计而非实现。
9. **AppFlowy** — 知识库 + 项目视图 + 内置 AI 的组合，对 DSH 的文档/需求沉淀侧有参考；AGPL-3.0，且主体是 Dart/Flutter，技术栈迁移性差。
10. **wekan** — 纯粹的经典看板参考（列表/卡片/泳道模型简单干净），MIT 允许直接借鉴代码；无 AI 能力，仅作看板数据模型参考。

### 落选说明

| 项目 | Stars | 状态 | 落选原因 |
|---|---|---|---|
| [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | 64,170 | MIT，archived | spec 驱动 + 长任务自治的名工具，但 **已归档**；续作 gsd-2（7,755 星）同样已归档 |
| [mattermost/focalboard](https://github.com/mattermost/focalboard) | 26,539 | NOASSERTION | 未标记归档，但近半年零推送，维护实质停滞，Mattermost 已转移重心 |
| [tegonhq/tegon](https://github.com/tegonhq/tegon) | 1,910 | AGPL-3.0，archived | AI 原生 issue tracking 方向契合，但 **已归档**（2025-03 停更） |
| [kaleidos-ventures/taiga](https://github.com/kaleidos-ventures/taiga) | 576 | MPL-2.0 | 社区版主仓近 3 年未推送，社区萎缩 |
| [plankanban/planka](https://github.com/plankanban/planka) | 12,666 | 自定义 License | 漂亮的自托管看板，但非标准开源协议，与 wekan 定位重叠 |
| [Pimzino/spec-workflow-mcp](https://github.com/Pimzino/spec-workflow-mcp) | 4,306 | GPL-3.0 | spec 工作流 MCP + dashboard 有参考性，但 4 个月未推送、社区小、GPL 传染 |

> 其余如 Leantime（11,956★/AGPL）、Kanboard（9,938★/MIT）、Vikunja（5,942★/AGPL）、Redmine（6,069★）均活跃，但与已入选项目功能重叠、对「agent 驱动 PM」增量参考有限。

---

## 6. 主题：DSH Browser 插件 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [browser-use/browser-use](https://github.com/browser-use/browser-use) | 119,866 | Python | MIT | 2026-11-02 | AI Agent 浏览器自动化框架的事实标准，LLM 驱动导航/点击/表单 |
| 2 | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | 39,032 | TypeScript | Apache-2.0 | 2026-11-01 | 微软官方浏览器 MCP server，结构化快照 + 扩展连接真实浏览器 |
| 3 | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | 54,675 | TypeScript | Apache-2.0 | 2026-11-02 | Chrome 官方 MCP server，经 CDP 接管活动 Chrome 做 DOM/网络/性能检查 |
| 4 | [browserbase/stagehand](https://github.com/browserbase/stagehand) | 25,911 | TypeScript | MIT | 2026-11-02 | AI 版 Playwright：`act()/extract()/observe()` 三原语 SDK |
| 5 | [browser-use/browser-harness](https://github.com/browser-use/browser-harness) | 18,823 | Python | MIT | 2026-11-02 | 让 Claude Code/Codex/Cursor 以用户登录态驱动真实 Chrome 的 harness |
| 6 | [Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern) | 23,336 | Python | AGPL-3.0 | 2026-11-02 | 视觉 + DOM 混合的浏览器工作流自动化（表单/发票/企业流程） |
| 7 | [nanobrowser/nanobrowser](https://github.com/nanobrowser/nanobrowser) | 14,223 | TypeScript | Apache-2.0 | 2026-10-24 | Chrome 侧边栏多 Agent 扩展（Planner + Browser Agent），开源 Operator 平替 |
| 8 | [hangwin/mcp-chrome](https://github.com/hangwin/mcp-chrome) | 12,526 | TypeScript | MIT | 2026-01-06 | 直接跑在 Chrome 扩展里的 MCP server，接管已登录标签页 |
| 9 | [wxt-dev/wxt](https://github.com/wxt-dev/wxt) | 10,688 | TypeScript | MIT | 2026-11-02 | 下一代浏览器扩展开发框架（MV3、多浏览器、Vite 生态） |
| 10 | [steel-dev/steel-browser](https://github.com/steel-dev/steel-browser) | 7,909 | TypeScript | Apache-2.0 | 2026-11-02 | 面向 AI Agent 的开源浏览器 API：会话管理/指纹/自托管 |

### 逐项点评

1. **browser-use** — DSH 浏览器插件绕不开的标杆：Agent 决策与浏览器动作解耦、DOM 序列化喂给 LLM、多标签管理的设计可直接映射为插件工具集。MIT、12 万星、日更级活跃；注意其商业云服务与开源库的功能边界在收敛，接入前确认用库而非 SDK 锁定。
2. **playwright-mcp** — 浏览器插件「工具层」的最佳模板：accessibility-tree 结构化快照（省 token）、按 tab 隔离 context、官方 Chrome 扩展可连用户已登录浏览器（登录态复用的标准做法）。Apache-2.0 + 微软维护，DSH 插件若封装 MCP 协议，此为第一参考。
3. **chrome-devtools-mcp** — 与 playwright-mcp 互补：偏「观察/接管」而非跨浏览器驱动，console/network/storage/性能 trace 一应俱全，适合做 DSH 的页面调试与 DOM 深度提取能力。Chrome-only 是边界；谷歌官方团队维护，增长极快。
4. **stagehand** — DOM 提取与操作原语设计最优雅的参考：缓存化 `observe()`、可组合的 `act/extract`、AI SDK 风格 Provider 抽象（换模型不动代码），TypeScript 技术栈与多数插件系统天然亲和。MIT，与 Browserbase 云服务解耦可纯本地用。
5. **browser-harness** — 与 DSH 插件形态最直接的镜像：以 harness/skill 形式给 coding agent 注入「真实浏览器 + 用户登录态」，解决了 profile 复用与持久会话问题。MIT、18.8k 星且极活跃；依赖 browser-use 生态，架构上需评估传递依赖。
6. **Skyvern** — 视觉 + DOM 双通道与「工作流固化」（把交互沉淀为可重放任务）思路，适合 DSH 做确定性重复任务场景。**注意 AGPL-3.0 传染性**：以服务形态集成需评估合规，参考架构而非抄代码更稳妥。
7. **nanobrowser** — 扩展形态 Agent 的代表：MV3 侧边栏 UI + CDP 控制宿主浏览器 + 多角色 agent（Planner/Executor）编排，BYOK 模式。Apache-2.0；适合作 DSH「插件内嵌 UI + agent loop」的样板。
8. **mcp-chrome** — 「MCP server 藏进扩展、零 native 依赖接管真实浏览器」的完整实现：标签页/网络/截图/DOM 全套工具，是登录态复用的另一条技术路线（无 CDP 调试端口）。MIT；注意 2026-01 之后主分支推送放缓（约 10 个月），需评估维护风险。
9. **wxt** — 若 DSH 浏览器插件走扩展形态（侧边栏 agent、页面接管），wxt 是当前最活跃的工程基座：HMR、跨 Chrome/Firefox/Safari 构建、auto-import。MIT、周更级活跃；与 Plasmo 同类二选一，wxt 社区势头更盛。
10. **steel-browser** — 浏览器插件「后端供给层」参考：把 Playwright 会话包装成 REST API（会话持久化、指纹伪装、代理、扩展注入），Docker 自托管即得云浏览器。Apache-2.0、活跃；API 设计对 DSH 自建浏览器服务最易抄。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [lightpanda-io/browser](https://github.com/lightpanda-io/browser) | 40,938 | 面向 agent 的无头浏览器引擎，性能惊艳但属 Zig 引擎级基建且 **AGPL-3.0**，对插件层参考为「集成」而非「模式」 |
| [browserless/browserless](https://github.com/browserless/browserless) | 13,888 | 老牌无头浏览器服务、仍在更新，但 License 为 NOASSERTION（非标准商业条款），商用集成有法律成本 |
| [PlasmoHQ/plasmo](https://github.com/PlasmoHQ/plasmo) | 13,172 | 优秀扩展框架，但与 wxt 同定位，按活跃度与社区势头二选一落选 |
| [web-infra-dev/midscene](https://github.com/web-infra-dev/midscene) | 15,474 | 字节系视觉驱动 UI 自动化、MIT 且极活跃，但主战场是自然语言 E2E 测试 |
| [executeautomation/mcp-playwright](https://github.com/executeautomation/mcp-playwright) | 5,675 | 社区早期 Playwright MCP，但约 11 个月无推送，被官方 playwright-mcp 取代 |
| [browserbase/mcp-server-browserbase](https://github.com/browserbase/mcp-server-browserbase) | 3,398 | **已归档**，功能并入 Stagehand/官方平台 |
| [lavague-ai/LaVague](https://github.com/lavague-ai/LaVague) | 6,395 | 早期知名 web agent 框架，2025-01 后停更近两年，仅存历史价值 |

> **给 DSH 的选型小结**：工具协议层抄 playwright-mcp / chrome-devtools-mcp，Agent 循环与 DOM 提取参考 browser-use + stagehand，登录态复用看 browser-harness（CDP/CLI 路线）与 mcp-chrome（扩展内 MCP 路线），扩展形态基座选 wxt，自托管浏览器供给参考 steel-browser。License 红线：Skyvern 与 Lightpanda 均为 AGPL。

---

## 7. 主题：DSH Desktop 插件 Top 10

| 排名 | 项目 | Stars | 语言 | License | 最近推送 | 一句话定位 |
|---|---|---|---|---|---|---|
| 1 | [openclaw/openclaw](https://github.com/openclaw/openclaw) | 393,755 | TypeScript | MIT | 2026-11-03 | 本地自托管的个人 AI Agent 宿主，靠 skills/插件体系给 agent 注入能力 |
| 2 | [microsoft/vscode](https://github.com/microsoft/vscode) | 194,506 | TypeScript | MIT | 2026-11-03 | 插件（扩展）架构的黄金标准：Extension Host 进程隔离 + 声明式贡献点 |
| 3 | [bytedance/UI-TARS-desktop](https://github.com/bytedance/UI-TARS-desktop) | 39,526 | TypeScript | Apache-2.0 | 2026-10-09 | 字节开源的 GUI Agent 桌面应用：截屏/键鼠控制 + 多模型接入的完整产品形态 |
| 4 | [openinterpreter/openinterpreter](https://github.com/openinterpreter/openinterpreter) | 68,782 | Rust | Apache-2.0 | 2026-11-01 | LLM 在本地电脑上执行代码/控制系统，Rust 重写后含 Computer Use 技能 |
| 5 | [janhq/jan](https://github.com/janhq/jan) | 45,339 | Rust | AGPL-3.0 附加（NOASSERTION） | 2026-11-02 | Electron AI 桌面应用，extension 架构 + 推理放独立进程的隔离设计 |
| 6 | [simular-ai/Agent-S](https://github.com/simular-ai/Agent-S) | 12,859 | Python | Apache-2.0 | 2026-10-30 | SOTA 开源 computer-use agent 框架，OS 级鼠标键盘自主操作 |
| 7 | [microsoft/UFO](https://github.com/microsoft/UFO) | 10,167 | Python | MIT | 2026-10-30 | 微软 Windows OS Agent，基于 UI Automation（accessibility 树）的原生方案 |
| 8 | [mediar-ai/screenpipe](https://github.com/mediar-ai/screenpipe) | 22,210 | Rust | Screenpipe Open License（NOASSERTION） | 2026-11-03 | 24/7 桌面录屏 + OCR/索引 + 插件管道，给 agent 提供桌面感知原语 |
| 9 | [tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace) | 1,840 | Rust | Apache-2.0 | 2026-11-02 | Tauri 官方插件 monorepo：权限/能力（capability）声明 + 插件工程化范本 |
| 10 | [eclipse-theia/theia](https://github.com/eclipse-theia/theia) | 21,732 | TypeScript | EPL-2.0 | 2026-11-02 | 可复用 IDE/工具框架，插件跑在独立进程的 headless 宿主 + VS Code 扩展兼容 |

### 逐项点评

1. **openclaw/openclaw** — 与 DSH「桌面/本地宿主 + 插件为 agent 注入能力」形态最同构的巨型实践：技能（skills）目录规范、插件/集成（channels、tools）分层、执行沙箱与权限门控都有生产级实现，且 MIT 极友好、社区极活跃。注意其宿主偏消息渠道形态，桌面 GUI 交互层需另补。
2. **microsoft/vscode** — Code-OSS 里的 Extension Host（`src/vs/workbench/api/node`）是 DSH 桌面宿主插件 API 设计的必修课：扩展独立进程 + JSON-RPC、package.json 声明式贡献点、activation events 按需激活。MIT 无忧，直接搬设计模式即可。
3. **UI-TARS-desktop** — 与 DSH 最像的「GUI Agent 桌面产品」：Electron 宿主、截屏/鼠标/键盘/剪贴板原语、内置 VLM（UI-TARS）同时支持外部模型，Agent 框架可插拔（含 CUA 使用等）。Apache-2.0 友好；推送间隔约月级，迭代略慢于排名靠前项目。
4. **openinterpreter** — 「让模型控制本机」的经典项目，Rust 化后把 computer use 做成可注入技能，其「能力=技能包」的分发思路可直接映射到 DSH 插件。68k 星社区大；Rust 重写后生态仍在重建期。
5. **janhq/jan** — AI 桌面应用做 extension 架构的直接参照：`@janhq/core` 扩展点 + 推理引擎放独立进程（进程隔离与崩溃兜底），插件市场机制完整。注意 License 为 NOASSERTION（AGPL-3.0 附加条款系），借鉴架构可以，抄代码需过法务。
6. **Agent-S** — computer-use 研究线最强开源框架（Agent-S/S2），OSWorld 等 benchmark 常年第一，感知-推理-动作分层清晰，模型后端可换（含 DeepSeek/vLLM）。学术味重，工程化（打包、权限）需自己补。
7. **UFO** — 补齐「accessibility 树方案」这条线：Windows UIAutomation API 精细读屏与操控，AppAgent⇒Action 的动作定义方式天然适合做 DSH 的「动作插件」规范。MIT 友好；仅 Windows，macOS/Linux 需换实现（可对照 nut.js/AXAPI）。
8. **screenpipe** — 从「感知」侧给 agent 注入桌面能力：全量录屏、OCR、向量索引、本地+云端管道，且自身就是插件化设计（apps + pipe 插件）。License 是 AGPL 改的 Screenpipe Open License，商用集成要单独评估。
9. **tauri-apps/plugins-workspace** — Tauri v2 官方插件的工程化范本：Rust crate + npm 双端包结构、权限/capability 清单、移动端兼容——DSH 若走 Rust 宿主，这就是插件 ABI 与安全模型的样板。星数少但含金量高、极活跃。
10. **eclipse-theia/theia** — 框架级插件宿主参考：插件运行在独立 Node 进程（与前端 UI 隔离）、支持 headless 部署、并完整兼容 VS Code 扩展协议（省掉自建生态冷启动）。EPL-2.0 对商用联动需注意，但作架构参考无碍。

### 落选说明

| 项目 | Stars | 落选原因 |
|---|---|---|
| [browser-use/browser-use](https://github.com/browser-use/browser-use) | 119,866 | 质量很高但专注浏览器域（DOM/CDP），不覆盖桌面 OS 层，已在「浏览器插件」专题进榜 |
| [anthropics/anthropic-quickstarts](https://github.com/anthropics/anthropic-quickstarts) | 19,084 | computer-use-demo 是 Docker 沙箱演示，官方明示不建议生产部署，价值已被 UI-TARS-desktop/Agent-S 覆盖 |
| [nut-tree/nut.js](https://github.com/nut-tree/nut.js) | 2,853 | TS 键鼠/截屏/OCR 原语库（UI-TARS-desktop 底层即基于它），但 2024-05 起停推，且 License 无法识别（3.x 部分商业化），引入需法务确认 |
| [asweigart/pyautogui](https://github.com/asweigart/pyautogui) | 12,753 | 输入原语 API 设计的祖师爷，但 2024-08 后基本停更，作为「API 设计参考」翻文档即可 |
| [obsidianmd/obsidian-api](https://github.com/obsidianmd/obsidian-api) | 2,349 | 仅是插件 API 类型定义 + manifest 规范，宿主本体闭源，架构参考深度不足（已在侧边栏专题进榜） |
| [siyuan-note/siyuan](https://github.com/siyuan-note/siyuan) | 47,042 | Electron 桌面插件系统（kernel+插件市场）参考价值不错，但 AGPL-3.0 传染性强，且与 jan/vscode 参考重叠 |

> 其他已实测：bytedance/UI-TARS（11,666★，模型 repo，2026-01 后停推）、OthersideAI/self-operating-computer（10,300★，能力被 Agent-S 覆盖）、OpenAdaptAI/OpenAdapt（1,861★，RPA 录制回放，规模小）、appium/appium（22,176★，偏测试自动化）、xlang-ai/OSWorld（3,249★，benchmark）、openinterpreter/interpreter-workstation（35★，太小但方向与 DSH 撞型，值得观察）。

---

## 8. 跨主题结论与选型速查

1. **插件体系内核**：机制层最值得整体研读的是 **anthropics/claude-code（marketplace.json + /plugin）→ anthropics/claude-plugins-official（索引 schema）→ openclaw（本地宿主 + skill/channels 分层）→ vscode Extension Host（进程隔离 + 声明式贡献点）** 这条链；DSH 已有的 `ctx.skills` provider 机制与之同构，缺的正是市场索引与治理层（对照 [dsh-skill-management.md](./dsh-skill-management.md) 的方案一/三）。
2. **Skill 治理三件套**：分发抄 **vercel-labs/skills**（安装 CLI）、审核抄 **tech-leads-club/agent-skills**（信任链）与 **iflytek/skillhub**（registry/RBAC）、评测抄 **skillsbench**（配对任务 + verifier）。
3. **UI 层**：桌面壳 = **shadcn sidebar**（折叠 rail）+ **dockview**（dock 布局）+ **LobeChat Plugins 页**（插件商店 UX）+ **Cline**（窄面板信息密度）；面板注册机制直接对照 vscode 的 `contributes.viewsContainers`。
4. **多插件冲突**：工具名前缀、虚拟 server、版本 pin 的完整解法在 **IBM/mcp-context-forge** 与 **docker/mcp-gateway**；轻量启停管理参考 **mcphub**。
5. **Workspace**：`.dsh` 配置分层抄 **mise**（global > project > local 合并）、多 agent 并行目录规划抄 **worktrunk**、会话↔项目映射抄 **sesh**、环境复现抄 **devbox**。
6. **项目管理**：流程抄 **spec-kit**（重）/ **OpenSpec**（轻），任务数据源抄 **Backlog.md**（git 内 markdown，人机共用），平台级参考 **Plane**。
7. **Browser 插件**：协议层 **playwright-mcp + chrome-devtools-mcp** 双官方 MCP；agent 循环 **browser-use**；登录态复用 **browser-harness**（CDP）与 **mcp-chrome**（扩展内 MCP）两条路线；扩展基座 **wxt**。
8. **Desktop 插件**：宿主架构抄 **openclaw/vscode/jan** 三家（MIT 优先），GUI 控制原语抄 **UI-TARS-desktop**（Electron 全家桶）+ **UFO**（accessibility 树路线，macOS/Linux 需换实现），感知层参考 **screenpipe**（注意其自定义 License）。
9. **License 红线清单**（引用代码前必查）：无 License（anthropics/skills、anthropics/claude-code、ComposioHQ 索引）只可借鉴机制不可抄内容；AGPL 系（Skyvern、Lightpanda、Plane、coder、AppFlowy、siyuan）有传染性；NOASSERTION 自定义条款（claude-task-master、BMAD、jan、screenpipe、dockview、planka、tech-leads-club）商用前逐条审读；source-available 非 OSI（cc-haha 的 Community Source 1.0）只可借鉴思路。

## 附：数据来源与调研方法

- GitHub API（`gh api repos/{owner}/{repo}`，2026-11-03 实测）：Stars / 语言 / License / 最近推送 / 归档状态
- 每主题独立执行 5–8 组 WebSearch 关键词检索，候选池 22–27 个/主题（合计 140+），Top 10 之外均给出落选原因
- 与本仓库既有调研的衔接：[dsh-skill-management.md](./dsh-skill-management.md)（DSH skill 管理能力盘点与落地方案）、[top10-content-search.md](./top10-content-search.md)（内容检索采集 Top 10，其中 browser-use / MediaCrawler 等与本文 Browser 主题互见）
