# mygo（Go 写 Native Desktop）原理分析与 DSH 集成可行性调研

> 调研对象: [egoist/mygo](https://github.com/egoist/mygo)（本地 clone 于 `references/mygo`，v0.7.4，MIT）
> 关联: DSH 调研系列（issue #3 延伸）
> 日期: 2026-11-03
> 说明: DeepWiki（deepwiki.com/egoist/mygo）在调研期间持续 429/网络不可达，本文改以仓库自带的
> `docs/architecture.md`（5090 行权威架构文档）+ 源码精读为依据，信息质量高于自动生成 wiki。

## 一句话结论

**mygo 是"无 cgo 的 Go 桌面框架"：用 purego 在运行时直接调 Objective-C/GTK/Win32，webview 窗口用系统自带引擎，Native UI 窗口自己用 GPU 画，产物是几 MB 的单二进制。** 它与 DSH 的集成**两个方向都通**：以 mygo 为底座，把 `dsh web` 当本地服务嵌进 webview/native 窗口做成桌面 App（可行，工程量中等，trust/IPC/进程管理全是现成设施）；以 DSH 为底座，把 mygo 构建的 companion 二进制做成 DSH 插件的桌面外设、或做成教 agent 用 mygo 造桌面应用的 skill 内容包（可行，工程量小，建议先做）。两者 MIT+MIT，无 license 障碍。

## 核心三问速答

**Q1：能否集成浏览器做自动化？—— 分层回答**

| 层次 | 结论 | 依据 |
| --- | --- | --- |
| 驱动**自己 app** 的页面与 Native UI | ✅ 强支持 | `Page.Eval`（原生异步 JS API，await promise、无视页面 CSP）+ **automation 插件**：`MYGO_AUTOMATION` Unix socket 上 JSON-lines 协议，方法 `windows`/`tree`（native UI 无障碍树，带 app key）/`act`（按键 key）/`input`（指针/滚轮/键盘/文本注入）/`menu`/`capture`（PNG 截图）/`eval`（**注入脚本到页面**）/`idle`（等静止）。跨平台同一协议，专为"外部进程/agent/E2E runner 驱动 app"设计（`plugins/automation/README.md`） |
| **任意网站的 CDP 级自动化**（Puppeteer/Playwright：网络拦截、全量 DevTools 域） | ❌ 不直接支持 | mygo 用系统 webview 非自捆绑 Chromium：macOS/Linux 是 WebKit（无 CDP）；Windows WebView2 虽是 Chromium 内核且 mygo 内部确有 `devtools()` 通用调用封装（`internal/windows/webview.go:870`，用于实现 Eval/SetZoom），**但未公开为通用 CDP passthrough API** |
| 捆绑完整浏览器引擎（CEF） | ❌ 官方 out of scope | AGENTS.md 明示"The bundled CEF option is out of scope until asked" |

可行组合：mygo 窗口加载目标网站 + automation socket 暴露给 agent = 轻量"browser-use"方案（有 tree/eval/capture/input，缺网络层拦截与 headless）。需要完整 Playwright 能力时应外挂 Chromium 子进程，与 mygo 各司其职。

**Q1.1 补：CDP 缺口能否用 bun script 调外部 Playwright 补上？—— ✅ 可以**

- Bun 1.4（2026-08）起 Playwright 官方支持 Bun runtime（启动 Chromium、`connectOverCDP`、`playwright test`、`--ui`）；此前只能 bun 装包 + Node 运行。
- 集成模式：bun script 做 **sidecar**（stdio JSON-RPC），mygo Go 主进程 spawn；`bun build --compile` 编译成独立二进制后**运行时不依赖 bun**，满足 mygo "Bun is dev tooling only" 硬规则。
- 更贴 mygo 单二进制哲学的替代：纯 Go 的 `chromedp`/`rod` 直接说 CDP、自己 spawn Chromium，零 Node/Bun 运行时。
- DSH 侧更简单：DSH 本体是 Node，插件直接 `import playwright`。

**Q2：能否集成 DSH？—— ✅ 双向皆可**（详见第 4 节）

- DSH 为底座：`dsh-skill-desktop` skill（教 agent 用 mygo 造桌面 app）+ automation socket 包装成 agent 工具 + companion 二进制插件，工程量小；
- mygo 为底座：Go 主进程 spawn `dsh web`，webview 嵌面板（`TrustedOrigins` 或 custom scheme 反代解决 trust），tray/快捷键/deeplink/自动更新白拿。

**Q3：能否承载常见 web 应用？—— ✅ 可以，两种姿势**

- **作为自己 app 的前端**（React/Vue/Vite 等）：一等公民。typed IPC + 生成 TS client、`Channel[T]` 流式、`Event[T]`、自定义 scheme（`http.Handler`）、dev 热更（`mygo dev`）。
- **包外部网站成桌面应用**（Electron 式 wrapper）：`Page.LoadURL` 任意 http(s)。配套齐全：Session/cookies/ClearData、下载管理（`OnWillDownload`/`OnDownloadDone`）、权限门（`SetPermissionHandler`）、右键菜单定制、FindInPage、theme-color 跟随、文件拖放、`OnWillNavigate` 导航拦截。安全边界清晰：外部页默认 **untrusted，不可调 Go**（`PageOptions.TrustedOrigins` 显式放行），防恶意页面打宿主。
- **局限**：引擎随系统（macOS = Safari 同源 WebKit：Widevine DRM 不可用，Netflix 类不行；Windows = WebView2 Chromium，兼容性反而最好）；不捆绑 Chromium 故老系统体验取决于系统引擎；无浏览器扩展；无 Electron `webRequest` 级全量请求拦截（只有导航级 + 自有 scheme 的 handler）；多 tab 需自建 UI（native UI 里可嵌任意数量 `ui.WebView`）。

**Q3.1 补：untrusted 外部页面上能否 browser-use 式提取信息？—— ✅ 可以，trust 边界是单向的**

trust 挡的是**页面→宿主**（防恶意页调 Go）；**宿主→页面**的拉取通道全部保留，对 untrusted 页照常工作：

| 通道 | 源码依据 | 能拿到什么 |
| --- | --- | --- |
| `Page.Eval` / `EvalAs[T]` | `window.go:1533` 代码路径无 trust 检查；`window.go:1532` "not subject to the page's CSP"；文档示例即 `fetch('/data.json')` | DOM 全量（文本/链接/表格/页面内 fetch 的 JSON），结果回 Go |
| 宿主侧事件 | `OnPageTitleUpdated`/`OnDidNavigate`/`OnWillNavigate`/`OnDOMReady`/`OnThemeColorChanged`/`OnAudibleChanged` | 标题、每次导航、加载状态 |
| 右键菜单事件 | `context_menu.go:58` `ContextMenuEvent{LinkURL, LinkText, ImageURL, MediaURL, SelectionText}` | 链接/图片/**用户选中文字** |
| `CapturePage` | `window.go:1497` | 页面 PNG（喂多模态模型） |
| Cookies API | `cookies.go` 宿主侧存储 | 登录态/会话（`CookieFilter`） |
| automation 插件 | `eval`/`capture`/`input`/`menu`/`idle` | **交互闭环**：提取 + 输入注入，agent 可驱动任意外部页 |

即"browser-use lite"成立：DSH agent → automation socket → eval/capture/input，对象是任意外部网站。**仍拿不到**：网络层响应 body（XHR/fetch 不可见，只有导航与下载）、跨源 iframe、请求改写；合成输入可被页面 `isTrusted` 检测。选型：JS 渲染 + 登录态提取用 mygo webview（Session 持久 + Safari 同源指纹是反爬加分项）；网络级拦截/重反爬外挂 Playwright sidecar（见 Q1.1）。

**Q3.2 补：XHR/fetch 网络层响应抓取—— ✅ 有解，推荐"PreloadScript hook 为主 + MITM 代理补底"**

| 方案 | 原理 | 覆盖 | 代价/局限 |
| --- | --- | --- | --- |
| **① PreloadScript 注入 fetch/XHR hook（首选）** | `PageOptions.PreloadScript`（`page.go:297`）在**页面自身脚本运行前**注入 JS（document-start，每页必注入，untrusted 页同样生效；`PreloadAllFrames` 连跨源 iframe 一并覆盖）。hook 包装 `window.fetch`/`XMLHttpRequest`（可加 WebSocket/EventSource/sendBeacon），body 缓存到 `window.__cap`；宿主用 `Page.Eval("return window.__cap.splice(0)")` 轮询拉取（无 trust 限制）。若把目标站加进 `TrustedOrigins`，hook 还能经 `window.mygo.call` 主动推送 | 页面 JS 上下文里发出的一切 fetch/XHR（含 body/status/headers） | Service Worker / Web Worker 里发出的 fetch 抓不到（独立上下文）；CORS opaque response 读不出 body；页面可检测包装过的原生函数 |
| **② 本地 MITM 代理（网络层完备）** | Go 跑 goproxy/martian 类代理 + 自签 CA 装入系统信任链；三平台 webview（WKWebView/WebKitGTK/WebView2）都遵循系统代理 → 全部流量可见，与 mygo 无耦合，可与 ① 叠加 | **全部**：XHR/fetch/WebSocket/媒体/Worker/SW 请求响应 | 需装 CA；证书锁定（SSL pinning）的站点会失败 |
| **③ 外挂 Chromium（Playwright/chromedp，见 Q1.1）** | CDP Network 域原生 | 全部 + 请求改写/拦截 | 页面住在 mygo webview 之外；重 |
| ④ Windows fork 暴露 `devtools()` passthrough | WebView2 有 CDP | 仅 Windows | 不跨平台，不作主路线 |

推荐组合：**① 为主**（覆盖绝大多数 SPA 的 API 抓取，零依赖零证书）→ **② 补底**（worker/SW/WS 场景）→ **③ 留给重反爬任务**。

## 1. 项目概况

| 项 | 值 |
| --- | --- |
| 定位 | Desktop apps in Go, with native UI **or** a web frontend |
| 作者/活跃度 | EGOIST，极活跃（调研当日仍有 commit，v0.7.4） |
| License | MIT |
| 产物 | 单 Go 二进制；hello-world ≈7 MB，macOS 物理内存 ≈35 MB（AppKit/WebKit），≈62 MB 计入 WKWebView 子进程 |
| Native UI 窗口 | 无 webview 进程；空闲小窗 44 MB（macOS），counter 例 65–67 MB（Linux）；静止后 0.005% 核占用、不唤醒线程 |
| 平台 | macOS / Linux / Windows（amd64+arm64）；Native UI 另可编译到浏览器（wasm + WebGL2） |
| 依赖 | `purego`、`go-text/typesetting`、mp3/ogg 解码等 7 个直接依赖，无 GUI 框架依赖 |

同类对比：

| | Electron | Tauri | Wails | Gio | **mygo** |
| --- | --- | --- | --- | --- | --- |
| 语言 | JS | Rust | Go | Go | **Go** |
| cgo | – | Rust FFI | 需要 | 无 | **无（CGO_ENABLED=0，任意机器交叉编译）** |
| UI | Chromium | 系统 webview | 系统 webview | 自绘 | **系统 webview 或自绘，可混排** |
| 桌面 API 完整度 | 高 | 高 | 中 | 低（无菜单/tray 等成品） | **高（菜单/tray/通知/快捷键/deeplink/更新/签名全链路）** |
| typed IPC | – | command | bindings | – | **Bind → 生成 TS client（Channel 流式 + Event）** |

## 2. "Go 写 Native Desktop"的原理（核心）

mygo 的窗口有两种内容，一个 app 可混用：**系统 webview 里的 web 页**（WKWebView / WebKitGTK / WebView2，不捆绑浏览器引擎），和 **mygo 自己在 GPU 上画的 Native UI**（无 HTML/JS/webview）。原理可拆成六层：

### 2.1 无 cgo 的原生互操作 —— purego

这是整个项目的地基（AGENTS.md 硬规则："No cgo"，`CGO_ENABLED=0` 全平台可编译）：

- **macOS（`internal/darwin/objc.go`）**：启动时 `purego.Dlopen` libobjc + AppKit/Foundation/WebKit framework，`Dlsym` 拿到 `objc_msgSend` 地址；`send(obj, "selector:", args...)` 包装整数参数调用，浮点/结构体参数（`NSRect` 等）用启动时一次性 `purego.RegisterFunc` 注册的约 40 个 typed 变体；用 `objc.RegisterClass` 在运行时定义 ObjC 子类（`MyGoWindow`/`MyGoSurfaceView` 等），**ObjC 方法体就是 Go 函数**，经 `purego.NewCallback` 变成 C 函数指针回调（每签名一个、永不释放，靠 user data 路由到窗口 id —— 回调是 ≤2000 个的稀缺资源）。
- **Linux（`internal/linux/ffi.go`）**：`dlopen` GLib/GObject/GTK3/cairo 等，`RegisterFunc` 把数百个 GTK 符号绑成带类型的 Go 函数变量；信号用 `g_signal_connect_data` + 窗口 id user data 接回 Go；WebKitGTK 惰性加载——纯 native UI 应用永远不映射它（省 75 个库 ≈7 MB/20 ms 启动）。
- **Windows（`internal/windows/`）**：不用 purego，走 `syscall.NewLazyDLL`（从系统目录绝对路径加载防 DLL 劫持）；COM 调用手工走 vtable（`syscall.SyscallN` + 槽位偏移），Go 侧实现 COM 对象（WebView2 事件 handler）用共享 vtable + `syscall.NewCallback`。

### 2.2 分层架构：策略在核心，backend 只做翻译

```
user code ──► package mygo ──► platform.Backend(契约) ──► darwin | linux | windows | web | fake
                 │                                              │
                 └─ AppHandler/WindowHandler ◄── 事件回流 ◄──────┘ purego ─► AppKit / GTK / Win32
```

`internal/platform` 是一个小的同步契约接口；每个平台 backend 只把契约翻译成原生调用，不做任何决策。这带来两个效果：`internal/fake` 内存 backend 可以在无 GUI 环境跑几乎全部单测；新行为先进 `package mygo`，五平台各自实现一遍。

### 2.3 线程模型：主线程队列

Cocoa/GTK 必须在启动线程驱动。主 goroutine `runtime.LockOSThread` 锁死在主线程，`App.Run` 阻塞在原生事件循环；`loop.go` 提供 `postMain`（FIFO 队列 + `Backend.Signal` 唤醒）/ `onMain`（直接跑或投递并等待）/ `await`（主线程上泵原生事件直到异步结果到达——这让事件回调里弹对话框不死锁）。**IPC 调用在独立 goroutine 上跑**（绑定方法可以阻塞），事件监听器同步跑在主线程（可取消事件能立即应答原生工具包）。

### 2.4 Native UI 渲染管线：声明式 view + display list + GPU

- **编程模型**：每个窗口一个 `view(c *ui.Context)` Go 函数，是 app 状态的函数（README 的 counter 例 58 行）。帧内从 arena 分配节点（帧末复用），持久状态按元素 id 映射，事件即回调式查询（`if ui.Button(...).Clicked() { s.n++ }`）——Dear ImGui 式立即构建 + 声明式外观。
- **一帧**：`build(view) → layoutTree(flexbox/grid) → paint → internal/scene → host.present → placeWebViews`。
- **display list（`internal/scene`）**：`OpFill/OpShadow/OpGlyphs/OpImage/OpPushClip/OpEffect/OpHole` 等绘制指令数组，渲染器无关。
- **GPU（`internal/gpu`）**：每个 Op 变成**一个 instanced quad**（13 个 float4 的 Instance：Rect/Radii/Color/Transform/Clip…），按 scissor+纹理聚 batch，单一 uber-shader 片元内自算圆角/边框/渐变/阴影，字形用 dual-source blending；按 Op 类别特化 shader（Metal function constants / HLSL 宏 / GLSL define）。三后端同构：**Metal**（macOS）/ **D3D11 + DirectComposition**（Windows）/ **OpenGL·WebGL2**（Linux/浏览器），另有 CPU 软件渲染器兜底。
- **文本（`internal/text`）**：shaping/断行用**系统自己的引擎**——CoreText（macOS）、Pango+HarfBuzz（Linux）、DirectWrite（Windows）；字形光栅进共享 atlas，渲染层只画 `OpGlyphs`。输入法（NSTextInputClient/GtkIMContext/IMM32）、无障碍、屏幕阅读器全接系统。

### 2.5 Typed IPC：Bind → 生成的 TS client

webview 页面与 Go 的通信是全链路类型化的：

- Go 侧 `mygo.Bind(Service{})` 反射注册方法（参数/返回类型启动时校验），前端 `import { Greeter } from "./mygo"`（生成代码）直接 `await Greeter.greet("Ada")`。
- 传输：注入的 `bridge.js`（IIFE，编译后嵌入二进制）→ `webkit.messageHandlers` / `chrome.webview.postMessage`，JSON wire protocol（`{"t":"call","id","k","m":"Service.Method","a":[...]}`），`k` 为每页随机 secret 防跨导航串话；Go→页面按主循环轮次批量 `__mygo.receive([...])`。
- `Channel[T]`：方法参数位置上的流式通道（1 MiB 字节窗口流控 + ack），页面 break 即取消调用 context；`Event[T]`：类型化事件广播。
- **Trust 模型**：前端（`mygo:` scheme）、custom scheme 页、`file:`、dev 模式 loopback http(s)、显式 `TrustedOrigins` 可调 Go；其余页面一律拒绝。每窗口随机 secret 防 iframe 逃逸。

### 2.6 webview 与 Native UI 混排

native 窗口里可放 `ui.WebView` 元素：Painter 在其内容盒画 `OpHole`（把已画像素清透明的合成洞），帧末 `placeWebViews` 把系统原生 webview 移到洞下；后画的 native 内容（popover/菜单/对话框）自然盖在页面之上，圆角与滚动裁剪同样作用于洞。**页面级 API/IPC/session 在混合窗口里照常工作**。

### 2.7 工程配套（与"能不能集成"直接相关）

- **CLI（`cmd/mygo`）**：`init`（web/native 两模板）、`dev`（250ms 快照 watch + 重建 + relaunch，前端热更交给 Vite；`-web` 把 native UI 编译到浏览器）、`build`（.app/.dmg/NSIS 安装器/deb/PKGBUILD、ed25519 签名更新包与 delta、公证）、`generate`（生成 TS client）。
- **plugins/**：`Use(plugin)` 把服务绑定为 `plugin:<name>` 内部服务。官方插件：fetch（channel 流式 Response）、websocket、sqlite、watch、**updater**（Sparkle 式更新窗，有 web 和 native 双实现）、**terminal**（purego 加载 libghostty-vt 的终端视图）、**automation**（`MYGO_AUTOMATION` Unix socket，JSON-lines 协议 + 无障碍树，外部进程可驱动 app——内置的"CDP/Playwright server"）、glass、game、loading、permissionflow。
- **AGENTS.md 质量极高**：5000 行架构文档 + 给 agent 的硬规则/命令表，仓库本身即"agent 可维护"的范本。

## 3. DSH 侧现状回顾（集成的前提）

依据既有调研（`dsh-superagent-usage.md`、`dsh-skill-management.md`）与本机实证（`dsh 0.2.1-rc.5`，MIT，**Node.js 应用** `@deepseek-ai/dsh`）：

- 形态：`dsh web`（本地 Web 面板）/ `dsh tui` / `dsh headless "task"`（一次性任务）；profile 隔离（端口、state 目录、插件栈 cordis.patch.yml + pnpm）。
- 扩展体系：插件（ctx.services/llm/skills，可 spawn 子进程，subprocess runtime 会剥离 KEY/SECRET/TOKEN 环境变量）、skill provider 注册表、多 LLM provider 内置。
- dsh-superagent 先例：tmux 管理 `dsh --profile superagent` 生命周期 + 四级退出码自愈；worker = 独立 DSH Session + git worktree 目录；Web 面板（默认 3082）。

## 4. 集成分析

两个方向的"底座"含义不同：**mygo 做底座 = 你拥有桌面分发全链路，DSH 退化为本地 agent 服务**；**DSH 做底座 = 保留 agent 生态（插件/skill/多 provider），mygo 是插件的桌面外设**。

### 4.1 方向 A：以 mygo 为底座，集成 DSH ✅ 可行

把 innate-agent 产品化为桌面 App 的路径。三种形态由轻到重：

**A1. webview 壳（推荐起点）**：Go 主进程 `exec.Command("dsh", "web", "--profile", ...)` 拉起 DSH，解析端口后 `mygo.NewWindow(URL)` 加载之。要点：

- **Trust**：生产模式 loopback http 不在默认信任列表，两条路：(a) `PageOptions.TrustedOrigins` 显式加 `http://127.0.0.1:<port>`（一行）；(b) 更干净——用 `mygo.Protocol.Handle` 注册自定义 scheme，`http.Handler` 反代 DSH 的 localhost 端口，页面成为 custom-scheme 页天然 trusted（DSH 面板若用 WebSocket 需验证 custom scheme 下的升级支持，列为待验证项）。
- **IPC**：`mygo.Bind(DshService{})` 暴露 Start/Stop/Status/Sessions 给前端生成 TS client；DSH 侧事件（任务完成等）→ Go → `mygo.NewEvent` 或系统通知。
- **进程管理**：借鉴 dsh-superagent 的退出码自愈思路在 Go 侧实现（`os/exec` + signal + 重启策略）；`signal_unix.go` 已有 SIGINT/SIGTERM 处理先例；app 退出时连带清理子进程。
- **桌面化增益**（都是 mygo 现成 API）：tray 常驻 + `menubar-flyout` 式面板、全局快捷键唤起、`dsh://` deeplink 直达 session、文件关联/拖放喂给 agent、单实例锁、mygo updater 管 app 自身签名更新。

**A2. Native UI 重写面板**：纯 Go 窗口直连 DSH HTTP API（`GET models` 等），`examples/markdown-chat` 已给出**流式 Markdown 聊天 UI 的全部组件**（`ui/markdown` 按词/句/行渐进渲染 + 跟随滚动的虚拟列表），`examples/launcher` 给出 Spotlight 式唤起面板。体验最好、内存最低（44 MB 级、无 webview 进程），但要自己追 DSH Web API 的演进，重写成本最高。

**A3. 混排**：native UI 做外壳（菜单/tray/侧栏/通知）+ `ui.WebView`（OpHole 机制）内嵌 DSH Web 面板。mygo 原生支持，是 A1 与 A2 的折中。

**工程量估计**：A1 一个能用的壳 ≈ 数百行 Go（Bind service + 进程管理 + TrustedOrigins/trust 反代）；风险集中在 DSH Web API 不稳定（rc 阶段）与 WebSocket over custom scheme 待验证。

### 4.2 方向 B：以 DSH 为底座，集成 mygo ✅ 可行（且更轻）

保留 DSH 为运行时主体，mygo 以三种身份进入：

**B1. DSH 插件 + mygo companion 二进制（桌面外设）**：写一个 DSH 插件（Node，如 `dsh-innate-desktop`），Setup 时 spawn 一个 mygo 构建的 companion（tray 常驻、系统通知、全局快捷键、菜单栏摘要），companion 通过 DSH Web API 回连。agent 获得工具化的桌面触达（"任务完成弹通知""结果存到桌面"）。分发照抄 **mygo-cli 自己的 npm 模式**：`optionalDependencies` 按平台装二进制包（`@deepseek-ai/dsh-desktop-darwin-arm64` 之类）。dsh-superagent 的 tmux 服务化脚本是这个形态的直接先例。

**B2. `dsh-skill-desktop` skill 内容包（最轻，建议第一步）**：模仿 `dsh-skill-office` 的"内置内容包"模式，skill 教 agent 用 mygo CLI 造/改桌面应用：`bunx mygo-cli init` 或 `go tool mygo dev`（native 模板连 bun 都不需要）、`mygo generate` 出 TS client、`mygo build` 出安装包。**mygo 的 AGENTS.md + 5090 行架构文档本来就是写给 agent 看的**，skill 正文大量可以直接引。`mygo dev -web` 还能让 agent 把 native UI 跑到浏览器里自检。这直接服务"agent 产出桌面应用"的场景，零运行时耦合。

**B3. agent 桌面自动化：MYGO_AUTOMATION socket**：mygo 的 automation 插件（Unix socket + JSON-lines + 无障碍树 + 点击/求值/截图）等于一个进程间 GUI 自动化协议。DSH 插件把它包成 agent 工具后，agent 获得比截图-点击 computer-use **更精确、跨平台、免坐标猜测**的 GUI 驱动能力（前提是目标 app 是 mygo 应用）。可作为 dsh-innate-agent 生态的差异化能力。

### 4.3 两方向对比与推荐

| | A：mygo 底座 | B：DSH 底座 |
| --- | --- | --- |
| 定位 | innate-agent 的**桌面产品化** | DSH 生态的**桌面能力扩展** |
| 工程量 | 中（A1 壳数百行；A2 重写面板大） | 小（B2/B3 几乎零耦合；B1 中） |
| 主要风险 | DSH Web API 不稳定（rc）；WS over custom scheme 待验证 | companion 二进制分发链路；mygo API 演进快（v0.x 有 breaking） |
| 体验上限 | 最高（原生菜单/tray/deeplink/自动更新全链路） | 中（桌面是外设） |
| 对 DSH 的侵入 | 无（DSH 只是子进程） | 插件形态，符合 DSH 扩展哲学 |

**推荐路线**：B2（skill，1 天级）→ B3（automation 工具，包装层）验证价值 → A1（mygo 壳 + dsh web 子进程）做成可用桌面 App → 视需要演进 A3/A2。B 与 A 不互斥：B1 的 companion 与 A1 的壳可共享同一份 mygo 代码。

## 5. 风险与不确定性

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| mygo v0.7.x 快速演进（已有 element API breaking 迁移记录） | 升级成本 | 锁版本；关注 `ui/migration.md`；仓库测试/CI 极完善，破坏都有公告 |
| DSH 0.2.1-rc，研究原型，API 无稳定性承诺 | A1/A2 的面板对接层易碎 | 以子进程 + HTTP 面板对接（A1），重写层（A2）推迟 |
| custom scheme 反代下 WebSocket 升级是否可用 | A1 方案 (b) | 待验证；不可用则退 `TrustedOrigins` 直连 |
| Node 子进程内存（dsh web）与 mygo 低开销哲学的落差 | 桌面 App 总内存由 DSH 主导 | 接受（A1）；或 headless/tui 形态 + native UI（A2）规避 web 面板 |
| Linux 上 WebKitGTK 需系统安装 | A1 的 Linux 分发 | mygo 对纯 native 应用不加载它（errWebKit 提示安装）；deb/PKGBUILD 已处理 |
| purego 回调 ≤2000 个/进程 | 理论上限 | mygo 严格按签名复用，实践无虞 |
| 双方均为单人/小团队主导的早期项目 | 长期维护 | 都是 MIT，可 fork 自持；DSH 侧已是既定依赖 |

## 6. 信息来源

- 本地 clone：`references/mygo`（v0.7.4，含完整 git 历史）
- `docs/architecture.md`（5090 行）、`AGENTS.md`、`README.md`、`docs/plugins*`
- 源码精读：`internal/darwin/objc.go`、`internal/linux/ffi.go`、`internal/windows/{win32,com}.go`、`internal/scene`、`internal/gpu/*`、`internal/text`、`ipc.go`、`channel.go`、`plugin.go`、`plugins/automation`、`cmd/mygo`、`examples/*`
- DSH 侧：`docs/research/dsh-superagent-usage.md`、`docs/research/dsh-skill-management.md`、本机 `dsh 0.2.1-rc.5`（`--help`、`~/.dsh/`、npm 包元数据）
- Bun × Playwright：[Bun 1.4 发布博客](https://bun.com/blog/bun-v1.4)（Playwright on Bun runtime）、[microsoft/playwright#27139](https://github.com/microsoft/playwright/issues/27139)、[oven-sh/bun#8222](https://github.com/oven-sh/bun/issues/8222)
- DeepWiki：调研期间不可达（HTTP 429 / 网络错误），未采用
