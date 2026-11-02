# Innate Apps

记录开发的项目聚合 index 目录。项目信息以 [registry](registry/README.md) 方式记录（不使用 git submodule），数据源为 [registry/apps.json](registry/apps.json)。

## 维护中的项目

### 应用开发（Apps）

| Project | Repo | 说明 | 状态 | 可见性 |
|---------|------|------|------|--------|
| innate-daily | [variableway/innate-daily](https://github.com/variableway/innate-daily) | personal github repo dashboard for building in public | maintained | public |
| innate-fe-examples | [qdriven/innate-fe-examples](https://github.com/qdriven/innate-fe-examples) | Frontend examples for quick development | maintained | public |
| innate-vytdl | [qdriven/innate-vytdl](https://github.com/qdriven/innate-vytdl) | vYtDL CLI — Go/TUI wrapper around yt-dlp | maintained | public |
| innate-feeds | [variableway/innate-feeds](https://github.com/variableway/innate-feeds) | Github Trending and Starred Repo | maintained | public |
| spark-cli | [variableway/spark-cli](https://github.com/variableway/spark-cli) | Daily Cli command ideas fired by spark | maintained | public |
| dsh-innate-agent | [qdriven/dsh-innate-agent](https://github.com/qdriven/dsh-innate-agent) | 本地 superagent 实验：无 GitHub 的完整接单-执行-交付回路（localboard Source + demo UI） | experimental | public |

### 基础框架（Base）

位于 `../base` 目录（相对 innate-apps main 所在目录）：

| Project | Repo | 说明 | 状态 | 可见性 |
|---------|------|------|------|--------|
| innate-fe | [variableway/innate-fe](https://github.com/variableway/innate-fe) | 前端基础框架 | maintained | public |
| innate-backend | [variableway/innate-backend](https://github.com/variableway/innate-backend) | 后端基础框架 | maintained | public |
| innate-desktop | [qdriven/innate-susu](https://github.com/qdriven/innate-susu) | 桌面应用基础项目 | maintained | public |

## 目录结构

- `registry/` — collections 注册信息（apps.json + schema.json）
- `docs/` — 设计与调研文档
- 各 app 目录为独立 git 仓库（非 submodule）

## 约定

- 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
- worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
