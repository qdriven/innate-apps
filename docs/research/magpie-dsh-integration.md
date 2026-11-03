# Magpie × DSH 深度调研与模块级结合方案

> 状态：调研报告（2026-11-03）
> 背景：[docs/research/dsh-plugin-ecosystem-top10.md](./dsh-plugin-ecosystem-top10.md) 七主题调研的延伸——针对「Magpie（模型路由层）× DSH（agent 平台层）如何拆开模块进行合成」的深度分析。
> 方法：双线并行深度调研——Magpie 侧克隆源码逐目录分析（/tmp/magpie-research）；DSH 侧以本机源码为准（全局安装包 `@deepseek-ai/dsh@0.2.1-rc.5` 全家桶、`~/innate/projects/dsh-desktop`、`~/innate/projects/dsh-agent-workbench`、`~/.dsh/` 配置，API key 已脱敏）。
> 结论日期：2026-11-03

---

## 0. 一句话结论

**Magpie 是「本地多协议 LLM 网关 + 账号池路由器」，DSH 是「Cordis 插件化 agent 平台」——两者在 LLM 出口层完美互补，且 Magpie 已把 DSH 当一等公民（2775 行 `dsh.go` 适配器），本机 `~/.dsh/settings.yaml` 已有 Magpie 注入的 provider 痕迹。** 结合不需要发明新东西：短期走「零开发直连」（路线 A，已验证可通），中期把 Magpie 作为 dsh-innate-agent 的统一 LLM sidecar（路线 B），模块合成上「DSH 管会话/skill/tool/插件，Magpie 管协议/路由/账号/对账」。

---

## 1. Magpie（yetone/magpie）深度解析

### 1.1 定位与基本盘

**本地多协议 LLM 网关 + 全量 agent 配置适配器**：在本机 `127.0.0.1:3425` 起一个会说 OpenAI Chat / OpenAI Responses / Anthropic Messages / Gemini（含 Ollama 兼容）四种语言的代理，把内置 72 个 AI coding agent 的模型配置统一改写到这个网关上，让「一份订阅/一把 Key」被所有 agent 共享。

- **28,389 ★ / MIT / Go**（主语言）+ Wails v3 beta（桌面壳），创建于 2026-09-23，最后推送 2026-11-02——6 周 28k 星，极活跃但 churn 大
- 主页 [usemagpie.ai](https://usemagpie.ai)；口号："Every agent's model. One place. Codex on DeepSeek, Claude Code on Kimi, from the menu bar."
- 不接受外部 PR（README L303），社区共建走 Discord 与 [magpie-community/plugins](https://github.com/magpie-community/plugins)

### 1.2 模块拆解（源码证据）

| 模块 | 技术栈 | 目录证据 | 职责 |
|---|---|---|---|
| 菜单栏 App | Go + Wails v3 beta | `internal/gui/`、`build/darwin/` | 托盘 + 单窗口 UI，页面走 `POST /api/*` JSON API |
| TUI | Go + bubbletea | `internal/tui/` | 终端版 agent×model 切换矩阵 |
| CLI（~50 子命令） | Go | `internal/cli/` | `magpie provider add`、`magpie dsh <model>`、`magpie quota`、`magpie serve`… |
| **网关（核心）** | Go 标准库 HTTP | `internal/gateway/gateway.go`（`DefaultAddr=127.0.0.1:3425`）+ `fallback.go`/`routing.go`/`affinity.go`/`rpm.go` | 四协议收发互译、failover、会话粘性（保 prompt cache）、限流 |
| 常驻 | systemd/launchd/Docker | `internal/daemon/`、`ghcr.io/yetone/magpie` | `magpie serve` 纯网关；`magpie web` 浏览器 UI（:3430） |
| 配置存储 | 扁平 JSON/YAML | `~/.config/magpie/`：`providers.json`(0600)、`profiles.json`、`routing/`、`usage.jsonl`… | 单文件单职责，天然适配备份/Docker 卷 |
| **agent 适配层** | Go，声明式 adapter | `internal/agent/agent.go` + `agents.go`（内置 **72 个**：claude/codex/gemini/opencode/**dsh**/zcode/kimi/qwen…）+ **`dsh.go`（2775 行）** | 改 agent 自己的配置文件（原子写、保留用户字段、断开精确还原） |
| provider/账号池 | Go + OAuth 刷新 | `internal/provider/`、`internal/claudebridge/`、`internal/codexrelay/` | 一份订阅=N 个 account：smart/order/rotate/usage/pace/weight/free/fast/drain 九种策略 + 429 自动换号 |
| 模型目录 | models.dev | `internal/catalog/` | `/v1/models` 带 reasoning levels/context window/pricing；`auto/<model>` 自动成组 |
| 插件系统 | npm（Bun + moejs） | `internal/plugin/`、`plugins/` | 三类：provider 插件、gateway middleware（`onRequest/onEvent/onResponse`）、`magpie.agent` 模块（声明式添加新 agent） |
| 用量/预算 | jsonl + sqlite | `internal/usage/`、`internal/budget/` | 每请求一行（谁答的、failover 链、缓存计费）、配额窗口图表 |
| 隐私脱敏 | 占位符 + PII guard | `internal/masking/`、`internal/redact/`、`internal/pii/` | 出机前把 secret 换 `{{API_KEY_xxx}}` 占位符，回包还原 |
| 同步/备份 | WebDAV/S3/GitHub | `internal/backup/`、`internal/davsync/` | 加密备份、多机同步 |

### 1.3 对外接口（与 DSH 结合的关键）

**本地网关** `http://127.0.0.1:3425`（`MAGPIE_ADDR` 可改）：

| 路径 | 协议 |
|---|---|
| `/v1/chat/completions` | OpenAI Chat（baseURL 填 `http://127.0.0.1:3425/v1`） |
| `/v1/responses` | OpenAI Responses（HTTP/SSE/WebSocket） |
| `/v1/messages`（+`/count_tokens`） | Anthropic Messages（baseURL 填根路径） |
| `/v1beta/...:generateContent` | Gemini |
| `/api/*`（version/tags/show/chat/generate） | Ollama 兼容 |
| `/mcp/magpie/hub` | MCP 聚合（Library 全部 MCP server 合一） |
| `/v1/magpie/route`、`/v1/magpie/quotas`、`/v1/magpie/usage`（GET 读 + **POST 上报自家调用**）、`/v1/magpie/limit` | **状态/遥测 API** |

鉴权约定：loopback 任意 key 放行，但**约定发 `Authorization: Bearer magpie-<your-app-id>`**——Usage 按该 app 名计数；跨机必须用 gateway key（`caller-keys.json`）+ CORS/IP allowlist。`GET /api/hello` 探测存活。

**扩展点三级**（`docs/integrating.md`）：① 零改动——任何 OpenAI/Anthropic 客户端指 baseURL 即可，模型列表拉 `/v1/models`；② 官方 adapter——`internal/agent/` 加一个文件（进主干，但不收 PR）；③ 插件——`magpie.agent` 模块，一个 JS 文件声明式注册新 agent：

```js
// 插件包内 *.agent.js（internal/agentplug/agentplug.go 头注释）
export const agent = {
  id: "aider", name: "Aider",
  config: "~/.aider.conf.yml",  // magpie 要编辑的文件
  model: "model",               // model 在文件里的 key 路径
}
export function connect({ gateway, model, models }) {
  return { "openai-api-base": gateway.v1, "openai-api-key": gateway.key }
}
```

---

## 2. DSH（DeepSeek Harness）深度解析（本地实测）

### 2.1 本地形态

官方仓库 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）。内核是 **Cordis 依赖注入插件框架**（`@deepseek-ai/cordis ~4.0.5`），everything-is-a-plugin。本机：

- 全局 `@deepseek-ai/dsh@0.2.1-rc.5`（内嵌 306 个 `@deepseek-ai/*` 包）
- `~/innate/projects/dsh-desktop`（`dsh-plugin-desktop@2.0.13`：Electron main 进程直接 boot Cordis Host，loopback 临时端口）
- `~/innate/projects/dsh-agent-workbench`（SDK 用法示范：spawn `dsh --profile sdk-minimal`，JSON-RPC over stdio）
- `~/.dsh/`：`settings.yaml`、`profiles/{superagent,web}`、`sessions/`（按 workspace slug 分目录）、`.credentials.yaml`

### 2.2 模块分层图

```text
┌─ 宿主层（同一 kernel 的不同 bundle 组合）
│  dsh web / tui / headless / rescue / desktop（Electron）/ SDK 子进程（JSON-RPC stdio）
├─ Profile/组合层（Cordis loader）
│  profile 的 dsh.profile.bundles 数组 + 每层 cordis.patch.yml（patch 替换目标行整段，后写胜出）
│  + volatile 字段热更新（loader/volatile-update）
├─ 内核服务层（ctx.* 注册表）
│  llm / skills / tools / sessions / agents / agentLoop / settings / credentials
│  fs/workspaceRegistry / webServer / pluginManager / pluginMarket / subagents / sandbox…
├─ Agent 运行层：dsh-agent-loop 组装 GenerateOptions → ctx.llm.stream()
│  事件 waterfall：'llm/stream'（每次模型调用可拦截，请求 deep-frozen 可短路不可改写）
└─ Adapter 层（provider 出口）：dsh-llm-deepseek（官方直连，Anthropic 协议）
   dsh-llm-pi-ai（pi-ai 统一层 → 任意 OpenAI 兼容/Anthropic/Bedrock/Mistral）→ fetch
```

### 2.3 LLM 子系统（结合的 DSH 侧接缝）

**adapter 注册**：`ctx.llm.registerAdapter(providers, adapter)`，handle 带 `replace(routes)` **原子换路由**；`registerConfigurableProviders` 声明配置激活路由；`registerModelDiscovery` 端点模型探测。settings 是 **volatile**——变更触发 `loader/volatile-update` → pi-ai `replace()` **热生效无需重启**。

**pi-ai providers schema**（`dsh-llm-pi-ai/lib/types/config.d.ts:53-188`，每路由独立 baseURL/api/models）：

```yaml
# ~/.dsh/settings.yaml（本机实测结构，key 已脱敏）
llm-pi-ai:
  providers:
    magpie:                        # 路由 key
      displayName: Magpie
      apiKeyEnv: MAGPIE_GATEWAY_KEY
      api: openai-completions      # 或 anthropic-messages / openai-responses / bedrock / mistral
      baseURL: http://127.0.0.1:3425/v1
      models:
        - id: auto/glm-5.3        # routing group 模型 id
          contextWindow: 1000000
          reasoningEfforts: { low: low, high: high, max: max }
```

**逐请求路由**：`GenerateOptions{provider, model, reasoningEffort?, purpose?}` 每次调用独立选 provider/model；superagent 的 `RoleModelSchema` 让 eval/worker 各配模型。

**DSH 没有的东西（正是 Magpie 补的）**：无跨 provider failover、无多 key 池、无主动健康巡检——`dsh-llm-retry` 只在同一路由内重试（指数退避默认 5 次）。路由决策完全落在请求发起方（loop/角色配置）或**外部网关**身上。

---

## 3. 已发生的打通事实（重要）

结合不是从零开始，三条现成证据：

1. **Magpie 内置 DSH 适配器**：`internal/agent/dsh.go`（2775 行）+ `desktopapp.go`（识别 `com.deepseek.dsh` / DeepSeek Harness.app），`docs/integrating.md` 官方 adapter 列表明写 dsh。它精确理解 DSH 的 profile 体系（`~/.dsh/profiles/<name>/cordis.patch.yml` patch 层、`.credentials.yaml` key store、`llm-pi-ai` 插件行），并**按模型原生协议拆三条路由注入**（magpie/magpie-responses/magpie-anthropic），保证 sealed reasoning / cache_control 不被协议翻译破坏。
2. **本机已有注入痕迹**：`~/.dsh/settings.yaml` 存在 `llm-pi-ai.providers.magpie`（openai-completions → :3425/v1，`auto/minimax-m3`、`auto/glm-5.3` 等 routing-group 模型）与 `magpie-anthropic`（anthropic-messages → :3425）两条路由；yaml 注释明言 "Disconnect in magpie or `magpie uninstall` undoes it"。`profiles/superagent/cordis.patch.yml:11` 也在 profile 层 patch 了同一 provider（**双通道**）。当前 `which magpie` 为空（CLI 已卸载，配置残留）。
3. **DSH 侧先例**：第三方 `ChaoYuZhang001/dsh-auto-router` 已示范用 `registerAdapter` 注册 synthetic provider 做逐请求委托路由——模块搬运转自建（路线 D）有现成范式。

---

## 4. 模块合成矩阵（核心）

> 原则：**DSH 管会话/agent 循环/skill/tool/插件生态，Magpie 管协议互译/路由/账号池/对账**。重叠域只保留一份，避免双重翻译。

| # | 功能域 | Magpie 模块（证据） | DSH 模块（证据） | 合成决策 | 主/辅 |
|---|---|---|---|---|---|
| 1 | LLM 协议适配 | `internal/gateway` 四协议互译（含 streaming/tool calls/reasoning/图传） | `dsh-llm-pi-ai`（pi-ai lazy api 三协议） | **协议互译归 Magpie**；DSH 的 pi-ai 保留为「OpenAI 兼容客户端」，按原生协议分三条路由（magpie 已如此注入），避免 sealed reasoning/cache_control 被二次翻译破坏 | Magpie 主 |
| 2 | 路由/failover/多 key | `internal/routes` 九种策略 + `provider.Fallback` 降级链 + 会话粘性 | `dsh-llm-retry`（仅同路由重试）+ `GenerateOptions.provider` 逐请求选路 | **全部委托 Magpie**：DSH 只面向 routing group 模型 id（`auto/<model>`），429/配额耗尽自动换号由网关处理 | Magpie 主 |
| 3 | 模型目录/发现 | `internal/catalog`（models.dev + `/v1/models` 含 pricing） | `discoverModels` 按需端点探测 | DSH 从 Magpie `/v1/models` 拉目录（magpie 注入的 models 列表已带 contextWindow/reasoningEfforts 元数据） | Magpie 主 |
| 4 | 账号/订阅池 | `internal/provider/account*` + claudebridge/codexrelay | 无 | 完全 Magpie（DSH 不碰凭据，key 只存 `.credentials.yaml` 的 `MAGPIE_GATEWAY_KEY`） | Magpie 独占 |
| 5 | 配置注入/还原 | agent adapter 的 **applied/stash/drift 三件套**（记录我方写入/保存原值/检测他方改动） | loader volatile 热更新（`replace()` 原子换路由） | **已打通**：Magpie 写 → DSH 秒级热生效；⚠️ 注意双通道（settings.yaml + profile patch）后写胜出的覆盖顺序 | 双方协作 |
| 6 | 模型切换 UI | 菜单栏/TUI/Web（:3430） | Web GUI Settings 页（Eval/Execution 角色配模型） | 桌面快速切模型用 Magpie 菜单栏；角色级深度配置留 DSH；两边模型列表同源（:3425）不冲突 | 各管一层 |
| 7 | 用量/预算/对账 | `usage.jsonl` + budget + `/v1/magpie/usage`（GET 读 + POST 回写） | session usage 事件 | **对账合一**：DSH 侧做一个薄 plugin 读 `/v1/magpie/usage` 进面板；DSH 自营（不经网关）的调用用 POST 回写同一本账 | Magpie 记账、DSH 消费 |
| 8 | 插件系统 | npm 插件（Bun middleware + moejs `magpie.agent`） | Cordis plugin（pnpm、profiles、market） | **两套并存不合并**；交叉点 = 写一个 DSH plugin 封装 Magpie CLI/API（路线 E） | 各自独立 |
| 9 | 会话/agent 循环 | 无 | `dsh-agent-loop` + superagent（eval/worker 角色） | 完全 DSH | DSH 独占 |
| 10 | Skill / Tool / MCP | Library 的 MCP 聚合 hub（`/mcp/magpie/hub`） | `ctx.skills` provider 注册表 + `ctx.tools` | Magpie 的 MCP hub 可作为 DSH `mcpResources` 的一个上游源（把网关聚合的 MCP server 当一个 mcp endpoint 挂进来） | DSH 主、Magpie 供源 |
| 11 | 隐私脱敏 | `internal/masking`/`redact`/`pii`（占位符 + CoreML） | 无 | 取 Magpie（网关侧全局生效，DSH 零成本获得） | Magpie 独占 |
| 12 | 桌面宿主 | Wails 菜单栏（beta） | Electron main 内嵌 Cordis Host（loopback 临时端口） | 各自独立进程；可选托盘互链（magpie 菜单栏里已有 DSH Desktop 行） | 各自独立 |

---

## 5. 结合路线（按投入从小到大）

### 路线 A：零开发直连（已验证可行，第一步）

DSH 作为 Magpie 的 client：装 Magpie → `magpie dsh connect`（其 DSH 适配器自动写入 settings/profile patch）→ DSH 的 llm-pi-ai 立即多出 magpie/magpie-anthropic 路由。本机历史配置证明此路已走通过（当前 CLI 已卸载，重装即恢复）。

- DSH 侧动作：`dsh` Settings 页把 eval/worker 角色的 provider 切到 `magpie`、model 用 `auto/<model>` routing group
- 获得：订阅池、failover、九种路由策略、用量统计，DSH 零代码
- 成本：装一个常驻网关（loopback）

### 路线 B：平台级 sidecar（dsh-innate-agent 推荐）

把 `magpie serve`（纯网关无窗口，可 daemon/systemd 化或 Docker）作为 dsh-innate-agent 所有子进程的**默认 LLM 出口**：

- superagent 的 eval/worker 角色模型全部配 `provider: magpie`；「eval 用便宜档、worker 用强档」表达为 Magpie routing group（如 `group/daily-coding`、`group/cheap-eval`），角色配置只引用组名
- workbench/desktop spawn 的每个 `dsh --profile` 子进程天然继承同一 `~/.dsh/settings.yaml` 路由——**一次配置，全 fleet 生效**
- 面板消费 `/v1/magpie/usage`、`/v1/magpie/quotas` 做用量/配额视图；`Bearer magpie-dsh-innate-<role>` 命名约定按角色计数
- 关键设计：**保持 loopback-only**，不开 LAN 共享；DSH 侧 DeepSeek 官方路由（`dsh-llm-deepseek`）保留为兜底直连，Magpie 挂掉时可手动切回

### 路线 C：反向注册（把 innate 子 agent 挂进 Magpie Agents 页）

用 `magpie.agent` 插件模块（一个 JS 文件）把 dsh-innate-agent 生态里的新 agent/子进程注册成 Magpie Agents 页一行，纳入统一模型管理。同时**借鉴 `dsh.go` 的 applied/stash/drift 三件套**——这套「安全改写第三方配置」的工程模式，对 dsh-innate-agent 自己管理外部工具配置（IDE、浏览器、CLI 的模型注入）同样适用。

### 路线 D：模块搬运转自建（不依赖常驻网关的场景）

若某些部署不想跑常驻网关：把 Magpie 的 failover/路由策略思想搬进一个 **DSH plugin**——`ctx.llm.registerAdapter(['auto'], adapter)` 注册 synthetic provider，`stream()` 内部按策略在多个真实路由间委托切换（`replace()` 支持原子换路由；`dsh-auto-router` 已示范此形态）。适合：服务器 headless、嵌入式、或 Magpie 版本 churn 敏感期。代价：账号池/订阅桥接（claudebridge）不搬，只搬路由层。

### 路线 E：DSH plugin 封装 Magpie（体验融合）

写一个 `dsh-innate-magpie` plugin：封装 `magpie` CLI（`quota refresh/wait`、`gateway-key`、`save/use` profile 快照）+ 遥测 API，在 DSH 面板暴露配额/切换操作；把 `/v1/magpie/usage` 汇总进 trace（与现有 `cli/trace.mjs` 的 session usage 事件对账）。这是把 Magpie 从「外部工具」变成「DSH 一等公民插件」的一步。

### 推荐组合

| 阶段 | 路线 | 交付物 |
|---|---|---|
| 立即（0 天） | A | 重装 magpie + `magpie dsh connect`，验证双路由生效 |
| 短期（1 周） | B | dsh-innate-agent 角色模型统一切 `auto/*` 组；配额/用量进面板 |
| 中期（2–4 周） | E | `dsh-innate-magpie` plugin（quota/usage/快照工具化） |
| 按需 | C | innate 子 agent 注册进 Magpie Agents 页 |
| 长期备选 | D | 无网关部署的自建 router plugin（Magpie churn 兜底） |

---

## 6. 落地验证步骤

```bash
# 1. 安装并起网关（任选其一）
brew install magpie && magpie serve        # 纯网关
# 或安装 App：https://usemagpie.ai （菜单栏常驻）

# 2. 探活 + 目录
curl http://127.0.0.1:3425/api/hello
curl -H "Authorization: Bearer magpie-dsh" http://127.0.0.1:3425/v1/models | jq '.[].id' | head

# 3. 接入 DSH（官方适配器写入 settings + profile patch）
magpie dsh connect          # 或在 App Agents 页选 DSH

# 4. 验证 DSH 侧热生效
grep -A3 'magpie' ~/.dsh/settings.yaml           # 应见 magpie / magpie-anthropic 路由
# DSH Web Settings → 模型列表应出现 auto/* 组

# 5. dsh-innate-agent 角色切换（superagent 面板或 PUT settings/eval）
#    provider: magpie, model: auto/<model>, reasoningEffort 按需

# 6. 对账
curl -H "Authorization: Bearer magpie-dsh" http://127.0.0.1:3425/v1/magpie/usage | jq
```

---

## 7. 风险与注意点

1. **版本 churn（最大工程风险）**：Magpie 6 周冲到 28k 星、日更级迭代，`dsh.go` 里满是针对 DSH 0.1.5/0.2 行为变化的兼容分支；DSH 自身也在 rc 阶段（0.2.1-rc.5）。**任何一侧 config 格式变化都可能破坏注入**——锁版本 + 接入冒烟测试（第 6 节步骤 4）应进 CI。
2. **双通道写入冲突**：Magpie 同时写 `settings.yaml` 与 `profiles/<name>/cordis.patch.yml`（本机 superagent 两条都有）。profile patch 层「后写胜出」会整段替换 llm-pi-ai config——若人工手改 settings 的 providers，profile patch 可能覆盖手改。约定：**magpie 管的路由 key 前缀 `magpie*` 不手工编辑**，自营路由用其他 key。
3. **账号风控（ToS 灰区）**：多账号池 + 跨 agent 共享订阅踩多数厂商 ToS 灰区；Magpie 文档明示 Anthropic 会把非 Claude Code 流量归为第三方（故用真 `claude` 二进制桥接）、Google 可能封 Antigravity 之外使用的账号。企业场景自评；个人场景建议小号 + 用量预算（budget 模块）兜底。
4. **安全面**：网关 loopback 任意 key 放行（靠 Origin/DNS-rebinding 防护网页滥用）；跨机共享必须显式 gateway key + IP allowlist。**dsh-innate-agent 采用保持 loopback-only**，`Bearer magpie-<role>` 命名约定仅用于审计计数而非鉴权。
5. **Magpie 不收 PR**：fork 自维护是常态；依赖它的注入格式等于依赖其发布节奏——路线 D（自建 router plugin）是长期兜底。
6. **前沿依赖**：Wails v3 beta、moejs alpha、Bun 运行时——桌面壳与插件运行时均非稳定版；纯网关（`magpie serve`）路径更稳，优先采用。
7. **遥测默认开启**：每日匿名 ping，`DO_NOT_TRACK=1` 或设置关闭。

---

## 附：数据来源

- **Magpie 源码**（克隆于 /tmp/magpie-research，2026-11-03）：[yetone/magpie](https://github.com/yetone/magpie)（README、`docs/integrating.md`、`docs/reference.md`、`docs/subsystems/*`、`internal/agent/dsh.go`、`internal/gateway/gateway.go`、`internal/provider/provider.go`、`internal/agentplug/agentplug.go`）
- **Magpie 评测**：[usemagpie.ai/docs](https://usemagpie.ai/docs/zh/start) · [知乎评测](https://zhuanlan.zhihu.com/p/2092649589782352613) · [ai-tldr.dev](https://ai-tldr.dev/tools/magpie) · [wardlu.com 运维实录（quota fallback 实测）](https://wardlu.com/en/blog/magpie-gateway-part-3) · [Substack 横评](https://pythonlibraries.substack.com/p/magpie-github-top-3-ai-coding-agent) · [Bito 路由器横评](https://stg.bito.ai/blog/best-ai-model-routers-for-coding-agents-in-2026) · [musistudio/claude-code-router](https://github.com/musistudio/claude-code-router)（同类对比：cc-router 是「配置文件写规则的转发器」，magpie 是「带 72 个 agent 适配器与订阅账号池的桌面操作系统」）
- **DSH 本地源码**（2026-11-03 实测）：全局 `@deepseek-ai/dsh@0.2.1-rc.5` 包族（`dsh-llm/lib/types/index.d.ts`、`dsh-llm-pi-ai/lib/{index.js,types/config.d.ts}`、`dsh-plugin-manager/`、`dsh-skill/`）、`~/innate/projects/dsh-desktop`、`~/innate/projects/dsh-agent-workbench`、`~/.dsh/settings.yaml`（脱敏）
- **DSH 公开资料**：[deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) · [deepseek.com/en/harness](https://www.deepseek.com/en/harness) · [The New Stack](https://thenewstack.io/deepseek-harness-open-source-plugins) · [HN 讨论](https://news.ycombinator.com/item?id=49285244)
- **本仓库关联**：[dsh-skill-management.md](./dsh-skill-management.md)（DSH skill/LLM 层能力盘点）· [dsh-plugin-ecosystem-top10.md](./dsh-plugin-ecosystem-top10.md)（多 Plugin/MCP 管理主题中 cc-router/magpie 生态位）
