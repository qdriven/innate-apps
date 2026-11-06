# Innate Apps

记录开发的项目聚合 index 目录。项目信息以 [registry](registry/README.md) 方式记录（不使用 git submodule），数据源为 [registry/apps.json](registry/apps.json)。

本 README 是 registry 的人类可读视图，由 `registry/apps.json` 同步而来；改动项目信息请改数据源，再跑
`node scripts/validate-registry.mjs` 校验字段与本地路径。

## 维护中的项目

### 应用开发（Apps）

| Project | Repo | 说明 | 状态 | 可见性 |
|---------|------|------|------|--------|
| innate-daily | [variableway/innate-daily](https://github.com/variableway/innate-daily) | personal github repo dashboard for building in public | maintained | public |
| innate-fe-examples | [qdriven/innate-fe-examples](https://github.com/qdriven/innate-fe-examples) | Frontend examples for quick development | maintained | public |
| innate-vytdl | [qdriven/innate-vytdl](https://github.com/qdriven/innate-vytdl) | vYtDL CLI — Go/TUI wrapper around yt-dlp | maintained | public |
| innate-feeds | [variableway/innate-feeds](https://github.com/variableway/innate-feeds) | Github Trending and Starred Repo | maintained | public |
| spark-cli | [variableway/spark-cli](https://github.com/variableway/spark-cli) | Daily Cli command ideas fired by spark | maintained | public |
| innate-keepthem | [variableway/innate-keepthem](https://github.com/variableway/innate-keepthem) | keep different resources and to know more | maintained | public |
| innate-executable | [variableway/innate-executable](https://github.com/variableway/innate-executable) | executable tutorials website and desktop version | maintained | public |
| dsh-innate-agent | [qdriven/dsh-innate-agent](https://github.com/qdriven/dsh-innate-agent) | 本地 superagent 实验：无 GitHub 的完整接单-执行-交付回路（localboard Source + demo UI） | experimental | public |
| tutorials-maker | [qdriven/tutorials-maker](https://github.com/qdriven/tutorials-maker) | 教程生成工作台，含 agent-learning-workbench | maintained | public |
| cn-textbook-downloader | [qdriven/cn-textbook-downloader](https://github.com/qdriven/cn-textbook-downloader) | Download China Textbook Repo books | maintained | public |
| susu-edu-workspace | [qdriven/susu-edu-workspace](https://github.com/qdriven/susu-edu-workspace) | 单学生、本地优先的初中数学补学应用 | maintained | private |
| MangoDisk | [harry0703/MangoDisk](https://github.com/harry0703/MangoDisk) | 跨平台磁盘清理与空间分析工具 | maintained | public |
| fire-skills | [variableway/fire-skills](https://github.com/variableway/fire-skills) | Personal AI Agent Skills Collection | maintained | public |
| skill-management | [qdriven/skill-management](https://github.com/qdriven/skill-management) | Skill 管理与分发工具 | maintained | public |

### 基础框架（Base）

位于 `../framework` 目录（相对 innate-apps main 所在目录）：

| Project | Repo | 说明 | 状态 | 可见性 |
|---------|------|------|------|--------|
| innate-fe | [variableway/innate-fe](https://github.com/variableway/innate-fe) | 前端基础框架 | maintained | private |
| innate-backend | [variableway/innate-backend](https://github.com/variableway/innate-backend) | 后端基础框架 | maintained | private |
| innate-desktop | [qdriven/innate-desktop](https://github.com/qdriven/innate-desktop) | 桌面应用基础项目 | maintained | public |

### 参考项目（Reference）

| Project | Repo | 说明 | 状态 | 可见性 |
|---------|------|------|------|--------|
| AIHOT | [KKKKhazix/AIHOT](https://github.com/KKKKhazix/AIHOT) | 自己找热点、自己写日报的网站框架 | maintained | public |
| khazix-skills | [KKKKhazix/khazix-skills](https://github.com/KKKKhazix/khazix-skills) | 数字生命卡兹克开源的 AI Skills 合集 | maintained | public |
| ai-aug-edu | [HytidelLegend/ai-aug-edu](https://github.com/HytidelLegend/ai-aug-edu) | AI 增强教育项目参考实现 | maintained | public |
| word-atlas | [designfuchen/word-atlas](https://github.com/designfuchen/word-atlas) | 词光 · Illustrated IELTS vocabulary | maintained | public |

## 目录结构

- `registry/` — collections 注册信息（apps.json + schema.json）
- `docs/` — 设计与调研文档
- `scripts/validate-registry.mjs` — 校验 registry 字段与本地路径
- `scripts/daily-checkin.ts` — MiniMax Code（mcode）每日积分签到
- `scripts/mcode-sign-salt.ts` — mcode 签名盐交互式配置（探测客户端提取 / 写入环境变量）
- `scripts/workbuddy-checkin.ts` — WorkBuddy（腾讯 Buddy 加油站）每日积分签到
- `scripts/workbuddy-cdp.ts` — WorkBuddy 客户端 CDP 调试工具
- 各 app 目录为独立 git 仓库（非 submodule）

## 每日签到自动化

本机用 **Bun 脚本 + Windows 计划任务**自动领取两个客户端的每日积分，不再依赖 mcode hook：

| 目标 | 脚本 | 计划任务 | 时间 |
| --- | --- | --- | --- |
| MiniMax Code（mcode）积分 | `scripts/daily-checkin.ts` | `MiniMax Code Daily Checkin` | 每天 09:00 |
| WorkBuddy（Buddy加油站）积分 | `scripts/workbuddy-checkin.ts` | `WorkBuddy Daily Checkin` | 每天 09:05 |

两者均 Bun 优先（Node 24+ 也能直接跑同一份 `.ts`）、当天幂等、退出码恒为 0，
计划任务开启 `StartWhenAvailable` 以便错过后补跑。

实现细节、接口逆向与环境修复见 [docs/research/daily-checkin.md](docs/research/daily-checkin.md)
与 [docs/research/workbuddy-checkin.md](docs/research/workbuddy-checkin.md)。

## 约定

- 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
- worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
- `local_path` 一律相对 innate-apps main 检出目录；`null` 表示远程存在但本地尚未检出。
