# task-06 · registry/README.md 补预期工作区布局与 local_path 语义

| 字段 | 值 |
|------|-----|
| 状态 | 🔲 待办 |
| 优先级 | P2 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | — |

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

- [ ] `registry/README.md` 增加「工作区布局」小节，画出 `apps/` `tools/` `framework/`
      `refine-factory/` `build-it-own/` `references/` 与 `innate-apps/` 的相对关系
- [ ] 说明 `local_path` 的两种取值：有路径 = 本地已检出；`null` = 远程存在、本地未检出
- [ ] 说明 `local_path` 缺失时哪些校验应视为通过（配合 task-05 的 `--skip-paths`）
- [ ] 补充「仓库改名 / 下架」时的处理方式：更新 `repo` 字段并核对 `full_name`
