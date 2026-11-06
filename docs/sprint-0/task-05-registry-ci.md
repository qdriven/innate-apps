# task-05 · innate-apps 接入 CI（validate-registry）

| 字段 | 值 |
|------|-----|
| 状态 | ✅ 已完成（2026-11-06） |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | [#8](https://github.com/qdriven/innate-apps/issues/8) |

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

- [x] `scripts/validate-registry.mjs` 支持跳过路径校验
- [x] 新增 `.github/workflows/validate-registry.yml`，push / PR 时运行字段校验
- [x] 校验失败时 workflow 红，并给出可读的失败原因
- [x] 顺带补一条「repo 是否存在且未改名」的校验（GitHub API 解析后
      `full_name` 与 `repo` 不一致即报错）—— 这条能直接抓到 `innate-wip` 那类问题

## 备注

「repo 是否存在」需要调用 GitHub API，注意用 `GITHUB_TOKEN` 提升速率限制，
并对「仓库 404」与「仓库改名」给出不同提示。

## 执行记录

1. 开 issue [#8](https://github.com/qdriven/innate-apps/issues/8) 记录背景、障碍与方案
2. `validate-registry.mjs` 新增 `--skip-paths`（跳过 `local_path` 磁盘存在性校验）
   与 `--check-remote`（GitHub API 远程状态校验），原有行为不变
3. 远程校验覆盖：改名（API 把旧路径重定向到新路径，返回的 `full_name` 即新名字）、
   `visibility` 不一致、已归档但 `status` 仍 `maintained`、是 fork（违反收录标准第 1 条）；
   最后一次 push 不在当前年份按收录标准第 2 条给**警告**而不阻塞
4. **404 歧义处理**（关键）：私有仓库在其他组织下时令牌无权访问，同样返回 404。
   脚本先用探针 `github/gitignore` 确认当前凭据能否读到安装范围外的公开仓库——
   能读到，404 才判定为「仓库不存在」；读不到则降级为警告。
   否则 Actions 的安装令牌会让 CI 整片误报
5. 网络故障 / 403 / 429 一律按警告处理，不让 CI 因外部抖动变红
6. 新增 `.github/workflows/validate-registry.yml`：push / PR 时分两步跑
   字段校验与远程状态校验
7. `registry/README.md` 补「CI 里的校验」小节，说明两个开关的语义与 CI 用法
8. 提交 `929ab1e`（`Closes #8`），issue 自动关闭

> **验证**：以 5 个故障用例做注入测试——仓库改名、visibility 双向不一致、
> public 条目 404、repo 重复，全部被正确捕获并给出可读原因（退出码 1）。
> 另用 mock fetch 把探针打成 404，验证降级路径下 404 只警告、不误判（退出码 0）。
>
> **端到端验证**：开了一个自测 PR（`ci-selftest-red` 分支），故意把 `innate-vytdl`
> 的 `visibility` 写成 `private`（实际 public），CI 如预期变红，日志里给出
> 「visibility 不一致 —— registry 写的是 "private"，GitHub 上实际是 "public"」。
> 验证完关闭 PR 并删除分支。
