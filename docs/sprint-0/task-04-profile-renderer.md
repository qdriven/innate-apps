# task-04 · qdriven/qdriven profile 段落改由 registry 自动渲染

| 字段 | 值 |
|------|-----|
| 状态 | 🔲 待办 |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps)（渲染器所在） |
| 关联 issue | — |
| 波及仓库 | qdriven/qdriven（执行端）、variableway/.github（可选统一） |

## 目标

让 `qdriven/qdriven` 的 `innate_apps` 段落由 `registry/apps.json` 自动生成，
不再手工同步。

## 背景

`registry/README.md` 约定 #3 要求 registry 更新后同步刷新三处渲染产物：

| 产物 | 生成机制 | 状态 |
|------|----------|------|
| `innate-apps` README | 手改（中文描述人工撰写） | 手工 |
| `qdriven/qdriven` profile `innate_apps` 段落 | **无生成器** | 手工 |
| `variableway/.github` profile `project_list` 段落 | `build_readme.py` + 每晚 cron | 自动 ✓ |

三处里只有一处自动化，所以每次改 registry 都要手工同步两处——2026-11-06 修
`innate-wip` 时就是这样漏掉的（该仓库在 GitHub 上已改名为 `innate-daily`，registry
条目成了重复项，profile 上渲染成了指向 innate-daily 的死链）。

## 方案

**方案 A（推荐）** —— 渲染逻辑放数据源仓库，执行端只负责跑：

1. 在 `innate-apps/scripts/` 新增 `render-profile.mjs`
   - 输入 `registry/apps.json`，按 `category`（app / base / reference）与 `status`
     分段，输出 `innate_apps` 标记段落
   - 参数：`--registry` `--out` `--profile`（user / org）
2. 在 `qdriven/qdriven` 加 `.github/workflows/profile.yml`
   - checkout `qdriven/innate-apps` → `node scripts/render-profile.mjs`
   - 写回 README 的 `<!-- innate_apps starts/ends -->` 段落 → commit/push
3. 标记段落之间的内容（如 `## Featured Projects` 标题与引言）保持手写，不进渲染

**方案 B** —— 在 spark-cli 加 `spark hub render --from registry/apps.json`，
由 CLI 承担渲染职责。不推荐：会给 CLI 引入不属于它的职责，且让数据源仓库反过来
依赖一个外部工具。

**两处 profile 视图不必强行统一**：`variableway/.github` 的表格多一列
"Latest Release"（从 GitHub API 取），是"组织在推什么 release"的视图；用户 profile
用 registry 渲染是"我维护什么项目"的视图。分工合理，各自保留。

## 验收标准

- [ ] `scripts/render-profile.mjs` 存在且输出与当前手写段落一致
- [ ] `qdriven/qdriven` 有 workflow，registry 变更后自动更新 profile
- [ ] 手工删改 profile 段落会在下次 workflow 运行时被还原
- [ ] 私有仓库不出现在公开 profile 中
- [ ] 渲染器有最小测试（可用 `node --test`）
