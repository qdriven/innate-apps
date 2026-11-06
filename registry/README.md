# Innate Apps Registry

以 registry（数据文件）的方式记录聚合项目的元信息，不使用 git submodule。
`collections` 注册信息的数据源是 [apps.json](apps.json)，字段定义见 [schema.json](schema.json)。

## 数据源

- [`apps.json`](apps.json) — collections 注册信息（单一数据源）
- [`schema.json`](schema.json) — 字段定义

## 字段说明

| 字段 | 说明 |
|------|------|
| `name` | 目录名 / collection 名 |
| `repo` | `owner/repo`（必填，`owner/repo` 格式） |
| `url` | 仓库地址（URI 格式） |
| `local_path` | 相对于 innate-apps main 检出目录的相对路径；`null` 表示远程仓库存在但本地尚未检出 |
| `category` | `base`（基础框架）/ `app`（应用开发）/ `reference`（参考项目） |
| `status` | `maintained` / `archived` / `experimental` |
| `visibility` | `public` / `private`（以 GitHub 实际可见性为准） |
| `language` | 主要语言 |
| `description` | 一句话说明 |

## 收录标准

只有同时满足以下条件的项目才会进入 registry：

1. **非 fork** —— 上游他人的仓库不收录，直接引用上游地址即可。
2. **2026 年内有更新** —— 远程仓库在 2026 年有 push 活动的项目。
3. **远程仓库可访问** —— 已在 GitHub 移除或转为不可访问的仓库不再收录。

上游 fork 的项目（如 `deepseek-ai/deepseek-harness`、`TapXWorld/ChinaTextbook`、`stablyai/orca`）
按引用处理，不占用 registry 条目。

## 校验

字段与本地路径由脚本自动校验，改完 registry 请执行：

```bash
node scripts/validate-registry.mjs
```

校验内容：顶层与条目必填字段、`category`/`status`/`visibility` 枚举值、`repo` 格式、`url` 合法性、
`name`/`repo` 重复，以及每条 `local_path` 是否在磁盘上真实存在。加 `--verbose` 可打印逐条路径解析结果。

### CI 里的校验

push 与 PR 时由 [`.github/workflows/validate-registry.yml`](../../.github/workflows/validate-registry.yml)
自动执行，分两步：

| 步骤 | 命令 | 校验内容 |
|------|------|----------|
| 字段校验 | `node scripts/validate-registry.mjs --skip-paths` | 只查 schema 与格式，不依赖本地工作区 |
| 远程状态校验 | `node scripts/validate-registry.mjs --skip-paths --check-remote` | repo 是否存在、是否被改名、可见性、是否已归档、是否为 fork |

**`--skip-paths`** 跳过 `local_path` 的磁盘存在性校验。那项校验依赖本机的工作区布局
（见下文「工作区布局」），CI runner 上没有那些 checkout，不跳过会 21 条全部报「不存在」。

**`--check-remote`** 调用 GitHub API 核对每条 `repo` 的真实状态：

- 仓库已改名 → 报错，并给出 GitHub 上的新名字（API 会把旧路径重定向到新路径）
- `visibility` 与 registry 不一致 → 报错
- 仓库已归档但 `status` 仍是 `maintained` → 报错；是 fork → 报错
- 最后一次 push 不在当前年份 → 警告（收录标准第 2 条）
- 私有仓库在其他组织下时，令牌无权访问会返回 404；脚本先用探针（`github/gitignore`）
  确认当前凭据能否读到安装范围外的公开仓库：能读到，404 才判定为「仓库不存在」；
  读不到则降级为警告，不会误判成「不存在」

## 约定

1. 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
2. worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
3. registry 更新后同步刷新：本仓库 README、用户 profile 仓库 `qdriven/qdriven` 与 org profile 仓库 `variableway/.github`。
4. `visibility` 与 `status` 需与 GitHub 实际状态一致——仓库转为 private、删除或停止维护时必须同步更新。
5. **内容型目录入库，独立仓库型 checkout 忽略**：`skills/` 与 `references/` 下的目录默认忽略；
   只有手写内容（skill 目录、文档等）才纳入版本管理，并在 `.gitignore` 白名单里显式列出。
   独立 git 仓库的 checkout 只作为本地依赖，不入库、不做 submodule。

