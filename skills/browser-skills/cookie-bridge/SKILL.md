---
name: cookie-bridge
description: 浏览器登录态共享桥。在"共享自动化 Chrome profile"与各 agent 工具的内置浏览器之间同步 cookie（CDP 导出/注入）。当用户说"内置浏览器要登录""把 Chrome 登录态给 agent""cookie 同步/导入/导出""共享浏览器 profile""让 trae/kimi/codebuddy/opencode 等工具的浏览器带上我的登录状态"时使用。
compatibility: 需要 Node >= 22（全局 fetch/WebSocket）与本机 Chrome/Chromium；只走 CDP，不做任何 cookie 解密。
metadata:
  type: skill
  supported_agents:
    - claude-code
    - zcode
    - kimi
    - codex
    - opencode
    - trae
    - trae-solo
    - workbuddy
    - openclaw
    - hermes agent
  tags:
    - browser
    - cookies
    - cdp
    - login-session
---

# cookie-bridge：给所有内置浏览器共享登录态

## 定位与原理

各 agent 工具的内置浏览器是隔离 session，没有你的登录态。本 skill 用**共享自动化 profile** 模式解决：

1. `launch` 启动一个专属 Chrome（非默认 `--user-data-dir` + `--remote-debugging-port`，符合 Chrome 136+ 的 CDP 安全规则）；
2. 用户在这个 Chrome 里登录一次各网站（或从真实 Chrome 拷贝 profile 初始化）；
3. 任何工具的浏览器需要登录态时，从共享 profile `export`（CDP 明文导出 + 域名白名单），再 `import` 注入目标浏览器；Playwright 类工具也可以直接 `connectOverCDP` 接管共享 profile，连导入都省了。

不读 Chrome 的加密 cookie 库、不做 Keychain 解密——Windows（app-bound encryption）和未来 macOS 变更都不会影响此方案。

## 命令

CLI 位于本 skill 目录 `scripts/cookie-bridge.mjs`（零依赖，Node >= 22）：

```bash
CB="<本skill目录>/scripts/cookie-bridge.mjs"

node "$CB" launch  --port 9222                      # 启动共享 Chrome（--headless 可选，--profile 默认 ~/.cookie-bridge/profile）
node "$CB" status  --port 9222                      # 查看端口上的浏览器
node "$CB" export  --port 9222 --domains github.com --out ~/.cookie-bridge/gh.json
node "$CB" import  --port 9333 --file ~/.cookie-bridge/gh.json   # 注入目标工具的浏览器
```

`export` 必须带 `--domains` 白名单（子域自动覆盖），或显式 `--all`。cookie 文件权限 0600，默认存 `~/.cookie-bridge/`。

## 三种接入场景

**场景 A：工具的浏览器能指定 CDP 端点（Playwright 类）** — 不需要导入，直接接管：

```js
const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const ctx = browser.contexts()[0]; // 已登录上下文
```

**场景 B：工具只有隔离的托管 Chromium/内置浏览器** — 先查它是否带调试口（`status` 逐个试 9222/9330+ 等常见口），有口就 `import --port <该口>`。CLI 的 `openSession` 在没有标签页时会自动开 about:blank。

**场景 C：Electron IDE（Trae/CodeBuddy/Kimi 等）的内嵌浏览器** — 用调试口启动 IDE，webview 会作为 CDP target 出现，然后 `import`：

```bash
open -na Trae.app --args --remote-debugging-port=9333   # VS Code 系 fork 通常透传该开关
node "$CB" status --port 9333                           # 确认 target 出现
node "$CB" import --port 9333 --file ~/.cookie-bridge/gh.json
```

## 安全红线

- 只按用户点名的域名导出；`--all` 前必须和用户确认。
- cookie 值绝不打印到终端、绝不写入日志、绝不上传；比较时用哈希指纹。
- `~/.cookie-bridge/` 与一切 cookies-*.json 不得进入 git 仓库。
- Keychain/系统弹窗即用户授权机制，不得引导绕过。
- 注入的是会话凭据：目标工具的 agent 若执行敏感站点操作（支付、删库、发帖），仍需用户明确同意。

## 已知边界

- `__Host-` 前缀 cookie 走 url 形式注入；`__Secure-`/SameSite 约束导致的少量失败会在 import 结果中计数说明。
- 会话 cookie（无 expires）默认不导出（重启即失效，导出意义有限）。
- Chrome 136+ 禁止对默认 user-data-dir 开调试口，因此共享 profile 必须是独立目录——`launch` 已内置此约束。
