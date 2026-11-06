# task-02 · 清理 innate-vytdl description 中的本地态注释

| 字段 | 值 |
|------|-----|
| 状态 | ✅ 已完成（2026-11-06） |
| 优先级 | P0 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps)（数据源所在） |
| 关联 issue | [#10](https://github.com/qdriven/innate-apps/issues/10) |
| 波及仓库 | qdriven/qdriven（profile 渲染产物） |

## 目标

把 `registry/apps.json` 中 `innate-vytdl` 条目的 description 恢复为纯项目描述，
移除与本地工作区状态相关的注释。

## 背景

当前值：

```json
"description": "vYtDL CLI — Go/TUI wrapper around yt-dlp with embed and auto-download（远程仓库已存在，本地暂未检出）"
```

问题有三层：

1. **信息冗余** —— `local_path: null` 已经表达了"远程仓库存在、本地尚未检出"，
   description 里再说一遍是同一件事的两种写法。
2. **字段语义被污染** —— `description` 是项目的一句话说明，混进本地 checkout 状态后，
   它就不再是可以直接展示给外部读者的文案。
3. **会漏到公开页面** —— 该字段会被渲染进 `qdriven/qdriven` 的 profile README 表格，
   公开页面上出现"（远程仓库已存在，本地暂未检出）"属于本地环境噪音。

`innate-vytdl` 是 registry 中**唯一** `local_path: null` 的条目，所以这条注释
只此一处。已逐条核对全部 21 条 description，其余匹配到的中文关键词属于描述文本
本身（如 `dsh-innate-agent` 的 "Local experiment fork"、"susu-edu-workspace` 的
"本地优先"），不是同类问题。

## 验收标准

- [x] `registry/apps.json` 中 `innate-vytdl.description` 不含本地态注释
- [x] `innate-apps` README「应用开发」表格同步
- [x] `qdriven/qdriven` profile 的 `innate_apps` 段落重新渲染且不含该注释
- [x] `registry/apps.json` 的 `updated_at` 刷新
- [x] 其余 20 条条目的 description 不被改动

## 执行记录

- 先开 issue #10 记录背景与验收标准，再动数据源
- 改 `registry/apps.json` + `README.md` → 提交 `fix(registry): 移除已改名的 innate-wip 条目` 同一批次处理
- 重新生成 `qdriven/qdriven` 的 profile 段落并推送
