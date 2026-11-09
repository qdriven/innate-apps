# Sprint 0 · 任务索引

> 全局任务索引。本目录跟踪**跨仓库**的维护任务：每个任务一个文件，任务涉及多个
> 仓库时，由**数据源所在仓库**承载 issue，其余仓库作为被影响方提交修复。

## 任务清单

| # | 任务 | 目标仓库（issue 所在） | 优先级 | 状态 | Issue |
|---|------|----------------------|--------|------|-------|
| 01 | 合并 spark-cli PR #31，验证文档站重建与 issue 自动关闭 | variableway/spark-cli | P0 | ✅ 已完成 | [#30](https://github.com/variableway/spark-cli/issues/30) |
| 02 | 清理 innate-vytdl description 中的本地态注释 | qdriven/innate-apps | P0 | ✅ 已完成 | [#6](https://github.com/qdriven/innate-apps/issues/6) |
| 03 | 未跟踪内容定去留：skills/ 入库、repos3.txt 归档、镜像产物忽略 | qdriven/innate-apps | P1 | ✅ 已完成 | [#7](https://github.com/qdriven/innate-apps/issues/7) |
| 04 | qdriven/qdriven profile 段落改由 registry 自动渲染 | qdriven/innate-apps | P2 | ✅ 已完成 | [#11](https://github.com/qdriven/innate-apps/issues/11) |
| 05 | innate-apps 接入 CI：validate-registry + `--skip-paths` | qdriven/innate-apps | P2 | ✅ 已完成 | [#8](https://github.com/qdriven/innate-apps/issues/8) |
| 06 | registry/README.md 补预期工作区布局与 local_path 语义 | qdriven/innate-apps | P2 | ✅ 已完成 | [#10](https://github.com/qdriven/innate-apps/issues/10) |

任务详情见下方文件链接。

## 任务文件

| 文件 | 任务 |
|------|------|
| [task-01-merge-spark-cli-pr.md](./task-01-merge-spark-cli-pr.md) | 合并 spark-cli PR #31，验证文档站重建与 issue 自动关闭 |
| [task-02-registry-description-cleanup.md](./task-02-registry-description-cleanup.md) | 清理 innate-vytdl description 中的本地态注释 |
| [task-03-untracked-content-policy.md](./task-03-untracked-content-policy.md) | 未跟踪内容定去留 |
| [task-04-profile-renderer.md](./task-04-profile-renderer.md) | qdriven/qdriven profile 段落改由 registry 自动渲染 |
| [task-05-registry-ci.md](./task-05-registry-ci.md) | innate-apps 接入 CI |
| [task-06-workspace-layout-doc.md](./task-06-workspace-layout-doc.md) | registry/README.md 补预期工作区布局 |

## 执行约定

1. **开 issue 再修**：任务开工时先在目标仓库开 issue 记录背景与验收标准，修复过程
   以该 issue 为准绳。
2. **改数据源，不改渲染产物**：`registry/apps.json` 是唯一数据源，三处渲染产物
   （本仓库 README、`qdriven/qdriven` profile、`variableway/.github` profile）都从它生成。
   改渲染产物只是同步行为，改数据源才是修复。
3. **提交粒度**：一个任务一次提交，跨仓库时各仓库各自提交。
4. **关闭方式**：合并 PR 后关闭 issue；直接提交到 main 的仓库（innate-apps）在提交后
   手动关闭并在 issue 中回填提交链接。

## 背景

Sprint 0 的起点是 2026-11-06 对 `variableway/spark-cli` 的 issue #30（更新文档）。
在执行过程中顺带发现 innate-apps registry 体系存在三处结构性问题：

- **数据瑕疵**：`innate-vytdl` 的 description 混入了本地工作区状态注释，会随渲染漏到公开 profile（task-02）。
- **策略未定**：仓库存在三类未跟踪内容，性质各异，入库与否没有成文约定（task-03）。
- **结构性缺口**：registry 的三个渲染产物只有一个有生成器，每次改 registry 都要手工同步两处；
  仓库也没有 CI，陈旧条目可以无声无息地进入数据源（task-04 / task-05）。

## 当前状态（2026-11-09）

六个任务全部完成，三处渲染产物全部由 registry 驱动，不再需要手工同步：

| 产物 | 生成机制 |
|------|----------|
| `qdriven/qdriven`（个人 profile，根 README.md） | `render-profile.mjs --profile user` + `render-profile.yml`（每日 03:17 UTC + 手动触发） |
| `variableway/.github`（组织 profile，`profile/README.md`） | `build_readme.py` + `render-profile.mjs --profile org`，在 `build.yml` 里串行执行 |
| `innate-apps` README | 手改（中文描述人工撰写） |

私有仓库与第三方参考项目（reference 类）都不再出现在公开 profile 上；`registry/apps.json`
仍是完整数据源，这些条目一条不少地留在里面。

按约定，六个任务分别开 issue、修复后关闭：

| 任务 | Issue | 关闭方式 |
|------|-------|----------|
| 01 | [variableway/spark-cli#30](https://github.com/variableway/spark-cli/issues/30) | 合并 PR 后工作流自动关闭 |
| 02 | [qdriven/innate-apps#6](https://github.com/qdriven/innate-apps/issues/6) | 提交信息含 `Closes #6` 自动关闭 |
| 03 | [qdriven/innate-apps#7](https://github.com/qdriven/innate-apps/issues/7) | 同上 |
| 04 | [qdriven/innate-apps#11](https://github.com/qdriven/innate-apps/issues/11) | 同上 |
| 05 | [qdriven/innate-apps#8](https://github.com/qdriven/innate-apps/issues/8) | 同上 |
| 06 | [qdriven/innate-apps#10](https://github.com/qdriven/innate-apps/issues/10) | 同上 |

### 一并修掉的既有问题

- `innate-wip` 已改名 `innate-daily` 后留下的重复条目与死链（task-02）
- registry 校验从未进 CI（task-05）——现在 push / PR 会跑字段校验、远程状态校验、
  布局文档一致性校验与渲染器测试四步
- `qdriven/qdriven` 的 `innate_apps` 段落原本无生成器，靠手工同步（task-04）
- `variableway/.github` 的 org profile 里指向不存在的 `variableway/innate-apps` 的死链，
  以及把 private 仓库标成 public 的错标（task-04）
- `qdriven/qdriven` 的 `Update README` workflow 因缺 `<!--START_SECTION:activity-->`
  标记长期失败（2026-11-03 起每晚都红）——已随 task-04 的后续补充修好，现为 success
- 个人 profile 上不再列 reference 类第三方参考项目（数据源仍保留这些条目）
