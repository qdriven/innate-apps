# browser-skills

浏览器与登录态相关的 agent skill 集合。

## cookie-bridge

给所有带内置浏览器的 agent 工具（zcode / trae / codebuddy / kimi / opencode / workbuddy / codex …）共享 Chrome 登录态。

- 形态：**CLI 本体（`cookie-bridge/scripts/cookie-bridge.mjs`，零依赖 Node ≥ 22）+ skill 包装（SKILL.md，教 agent 何时/how 调用）**
- 原理：共享自动化 Chrome profile（非默认 user-data-dir + CDP 调试口）→ 按域名白名单明文导出 → 注入目标工具的浏览器；Playwright 类工具可直接 `connectOverCDP` 接管，免导入
- 不解密 cookie 库：Windows app-bound encryption 与 Chrome 136+ 的 CDP 限制均不影响
- 详见 [cookie-bridge/SKILL.md](cookie-bridge/SKILL.md)

```bash
CB=cookie-bridge/scripts/cookie-bridge.mjs
node $CB launch --port 9222                # 1. 启动共享 Chrome，登录一次
node $CB export --port 9222 --domains github.com   # 2. 白名单导出
node $CB import --port 9333 --file ~/.cookie-bridge/cookies-*.json  # 3. 注入目标工具
```
