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

## 约定

1. 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
2. worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
3. registry 更新后同步刷新：本仓库 README、用户 profile 仓库 `qdriven/qdriven` 与 org profile 仓库 `variableway/.github`。
4. `visibility` 与 `status` 需与 GitHub 实际状态一致——仓库转为 private、删除或停止维护时必须同步更新。

