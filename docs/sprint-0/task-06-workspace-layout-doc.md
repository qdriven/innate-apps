# task-06 · registry/README.md 补预期工作区布局与 local_path 语义

| 字段 | 值 |
|------|-----|
| 状态 | ✅ 已完成（2026-11-06） |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | [#10](https://github.com/qdriven/innate-apps/issues/10) |

## 目标

在 `registry/README.md` 里写清预期的工作区目录布局，并说明 `local_path` 的取值语义。

## 背景

`local_path` 是"相对于 innate-apps main 检出目录的相对路径"。当前条目指向：

```
../apps/daily-work
../apps/innate-fe-examples
../apps/innate-feeds
../apps/innate-keepthem
../apps/innate-executable
../apps/agent-way/innate-wip
../tools/spark-cli
../framework/innate-fe
../framework/innate-backend
../framework/innate-ds
../refine-factory/agent-way/dsh-innate-agent
../refine-factory/edu/cn-textbook-downloader
../refine-factory/susu-edu-workspace
../refine-factory/os-tools/MangoDisk
../refine-factory/skills/fire-skills
../refine-factory/skills/innate-skills
../build-it-own/tutorials-maker
../references/skills-hub/AIHOT
../references/skills-hub/khazix-skills
../references/edu/ai-aug-edu
../references/edu/word-atlas
```

但仓库里**没有任何地方说明这套布局**，新人（或别的机器上的 agent）只能靠猜。
后果之一：在还沿用旧平铺布局的 checkout 上跑 `validate-registry.mjs`，21 条条目的
`local_path` 全部报"不存在"，无法区分「数据错了」和「环境不对」。

同时 `local_path: null` 的含义——"远程仓库存在、本地尚未检出"——也只隐含在
schema 注释里，没有在 README 讲明白。这正是 task-02 判断
`innate-vytdl` description 冗余的判据来源。

## 验收标准

- [x] `registry/README.md` 增加「工作区布局」小节，画出 `apps/` `tools/` `framework/`
      `refine-factory/` `build-it-own/` `references/` 与 `innate-apps/` 的相对关系
- [x] 说明 `local_path` 的两种取值：有路径 = 本地已检出；`null` = 远程存在、本地未检出
- [x] 说明 `local_path` 缺失时哪些校验应视为通过（配合 task-05 的 `--skip-paths`）
- [x] 补充「仓库改名 / 下架」时的处理方式：更新 `repo` 字段并核对 `full_name`

## 执行记录

1. 开 issue [#10](https://github.com/qdriven/innate-apps/issues/10)
2. `registry/README.md` 新增「工作区布局」小节：画出 innate-apps 与
   `apps/` `tools/` `framework/` `refine-factory/` `build-it-own/` `references/`
   的相对关系，并逐条标注对应的 GitHub 仓库
3. 说明 `local_path` 的两种取值，并写明 `null` 条目在路径校验里走跳过、属正常情况
4. 写明路径校验与环境差异的关系：在旧平铺布局的机器上路径会几乎全红，那是**环境
   问题不是数据问题**，明确不要靠改 `local_path` 让校验变绿
5. 补充「仓库改名 / 下架 / 转 private / 停止维护」四种情况的处理方式
6. 新增 `scripts/check-layout-doc.mjs`：把 README 的布局树反解出来，与 `apps.json`
   逐条对拍，防止文档与数据源脱节；接入 CI 第三步
7. 提交 `b051314`（`Closes #10`），issue 自动关闭

> **验证**：布局树与 registry 的 20 条有路径条目全部对得上（另 1 条为 `null`）。
> 以注入漂移（把 `innate-vytdl` 的 `local_path` 改成一个布局树里不存在的槽位）
> 验证该检查确实会失败而非空转。
