# DSH Skill 管理与多 Provider 调研

> Issue: qdriven/innate-apps#3 延伸问题
> 问题：系统里加入"管理 SKILL"部分——eval skill、安装 skill、同步 skill——是否已有这样的 plugin？能否接入多 provider？
> 结论日期：2026-11

## 一句话结论

**skill 的"发现/加载/多来源合并"已经是 DSH 的核心能力**（`ctx.skills` 注册表 + provider 插件机制），**多 provider 也同样是 LLM 层的内置架构**（adapter 注册）。但你要的"**eval / 安装 / 同步**"这一层——即把 skill 当作可安装包来治理（版本、来源、评测、分发）——**官方目前没有**，最接近的是 plugin 生态里的 `dsh-plugin-market`（装的是 plugin/bundle，不是 skill），以及 skill 生态里"内置内容包"模式（`dsh-skill-office`、`dsh-skill-badge`）。需要自建一个薄层。

## 1. 已存在的官方能力

### 1.1 skill 注册表：`@deepseek-ai/dsh-skill`（核心）

所有 skill 来源（provider）向 `ctx.skills` 汇聚，消费者拿到**一个合并目录**：

- `ctx.skills.registerProvider(fn)` — 注册一个 provider（`list()` 发现 + `get()` 按需加载正文），返回 disposer；`runtime` 是保留名
- `ctx.skills.register(skill)` — 插件直接注册内存 skill（带默认调用策略，标 `runtime` provider）
- 合并规则：跨 layer 按 **project > runtime > user** 排名，同名冲突可预测；provider 失败只跳过并保留 last-good 目录（容错）
- 每条 skill 带调用策略四象限：`modelInvocable` / `userInvocable`（模型可见、人可见可独立开关）

**这就是"多来源 skill"的官方答案**：一个 provider 就是一个来源，注册即接入。

### 1.2 官方 provider 实现范式

| 包 | 角色 | 对"管理 skill"的启示 |
| --- | --- | --- |
| `dsh-skill-filesystem` | 本地目录 provider：扫描 project（`.dsh/skills`、`.agents/skills`）、custom dirs、user（`~/.dsh/skills`、`~/.agents/skills`）五级 root，解析 `SKILL.md`，**带 watch 热更新**（chokidar） | "同步本地 skill"事实上已存在（watch 即同步）；customSkillDirs 就是"额外安装位置" |
| `dsh-skill-office` | **内置内容包**：Word/PPT/Excel 工作流 skill，以 plugin 形式分发 | "安装 skill = 安装一个 plugin"的官方示范 |
| `dsh-skill-badge` | 同上（badge skill provider） | 同上 |
| `dsh-tool-skill` | 模型侧消费：`skill` 工具 + 目录热刷新（digest 变化即重发 `<available_skills>`） | 消费端无需自建 |

### 1.3 安装基础设施：plugin-manager + plugin-market

- `dsh plugin --profile <name> add <pkg>` / Web **Plugins** 页：安装/开关/卸载 bundle（走 pnpm，支持 npm/git/本地路径/registry 镜像探测）
- `@deepseek-ai/dsh-plugin-market`（**默认不装**，experimental bundle）：配置若干**市场索引 URL** → Discover 页 + `plugin_market` agent 工具可搜索/查兼容性/给出安装参数；索引格式由 `dsh-plugin-market-index` 校验
- 注意：**market 装的是 plugin，不是单独的 skill**。但 skill 内容包（office/badge 模式）本来就可以是 plugin，所以"skill 市场"可以搭在这条轨道上

### 1.4 多 provider（LLM）：已内置

`ctx.llm` 是 provider 中立的 LLM 服务：

- `registerAdapter(providers, adapter)` 注册路由；`registerConfigurableProviders` 声明"配置激活"的路由；`listModels` 动态发现模型
- 官方双 adapter：`dsh-llm-deepseek`（官方 API 直连）与 `dsh-llm-pi-ai`（经 `@earendil-works/pi-ai` 统一层接**任意 OpenAI 兼容 provider**）
- 实证：本机 `~/.dsh/settings.yaml` 的 `llm-pi-ai.providers` 已同时挂着 MiniMax、Volcengine deepseek 系等多个 provider/模型
- dsh-superagent 侧：`RoleModelSchema { provider, model, reasoningEffort? }`，eval/worker 两角色可各配模型（面板 Settings → Eval/Execution），`GET models` API 列全部

**结论：多 provider 开箱即用，无需任何开发。**

## 2. 缺口：eval / 安装 / 同步 skill 的治理层

| 你要的 | 现状 | 缺口 |
| --- | --- | --- |
| **发现/合并/加载** | ✅ `ctx.skills` + providers | 无 |
| **本地同步**（文件变化即生效） | ✅ filesystem provider 的 watch | 无 |
| **安装 skill** | ⚠️ 只有"安装含 skill 的 plugin"（office/badge 模式）或手动放目录 | 没有"单 skill 粒度"的安装命令/市场条目 |
| **同步远程 skill 集** | ❌ 无官方远程 skill provider | 需自写 provider（GitHub repo / registry / market index 均可做源） |
| **eval skill**（评测 skill 好坏） | ❌ 无 | dsh-superagent 有 Eval/规则/observe 模式的完整先例可借鉴，但没有针对 skill 的评测机制 |

## 3. 建议落地方案（dsh-innate-agent 生态内）

### 方案一：远程同步 provider（最小可用，推荐第一步）

写一个 `dsh-innate-skill-sync` 插件：

1. 实现 `SkillProvider`（`list`/`get`，官方接口就这两个方法，几十行）
2. 源格式沿用 `dsh-plugin-market-index`（JSON 索引 + 每条 install 参数），源可以是：GitHub 仓库 raw、任意静态 JSON URL
3. 配置 `sources: [url...]` + 定时/手动刷新（`SkillProviderControl.invalidate()` 热通知）
4. "安装"= 缓存到 `~/.dsh/skills/<name>/`（落入 filesystem provider 的 user root，天然获得 watch + 持久化）——**安装后即使拔掉 sync provider，skill 仍在**

### 方案二：skill eval（借鉴 superagent 自身的 Eval 架构）

superagent 的 observe→auto 渐进正是"先评测再启用"的范式，套到 skill 上：

1. 每个 skill 带**准入规则**（何时允许模型自动加载，类似 admission table）
2. 新 skill 先进 `observe` 模式：记录"would have used"，不实际注入
3. 人工审阅 trace（我们已有 `cli/trace.mjs`！加一类 `skill.used` 事件即可）
4. 靠谱后切 `auto`
5. 评测数据源：skill 加载后的任务成败（worker report 的 ready/dropped）、token 成本（session usage 事件里已有）

### 方案三：接入 dsh-plugin-market 轨道

如果希望 skill 走正式分发：把 skill 内容包发布为 plugin（office/badge 模式），自建一个 market index 文件即可获得 Discover 页搜索 + 安装参数。适合成熟后的对外分发，不适合实验期。

## 4. 与当前实验的衔接

dsh-innate-agent 已具备的对接点：

- worker prompt 的 skill 注入走 `Prompts.skills()`（`skill/github` 等内置 + team skills）——自建 provider 注册的 skill 会自动进入 Session 的 skill scope
- trace 已记录 `worker.tool`（含 `skill` 工具调用）→ skill 使用情况天然可观测
- 多 provider 模型选择：面板 Settings → Eval/Execution 或 `PUT settings/eval` 直接配

## 附：关键包速查

| 包 | 一句话 |
| --- | --- |
| `@deepseek-ai/dsh-skill` | skill 注册表（ctx.skills），多 provider 合并 |
| `@deepseek-ai/dsh-skill-filesystem` | 本地目录 provider，五级 root + watch |
| `@deepseek-ai/dsh-tool-skill` | 模型侧 skill 工具 + 目录热刷新 |
| `@deepseek-ai/dsh-skill-office` / `-badge` | 内置 skill 内容包（plugin 分发范式） |
| `@deepseek-ai/dsh-plugin-market`(+`-index`) | plugin 市场索引读取（Discover 页），默认不装 |
| `@deepseek-ai/dsh-llm(-deepseek/-pi-ai)` | 多 provider LLM 层；pi-ai 接任意 OpenAI 兼容端点 |
