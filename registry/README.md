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
| `repo` | `owner/repo` |
| `local_path` | 相对于 innate-apps main 所在目录的相对路径 |
| `category` | `base`（基础框架）/ `app`（应用开发）/ `reference`（参考项目） |
| `status` | `maintained` / `archived` / `experimental` |
| `visibility` | `public` / `private` |

## 约定

1. 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
2. worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
3. registry 更新后同步刷新：本仓库 README、`qdriven/.github` 与 `variableway/.github` 的 profile。
