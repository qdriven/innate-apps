# task-04 · qdriven/qdriven profile 段落改由 registry 自动渲染

| 字段 | 值 |
|------|-----|
| 状态 | 🟡 个人 profile 已完成；org profile 已改好，待确认后推送 |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps)（渲染器所在） |
| 关联 issue | [#11](https://github.com/qdriven/innate-apps/issues/11) |
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

- [x] `scripts/render-profile.mjs` 存在且输出与当前手写段落一致
- [x] `qdriven/qdriven` 有 workflow，registry 变更后自动更新 profile
- [x] 手工删改 profile 段落会在下次 workflow 运行时被还原
- [x] 私有仓库不出现在公开 profile 中
- [x] 渲染器有最小测试（可用 `node --test`）
- [ ] `variableway/.github` 的死链（指向不存在的 `variableway/innate-apps`）一并修掉
      —— 改动已做好并本地提交，待确认后推送

## 执行记录

1. 开 issue [#11](https://github.com/qdriven/innate-apps/issues/11)
2. `scripts/render-profile.mjs`：把 registry 投影成 profile 段落，
   `--registry` `--out` `--profile`(user|org) `--marker` `--check`
3. 两种视图：`user`（个人 profile，registry 全部公开条目，含第三方参考项目）、
   `org`（组织 profile，只收该组织名下条目，不含第三方参考项目）
4. **private 条目一律排除**——公开 profile 里放私有仓库，对访客恒为 404，只是噪音；
   现有产物里 private 条目还被错标成 `public`
5. 单条 description 超 110 字符时截断（沿用既有产物的规则）
6. `scripts/render-profile.test.mjs`：10 项测试，覆盖 private 排除、分段、截断边界、
   竖线转义、标记替换与全局替换、幂等性，以及真实 registry 下「公开条目恰好一次、
   私有条目零次」的不变式；接入 CI 第四步
7. 提交 `1495ca7`（`Closes #11`），issue 自动关闭
8. `qdriven/qdriven` 提交 `5439900`：引言移出标记块（保持手写，渲染器只接管表格），
   新增 `.github/workflows/render-profile.yml`（每日 03:17 UTC + 手动触发）；
   另提交 `a410047` 给 `update-readme.yaml` 加并发组——两个 workflow 都会推
   README.md，不串行会互相顶掉 push

### 验证

- 渲染器输出与 `qdriven/qdriven` 原手写段落**逐行比对**，除 3 条 private 条目
  （`susu-edu-workspace` / `innate-fe` / `innate-backend`）被移除外完全一致——分段标题、
  表头、分隔行、20 条数据行、110 字符截断全部逐字节相同
- 手工改坏标记块 → `--check` 退出码 1；重新渲染 → 内容被还原；再 `--check` → 退出码 0
- 线上 workflow 手动触发跑通：渲染结果「无变化，跳过提交」
- 线上 profile README 已核对：private 条目零残留

### 后续补充（2026-11-07）

**reference 类条目不上公开 profile**（提交 `656d9f2`）

- AIHOT、khazix-skills、ai-aug-edu、word-atlas 是本地检出的**上游参考项目**，不是本人
  维护的项目，列在公开 profile 上会误导 → 渲染器的 user 视图排除 `category=reference`
- **数据源 `registry/apps.json` 一行未动**：这四条仍在 registry 里，继续记录本地
  checkout 位置与用途；只是不渲染进 profile。测试里钉了这条不变量
- 排除清单现在会说明原因（private / reference 类）
- 渲染结果：21 条中排除 3 private + 4 reference，剩 14 条

**顺带修好长期失败的 `Update README`**（提交 `c6b61b2`）

- 该 workflow 从 2026-11-03 起每晚都红，原因是 `github-activity-readme` 找不到入口
  标记 `<!--START_SECTION:activity-->`，直接退出。补上 START/END 标记 + 显式声明
  `permissions: contents: write` 后，转为 success
- 首次成功运行由 `github-actions[bot]` 提交 `:zap: Update README with the recent activity`，
  自动写入 5 条真实活动（正是本 sprint 自己的 issue/PR 事件）

**profile 仓库类型澄清**：`qdriven/qdriven` 是**个人 profile 仓库**——GitHub 上展示的
profile 就是**仓库根目录的 README.md**；`profile/README.md` 是组织 profile 仓库
（`variableway/.github`）的约定，两者不同。`render-profile.yml` 的检出目录已由
`profile/` 改名为 `profile-repo/` 并加注释说明，避免混淆。

### 待确认：variableway/.github

org 侧的改动**已做好并本地提交**（`/tmp/vw-profile`，提交 `7065da3`），内容：

- 死链修正：`variableway/innate-apps` → `qdriven/innate-apps`
- 「Innate Apps」段落加入 `<!-- innate_apps -->` 标记块，改由渲染器生成
- private 条目排除后，「Base Frameworks」段整段移除（该段仅有的两条 base 条目
  都是 private）；「Apps」表补全为 registry 中 variableway 名下的 6 条公开条目
- `build.yml` 增加渲染步骤，在 `build_readme.py` 之后执行

已验证：`build_readme.py` 的 `project_list` / `org_stats` / `recent_releases`
三个标记块原样保留，两者互不覆盖；渲染幂等；`--check` 通过。

**未推送**——推送属于对外可见操作，需本人确认后再执行。
