# task-01 · 合并 spark-cli PR #31

| 字段 | 值 |
|------|-----|
| 状态 | ✅ 已完成（2026-11-06） |
| 优先级 | P0 |
| 目标仓库 | [variableway/spark-cli](https://github.com/variableway/spark-cli) |
| 关联 issue | [#30](https://github.com/variableway/spark-cli/issues/30) |
| 分支 / PR | `30-update-docs` / [#31](https://github.com/variableway/spark-cli/pull/31) |

## 目标

收尾 issue #30 的 spark-cli 侧改动：合并 PR，使文档站重建发布、issue 自动关闭。

## 背景

issue #30「更新文档」的三项内容已在 PR #31 中完成：

1. 按当前实现更新文档，并编写 `skills/spark-cli/SKILL.md`（使用说明）
2. 参考 Golang CLI 101 编写 Node + TypeScript 101（use case：实现一个 docs site）
3. 重写「如何获取 GitHub 仓库项目」章节，示例改为 `qdriven` / `qdriven/qdriven`

PR 共 65 个文件、+5498 / -585。仓库的 `close-issue-on-merge` 工作流按分支名前缀
`30-` 识别 issue，合并后自动关闭 #30。

## 验收标准

- [x] PR #31 合并进 `main`
- [x] `docs.yml`（触发条件 `paths: docs/**`）自动重建并发布文档站
- [x] `close-issue-on-merge` 自动关闭 issue #30
- [x] 文档站可访问，新增页面（Node/TS 101、skill/hub/witr 规格页）在导航中可达

## 执行记录

- 分支 `30-update-docs` 通过 SSH over 443 推送（本机直连 github.com:443 会 HTTP2 framing 报错）
- 合并前自检：`go build` / `go vet` 无告警、`go test ./...` 18 个有测试的包全过、`pnpm build` 产出 80 页
- 自写校验脚本核对导航项解析、站内相对链接、zh/en 文件集与结构对齐，全部通过
