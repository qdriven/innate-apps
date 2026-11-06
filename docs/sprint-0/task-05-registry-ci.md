# task-05 · innate-apps 接入 CI（validate-registry）

| 字段 | 值 |
|------|-----|
| 状态 | 🔲 待办 |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | — |

## 目标

让 registry 的字段校验进入 CI，防止陈旧条目再无声无息地进入数据源。

## 背景

`qdriven/innate-apps` **目前完全没有 `.github/`**，也就是说
`node scripts/validate-registry.mjs` 从来没在 PR 上自动跑过。

后果已经发生过：`variableway/innate-wip` 在 GitHub 上已被改名为
`variableway/innate-daily`，registry 里却仍留着 `innate-wip` 条目，与已有的
`innate-daily` 重复，渲染到 profile 上是一条死链。靠人工核对 21 条条目才发现。

## 障碍

`validate-registry.mjs` 会校验 `local_path` 是否在磁盘上真实存在，而 CI runner 上
没有那些 checkout，直接跑会全红。需要先把两类校验拆开：

- **字段校验**（必填字段、枚举值、repo 格式、url 合法性、name/repo 重复）
  —— 可以在任何环境跑，应该进 CI
- **路径校验**（`local_path` 是否存在）—— 依赖本地工作区布局，只在本地跑

实现方式二选一：

1. 给脚本加 `--skip-paths` 开关，CI 用它；或
2. 拆成两个脚本 / 两个 mode

## 验收标准

- [ ] `scripts/validate-registry.mjs` 支持跳过路径校验
- [ ] 新增 `.github/workflows/validate-registry.yml`，push / PR 时运行字段校验
- [ ] 校验失败时 workflow 红，并给出可读的失败原因
- [ ] 顺带补一条「repo 是否存在且未改名」的校验（GitHub API 解析后
      `full_name` 与 `repo` 不一致即报错）—— 这条能直接抓到 `innate-wip` 那类问题

## 备注

「repo 是否存在」需要调用 GitHub API，注意用 `GITHUB_TOKEN` 提升速率限制，
并对「仓库 404」与「仓库改名」给出不同提示。
