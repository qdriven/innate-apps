# DSH Web UI 可替换座位全景图（Seat Map）

> 状态：参考文档（2026-11-03，基于 `@deepseek-ai/dsh@0.2.1-rc.5` 全量 `.d.ts` 扫描）
> 背景：[innate-dev-factory.md](./innate-dev-factory.md) §2 的延伸——「不喜欢官方 sidebar 怎么改 / 右侧窗体怎么集成」需要一份完整的 UI 扩展座位清单。
> 数据来源：对 63 个声明 `SlotMap` 的包做全量正则提取，共 **103 个座位**；占用语义以 layout/sidebar/sidebar-right 三个包的类型注释与 README 原文为准。

---

## 0. 怎么读这份图

**座位类型（kind）**

| 标记 | kind | 语义 |
|---|---|---|
| **替** | `single` | 单座位：注册即**整体替换**当前占用者（官方占用者被你接管） |
| **增** | `list` | 列表座位：追加，多注册者并存（按 order 排序） |
| **键** | `keyed` | 按 key 注册：一个 key 一个占用者（面板/tab/消息节点） |
| **链** | `chain` | 链式接管：接管渲染但保留宿主结构（如替换 guide tab 的 body 而不动 tab） |

**占位状态**：● = 官方占用（替换型接管对象）；○ = 默认空（白送座位）；◐ = 官方只提供 fallback（替换不影响周围控件）；— = list/keyed 天然多人。

**作用域（scope）**：`root` = 全窗口单份；`session` = 每个会话独立渲染一份；`session-maybe` = 仅当存在会话时挂载。

**前置条件**：所有座位都在**浏览器端 Cordis 插件**里注册——插件 package.json 声明 `dsh.client`（`platform: "web"`）+ 导出 `./client` 构建产物，经 `/plugins` combo 路由进入客户端模块图，HMR 支持运行中热增删。CLI / Web / Desktop 三种宿主同样生效。

---

## 1. 全窗口总览

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ shell.leading ●替·root   窗口左上角窗控带                                  │
│   （仅当左侧栏完全隐藏时挂载；官方=重新展开/New Session 控件；               │
│    macOS 桌面折叠时露出交通灯位置，帧会发布 --dsh-frame-leading-clearance） │
├──────────┬────────────────────────────────────────────┬──────────────────┤
│ sidebar  │  main 键·root —— 中央面板区（按 key 切换）     │ rightbar ●替·root│
│  ●替·root│  ┌────────────────────────────────────────┐ │  右列轨道         │
│          │  │ key="conversation"（保留键 → 会话面板）  │ │  官方=右侧 dock   │
│ (见图2)  │  │   conversation.* 座位族（见图3）          │ │  (见图4)          │
│          │  └────────────────────────────────────────┘ │                  │
│          │  key="<你的面板>" ← sidebar.panellist 增     │                  │
│          │  注册图标行 + ctx.layout.selectPanel(id)     │                  │
├──────────┴────────────────────────────────────────────┴──────────────────┤
│ shell.bottom ○替·root  三列之下的全宽条（默认空=白送）                      │
│   自管高度/可见性/控件；高度挤占列高；跨面板切换常驻；无会话绑定              │
├──────────────────────────────────────────────────────────────────────────┤
│ shell.overlay 增·root  全窗浮层（点击穿透层，条目自行恢复指针事件）          │
│   badge / toast 栈 / 状态丸的正规座位；新 id 并排追加不替换                  │
└──────────────────────────────────────────────────────────────────────────┘
  root ●替·root —— 整个应用渲染根（替换=重写全部 UI，勿动）
```

**官方原话**（`dsh-client-ui-layout/lib/types/client/index.d.ts`）：
- `sidebar`：「OCCUPIED by ui-sidebar's SidebarRoot… registering here **replaces the navigation column outright** rather than adding to it, **and the seats it declares disappear with it**. To add something to the sidebar, register into one of those inner seats instead.」——**替换整列 = 内部座位全部消失**，官方明文建议改内部座位。
- `rightbar`：「OCCUPIED by the right Sidebar… The expand control is not this column's: it is a button in the conversation header.」——右列展开按钮不在右列，在会话头角落座位。

---

## 2. 左侧栏解剖（15 座位）

```text
┌─ sidebar ●替·root（整列；官方=ui-sidebar 的 SidebarRoot）─────────────┐
│  ⚠️ 替换此座位 → 品牌区/面板行/浏览区/设置行全部随之消失，需自行重声明    │
│  占位者收到帧的实时列状态 {collapsed, width}，折叠时须自绘窄 rail        │
├────────────────────────────────────────────────────────────────────┤
│ ◐ sidebar.brand.mark   品牌 logo（官方只有 fish 兜底图）                │
│ ◐ sidebar.brand.name   品牌名（官方通用文本兜底）                       │
│ ○ sidebar.toggle.badge 折叠展开钮上的非交互通知点                       │
├────────────────────────────────────────────────────────────────────┤
│ 增 sidebar.panellist          全局面板图标行（每行 id 对应一个 main 面板）│
│ 增 sidebar.panellist.actions  图标行 More 菜单行（pin/unpin/open）      │
├────────────────────────────────────────────────────────────────────┤
│ ●替 sidebar.workspaces ←←← 会话/工作区浏览区（本列主体，官方=ui-workspace）│
│    ◐替 sidebar.workspaces.directoryFlow      目录选择流                 │
│    增  sidebar.workspaces.session.row.action 会话行尾动作               │
│    增  sidebar.workspaces.session.menu.item  会话右键菜单项             │
│    增  sidebar.session.row.hover / .leading  会话行悬停浮层/行首前缀     │
├────────────────────────────────────────────────────────────────────┤
│ ●替 sidebar.settings   设置触发行+模态（官方=ui-settings）              │
│ 增  sidebar.footer.action  设置行旁附加按钮（只收 {wide} 列状态）        │
└────────────────────────────────────────────────────────────────────┘
   另：sidebar.chat.conversation ●替·session —— 子代理会话侧栏（ui-subagent）
```

| 座位 | 类型/作用域 | 声明包 | 占位与说明 |
|---|---|---|---|
| `sidebar` | 替·root | ui-layout（声明）/ ui-sidebar（占用） | ● 整列接管入口；替换则内部座位消失 |
| `sidebar.brand.mark` | 替·root | ui-sidebar | ◐ 收 `{size}`；替换不动周围控件 |
| `sidebar.brand.name` | 替·root | ui-sidebar | ◐ 自有内容与宽度 |
| `sidebar.toggle.badge` | 替·root | ui-sidebar | ○ 折叠钮通知点 |
| `sidebar.panellist` | 增·root | ui-sidebar | — 行 id=main 面板 key；收 `{size, active}` |
| `sidebar.panellist.actions` | 增·root | ui-sidebar | — 收 `{entries, onOpen, onPinnedChange, onDismiss}` |
| `sidebar.workspaces` | 替·root | ui-sidebar（声明）/ ui-workspace（占用） | ● **本列主体**；收 `{wide, expandSidebar}` |
| `sidebar.workspaces.directoryFlow` | 替·root | ui-workspace | ◐ 目录选择流程 |
| `sidebar.workspaces.session.row.action` | 增·root | ui-workspace | — 会话行动作 |
| `sidebar.workspaces.session.menu.item` | 增·root | ui-workspace | — 右键菜单项 |
| `sidebar.session.row.hover` | 增·root | ui-workspace | — 行悬停内容 |
| `sidebar.session.row.leading` | 增·root | ui-workspace | — 行首前缀 |
| `sidebar.settings` | 替·root | ui-sidebar（声明）/ ui-settings（占用） | ● 设置入口行；收 `{wide}` |
| `sidebar.footer.action` | 增·root | ui-sidebar | — 设置行旁按钮；收 `{wide}` |
| `sidebar.chat.conversation` | 替·session | ui-subagent | ● 子代理侧栏会话体 |

---

## 3. 中央会话面板解剖（44 座位）

```text
┌─ main key="conversation"（会话面板）────────────────────────────────────┐
│ conversation.session ●替·session      会话整体（含 header 以下全部）      │
│ ┌ conversation.session.header ●替·session ────────────────────────────┐ │
│ │  增 .actions        头部动作行                                       │ │
│ │  增 .utilities      工具行（会话日志等）                              │ │
│ │  ●替 .lineage       谱系（fork/延续链）                               │ │
│ │  ●替 .corner        右端角落座位 ← 右侧栏展开按钮住这里                │ │
│ │  增 .views.actions  （root 作用域）视图动作                           │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ conversation.header ●替·session-maybe    无会话时头部                    │
│ conversation.header.leading ●替·root     头部左端                        │
│ ┌ 消息流 ─────────────────────────────────────────────────────────────┐ │
│ │ 增 conversation.view            包裹会话视图                          │ │
│ │ ●替 conversation.chat.flow      聊天流主体                           │ │
│ │ 键 conversation.chat.node       每类消息节点                          │ │
│ │    ●替 chat.reasoning.body      思考体                                │ │
│ │    ●替 chat.user.images         用户消息图片                          │ │
│ │    ●替 chat.message.images      消息图片渲染                          │ │
│ │    键 user.text.node            用户文本节点                          │ │
│ │    键 chat.commandview          命令视图                              │ │
│ │    增 chat.assistant-actions    助手消息尾部动作                       │ │
│ │    增 chat.turnTail             轮次尾部                              │ │
│ │ 键 tool.call.toolview           每个工具调用的视图（工具卡片）           │ │
│ │ 键 tool.view.cordis             cordis 类工具视图                      │ │
│ │ ●替 tool.call.images            工具结果图片                          │ │
│ │ ●替 conversation.approval.detail 审批详情                             │ │
│ │ ●替 conversation.trajectory.images 轨迹图                            │ │
│ │ 增 deliverables.file.actions / review.file.actions 交付物文件动作      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ ┌ 输入区 ─────────────────────────────────────────────────────────────┐ │
│ │ 链 conversation.composer        整个输入区（链式接管）                 │ │
│ │ ●替 conversation.composer.bar   输入条                                │ │
│ │ 增 conversation.composer.dock / input.dock   输入区 dock              │ │
│ │ ●替 conversation.input.model    模型选择                              │ │
│ │ ●替 conversation.input.model.label  模型标签（ui-model-selection）    │ │
│ │ ●替 input.plan / input.permission / input.attachments / input.activity│ │
│ │ 增 input.overlay / input.left / input.right                          │ │
│ │ 增 conversation.plan-review.actions  计划审阅动作（ui-user-questions） │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│ 空态：◐ hero.brand.mark / ●替 hero.workspace(+directoryFlow)            │
│       ●替 hero.agentPreset / 增 hero.options                           │
│ ●替 main.conversation·session-maybe   会话列主体（⚠️ 慎动）              │
└─────────────────────────────────────────────────────────────────────────┘
```

<details>
<summary><b>完整清单表（点开）</b></summary>

| 座位 | 类型/作用域 | 声明包 |
|---|---|---|
| `conversation.approval.detail` | 替·session | ui-approval |
| `conversation.chat.assistant-actions` | 增·session | ui-chat |
| `conversation.chat.commandview` | 键·session | ui-chat |
| `conversation.chat.flow` | 替·session | ui-chat |
| `conversation.chat.message.images` | 替·session | ui-chat |
| `conversation.chat.node` | 键·session | ui-chat |
| `conversation.chat.reasoning.body` | 替·session | ui-chat |
| `conversation.chat.turnTail` | 增·session | ui-chat |
| `conversation.chat.user.images` | 替·session | ui-chat |
| `conversation.composer` | 链·session | ui-conversation |
| `conversation.composer.bar` | 替·session-maybe | ui-conversation |
| `conversation.composer.dock` | 增·session | ui-conversation |
| `conversation.header` | 替·session-maybe | ui-conversation |
| `conversation.header.leading` | 替·root | ui-conversation |
| `conversation.hero.agentPreset` | 替·session-maybe | ui-agent-preset |
| `conversation.hero.brand.mark` | 替·root | ui-conversation |
| `conversation.hero.options` | 增·session | ui-conversation |
| `conversation.hero.workspace` | 替·root | ui-conversation |
| `conversation.hero.workspace.directoryFlow` | 替·root | ui-workspace |
| `conversation.input.activity` | 替·session | ui-conversation |
| `conversation.input.attachments` | 替·session-maybe | ui-conversation |
| `conversation.input.dock` | 增·session | ui-conversation |
| `conversation.input.left` | 增·session | ui-conversation |
| `conversation.input.model` | 替·session | ui-conversation |
| `conversation.input.model.label` | 替·session | ui-model-selection |
| `conversation.input.overlay` | 增·session | ui-conversation |
| `conversation.input.permission` | 替·session | ui-conversation |
| `conversation.input.plan` | 替·session | ui-conversation |
| `conversation.input.right` | 增·session | ui-conversation |
| `conversation.plan-review.actions` | 增·session | ui-user-questions |
| `conversation.session` | 替·session | ui-conversation |
| `conversation.session.header` | 替·session | ui-conversation |
| `conversation.session.header.actions` | 增·session | ui-conversation |
| `conversation.session.header.corner` | 替·session | ui-conversation（右侧栏展开按钮占用） |
| `conversation.session.header.lineage` | 替·session | ui-conversation |
| `conversation.session.header.utilities` | 增·session | ui-conversation |
| `conversation.session.header.views.actions` | 增·root | ui-conversation |
| `conversation.trajectory.images` | 替·session | ui-trajectory |
| `conversation.user.text.node` | 键·session | ui-conversation |
| `conversation.view` | 增·session | ui-conversation |
| `deliverables.file.actions` | 增·session | ui-deliverables |
| `deliverables.review.file.actions` | 增·session | ui-deliverables |
| `main` | 键·root | ui-layout（`conversation` 为保留键） |
| `main.conversation` | 替·session-maybe | ui-conversation |
| `tool.call.images` | 替·session | ui-tool |
| `tool.call.toolview` | 键·session | ui-tool |
| `tool.view.cordis` | 键·session | ui-cordis |

</details>

---

## 4. 右侧 dock 解剖（14 座位）——右侧窗体的正规集成点

```text
┌─ rightbar ●替·root（右列轨道；官方=右侧 Sidebar）───────────────────────┐
│  占位者自报组成状态（展开/呈现）→ 帧据此定轨道宽度与拖柄                    │
│  rightbar.session ●替·session  每会话 dock 面（前台+后台 keepMounted）    │
│ ┌ dock 面（每会话一个；布局持久化在 localStorage dsh.sidebar-right.v1.*）┐│
│ │ ┌tab strip（面板整个上缘）────────────────────────────────────────┐ ││
│ │ │ [tab 胶囊×N(可关)] [+guide] [分屏] [呈现切换][折叠(仅右上pane)]   │ ││
│ │ └─────────────────────────────────────────────────────────────────┘ ││
│ │ ┌ docked pane ──────────┬─ split pane ───────────────────────────┐  ││
│ │ │ 键 sidebar.right.pane.tab       ←←← 你的面板 body 注册在这里     │  ││
│ │ │ 键 sidebar.right.pane.tab.title     tab 胶囊标题接管             │  ││
│ │ └──────────────────────────────┴──────────────────────────────────┘  ││
│ │ 增 sidebar.right.tab.menu.item   tab 菜单追加项（kit 布局动作之后）    ││
│ │ 链 sidebar.right.tab.guide       guide tab body 接管（tab 本身不动）  ││
│ │ 键 sidebar.right.tab.guide.entry + 增 sidebar.right.tab.guide.actions ││
│ └─────────────────────────────────────────────────────────────────────┘ │
│ 浮动面板：独立于列展开状态常驻渲染，tab 可自由关闭                          │
└──────────────────────────────────────────────────────────────────────────┘
  文档预览族（ui-sidebar-documentpreview = 第三方走公开路径的活样本）：
    键 sidebar.right.tab.document / .document.office.pdf
    键 sidebar.right.tab.document.action / 增 .document.actions / 增 .unpreviewable
  增 sidebar.right.tab.files.actions（文件树 tab 动作，ui-sidebar-files）
  展开按钮在会话头：conversation.session.header.corner（面板隐藏时的回归入口）
```

| 座位 | 类型/作用域 | 声明包 | 说明 |
|---|---|---|---|
| `rightbar` | 替·root | ui-layout / ui-sidebar-right | ● 整列接管（不建议，见 §7） |
| `rightbar.session` | 替·session | ui-sidebar-right | ● 每会话 dock 面树 |
| `sidebar.right.pane.tab` | 键·session | ui-sidebar-right | **tab body 主入口**；key=tab 类型 id |
| `sidebar.right.pane.tab.title` | 键·session | ui-sidebar-right | tab 胶囊标题（缺省用开 tab 时捕获文本） |
| `sidebar.right.tab.guide` | 链·session | ui-sidebar-right | guide tab body 接管 |
| `sidebar.right.tab.guide.entry` | 键·session | ui-sidebar-right | guide 页入口盒 |
| `sidebar.right.tab.guide.actions` | 增·root | ui-sidebar-right | guide 页动作 |
| `sidebar.right.tab.menu.item` | 增·session | ui-sidebar-right | tab 菜单内容级动作 |
| `sidebar.right.tab.document` | 键·session | ui-sidebar-documentpreview | 文档预览 tab |
| `sidebar.right.tab.document.office.pdf` | 键·session | ui-sidebar-documentpreview | PDF 预览 |
| `sidebar.right.tab.document.action` | 键·session | ui-sidebar-documentpreview | 文档 tab 单动作 |
| `sidebar.right.tab.document.actions` | 增·session | ui-sidebar-documentpreview | 文档 tab 动作组 |
| `sidebar.right.tab.document.unpreviewable` | 增·session | ui-sidebar-documentpreview | 不可预览回退 |
| `sidebar.right.tab.files.actions` | 增·session | ui-sidebar-files | 文件树 tab 动作 |

---

## 5. 设置模态 + Plugins 页 + 其他（16 座位）

```text
┌─ 设置模态（ui-settings）────────────────────┐  ┌─ Plugins 页（main 面板之一）────────┐
│ settings.trigger ●替  触发行（住 sidebar.settings）│ │ 增 plugins.tab          页内 tab     │
│ settings.launcher ●替  启动器                 │  │ 增 plugins.add.actions  添加按钮区   │
│ settings.close   ●替  关闭钮                 │  │ 增 plugins.item         插件列表行   │
│ settings.header  ●替  头部                   │  │ 键 plugins.bundle.activation/config │
│ settings.section 增   左侧分区行             │  │ 键 plugins.row.config                │
│ settings.general.item 增  常规页设置项        │  │ 增 plugins.detail.actions/badge      │
│ settings.plugins.tab 增  插件页 tab          │  │ 增 plugins.detail.section 详情区块   │
│ settings.models.provider-card 键             │  └─────────────────────────────────────┘
│ settings.models.sign-in ●替 / models.footer 增│
│ settings.action 增 / settings.onboarding 增  │  其他：
└──────────────────────────────────────────────┘  键 workspace.toast（工作区 toast）
                                                  链 shell.quota-notice（配额提醒，ui-chat）
                                                  ●替 root（整个渲染根——勿动）
```

---

## 6. 非 slot 扩展点速查（UI 之外的「可替换件」）

| 扩展点 | 能力 | 证据 |
|---|---|---|
| `ctx.sidebarRightTabs` | tab **类型注册表**：`register({id, kind, patterns?, priority?, canOpen?, title, guide?, keepMounted?})`；`dsh-resource://` 地址按 glob 认领，优先级带 extension > builtin > fallback | ui-sidebar-right README「Extension seats」 |
| `ctx.sidebarRight` | 导航控制器：`openTab(kind, opts)` / `openResource(addr, {params, preferNewPane, replaceTab, paneId})` / `close` / `split` / `float(tabId, rect?)` / `dock(paneId)` / `focus` / `toggleExpanded` / `toggleFullscreen` / `active` / `isExpanded` / `mounted` | 同上「ctx.sidebarRight」 |
| `ctx.layout` | `selectPanel(id)`（切 main 面板）/ `panelInfo` / `openRightbar(track, fullscreen)` / `closeRightbar()` | 同上 + SidebarRootInjected |
| `dsh.client` + `./client` | 进入浏览器端模块图（combo 路由分发 + HMR 热增删） | dsh-client-modules README |
| `ctx.webServer` | `register(exact/prefix)` 自定义路由、`registerUpgrade` WS、`tapIndex`/`index-inject` 注入 index.html（CSS 皮肤层入口） | dsh-host-webserver 类型契约 |
| Desktop 专属 Host service | `ctx.desktopProfiles`（profile 切换）/ `ctx.desktopPnpm`（进程执行）；`ctx.desktopWindow` 只读几何；窗口/托盘/通知**不对第三方开放** | dsh-plugin-desktop docs/plugin-services.md |
| Desktop 稳定 DOM 锚点 | `[data-pane="sidebar"]`、`.dshDesktop_sidebarCol`、`[data-rightbar-col]`、`[data-shell-overlay]`（extended/enhanced 模式下 ui-layout 类名不存在） | dsh-plugin-desktop plugin-development.md |

---

## 7. 实战一：改造左侧 sidebar（按侵入度从低到高）

**方案 ①（推荐）：换内容不换壳——接管 `sidebar.workspaces`**

左列的主体就是会话/工作区浏览区。不喜欢它，就把它整块换成自己的导航（应用启动器、工作台、任务看板），同时保留官方的列几何、折叠 rail、New Session、面板行、设置行：

```js
// 插件 client.js（package.json 需声明 dsh.client + 导出 ./client）
export function client(ctx) {
  ctx.slots.inject('sidebar.workspaces', function* () {
    yield ctx.slots.register({
      name: 'sidebar.workspaces',
      // 契约 owner props（SidebarSectionOwnerProps）：{ wide, expandSidebar }
      inject: (owner) => (
        <MyLauncher wide={owner.wide} onExpand={owner.expandSidebar} />
      ),
    })
  })
}
```

微调件：`sidebar.brand.mark/name`（◐ 换品牌）、`sidebar.settings`（● 换设置入口）、`sidebar.footer.action`（增，加自定义按钮）、`sidebar.session.row.leading/hover`（增，行首/悬停）。

**方案 ②（重）：换壳——接管整个 `sidebar`**

全权接管左列（连折叠 rail、New Session、面板行都自己画）。**官方明文警告**：内部座位随声明一起消失，必须重新声明要保留的 children，否则其他插件的面板行（`sidebar.panellist`）失去挂载点：

```js
ctx.slots.inject('sidebar', function* () {
  yield ctx.slots.register({
    name: 'sidebar',
    // 契约 owner props（SidebarOwnerProps）：帧的实时列状态
    inject: (owner) => (
      <MyRail
        collapsed={owner.collapsed} width={owner.width}
        /* 折叠时必须自绘 56px 窄 rail（官方契约要求） */
      />
    ),
    // 重新声明内部座位（结构以 dsh-client-ui-slots 类型为准），
    // 把官方那组 children 抄过来，生态兼容才不断
    children: {
      'sidebar.panellist': { kind: 'list', scope: 'root' },
      'sidebar.panellist.actions': { kind: 'list', scope: 'root' },
      'sidebar.settings': { kind: 'single', scope: 'root' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
      /* workspaces 族按需 */
    },
  })
})
```

**方案 ③（轻）：只换皮——CSS 注入**

不动结构只改观感（宽度/密度/字体/隐藏元素）：

```ts
// Host 侧插件（inject = ['webServer']）
ctx.webServer.tapIndex((html) =>
  html.replace('</head>', '<style>/* 覆盖规则 */</style></head>'))
// 结构化等价：'webserver/index-inject' 事件推 IndexInjection 行
```

⚠️ 类名**非契约**，上游更新可能碎；Desktop 下优先用稳定 DOM 锚点（`[data-pane="sidebar"]` 等，见 §6）。

**快速决策表**

| 不喜欢什么 | 动哪里 |
|---|---|
| 会话/工作区列表本身 | ●替 `sidebar.workspaces` |
| 品牌 logo / 名字 | ◐ `sidebar.brand.mark` / `.name` |
| 整个左列结构 | ●替 `sidebar`（重声明 children，方案②） |
| 只想换观感 | CSS 注入（方案③） |
| 左栏底部 | ●替 `sidebar.settings` / 增 `sidebar.footer.action` |
| 想加自己的入口 | 增 `sidebar.panellist` + `main` 键面板 |
| 想要底部状态条 | ○ 替 `shell.bottom`（白送） |

---

## 8. 实战二：集成右侧窗体——注册 tab 类型（不要替换 rightbar）

右侧栏是**每会话一个的 dock 面**：tab 可分屏（split）、拉成浮动面板（float）、全屏（fullscreen），布局按会话持久化。**正规入口是 tab 类型注册表**，不是替换 `rightbar` 座位（那要重接整个 dockkit）。官方 shipped 的 documentpreview 就是走这条公开路径的活样本。

**两段式注册**（都在插件的 `ctx.effect` 里，生命周期=插件生命周期）：

```js
// ① tab 类型声明（静态；id 全局唯一，包名是天然值）
const disposeType = ctx.sidebarRightTabs.register({
  id: 'qdriven.innate.atelier',   // 全局唯一；body/title 以它为 key
  kind: 'innate-app',             // 页面型：不写 patterns，按 kind 打开
  title: (address) => '轻应用',    // tab 胶囊文本（开 tab 时捕获）
  guide: [{ /* guide 页入口盒，可选 */ }],
  keepMounted: true,              // 切走不卸载
})

// ② tab body（keyed 座位，key = ① 的 id）
ctx.slots.register(
  { name: 'sidebar.right.pane.tab', key: 'qdriven.innate.atelier' },
  function Body() {
    // useTabInfo() → { sidebar, panel, tab }
    // tab 内含 record 字段、visible、navigation(params)、signal、actions
    const { tab } = useTabInfo()
    return <AtelierApp appId={tab.navigation.params.appId} />
  },
)
```

**资源认领型**（让文件链接自动落进你的查看器）：

```js
ctx.sidebarRightTabs.register({
  id: 'qdriven.md-viewer',
  kind: 'preview',
  patterns: ['*.md'],                  // 不含 ':' 匹配路径任意深度；含 ':' 匹配整地址
  priority: 'extension',               // extension > builtin > fallback
  canOpen: (address) => true,
  title: (address) => basename(address),
})
// 会话里的 md 链接：ctx.sidebarRight.openResource(addr, { params: { line: 3 } })
```

**编排 API**（打开/分屏/浮动窗）：

```js
ctx.sidebarRight.openTab('innate-app', { params: { appId } })  // 默认进活动 dock pane
ctx.sidebarRight.openTab('innate-app', { preferNewPane: true }) // 想分新 pane
ctx.sidebarRight.split()                       // 分屏（两 pane 上限，返回新 pane id）
ctx.sidebarRight.float(tabId, { x, y, w, h })  // 拉成独立浮动面板（右侧「窗体」）
ctx.sidebarRight.dock(paneId)                  // 浮动面板归位
ctx.sidebarRight.toggleExpanded()              // 列展开/收起
ctx.sidebarRight.toggleFullscreen(paneId)      // 全屏呈现
ctx.layout.openRightbar(track, fullscreen)     // 帧级控制
```

**更多座位**：tab 菜单加动作 → 增 `sidebar.right.tab.menu.item`；接管 guide 页 → 链 `sidebar.right.tab.guide` + 键 `.guide.entry`；会话头角落放自定义按钮 → ●替 `conversation.session.header.corner`（注意与右侧栏展开按钮共存冲突）。

**对开发工厂的落点**：App Atelier 的 manifest `forms` 增加两个形态——`righttab`（dock 进右列，`sidebar.right.pane.tab`）与 `float`（`ctx.sidebarRight.float` 浮动窗），与既有 `panel`（main 键面板）/`web`/`cli` 并列；同一 app 源在面板、右栏 tab、浮动窗三种宿主位形间零改动切换。

---

## 附：证据来源

- 全量座位提取：`@deepseek-ai/dsh@0.2.1-rc.5` 全部 `*.d.ts` 中 `declare module '@deepseek-ai/dsh-client-ui-slots'` 的 `SlotMap` 条目（63 包 / 103 座位，正则扫描）
- 顶层座位语义原文：`dsh-client-ui-layout/lib/types/client/index.d.ts:33-116`（sidebar/main/rightbar/shell.bottom/shell.overlay/shell.leading 注释）
- 左栏契约：`dsh-client-ui-sidebar/lib/types/client/contract/slots.d.ts`（holes 声明、owner props、SidebarRootInjected）
- 右栏契约：`dsh-client-ui-sidebar-right/README.md`（Extension seats / ctx.sidebarRight / 状态与呈现）、`dsh-client-ui-sidebar-documentpreview`（第三方 tab 类型活样本）
- 注册范式：`dsh-client-ui-plugin-manager/lib/client.js:4372-4418`（slots.inject + register shipped 实例）
- Desktop 侧：`~/innate/projects/dsh-desktop/dsh-plugin-desktop/docs/plugin-services.md`、`docs/plugin-development.md`（稳定 DOM 锚点）
- 关联文档：[innate-dev-factory.md](./innate-dev-factory.md)（桌面底座决策与工厂模块设计）
