# devops-skill 安装指南（Use Cases）

`devops-skill` 是本目录（`factory/skills/`）下的一个 skill 集合，共 8 个 skill：

| Skill | 说明 |
| --- | --- |
| `docmd` | 搭建与构建双语 Diátaxis 文档站 |
| `gh-create-release` | 用 gh CLI 创建 GitHub Release |
| `git-pr` | GitHub PR 工作流（推送分支、建/更 PR、合并、关联 Issue） |
| `git-workflow` | 基于 github-cli 的 GitHub Issue 工作流 |
| `git-worktree` | 用 git worktree 做隔离的并行开发 |
| `github-cli` | gh 命令操作助手（源目录名为 `github-cli-skill`，安装名取 SKILL.md 的 `name`） |
| `local-workflow` | 本地任务工作流 |
| `scanning-for-secrets` | 扫描仓库中的敏感信息 |

以下命令在 hub 根目录（`innate-spark/`）执行，`SPARK` 指向 CLI：

```bash
SPARK="bun tools/innate-spark-cli/packages/skill-cli/src/index.ts"
```

构建过二进制的话也可以直接用 `tools/innate-spark-cli/dist/skill-spark` 替代 `$SPARK`。

---

## Use Case 1：全局安装全部 skill

**场景**：想让所有 agent（Claude Code、Codex、Gemini、Trae……）在任意目录下都能用这套 devops skill。

```bash
$SPARK add factory/skills/devops-skill -g
```

**行为**：

- 以**真实拷贝**方式（非符号链接）写入每个检测到的 agent 的全局 skills 目录（如 `~/.claude/skills/`、`~/.codex/skills/`），已存在的同名条目会被覆盖；
- 安装记录写入 `~/.skill-spark/skills.lock`，之后 `list` 可见；
- 脚本化执行加 `-f` 跳过确认；只想装到个别 agent 加 `-a --agent <names>`。

## Use Case 2：安装到当前项目

**场景**：只在某个项目里启用这套 skill，不污染全局。

```bash
cd <你的项目根目录>
$SPARK add /Users/patrick/workspace/variableway/innate-spark/factory/skills/devops-skill
```

**行为**：

- 写入项目内的 `.agents/skills/`、`.claude/skills/` 等目录，安装记录写入 `./skills.lock`；
- 提交 `skills.lock` 后，团队成员在同样位置执行同样命令即可复现。

## Use Case 3：列出 devops-skill 里的所有 skill

**场景**：安装前先看看源里有什么。

`directory` 源扫描**当前目录往下 2 层**（`--dir` 指定起点目录，`--depth` 指定层数）：

```bash
cd factory/skills
$SPARK search git --sources directory            # 当前目录下 2 层，按关键词过滤
$SPARK search git --sources directory --depth 5  # 扫得更深（含嵌套集合）

# 或者从任何地方用 --dir 指向集合目录：
$SPARK search git --sources directory --dir /path/to/factory/skills
```

实测输出（在 `factory/skills/` 下，默认 2 层）：

```
◇  Found 8 skills (directory: 8)
    git-pr            GitHub Pull Request 工作流 Skill：推送分支、创建/更新 PR ...
    git-workflow     基于 github-cli-skill 的 GitHub Issue 工作流 Skill。...
    git-worktree     Use git worktree for isolated parallel development ...
    github-cli       GitHub CLI operations helper. ...
    ...
```

> 默认 2 层正好覆盖"集合目录 → skill 子目录"这一层结构（`devops-skill/git-pr`）。sdlc-skills 里嵌套更深的 skill 需要 `--depth 4` 以上才会出现。确认某条属于 devops-skill，可对照上表或 `ls factory/skills/devops-skill/`。

另一种方式是校验报告（顺带检查每个 skill 的规范性）：

```bash
$SPARK validate factory/skills/devops-skill --all
```

## Use Case 4：按选择安装（只装部分 skill）

**场景**：只需要其中一两个 skill，比如只要 `git-pr`。

`add` 不支持 `--skill` 过滤，但**单个 skill 的子目录本身就是一个合法源**，直接指向它：

```bash
$SPARK add factory/skills/devops-skill/git-pr          # 项目作用域，只装 git-pr
$SPARK add factory/skills/devops-skill/git-pr -g       # 全局作用域，只装 git-pr
```

实测：`Found 1 skill`，`skills.lock` 只记录 `skill:git-pr`。多个 skill 就多执行几次，或用 `-a --agent` 控制 agent 范围。

### 交互式多选安装（TUI）

也可以用交互界面：列出目录里的 skill → 空格/Tab 勾选 → 选择安装范围（Project / Global）→ 安装：

```bash
cd factory/skills
skill-spark search --sources directory -i          # 当前目录下 2 层

# 从任何地方指向集合目录：
skill-spark search --sources directory --dir . -i

# 只浏览 devops-skill 这一个集合：
skill-spark search --sources directory --dir devops-skill -i
```

界面流程：

```
◆  Choose skills to install        ← ↑/↓ 移动，空格/Tab 勾选，Enter 确认
◆  Install scope                   ← Project（./skills.lock）或 Global（~/.skill-spark/skills.lock）
●  Installing 1/1: skills/devops-skill/git-pr
└  Installed 1 skill.
```

按键说明：进入列表后先用**方向键**聚焦选项，再按**空格**（或 Tab）勾选；搜索框里输入关键词可过滤列表。`local` 是 `directory` 的历史别名，仍可用。

> **注意（skill 间引用）**：这套 skill 的 SKILL.md 里有跨目录的相对引用（如 `git-pr` 引用 `../git-workflow`、`../github-cli-skill`），用 `$SPARK validate factory/skills/devops-skill --all` 可以看到这些 `reference-outside-skill` 警告。只安装单个 skill 时这些引用会失效，互相关联的 skill（git-pr / git-workflow / git-worktree / github-cli / local-workflow）建议一起安装。

**现状说明（交互式多选）**：CLI 的交互多选安装（`$SPARK search` 不带参数，出现 "Choose skills to install" 多选界面）目前只浏览**远程 skill 目录**，不支持本地集合目录；且 `search -i` 的 `-i` 标志当前实际未生效（进入交互的唯一方式是不带查询参数）。对本地 devops-skill，"列出 → 挑选 → 安装"请按 Use Case 3 + Use Case 4 组合操作。

## Use Case 5：查看与移除

```bash
$SPARK list                    # 列出已安装 skill 及各 agent 落位
$SPARK remove git-pr -g        # 从全局移除单个 skill
$SPARK remove -p               # 清空当前项目作用域
$SPARK doctor                  # 诊断环境与 agent 目录
```

---

## 能力现状小结

| 需求 | 支持 | 方式 |
| --- | --- | --- |
| 列出本地集合的全部 skill | ✅ | `search <关键词> --sources directory [--dir <路径>] [--depth <n>]`（默认当前目录下 2 层） |
| 全局 / 项目安装整集合 | ✅ | `add <源> -g` / `add <源>` |
| 只安装指定 skill | ✅（变通） | `add <源>/<skill子目录>` |
| TUI 多选 + 选范围后安装 | ✅ | `search --sources directory [-i]`（空格勾选后选 Project/Global） |
