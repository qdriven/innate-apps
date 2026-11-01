# dsh-superagent-prototype 使用调研报告

> Issue: [qdriven/innate-apps#3](https://github.com/qdriven/innate-apps/issues/3)
> 调研对象: [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)（本地 clone 于 `dsh-superagent-prototype/`，已加入 .gitignore）
> 日期: 2026-11

## 1. 项目是什么

dsh-superagent 是 DeepSeek Harness（DSH）团队公开的**研究原型**（非官方产品、非生产就绪）：
一个面向**单个 GitHub 仓库**的主动式编码智能体（proactive coding agent），以 DSH bundle 形式打包。

它监听 GitHub（可选飞书），当**被允许的人**向智能体请求工作时：

1. 开一个工单（Ticket）
2. 在自己的 DSH Session 和目录里处理
3. 回到原对话交付结果（通常是 Pull Request）
4. Web 面板展示哪些事需要人

核心哲学（docs/000-philosophy.md）：**占用尽可能少的人类注意力，交付尽可能多的价值**。
只在被点名/被规则允许时行动；只在有结果、需要决策或无法完成时说话。

配套文章：*Exploring Super-agent Design: Towards a More Autonomous Agent System*（原型与文章描述不完全一致，部分设计未实现）。

## 2. 核心概念与工作流（docs/001-domain.md）

```
Source(来源) → Trigger(触发) → Thread(线程)
   ├─ Thread 订阅扇出 → 已有 Ticket 的 Executor（免评估续上下文）
   └─ Eval(评估: gate + assessment) → accept 带 Mandate(授权)
        → Ticket(工单) → Assignment(派工) → Executor(DSH Session + 独立目录)
        → 结果经 Channel(渠道) 回到 Source 原对话
```

| 概念 | 说明 |
| --- | --- |
| Source | 事件流：GitHub / 飞书两种实现（kind + instance 配置） |
| Trigger | 不可变事件，幂等与审计的单位（重复接受只建一个 Ticket） |
| Thread | 按时间排序的 Trigger 序列；同一时刻至多一个 Eval |
| Eval | 两层判定：gate（确定性：谁可以发起工作）+ assessment（模型研判） |
| Mandate | 接受所授予的：策略版本、范围、强度（explicit/inferred） |
| Ticket | 被授权的工作单元；open → ended，人的消息可复活 |
| Assignment | Ticket 与 Executor 实例的绑定（pending → running → ended） |
| Subscription | Ticket↔Thread 多对多；后续讨论无需再 @ 智能体即可到达 |

**Executor 在领域之外**：每个 Ticket 一个 `worker-<ticketId>` DSH Session + 一个目录（prepare command 通常用 `git worktree` 建检出）。主 Session（orchestrator）只做路由，不实现。

## 3. 与 DSH 的结合方式（回答"如何和 dsh 结合"）

原型本身就是 **DSH bundle**（package.json 里 `dsh.bundle.patch: ./cordis.patch.yml`），结合点是四个：

1. **DSH profile**：专用 `superagent` profile（从 Web 模板复制），独立于操作者日常 profile，独立端口（默认 3082）、独立 state 目录（`~/.dsh/state/superagent`）。
2. **Cordis 插件体系**：bundle 注册 `dsh-superagent`（主体）、`dsh-superagent-github`、`dsh-superagent-feishu`（默认 disabled）四个插件；通过 `ctx.orchestrator`（SourceHost 服务接口）交互。
3. **DSH Agent Session API**：主 Session 用 `dsh-superagent-router` preset、worker 用 `dsh-superagent-worker` preset（均在 cordis.patch.yml 定义；前台命令 5 秒转后台、限定工具集）；worker 子代理用 DSH `standard` preset。
4. **DSH 子进程服务**：setup 检查、prepare command、CLI 调用都走 DSH subprocess runtime（会剥离含 KEY/PASSWORD/SECRET/TOKEN 的环境变量）。

版本要求：`engines.dsh: ^0.2.1-alpha.2`；本机已装 `dsh 0.2.1-rc.5`（满足）。

### 与操作者现有环境的关系

- 凭据隔离：state 目录下写 `worker-bin/`（gh/lark-cli shim + blocked 命令拦截）和 `worker-gitconfig`（替换全局 git 配置，github.com 凭据指向智能体 CLI，SSH 地址改写 HTTPS）。
- 服务化：`scripts/dsh-superagent`（Python）以 tmux 管理 `dsh --profile superagent` 生命周期，`status/start/stop/restart` 四级退出码（0 正常 / 1 可重启 / 2 组件错 / 3 待配置），配合每小时巡检实现自愈。

## 4. 构建步骤（GitHub 场景，官方路径）

前置：Node 22.19+/24+、pnpm、git 2.32+、tmux、Python 3.8+、gh 2.48+、DSH + 模型 provider。

官方推荐把 SETUP.md 交给编码智能体执行（一次一问、先收集后执行），人工步骤摘要：

1. **建智能体 GitHub 账号**（不能用 GitHub App，因为要读账号 notifications），授予仓库写权限。
2. **gh 包装脚本**（凭据隔离的关键）：
   ```sh
   mkdir -p ~/.local/bin
   cat > ~/.local/bin/gh-agent <<'EOF'
   #!/bin/sh
   GH_CONFIG_DIR="$HOME/.config/gh-agent" exec gh "$@"
   EOF
   chmod +x ~/.local/bin/gh-agent && gh-agent auth login
   ```
3. **安装**：
   ```sh
   npm install -g @deepseek-ai/dsh@0.2.1-rc.3   # 满足 engines.dsh 即可
   git clone <repo> dsh-superagent && cd dsh-superagent
   pnpm install && pnpm build
   dsh superagent --from-default-profile web --dump-config > /dev/null
   dsh plugin --profile superagent add "link:$PWD"
   ```
4. **机器配置**：`examples/profile.cordis.patch.yml` → `~/.dsh/profiles/superagent/cordis.patch.yml`，填 `stateDir` 绝对路径（面板端口 3082）。
5. **启动**：`scripts/dsh-superagent start` → exit 3 表示等待配置，打开面板。
6. **面板配置**（或 Management API，见 §7）：
   - Sources：仓库 `owner/name` + 智能体 CLI 绝对路径
   - Policy：allowed 名单（没名单就没有请求能变 Ticket）
   - Execution：目录根 + prepare command（worktree 模板）：
     ```sh
     git -C /home/me/src/widgets fetch --no-tags "https://github.com/$DSH_SUPERAGENT_GITHUB_REPOSITORY.git" "${DSH_SUPERAGENT_GITHUB_PR_HEAD:-HEAD}:refs/dsh-superagent/$DSH_SUPERAGENT_TICKET" &&
     git -C /home/me/src/widgets worktree add -b "agent/$DSH_SUPERAGENT_NAME" "$DSH_SUPERAGENT_DIR" "refs/dsh-superagent/$DSH_SUPERAGENT_TICKET"
     ```
   - Prompts：team sections（GitHub 披露行、commit 作者、auto-merge 条件）
7. **验证**：allowed 账号在仓库 Issue 里评论 `@<agent-login> 修复 xxx`，一分钟内 Overview 出现 Ticket。
8. **（推荐）每小时巡检**：在日常 profile 里建定时任务跑 `status`/`--respect-stop restart`（prompt 模板见 docs/006-deployment.md Hourly check 节）。

本机注意：当前缺 `tmux`（brew 安装即可），其余依赖均满足。

## 5. Issue 驱动的四种玩法

原型对这些场景的支持是**策略（Policy）+ 提示词**层面的，不是硬编码：

| 场景 | 机制 | 关键配置 |
| --- | --- | --- |
| 发起请求，修复 | allowed 名单里的人 @ 智能体 → explicit 请求 → accept → worker 修 → PR → 原对话回链 | Policy allowed + worker 流程（prompts/work.md） |
| 发现问题自建 issue | worker 在处理中发现的关联问题可开新 Issue（skill 里 `source_url` 引用原消息），但**新 Issue 不会自动变成新工单**，需要人 @ 或规则介入 | dsh-superagent-github skill；observe 开关 |
| 发现 issue 直接修复 | 主动模式：observeIssues 等接收开关 + 准入表（admission）+ 评估规则（rules）+ accept mode `observe`→`auto` | 见下 |
| issue 怎么写 | 原型**没有 issue 模板要求**：dispatch prompt 明确"不要扩写请求的范围/计划/验收标准，worker 从原始来源推导需求"；写清意图和上下文即可，越具体评估越准 | prompts/dispatch.md |

**主动接单的渐进路径**（官方推荐姿势）：

1. accept mode 先 `observe`：推断候选只记录"would accept"，不实际接
2. 审阅面板里的 Decision 记录，确认判断靠谱
3. 切 `auto`：正面评估才接受
4. 规则（rules）描述"哪类主动工作"：如 dependabot[bot] 的依赖 PR、CI 失败修复等；Mandate 记录命中规则，worker 权限被限制在规则范围内（prompts/work.md 对 inferred 强度有严格收权）

GitHub 的准入表行：新 Issue / 新 PR / 评论 / 默认分支 CI，每行三个格子（名单内未@ / 名单外@ / 名单外未@）可设 explicit / inferred / ignore。bot 名单（如 dependabot[bot]）的评论只能成为 inferred 候选，永远不能 explicit 或停止工单。

## 6. 飞书场景构建

飞书是**一等公民 Source**（src/sources/，与 github 同级），但默认 disabled：

1. **建自建应用**（飞书开放平台）：启用机器人能力；权限：接收消息事件、读发群消息、读群成员；发布版本。
2. **lark-cli 配置**（必须 strict mode bot，拒绝用户身份——host 会检查）：
   ```sh
   LARKSUITE_CLI_CONFIG_DIR="$HOME/.lark-cli-dsh-superagent" lark-cli config init --app-id <cli_…> --app-secret-stdin
   LARKSUITE_CLI_CONFIG_DIR="$HOME/.lark-cli-dsh-superagent" lark-cli config strict-mode bot --global
   # 包装脚本 lark-bot，同 gh-agent 模式
   ```
3. **启用插件**：profile 的 cordis.patch.yml 里 `dsh-superagent-feishu` 的 `disabled: false`，重启。
4. **面板配置**：bot CLI、接收的群（每群可选"仅 @"或"全部消息"）、是否接收私聊、其他群策略。
5. **Policy**：飞书 allowed 名单（open_id），可设**同步群**（启动/手动同步时名单=群成员，自动增删）。
6. **使用**：群里 @ 机器人 或私聊；worker 经 lark-cli 读线程/合并转发/文档附件（dsh-superagent-feishu skill）。

飞书特定细节：事件消费 + 历史回补 + 订阅话题轮询（feishu/feishu-loops）；回复带幂等 key；IM 起源的工单结果必须回 IM 原线程（communication.md：不许让用户去 GitHub 找结果）。

## 7. 本地 GitLab / 自建项目场景

**结论先行：官方不支持 GitLab**——文档明说"GitHub Enterprise Server is not supported"，代码里对 github.com 域名、gh CLI 子命令、notifications API 有大量硬依赖（src/deployment.ts 校验、github-trigger.ts URL 正则、environment.ts 的 credential helper 只配 github.com）。仓库全局搜索 "gitlab" 零命中。

要接本地 GitLab，本质是**按 docs/008-cookbook.md 新写一个 Source kind**（官方给的扩展路径，示例是虚构的 `webhook` 队列）：

1. 映射领域概念：Trigger=一条 note/issue/MR 事件、Thread=一个 issue/MR、actor=用户名、Channel 地址=回复目标
2. 实现 `SourceKind` 接口：`schema/fields`（配置表单）、`scope`（收什么）、`channel.send`（幂等回复）、`threadContext`（评估上下文）、`policy`（allowed + 准入行）、`environment`（执行变量）、轮询循环（游标存 `ctx.state`）
3. 关键差异：glab CLI 与 gh 子命令不同（notifications、checks 等 API 形状不同）需要适配；PR 绑定（`bindThread`/`threadClosed`）要对接 MR 事件；`gh` shim 与 git credential 要改成 GitLab host
4. 注册 tsdown 构建入口 + package.json exports + cordis.patch.yml insert（disabled 起步）
5. 按 tests/sources.spec.ts 模式写 spec（tests/docs.spec.ts 会检查文档表格同步）

工作量评估：这是**中等偏大的二次开发**（参照 feishu source 约 6 个模块 + spec），核心难点在触发器映射的稳定性与 MR/CI 事件覆盖，而非框架接入——框架接入本身是声明式的。

**折中方案（不写代码）**：
- 本地 git 仓库（无 GitHub/GitLab）：把"Source"降级为**飞书/本地文件**入口——请求从飞书群来，prepare command 用本地 `git worktree` 从本地路径检出（environment 变量仍可用）。GitHub Source 仍是必配项（当前实现里 deployment 解析强制要求 GitHub 仓库可推送），所以纯本地需改造 `resolveDeployment`，或退一步：建一个私有 GitHub 仓库做镜像。
- 本地 GitLab + 已有飞书：飞书做请求入口（§6），GitLab 只是被 prepare command 检出的 git remote（CI/评审不走 superagent）。这是**成本最低的混合用法**，损失的是 GitHub 侧的 PR 绑定与 review 流自动化。

## 8. Management API（自动化配置的关键）

面板背后的本地 HTTP API，SETUP.md 的智能体就靠它写配置。便于脚本化/复现部署：

```sh
api=http://127.0.0.1:3082/orchestrator/api
# 带 x-orchestrator-request: 1 头，Host 必须 127.0.0.1/localhost（防 CSRF）
GET  state | settings | sources | prompts
PUT  settings/source:github  {"value": {...}, "revision": n}   # revision 乐观锁，409=过期
PUT  settings/policy | settings/eval | settings/executor
POST executor/pause | setup/check | policy-sync/<id>
POST tickets/<id>/retry | tickets/<id>/stop
```

保存仓库/CLI 会先跑账号检查，成功后 `restarting: true`，需等 `scripts/dsh-superagent status` 不再 exit 1。

## 9. 风险与注意

- 明确的 research code：有 bug、风格不一致，升级靠 `git pull && pnpm build && restart`，数据库被新版本迁移后旧版本打不开（先备份 `orchestrator.sqlite`）
- 权限模型是**默认而非安全边界**：worker 以操作者 OS 用户跑 `danger-full-access`，能按路径执行程序、读 home；要隔离请用专用 OS 账号
- 注意力成本的设计贯穿始终：名单从短开始、主动模式从 observe 开始、噪声大时收紧提示词而不是解释噪声
- DSH 版本锁 `^0.2.1-alpha.2`（当前 latest 0.2.1-rc.5 兼容；0.2.2-alpha.2 未验证）

## 10. 落地建议（针对 innate-apps）

1. **第一步（零改造）**：选一个低风险仓库（如 innate-fe-examples）+ 专用 agent 账号，按 §4 走官方 SETUP.md 流程，accept mode 保持 observe 跑一周，审阅 Decision 质量。
2. **第二步**：开飞书 Source（§6），把请求入口挪到日常协作群，验证 IM 交付回路。
3. **第三步（可选）**：如需脱离 GitHub，评估 cookbook 路线自写 GitLab Source，或维持"飞书入口 + 私有 GitHub 镜像"的混合方案。
4. 巡检与备份纳入日常：hourly check prompt + `orchestrator.sqlite` 备份。

## 附：本地分析材料

- 上游 clone：`./dsh-superagent-prototype/`（gitignore 已排除，不随本仓库提交）
- 重点阅读顺序：docs/000 → 001 → 002 → 003 → 006 → 008；prompts/team/*（可定制的团队策略文本）；src/sources/github.ts（Source 实现范式）
