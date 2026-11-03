# DeepSeek Harness 原生 Plugin 推荐：七主题直装清单

> 状态：调研报告（2026-11-03）
> 定位：这是 [dsh-plugin-ecosystem-top10.md](./dsh-plugin-ecosystem-top10.md)（泛 GitHub 生态 Top 10）的**替换口径**——只推荐 **DSH 生态内直接可装的 plugin**：官方 `@deepseek-ai/dsh-*` 包族（本机 0.2.1-rc.5 全量 306 包实测）+ 社区 DSH plugin（GitHub/npm 实测 stars 与周下载）。
> 数据说明：官方包描述摘自本地 package.json；社区数据 2026-11-03 经 `gh api` 与 npm registry API 实测。

---

## 0. 先搞清楚分发渠道（3 分钟）

官方**刻意不做市场**（设计笔记原文 "No official market exists"），只给机制：

| 渠道 | 是什么 | 怎么用 |
|---|---|---|
| **Discover 页** | `dsh-experimental-plugin-market-bundle`（npm 周下载 545k）+ `dsh-plugin-market` 服务 + `plugin_market` agent 工具 | Web → Plugins → Discover → Add index source 填索引 URL |
| **事实标准索引** | [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)（22,038★，CC0，双语，带收录评审）发布的 format-1 索引，现含 4,380 个 npm 插件 | Discover 添加 `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` |
| **内置市场插件** | [dshmarket](https://github.com/dsh-market/dsh-market)（10,296★，周下载 348k）：DSH 内的可视化插件市场（8000+ 插件、一键装/升级） | `dsh plugin --profile web add dshmarket` |
| **直接装包** | 任何 npm 包 / git URL / 本地路径 | `dsh plugin --profile <p> add <pkg>`（走 pnpm） |
| 自建索引 | `apps/plugin-market-generator`（官方参考生成器，读「每行一个包名/git URL」清单生成静态 index.json） | 静态托管即可（GitHub Pages/对象存储） |

⚠️ **安全**：社区插件无官方审查，「上架 ≠ 安全」，安装即以用户权限执行第三方代码——建议配 dsh-skill-hub 类安装前审计插件，重要环境用独立 profile。

---

## 1. Skill 管理

### 官方（多数已随 base 内置）

| 包 | 官方描述（实测摘录） | 说明 |
|---|---|---|
| `@deepseek-ai/dsh-skill` | Agent skill provider registry | `ctx.skills` 注册表，多来源合并（project > runtime > user） |
| `@deepseek-ai/dsh-skill-filesystem` | Local filesystem skill provider | 五级目录扫描 + watch 热更新，「装 skill = 放文件」 |
| `@deepseek-ai/dsh-skill-office` | Bundled Word, PowerPoint, and Excel workflows | **官方 skill 内容包范本**（「skill 以 plugin 分发」的示范） |
| `@deepseek-ai/dsh-skill-badge` | Bundled dsh badge skill provider | 同上（另有 `dsh-experimental-badge-skill-bundle`） |
| `@deepseek-ai/dsh-tool-skill` | Model-facing skill loading tool | 模型侧消费，目录 digest 变化热刷新 |
| `@deepseek-ai/dsh-client-ui-skill` | Web skill references and the dedicated skill tool row | Web 端 skill 展示 |
| `@deepseek-ai/dsh-experimental-session-search` | Agents search and read earlier sessions | agent 检索历史会话（知识侧补充） |

### 社区推荐

| 包/repo | Stars/周下载 | 功能 | 备注 |
|---|---|---|---|
| [MichengAI/dsh-skills-manager](https://github.com/MichengAI/dsh-skills-manager) | 444★ | 本机 Agent Skills 统一加载与安全管理 | 活跃 |
| [cheshireez/dsh-skill-hub](https://github.com/cheshireez/dsh-skill-hub) | 38★ / **2,608 周下载** | skill 中枢：**安装前安全审计**、commit 钉源、回收站 | 下载量证明刚需；安全问题正面回应者 |
| [Fishquito7/dsh-skill-mcp-panel](https://github.com/Fishquito7/dsh-skill-mcp-panel) | 248★ / 1,593 周下载 | 侧边栏 skill + MCP 统一管理面板 | 活跃 |
| [zimodzh/dsh-plugin-dev-skills](https://github.com/zimodzh/dsh-plugin-dev-skills) | 16★ | 插件开发 skill 套件 | 开发者向 |

> 组合建议：官方注册表（内置）+ dsh-skill-hub（装前审计）+ dsh-skills-manager（统一加载）；外部 skill 生态用 `npx skills`（[vercel-labs/skills](https://github.com/vercel-labs/skills)）直接装进 `~/.dsh/skills`，落盘即被 filesystem provider 接管。评测维度官方生态仍空白（对照 [dsh-skill-management.md](./dsh-skill-management.md) 方案二自建）。

---

## 2. Plugin 侧边栏（Sidebar）

### 官方（Web UI 侧边栏全家桶，均已内置）

| 包 | 官方描述 | 说明 |
|---|---|---|
| `dsh-client-ui-sidebar` | session multi-level tree, search, grouping, state dots | 左侧会话树 |
| `dsh-client-ui-sidebar-right` | Right Sidebar: docking surface, panel and header expand, navigation service | **右侧 dock 面**（面板注册的承载者） |
| `dsh-client-ui-sidebar-browser` | **Sandboxed Web browser tabs for the right Sidebar** | 右侧沙箱浏览器标签页（官方！） |
| `dsh-client-ui-sidebar-terminal` | Interactive shell tabs for the right Sidebar | 右侧终端 tabs |
| `dsh-client-ui-sidebar-files` | Workspace file tree tab type for the right Sidebar | 右侧文件树 |
| `dsh-client-ui-sidebar-documentpreview` | previews for Office, spreadsheets, Markdown, code, images, PDF, HTML | 右侧文档预览 |
| `dsh-client-ui-layout` | three-column AppFrame with drag handles, ctx.layout viewing-state | 三栏布局框架 |
| **`dsh-client-ui-entry-customization`** | **Customize plugin entries in the left sidebar, conversation views, and right sidebar, and quickly create new plugins** | ⭐ 这就是「plugin 侧边栏管理」本体：自定义插件入口 + 快速创建插件 |
| `dsh-client-ui-workspace` | WorkspacePicker registered into the sidebar | workspace 选择器挂侧栏 |
| `dsh-client-ui-brand-official` | Official brand occupants for sidebar slots | 官方侧栏槽位（槽位机制的参考实现） |

### 社区推荐

| 包/repo | Stars | 功能 | 备注 |
|---|---|---|---|
| [omdsh-dev/DSH-better-sidebar](https://github.com/omdsh-dev/DSH-better-sidebar) | 4,833★ | **开放侧边栏底座**：三方注册侧边栏页（终端/Git/子代理） | 侧边栏方向事实上的社区标准 |
| [FSMargoo/dsh-at-file](https://github.com/FSMargoo/dsh-at-file) | 559★ | Codex 式 @file 引用 | 原 omdsh-dev 出品 |
| [Nagi-ovo/dsh-visualize](https://github.com/Nagi-ovo/dsh-visualize) | 331★ | 对话内生成式 UI | 面板渲染增强 |

> 组合建议：做「插件侧边栏」先读 `dsh-client-ui-sidebar-right` 的 panel 注册 API + `entry-customization` 的入口机制，三方扩展走 DSH-better-sidebar 的注册模式（与官方槽位机制互补）。

---

## 3. 多 Plugin 管理

### 官方（市场机制四件套 + 管理面板）

| 包 | 官方描述 | 说明 |
|---|---|---|
| `dsh-plugin-manager` | plugin and bundle management shared by dsh CLI, Web and agent tools | 核心：装/启停/卸载（CLI、Web、`tool-plugin-manager` agent 工具三用） |
| `dsh-plugin-market` | Configured plugin market indexes for the Web Discover page and the `plugin_market` agent tool | 索引源管理（volatile `indexes: []`，改动即生效） |
| `dsh-plugin-market-index` | Plugin market index format 1: JSON validation… | format-1 校验器（自建索引对齐它） |
| `dsh-experimental-plugin-market-bundle` | Discover tab: browse configured plugin market indexes and install | Discover 页（npm 周下载 545k，默认装机率极高） |
| `dsh-client-ui-plugin-manager` | sidebar Plugins panel installs, enables, disables, retries | Plugins 管理面板 |
| `dsh-client-ui-plugin-market` | Discover tab of the Plugins page | 同上 UI |
| `dsh-host-plugin-inventory` / `dsh-client-ui-settings-plugin-inventory` | Read-only Cordis Loader plugin state / inventory tab | 只读 Loader 清单（排障） |
| `dsh-tool-cordis` | Read-only runtime API inspection for Harness plugin development | **插件开发调试利器**（runtime 里看 ctx.* API） |
| `dsh-config-editor` | Persist plugin configuration through profile patches | profile patch 持久化（改配置的正确姿势） |

### 社区推荐

| 包/repo | Stars/周下载 | 功能 | 备注 |
|---|---|---|---|
| [dsh-market/dshmarket](https://github.com/dsh-market/dsh-market) | 10,296★ / **348,603 周下载** | 内置可视化插件市场：8000+ 插件、一键装/升级、主题 | 多插件管理第一装 |
| [awesome-dsh-plugin/dsh-find-plugin](https://github.com/awesome-dsh-plugin/dsh-find-plugin) | 216★ / 5,946 周下载 | 会话内找插件（agent 工具形态） | 配合 plugin_market 工具 |
| [AdamPlatin123/dsh-plugin-radar](https://github.com/AdamPlatin123/dsh-plugin-radar) | 1,490★ | 生态雷达：21k+ 候选自动发现、k8s 实测、15 分钟快照 | 选型参考数据源 |
| [xiajiajun516/dsh-config-manager](https://github.com/xiajiajun516/dsh-config-manager) | 291★ | 配置/插件/MCP/skill 备份迁移 | 多机同步 |
| [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) | 22,038★ | 精选清单 + format-1 索引（见第 0 章 URL） | 发现层，非插件 |

> 组合建议：`dshmarket`（市场）+ 官方 Discover 加 awesome 索引（覆盖面）+ `dsh-tool-cordis`（开发调试）+ `dsh-config-manager`（备份）。自建私域分发：`plugin-market-generator` 生成 index.json 托管内网。

---

## 4. Workspace

### 官方

| 包 | 官方描述 | 说明 |
|---|---|---|
| `dsh-workspace` | Workspace entity registry: durable records with validated session attachment | workspace 注册表（`ctx.workspaceRegistry`） |
| `dsh-api-workspace-controller` / `-files` | Workspace Remote commands / file service | workspace API 层 |
| `dsh-client-ui-workspace` | Workspace picker into the sidebar | UI 选择器 |
| **`dsh-experimental-worktree`** | Creates a named Git worktree and changes the calling Session working directory | **官方 worktree 支持**（配 `dsh-experimental-tool-worktree` 模型工具） |
| `dsh-terminal` + `dsh-terminal-bash` + `dsh-tool-terminal` | Persistent PTY session seam / bash backend / six model-facing tools | 持久终端（owner 隔离） |
| `dsh-experimental-terminal-bundle` | Keep shell processes alive across tool calls | shell 跨调用存活 |
| `dsh-tmux-context` | Opt-in durable per-step context with this agent's tmux pane and window location | agent 记忆自己的 tmux 位置 |
| `dsh-tool-workspace-dependencies` | load_workspace_dependencies: bundled Python, Node.js, pnpm payload | 捆绑运行时依赖 |
| `dsh-workspace-changes` | per-turn workspace file changes from git snapshots | 每轮 git 快照 diff |
| `dsh-session-query`(+sqlite) / `dsh-experimental-session-search` | session 查询 / agent 搜历史会话 | 跨会话检索 |

### 社区

| 包/repo | Stars/周下载 | 功能 | 备注 |
|---|---|---|---|
| [@laoyuehanni/dsh-git-worktree](https://www.npmjs.com/package/@laoyuehanni/dsh-git-worktree) | 876 周下载 | Web 会话 git worktree 隔离 | 与官方 worktree 互补 |
| [ranxianglei/billion-context](https://github.com/ranxianglei/billion-context) | 3,713★ | 月级长会话上下文压缩 | workspace 记忆侧；**无 License 字段，引用需注意** |
| [techflag/workdsh](https://github.com/techflag/workdsh) | 296★ | WorkBuddy 式桌面工作区（项目/资产/专家/skill） | 工作台形态参考 |

> 组合建议：官方 worktree（experimental，先在实验 profile 验证）+ 持久终端全家 + session-search 做跨会话知识；长期会话配 billion-context。

---

## 5. 项目管理

### 官方（goal/plan/workflow/jobs/schedule/agent-team 六族）

| 族 | 包 | 官方描述要点 |
|---|---|---|
| **Goal** | `dsh-goal` / `dsh-tool-goal` / `dsh-command-goal` / `dsh-goal-round-driver` / `dsh-client-ui-goal` | Event-sourced 同会话目标状态机；`/goal` 斜杠命令；GoalBar UI |
| **Plan** | `dsh-plan-mode` / `dsh-client-ui-plan` / `dsh-client-ui-user-questions` | 计划模式（logged、user-reviewed exit）；plan 卡片与 Markdown 预览 |
| **Todo** | `dsh-tool-todo` | `todo_write` 工具（事件溯源 session log） |
| **Workflow** | `dsh-workflow` / `dsh-tool-workflow` / `dsh-workflow-ptc` / `dsh-client-ui-workflow-run` | **JS 编排脚本**跑在沙箱 PTC runtime；durable workflow-run 节点 |
| **Ralph** | `dsh-tool-ralph` | fresh-agent Ralph loop（长任务自治循环） |
| **Jobs** | `dsh-jobs` / `dsh-tool-jobs` / `dsh-client-ui-jobs` | 后台任务注册表（job_output/list/kill）+ 头部任务列表面板 |
| **Schedule** | `dsh-schedule` / `dsh-tool-schedule` / `dsh-client-ui-schedule` | Host 级持久提醒 + 任务管理页 |
| **Subagent** | `dsh-subagent`(fork/spawn) / `dsh-tool-subagent(-control)` / `dsh-client-ui-settings-subagent` | 子代理委派（深度/并发/可选模型可配） |
| **Agent Team** ⭐ | `dsh-experimental-agent-team(-profile)` / `-tool-agent-team` / `-client-ui-agent-team` | **共享任务 DAG + roster + task board UI**——DSH 内置的「多人/多 agent 项目管理」形态 |

### 社区

| 包/repo | Stars | 功能 | 备注 |
|---|---|---|---|
| [chuspeeism/dashi-taskboard](https://github.com/chuspeeism/dashi-taskboard) | 3,434★ | 可嵌入任务面板（Codex + DSH 双支持） | 看板 UI 首选 |
| [xuanyuanzhifeng/dsh-plugin-agent-workflow](https://github.com/xuanyuanzhifeng/dsh-plugin-agent-workflow) | 312★ | agent 工作流 | |
| [omdsh-dev/dsh_workflow](https://github.com/omdsh-dev/dsh_workflow) | 153★ | 多 agent 工作流 | |
| [xmanrui/dsh-im](https://github.com/xmanrui/dsh-im) | 3,118★ | 9 渠道 IM 接入（飞书/微信/钉钉/Slack/TG…） | 任务派发的人机通道 |

> 组合建议：同会话目标管理用官方 Goal 族（已内置）；跨会话/多人任务板用 Agent Team（experimental）或 dashi-taskboard；长任务编排走 Workflow(PTC) + Ralph + Jobs；提醒用 Schedule。缺口：spec 驱动开发（spec-kit 类）官方生态没有，可经 `dsh-mcp-client` 接 spec-kit MCP 或自建 plugin。

---

## 6. Browser 插件

### 官方

| 包 | 说明 | 证据 |
|---|---|---|
| **`@deepseek-ai/dsh-browser-use`** | **官方 browser-use provider 注册**（monorepo `packages/browser-use`，0.1.6-alpha 起） | npm 周下载 7,153 |
| `dsh-client-ui-sidebar-browser` | 右侧沙箱浏览器标签页（人工/agent 共用浏览面） | 本地 0.2.1-rc.5 内置 |
| `dsh-web` + `dsh-web-search-deepseek` + `dsh-web-deepseek-api` + `dsh-web-fetch-http` + `dsh-tool-web` | 联网能力 seam：search/fetch provider 注册表 + 模型工具 | 内置 |
| **`dsh-mcp-client`** + `dsh-mcp-resources` | MCP 桥：连 MCP server 并把工具注册到 `ctx.tools` | **接 playwright-mcp / chrome-devtools-mcp 的官方通道** |
| `dsh-http-proxy` / `dsh-client-file-upload` / `dsh-authorization`（+ `dsh-deepseek-account-platform` 浏览器 PKCE） | 网络代理 / agent 文件上传 / 凭据授权流 | 内置 |

### 社区

| 包/repo | Stars | 功能 | 备注 |
|---|---|---|---|
| [Kerberos255/dsh-browser-tools](https://github.com/Kerberos255/dsh-browser-tools) | 0★（新） | CDP 直连**已运行的 Chromium**（不装新浏览器，复用登录态） | 思路对标 playwright-mcp 扩展模式 |
| [ricardochen1996/dsh-browser-use](https://dshopen.org/plugins/@ricardochen1996/dsh-browser-use) | 2★ | 页面动作逐操作守护执行 | 安全增强 |
| dsh-plugin-browser（Playwright 右侧面板）/ dsh-browser-runtime / Agent Browser Auto（15 个 browser_* 工具） | — | 各形态浏览器插件 | 见 [yeyupiaoling 系列评测](https://blog.yeyupiaoling.cn/article/1792412587822?lang=zh-tw) |
| [liustack/modlens](https://github.com/liustack/modlens) | 4,725★ | 纯文本模型外挂视觉（贴图→结构化 JSON：OCR/版面/语义） | 网页截图理解侧 |

> 组合建议：**官方 `dsh-browser-use` 是第一装**；人工浏览用 sidebar-browser；深度调试/登录态复用走 `dsh-mcp-client` + playwright-mcp（或社区的 CDP 直连方案）；截图理解配 modlens。

---

## 7. Desktop 插件

### 官方/宿主

| 包/渠道 | 说明 |
|---|---|
| 官方桌面安装包 | download.deepseek.com 分发（deepseek-ai org 下无桌面仓库） |
| `dsh-plugin-desktop`（npm，latest **2.0.0**，2026-08-16） | "DSH Desktop: an Electron shell composed as a DeepSeek Harness Cordis plugin"——桌面宿主本身注册为 Cordis plugin；`dsh plugin add dsh-plugin-desktop` 可装。⚠️ 本地 `~/innate/projects/dsh-desktop` vendored 的 2.0.13 是**上游开发版**，npm 未发布 |
| **`@deepseek-ai/dsh-computer-use`** | **官方 computer-use provider 注册**（桌面 GUI 控制），npm 周下载 15,620 |
| `dsh-headless` / `dsh-acp`(+`-app`) / `dsh-sdk-minimal`(+`-jsonrpc-server`) | 嵌入形态：one-shot / ACP JSON-RPC stdio / SDK 子进程 |
| `dsh-host-open-in-app` + `dsh-client-ui-open-in-app` | 「用已装应用打开」工作区/文件 |
| `dsh-host-directory-picker-native` / `-auto` / `-browse` | OS 原生目录选择器（桌面能力 seam 的三实现） |
| `dsh-native-command` | 宿主原生命令/路径打开/桌面检测/WSL 移交 |
| `dsh-experimental-inspector` | 跨 realm CDP 调试 hub（Host/Client 调试） |

### 社区桌面宿主（DSH Desktop 的三个开源实现）

| repo | Stars | 特点 |
|---|---|---|
| [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop) | **34,537★** | Electron 宿主「注册成 Harness 插件」；npm `dsh-plugin-desktop` 指向它；MIT、**非官方**（勿误称） |
| [dataelement/dsh-desktop](https://github.com/dataelement/dsh-desktop) | 17,107★ | DSHDesktop，MIT，**内置 dsh-market** |
| [dsh-tauri/deepseek-harness-desktop](https://github.com/dsh-tauri/deepseek-harness-desktop) | 3,431★ | Tauri 版，零环境配置、预置插件 |

### 社区桌面控制/延伸

| repo | Stars | 功能 | 备注 |
|---|---|---|---|
| [ccch1mneyyy/dsh-Go](https://github.com/ccch1mneyyy/dsh-Go) | 5,859★ | 手机本机运行/遥控电脑 | **AGPL-3.0** |
| [sixtysevenlf/dsh-blender-plugin](https://github.com/sixtysevenlf/dsh-blender-plugin) | 1,569★ | 15 个模型工具驱动 GUI Blender | BSD-3；「agent 操控桌面 GUI 应用」范例 |
| [Clarklevis1995/dsh-plugin-mobile-gateway](https://github.com/Clarklevis1995/dsh-plugin-mobile-gateway) | 135★ | WebSocket 移动端接入网关 | |
| [Anionex/dsh-vision-toolkit](https://github.com/Anionex/dsh-vision-toolkit) | 922★ | 视觉工具箱 | 官方 Discussion #215 首推 |

> 组合建议：桌面 GUI 控制第一装 **官方 `dsh-computer-use`**；宿主按需选 anywhere-labs（Electron 生态主流）或 dsh-tauri（轻量）；移动遥控 dsh-Go（注意 AGPL）；GUI 应用操控参考 dsh-blender-plugin 的工具设计。

---

## 8. 汇总：每主题「第一装」速查

| 主题 | 官方第一装 | 社区第一装 |
|---|---|---|
| Skill 管理 | dsh-skill-office（内容包范本，已内置） | dsh-skill-hub（装前审计） |
| Sidebar | dsh-client-ui-sidebar-right + entry-customization（已内置） | DSH-better-sidebar（4.8k★） |
| 多 Plugin 管理 | Discover + plugin-market（加 awesome 索引 URL） | dshmarket（348k 周下载） |
| Workspace | dsh-experimental-worktree（实验） | dsh-git-worktree（npm） |
| 项目管理 | Agent Team bundle（experimental） | dashi-taskboard（3.4k★） |
| Browser | @deepseek-ai/dsh-browser-use | dsh-browser-tools（CDP 直连） |
| Desktop | @deepseek-ai/dsh-computer-use | anywhere-labs/dsh-desktop（宿主） |

## 9. 对既有调研的两处修正

1. [magpie-dsh-integration.md](./magpie-dsh-integration.md) 中引用的 `dsh-auto-router` 实测仅 **1★ 且 2026-08-20 后停更**——作为「registerAdapter 注册 synthetic provider」的代码先例仍成立，但社区分量极轻；LLM 路由方向的实际头部是 [dsh-our-free-model](https://github.com/Ebony-Vinyl/dsh-our-free-model)（57,279★，免登录用前沿免费模型）、[dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)（6,994★，任务感知路由，2026-09 后未推）、[dsh-plugin-subscriptions](https://github.com/V1ki/dsh-plugin-subscriptions)（548★，把 ChatGPT/Claude 订阅经 OAuth 变 provider——与 Magpie 路线 B/C 直接相关）。
2. 上份报告的「泛生态 Top 10」中，vscode/dockview/LobeChat 等仍是**自建 UI 的参考**；若只需「直接可用的 DSH 插件」，以本文档为准。

## 附：数据来源

- 官方包族：本机全局 `@deepseek-ai/dsh@0.2.1-rc.5`（306 包）package.json 描述实测（`/Users/patrick/.local/share/fnm/node-versions/v24.14.1/installation/lib/node_modules/@deepseek-ai/dsh/`）
- 官方机制：[plugin-market 用户文档](https://github.com/deepseek-ai/deepseek-harness/blob/main/docs/user/guide/plugin-market.md)（"DSH ships no index source"）、[index-format 设计笔记](https://github.com/deepseek-ai/deepseek-harness/blob/main/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md)、[plugin-market-generator](https://github.com/deepseek-ai/deepseek-harness/tree/main/apps/plugin-market-generator)、Discussion [#215](https://github.com/deepseek-ai/deepseek-harness/discussions/215)（2026-11-03 gh api 读取）
- 社区数据：各 repo `gh api repos/{owner}/{repo}` 与 npm registry（`registry.npmjs.org/-/v1/search` + downloads API）2026-11-03 实测；索引 URL `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json`
- 本仓库关联：[dsh-skill-management.md](./dsh-skill-management.md) · [magpie-dsh-integration.md](./magpie-dsh-integration.md) · [dsh-plugin-ecosystem-top10.md](./dsh-plugin-ecosystem-top10.md)（泛生态参考版）
