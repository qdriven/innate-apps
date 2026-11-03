# 轻量级个人开发工厂：桌面底座选型与模块设计

> 状态：调研 + 设计决策文档（2026-11-03）
> 背景：[magpie-dsh-integration.md](../research/magpie-dsh-integration.md)（Magpie×DSH 模块合成）的延伸——回答「个人开发工厂的桌面底座选 DSH 还是自建」，并给出两个推荐模块的详细设计。
> 证据基准：本机实测（全局 `@deepseek-ai/dsh@0.2.1-rc.5` 包族、`~/innate/projects/dsh-desktop`、`~/innate/projects/innate-desktop`、`~/innate/projects/dsh-agent-workbench`），调研当日有效。

---

## 0. 一句话结论

**桌面底座 = DSH 内核 + DSH Desktop 壳起步：所有自研产出一律做成「标准 DSH 插件」（面板走官方 slots、服务走官方 ctx 契约），Magpie 做统一 LLM 网关 sidecar；自建 Tauri 壳（innate-desktop）定位为第二阶段的「壳替换件」而非起点——因为 dsh-plugin-desktop 已证明「桌面壳本身就是一个普通 Cordis 插件」，换壳不换插件资产。** 推荐先建两个模块：**① Innate Model Fabric**（多 Provider 进出 DSH 的统一模型织物：网关治理 + 路由注入 + 对账 + 反向暴露）、**② Innate App Atelier**（轻应用工厂：agent 产出的小应用 → 注册 → 桌面宿主 → 多形态打包分发）。

---

## 1. 需求解读：把目标拆成工程问题

| # | 原始诉求 | 工程含义 | 现成答案（证据） |
|---|---------|---------|----------------|
| 1 | 轻量级个人开发工厂 | 单机、loopback、少常驻进程、自己一个人用 | DSH loopback webServer + Magpie loopback 网关，全部本机 |
| 2 | 需要一个桌面，底座是什么 | 桌面壳选型：DSH Desktop（Electron）vs 自建 Tauri vs 嵌 webview | §2 决策矩阵 |
| 3 | LLM 多 Provider 用 Magpie | 统一 LLM 出口 = Magpie 网关；DSH 经 pi-ai 指向网关 | Magpie 官方 DSH 适配器（2775 行 `dsh.go`），本机已验证注入（magpie-dsh-integration.md §3） |
| 4 | DSH plugin 已有的组件直接用 | 不重造：skill/tool/session/插件市场/终端全用官方 | `@deepseek-ai/` 306 包族；`ctx.skills`/`ctx.tools`/`ctx.sessions` |
| 5 | 不同 Provider 在 DSH 中使用 | 正向：任意厂商模型 → DSH 会话 | pi-ai providers（openai/anthropic/responses 三协议）+ Magpie routing group |
| 6 | 不同 Provider 使用 DSH | 反向：其他 agent 工具（Claude Code、Codex…）把 DSH 当能力源 | `dsh-sdk-jsonrpc-server`（stdio JSON-RPC 驱动 session）+ 可选 MCP 桥 |
| 7 | 轻应用以类似 plugin 形态在桌面使用 | agent 产出的小应用注册为面板/窗口，即装即用 | DSH slots 系统：第三方插件可加整页面板 + 侧边栏入口（HMR 热增删） |
| 8 | 打包成不同默认形式 | 同一应用源导出多形态：面板 / 独立窗 / Web / CLI | 模块二「打包器」设计（§5.5） |
| 9 | 可增加扩张不同内容 | 插件化扩展：新面板/新 skill/新 provider 即插即用 | DSH plugin + profile 组合体系 + plugin-market 索引 |

---

## 2. 桌面底座决策：三个候选实测对比

### 2.1 候选与关键证据

**候选 A：DSH Desktop（社区 anywhere-labs，Electron）——「万物皆插件，桌面也是插件」**

- 本质：`dsh-plugin-desktop@2.0.13` 是一个**普通 Cordis 插件**（7 个 entries：shell/terminal/diagnostics/notifications/pnpm/profiles/updates），Electron main 进程 boot 官方 DSH Host，Web UI 走 loopback webServer，renderer 是纯浏览器环境（contextIsolation + sandbox，**无第二条 IPC 插件系统**）。
- 第三方可扩展面（实测确认，这正是「轻应用进桌面」的地基）：
  - **UI 面板**：插件在 package.json 声明 `dsh.client`（`platform: "web"` + `./client` 导出）→ 经 `/plugins` combo 路由分发 → 浏览器端 `ctx.slots.inject("main", ...)` 注册**整页面板**、`sidebar.panellist` 注册**侧边栏图标行**；`shell.overlay`（全屏浮层）、`shell.bottom`（底部条）、`sidebar.footer.action` 均为 additive 座位；`dsh-client-hmr` 支持运行中实时增删 UI。证据：`@deepseek-ai/dsh-client-modules/README.md`、`dsh-client-ui-layout/lib/types/client/index.d.ts:33-116`、`dsh-plugin-desktop/README.md` L165。
  - **自定义 HTTP/WS 路由**：`ctx.webServer.register({kind:'exact'|'prefix', path, handler})` 完整拥有响应生命周期（可伺服静态文件、长持 SSE），`registerUpgrade` WebSocket，`tapIndex`/`index-inject` 注入 index.html。证据：`@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts`。
  - **桌面专属服务**：仅 `ctx.desktopProfiles`（profile 切换）与 `ctx.desktopPnpm`（进程执行）两个 Host service 对第三方开放；窗口/托盘/通知/更新等 Electron 能力**私有不可触达**（`dsh-plugin-desktop/docs/plugin-services.md`）。
- 代价：Electron 重量（对比 Tauri）；UI 深度定制受官方 Web UI 约束（不能加 titlebar/命令栏按钮）；上游 0.2.x rc churn。

**候选 B：自建 innate-desktop（Tauri 2 + React 19）**

- 现状（实测盘点）：BaseShell 可运行（VSCode 式 activity bar + 左右面板 + 底部面板）；**插件最小闭环已通**——manifest `innate.plugin.v1` 四型 runtime（iframe-static / iframe-sidecar / external-web / native）+ `plugin://` URI 协议 + iframe 整页宿主 + PTY 终端（stable）+ workbench + 9 个 agent CLI 注册表。
- 致命缺口（按阻断程度）：
  1. **无面板贡献点 API**——插件只能整页 iframe，不能向 activity bar/sidebar 注册面板，无 postMessage host RPC；
  2. **agent 会话模型弱**——`agent_run` 是一次性 exec，无 session 持久化/连续对话，嵌长驻内核缺一层会话管理；
  3. permissions 无 enforcement、plugin-builder 是 stub。
- 项目状态：**休眠 3.5 个月**（最后 commit 2026-07-13，工作区有未提交重构）；零 DSH/Magpie 集成（deepseek 只是普通 CLI provider）。

**候选 C：任意壳嵌 `dsh web`（mygo/Tauri webview 加载 loopback 页面）**

- `dsh-agent-workbench` 已示范 SDK 用法（spawn `dsh --profile sdk-minimal`，JSON-RPC over stdio）；mygo 调研确认「mygo 为底座嵌 dsh web」工程量中等、trust/IPC/进程管理现成（mygo-dsh-integration.md §4）。
- 本质上是候选 A 的「壳换成自己写的」变体，适用于对产物体积/语言栈有硬约束的场景。

### 2.2 决策矩阵

| 维度 | A：DSH Desktop | B：自建 innate-desktop | C：自嵌壳（mygo/Tauri webview） |
|---|---|---|---|
| 启动工程量 | **零**（下载即用） | 高（补面板 API + session 层，估 4-8 周） | 中（壳本身 2-4 周，复刻 dsh-plugin-desktop 模式） |
| DSH 插件生态复用 | **全部**（UI 型 + headless 型） | 仅 headless 型（skill/tool/llm），UI 型全部失效 | **全部**（同一 Web UI 加载） |
| 轻应用宿主能力 | **现成**（slots + webServer prefix） | 需自建贡献点 | 现成（继承 A 的机制） |
| 轻量程度 | 中（Electron） | **高**（Tauri） | 高（mygo 单二进制 ≈7MB / Tauri） |
| Shell 自主可控 | 低（官方 Web UI 约束） | **完全** | 完全（壳层） |
| 上游 churn 风险 | 跟随 dsh-desktop + dsh 双上游 | 只跟随 dsh 内核 | 只跟随 dsh 内核 |
| 与 Magpie 结合 | **官方适配器现成** | 需自己注入 pi-ai 配置 | 同 B |

### 2.3 结论：底座分两层回答

**内核层（无悬念）：DSH。** 会话/skill/tool/agent 循环/插件市场全部现成，Magpie 已把 DSH 当一等公民。「自建内核」在任何路线下都不划算。

**壳层（两步走）：**

1. **第一步（现在）：直接用 DSH Desktop。** 零开发拿到完整桌面 + 插件 UI 生态 + profile 管理 + 更新器。所有自研产出（包括下文两个模块）做成**标准 DSH 插件**——这是唯一同时兼容 A/C 两种壳的资产形态。
2. **第二步（按需）：壳替换，而非重写。** dsh-plugin-desktop 证明了「桌面壳本身就是一个普通 Cordis 插件」——若未来要 Tauri 轻量壳或 mygo 单二进制壳，只需复刻该模式（壳 = boot Host + loopback webServer + webview 加载 Web UI），**全部插件资产（slots 面板、路由、skill）无损迁移**。innate-desktop 的既有资产（PTY 终端、agent CLI 注册表、workbench、`innate.plugin.v1` manifest 设计）此时作为壳层组件与插件移植来源复活，而非废弃。

> 判断依据一句话：**「面板贡献点 + host RPC + 会话管理」是自建路线最贵的 30%，而 DSH 已经把它们做成了开放契约（slots / ctx.* / SDK JSON-RPC）——把钱花在只有你能做的东西上（工厂模块），不要花在重造底座上。**

---

## 3. 总体架构

```text
┌─────────────────────────────────────────────────────────────────┐
│ 桌面壳层（可替换件）                                              │
│   现在: DSH Desktop (Electron, 壳即插件)                          │
│   未来: innate-desktop Tauri 壳 / mygo 壳（复刻同一模式）          │
├─────────────────────────────────────────────────────────────────┤
│ DSH 内核层（Cordis Host, loopback webServer）                     │
│   官方: sessions / skills / tools / agents / plugin-market        │
│   自研插件①: dsh-innate-model  (模型织物, §4)                     │
│   自研插件②: dsh-innate-apps   (轻应用工厂, §5)                    │
│   轻应用面板: slots(main) + webServer prefix 伺服的 app 静态资产   │
├─────────────────────────────────────────────────────────────────┤
│ LLM 网关层（sidecar, loopback :3425）                             │
│   magpie serve —— 四协议互译 / 账号池 / failover / 用量记账        │
├─────────────────────────────────────────────────────────────────┤
│ 反向能力层（其他 agent → DSH）                                     │
│   dsh-sdk-jsonrpc-server (stdio JSON-RPC: session/prompt/resume)  │
│   + MCP 桥（可选）: 把 DSH session 包成 MCP server 工具            │
└─────────────────────────────────────────────────────────────────┘

双向流:
  正向: Magpie 路由组(auto/*) ──pi-ai──► DSH 会话（eval/worker 各角色）
  反向: Claude Code / Codex / 任意宿主 ──stdio JSON-RPC / MCP──► DSH session
  对账: DSH 直营调用 ──POST /v1/magpie/usage──► Magpie 同一本账
```

---

## 4. 模块设计一：Innate Model Fabric（`dsh-innate-model`，模型织物）

### 4.1 定位与职责边界

**一个 DSH 插件，管「模型进出 DSH」的全生命周期**：Magpie 网关治理、路由注入与还原、角色级路由组、用量对账面板、反向能力暴露。遵循 magpie-dsh-integration.md §4 合成原则——**DSH 管会话/循环，Magpie 管协议/路由/账号，本插件只做「织物接线员」，不重造任何一层**。

| 职责 | 归属 | 说明 |
|---|---|---|
| 网关进程治理 | 本插件 | magpie serve 探活/自动拉起/健康上报 |
| 路由注入/还原 | Magpie 官方适配器（`magpie dsh connect`） | 本插件只调用与校验，不自己写 settings |
| 路由组→角色映射 | 本插件 | `auto/*` 组名 ↔ superagent eval/worker 角色 |
| 用量/配额可视化 | 本插件（消费 Magpie API） | Magpie 记账、DSH 消费 |
| 反向暴露 | 本插件（薄封装官方 SDK server） | 外部 agent 驱动 DSH session |

### 4.2 子组件设计

**M1 · Gateway Guardian（网关守卫）**
- 插件启动时 `GET http://127.0.0.1:3425/api/hello` 探活；失败则按配置执行拉起策略（`launchd`/`brew services`/手动提示），指数退避重试。
- 在 DSH 侧注册 `/api/innate/model/health` webServer 路由，返回 `{gateway: up|down, providers: n, routes: n}`。
- Magpie 不可达时的降级：settings 切回 `dsh-llm-deepseek` 官方直连兜底（magpie-dsh-integration.md 路线 B 的既定设计）。

**M2 · Route Weaver（路由织入）**
- 封装 `magpie dsh connect`（官方适配器写入 settings.yaml + profile patch，原子 + 可还原），插件内提供「连接/断开/校验」三个动作，校验 = 解析 `llm-pi-ai.providers.magpie*` 三条路由是否齐全（openai-completions / openai-responses / anthropic-messages 按原生协议分路）。
- 守护「双通道写入冲突」：本插件管的路由 key 一律 `magpie*` 前缀（对齐 magpie-dsh-integration.md §7.2 约定），自营路由用 `innate-*` 前缀，人工手改告警。

**M3 · Role Fabric（角色织物）+ Usage Loom（对账面板）**
- 角色路由组：定义命名约定 `group/<场景>`（如 `group/daily-coding`、`group/cheap-eval`），在 DSH Web UI 的 slots main 面板里把「eval/worker 角色 ↔ routing group ↔ reasoning effort」做成三列映射表，写回 superagent 的 RoleModel 配置。
- 对账面板（slots main 整页 + sidebar.panellist 图标）：
  - 读 `GET /v1/magpie/usage`、`/v1/magpie/quotas`，按 `Bearer magpie-dsh-innate-<role>` 的 app 名维度聚合（约定用于计数而非鉴权）；
  - DSH 直营（不经网关）的调用走 `POST /v1/magpie/usage` 回写同一本账，与 session usage 事件（现有 `cli/trace.mjs`）交叉对账。
- 实现 touches：`ctx.webServer.register({kind:'prefix', path:'/api/innate/model'})` + `ctx.slots.inject("main", ...)`（对齐 `dsh-client-ui-plugin-manager/lib/client.js:4372-4418` 的 shipped 范式）。

**M4 · DSH Outbound（反向暴露）**
- 基座：官方 `dsh-sdk-jsonrpc-server`（stdio JSON-RPC：`initialize` → `session/prompt` → `session.event`/`session.status` 流 → `session/resume`/`session/wait`）。任何外部宿主（Tauri、mygo、脚本）spawn `dsh --profile <p>` 子进程即可驱动完整 agent 会话——**这一层零开发，纯组合**。
- 增值薄桥：`dsh-innate-model` 附带一个 **MCP server 包装器**（stdio↔stdio 桥），把 SDK 的 `session/prompt`/`session/wait` 暴露为 MCP 工具（如 `dsh_session_ask`、`dsh_session_resume`），使 Claude Code / Codex / Cursor 等「不同 Provider 的 agent」在各自 MCP 配置里加一行即可**使用 DSH**（其 skill 库、工具、会话持久化）。
- 可选：按 magpie-dsh-integration.md 路线 C，写一个 `magpie.agent` 插件把 dsh-innate 子 agent 注册进 Magpie Agents 页，纳入统一模型管理（借 `dsh.go` 的 applied/stash/drift 三件套模式管理外部工具配置）。

### 4.3 数据流（正向一问）

```text
用户在面板选角色模型
  → Role Fabric 写 RoleModel {provider: magpie, model: auto/glm-5.3}
  → dsh-agent-loop 组装 GenerateOptions → ctx.llm.stream()
  → pi-ai 路由 http://127.0.0.1:3425/v1 (openai-completions)
  → Magpie: 账号池选号 → 原生协议出站 → failover 链兜底
  → usage.jsonl 记一行（app=magpie-dsh-innate-worker）
  → Usage Loom 面板 GET /v1/magpie/usage 聚合展示
```

### 4.4 里程碑

| 阶段 | 交付 | 量级 |
|---|---|---|
| M1 | Gateway Guardian + 健康路由 + 降级切换 | ~2 天 |
| M2 | Route Weaver（connect 封装 + 校验 + 冲突守护） | ~2 天 |
| M3 | Role Fabric + Usage Loom 面板（slots） | ~1 周 |
| M4 | MCP 桥 +（可选）magpie.agent 注册 | ~3 天 |

---

## 5. 模块设计二：Innate App Atelier（`dsh-innate-apps`，轻应用工厂）

### 5.1 定位与职责边界

**agent 产出的小应用的「生成 → 注册 → 桌面宿主 → 多形态打包」全生命周期**。核心洞察：DSH 的 slots + webServer 机制天然构成一个「应用宿主」——每个轻应用 = 一个 webServer prefix 路由（伺服静态资产）+ 一个 slots 面板（入口与容器），而 manifest 设计与 innate-desktop 的 `innate.plugin.v1` 对齐，使同一应用未来可双宿主（DSH 面板 / Tauri 壳原生插件）。

### 5.2 App Manifest v1（`innate.app.v1`）

```yaml
id: markdown-viewer            # 唯一 id
version: 0.1.0
title: Markdown Viewer
description: 拖入 md 文件即预览的小工具
forms:                         # 打包形态声明（§5.5 打包器的输入）
  panel:    { entry: index.html }        # DSH slots 面板（默认）
  window:   { entry: index.html, size: [720, 480] }   # 独立窗（壳支持时）
  web:      { entry: index.html }        # 纯静态 web 包
  cli:      { entry: cli.ts, optional: true }
runtime: iframe-static         # 对齐 innate.plugin.v1 四型
permissions: [fs.read:~/*]     # 预留，DSH 侧暂不 enforce
source:
  created-by: dsh-session      # 哪个会话生成的（溯源）
  prompt-ref: trace://...      # 生成时的 prompt 引用
```

### 5.3 子组件设计

**A · App Registry（注册表）**
- 扫描 `~/.dsh/apps/*/app.yaml`（对齐 skill-filesystem provider 的五级 root 思路：project `.dsh/apps` > user `~/.dsh/apps`），解析 manifest，watch 热更新。
- 每个应用注册一条 `ctx.webServer.register({kind:'prefix', path:'/apps/<id>', handler})` 伺服其静态资产（webServer 无内建静态服务，handler 自己流文件——实测契约允许完整响应生命周期）。
- 暴露 `/api/innate/apps`（列表/详情/启停），同时注册为 `ctx.skills` provider，让模型能「看到」已安装应用目录（`list`/`get` 两方法，对齐 dsh-skill-management.md 方案一范式）。

**B · Panel Host（面板宿主）**
- 每个已安装且启用 panel 形态的应用：`ctx.slots.inject("main")` 注册一个 keyed 面板（内部 iframe 指向 `/apps/<id>/index.html`，同源免 trust 问题）+ `sidebar.panellist` 注册图标行。
- HMR 意味着安装/卸载应用**无需重启**（dsh-client-hmr 的 live plugin composition 同样适用于本插件注册的面板集合变更）。
- 面板容器提供宿主桥（postMessage ↔ `/api/innate/apps/<id>/rpc`），首版只开放三个能力：读文件、发系统通知（走官方 notifications）、跳转面板——刻意最小，避免重造 permission 体系。

**C · Atelier Skill（生成技能）**
- 一个 `dsh-skill-atelier` 内容包（office/badge 模式）：教 agent 按模板产出应用——`app.yaml` + 单文件 `index.html`（无构建、内联依赖、限 200KB）起步；提供 3 个起步模板（工具页 / 仪表盘 / 表单流）与验收 checklist（manifest 合法、panel 可打开、无外网依赖）。
- 生成后的应用落入 project `.dsh/apps/`，Registry watch 即刻生效——**「会话造出 → 侧边栏出现 → 立即可用」闭环 < 1 分钟**，这是「开发工厂」体验的核心。

**D · Packager（打包器）**
- 同一应用目录导出四种默认形态：
  1. **DSH 插件包**：把应用包成标准 plugin（manifest + 静态资产 + slots 注册），可进自建 plugin-market 索引分发安装；
  2. **静态 web 包**：zip 即部署（innate-selfhost / ZCode Sites 均可托管）；
  3. **innate-desktop 插件**：转译为 `innate.plugin.v1` manifest（runtime/entry 字段已对齐，§5.2），供未来 Tauri 壳原生宿主；
  4. **CLI**（可选）：manifest 声明了 cli entry 才生成。
- 未来扩展位：mygo 桌面二进制形态（agent 用 mygo companion 模式产出原生小工具，走 automation socket 进桌面——对齐 mygo-dsh-integration.md 双向路线）。

### 5.4 数据流（造一个应用）

```text
用户: "给我做个 markdown 预览小工具"
  → dsh agent 加载 dsh-skill-atelier → 产出 .dsh/apps/markdown-viewer/
     (app.yaml + index.html)
  → Registry watch 触发 → webServer prefix /apps/markdown-viewer 生效
  → slots 注册面板 + 侧边栏图标（HMR，不重启）
  → 用户侧边栏点开即用
  → 满意后 Packager 导出: DSH 插件 / web 包 / innate-desktop 插件
```

### 5.5 里程碑

| 阶段 | 交付 | 量级 |
|---|---|---|
| P1 | App Manifest v1 + Registry（扫描/路由/watch） | ~3 天 |
| P2 | Panel Host（slots 面板 + iframe + 最小宿主桥） | ~4 天 |
| P3 | Atelier Skill + 3 模板 + 验收 checklist | ~3 天 |
| P4 | Packager（DSH 插件 + web 包两形态先行） | ~4 天 |

---

## 6. 与现有资产的关系

| 资产 | 在工厂中的角色 |
|---|---|
| dsh-innate-agent（superagent fork） | 工厂的「车间」：localboard Source + trace + 角色模型全保留；模块一 M3 直接消费其 RoleModel 配置 |
| innate-desktop（Tauri 底座） | 第二阶段壳替换件；`innate.plugin.v1` manifest 与 App Atelier 对齐实现双宿主；PTY/workbench/agent-registry 作为壳层组件移植 |
| dsh-agent-workbench | SDK 驱动范式参考（M4 反向暴露的组合基座即其内核化版本） |
| mygo | Packager 未来原生形态；automation socket 可作桌面外设控制原语 |
| Magpie | 模块一的网关基座，官方适配器负责注入，本侧只治理 |

## 7. 风险与对策

1. **上游 churn（最大风险）**：DSH 0.2.x rc + dsh-desktop 快速迭代 + Magpie 日更。对策：两个模块只依赖**已文档化的稳定契约**（slots additive 座位、webServer register、`dsh.client` 声明、SDK JSON-RPC wire 协议），并在 CI 加「契约冒烟」（启动 profile → 断言面板注册与路由可达）。
2. **slots 官方占用座位的替换语义**：`sidebar`/`rightbar`/`shell.leading` 等被官方占用（注册即整体替换）——工厂只用 additive 座位（`main`、`sidebar.panellist(.actions)`、`shell.overlay`、`shell.bottom`），绝不碰替换型座位。
3. **双通道写入冲突**：沿用 `magpie*` 前缀约定 + Route Weaver 校验告警（对齐 magpie-dsh-integration.md §7.2）。
4. **iframe 应用的安全面**：轻应用默认无宿主桥权限；宿主桥首版仅三能力且同源限制；`permissions` 字段先存储后 enforce（与 innate-desktop 同节奏）。
5. **webServer 无静态文件服务**：Registry 的 prefix handler 自行实现文件流 + MIME + 目录穿越校验（这是本模块少数需要「自己写」的基础件，注意路径规范化测试）。
6. **账号风控灰区**（Magpie 侧）：个人使用建议小号 + budget 窗口兜底（对齐 magpie-dsh-integration.md §7.3）。

---

## 附：证据来源

- DSH UI 插件机制：`@deepseek-ai/dsh-client-modules/README.md`（dsh.client 声明 + combo 分发 + HMR）、`dsh-client-ui-layout/lib/types/client/index.d.ts:33-116` 与 `dsh-client-ui-sidebar/.../contract/slots.d.ts`（座位清单）、`dsh-client-ui-plugin-manager/lib/client.js:4372-4418`（slots.inject shipped 范例）
- webServer 契约：`@deepseek-ai/dsh-host-webserver/lib/types/index.d.ts`（register/registerUpgrade/registerFallback/tapIndex）
- SDK 反向通路：`@deepseek-ai/dsh-sdk-jsonrpc-server/README.md`（stdio JSON-RPC 全协议）
- 桌面即插件：`~/innate/projects/dsh-desktop/dsh-plugin-desktop/`（package.json、cordis.patch.yml、docs/plugin-services.md、README.md L165）
- innate-desktop 现状：`~/innate/projects/innate-desktop/`（apps/desktop/src/main.tsx 九路由、src-tauri/src/lib.rs、packages/plugin-runtime/src/index.ts manifest 四型、docs/MODULE_MAP.md、git log 4 commits 至 2026-07-13）
- Magpie×DSH：[magpie-dsh-integration.md](../research/magpie-dsh-integration.md)（路线 A-E、合成矩阵、风险清单）
- mygo 双向集成：[mygo-dsh-integration.md](../research/mygo-dsh-integration.md)
