# Innate Apps Registry

以 registry（数据文件）的方式记录聚合项目的元信息，不使用 git submodule。
`collections` 注册信息的数据源是 [apps.json](apps.json)，字段定义见 [schema.json](schema.json)。

## 数据源

- [`apps.json`](apps.json) — collections 注册信息（单一数据源）
- [`schema.json`](schema.json) — 字段定义

## 字段说明

| 字段 | 说明 |
|------|------|
| `name` | 目录名 / collection 名 |
| `repo` | `owner/repo`（必填，`owner/repo` 格式） |
| `url` | 仓库地址（URI 格式） |
| `local_path` | 相对于 innate-apps main 检出目录的相对路径；`null` 表示远程仓库存在但本地尚未检出。详见[工作区布局](#工作区布局) |
| `category` | `base`（基础框架）/ `app`（应用开发）/ `reference`（参考项目） |
| `status` | `maintained` / `archived` / `experimental` |
| `visibility` | `public` / `private`（以 GitHub 实际可见性为准） |
| `language` | 主要语言 |
| `description` | 一句话说明 |

## 工作区布局

`local_path` 是**相对于 innate-apps 检出目录**的相对路径——也就是从本仓库所在目录往上找。
所有项目 checkout 都待在 innate-apps 的**同级**目录里，按用途分在几个桶下：

```
<workspace>/                     ← 工作区根，innate-apps 与所有项目 checkout 的父目录
├── innate-apps/                 ← 本仓库，registry 数据源所在
├── apps/                        ← 应用项目
│   ├── daily-work/              → variableway/innate-daily
│   ├── innate-fe-examples/      → qdriven/innate-fe-examples
│   ├── innate-feeds/            → variableway/innate-feeds
│   ├── innate-keepthem/         → variableway/innate-keepthem
│   └── innate-executable/       → variableway/innate-executable
├── tools/                       ← 工具
│   └── spark-cli/               → variableway/spark-cli
├── framework/                   ← 基础框架
│   ├── innate-fe/               → variableway/innate-fe            (private)
│   ├── innate-backend/          → variableway/innate-backend       (private)
│   └── innate-ds/               → qdriven/innate-desktop
├── refine-factory/              ← 实验与衍生项目
│   ├── agent-way/
│   │   └── dsh-innate-agent/    → qdriven/dsh-innate-agent
│   ├── edu/
│   │   └── cn-textbook-downloader/ → qdriven/cn-textbook-downloader
│   ├── susu-edu-workspace/      → qdriven/susu-edu-workspace       (private)
│   ├── os-tools/
│   │   └── MangoDisk/           → harry0703/MangoDisk
│   └── skills/
│       ├── fire-skills/         → variableway/fire-skills
│       └── innate-skills/       → qdriven/skill-management
├── build-it-own/                ← 独立作品
│   └── tutorials-maker/         → qdriven/tutorials-maker
└── references/                  ← 外部参考项目（上游等）
    ├── skills-hub/
    │   ├── AIHOT/               → KKKKhazix/AIHOT
    │   └── khazix-skills/       → KKKKhazix/khazix-skills
    └── edu/
        ├── ai-aug-edu/          → HytidelLegend/ai-aug-edu
        └── word-atlas/          → designfuchen/word-atlas
```

### local_path 的两种取值

| 取值 | 含义 | 路径校验如何处理 |
|------|------|------------------|
| `"../apps/daily-work"` | 该项目**已在本地检出**，路径相对 innate-apps 检出目录 | 检查它在磁盘上是否存在 |
| `null` | 远程仓库存在，但**本地尚未检出**，没有对应 checkout 目录 | 跳过该项，属于正常情况，不是漏项 |

`local_path` 描述的是**规范布局**里的位置。机器上还可能残留旧平铺布局的 checkout
（直接躺在 innate-apps 内部，如 `innate-daily/`、`spark-cli/`），那类目录不受 registry
跟踪，也不对应任何 `local_path` 条目。

### 路径校验与环境差异

路径存在性校验**依赖本机布局**，因此：

- 在符合上述布局的机器上，`node scripts/validate-registry.mjs` 的 20 条路径应全部存在，
  另 1 条为 `null` 走跳过
- 在仍是旧平铺布局的机器上，路径会**几乎全部报「不存在」**——这是**环境差异，不是数据错误**
- **不要为了让校验变绿去改 `local_path`**：那会把「本机布局不对」伪装成「registry 数据不对」，
  下次换台机器或调整布局时反而更难查
- CI runner 上没有这些 checkout，一律用 `--skip-paths` 跳过路径校验（见[校验](#校验)）

### 仓库改名 / 下架时的处理

| 情况 | 处理 |
|------|------|
| GitHub 上被改名 | `repo` 改成新的 `owner/name`，`url` 同步更新；目录名若随之改变，`local_path` 一并改 |
| 仓库被删除 | 移除该条目 |
| 仓库转为 private | `visibility` 改为 `private`；该条目**不得再出现在公开 profile** |
| 停止维护但仍在 | `status` 改为 `archived`；GitHub 上勾了 archive 就同步改 |

改名是最容易漏的一种：GitHub 会把旧路径重定向到新路径，页面照常打开、链接也不报错，
只有 registry 里的 `repo` 字段是旧的。CI 的远程校验会拿 GitHub 返回的 `full_name`
与 `repo` 比对，不一致直接报错并给出新名字（见[校验](#校验)）。

## 收录标准

只有同时满足以下条件的项目才会进入 registry：

1. **非 fork** —— 上游他人的仓库不收录，直接引用上游地址即可。
2. **2026 年内有更新** —— 远程仓库在 2026 年有 push 活动的项目。
3. **远程仓库可访问** —— 已在 GitHub 移除或转为不可访问的仓库不再收录。

上游 fork 的项目（如 `deepseek-ai/deepseek-harness`、`TapXWorld/ChinaTextbook`、`stablyai/orca`）
按引用处理，不占用 registry 条目。

## 校验

字段与本地路径由脚本自动校验，改完 registry 请执行：

```bash
node scripts/validate-registry.mjs
```

校验内容：顶层与条目必填字段、`category`/`status`/`visibility` 枚举值、`repo` 格式、`url` 合法性、
`name`/`repo` 重复，以及每条 `local_path` 是否在磁盘上真实存在。加 `--verbose` 可打印逐条路径解析结果。

### CI 里的校验

push 与 PR 时由 [`.github/workflows/validate-registry.yml`](../../.github/workflows/validate-registry.yml)
自动执行，分两步：

| 步骤 | 命令 | 校验内容 |
|------|------|----------|
| 字段校验 | `node scripts/validate-registry.mjs --skip-paths` | 只查 schema 与格式，不依赖本地工作区 |
| 远程状态校验 | `node scripts/validate-registry.mjs --skip-paths --check-remote` | repo 是否存在、是否被改名、可见性、是否已归档、是否为 fork |
| 布局文档一致性 | `node scripts/check-layout-doc.mjs` | 本文[工作区布局](#工作区布局)的布局树与 `apps.json` 逐条对得上 |

**`--skip-paths`** 跳过 `local_path` 的磁盘存在性校验。那项校验依赖本机的工作区布局
（见下文「工作区布局」），CI runner 上没有那些 checkout，不跳过会 21 条全部报「不存在」。

**`--check-remote`** 调用 GitHub API 核对每条 `repo` 的真实状态：

- 仓库已改名 → 报错，并给出 GitHub 上的新名字（API 会把旧路径重定向到新路径）
- `visibility` 与 registry 不一致 → 报错
- 仓库已归档但 `status` 仍是 `maintained` → 报错；是 fork → 报错
- 最后一次 push 不在当前年份 → 警告（收录标准第 2 条）
- 私有仓库在其他组织下时，令牌无权访问会返回 404；脚本先用探针（`github/gitignore`）
  确认当前凭据能否读到安装范围外的公开仓库：能读到，404 才判定为「仓库不存在」；
  读不到则降级为警告，不会误判成「不存在」

## 约定

1. 所有需要查找的内容都到 main 所在目录进行查找，相对目录都是从 main 所在目录出发。
2. worktree 开发时不需要复制启发的项目，只读取 main 目录中的 registry 信息。
3. registry 更新后同步刷新：本仓库 README、用户 profile 仓库 `qdriven/qdriven` 与 org profile 仓库 `variableway/.github`。
4. `visibility` 与 `status` 需与 GitHub 实际状态一致——仓库转为 private、删除或停止维护时必须同步更新。
5. **内容型目录入库，独立仓库型 checkout 忽略**：`skills/` 与 `references/` 下的目录默认忽略；
   只有手写内容（skill 目录、文档等）才纳入版本管理，并在 `.gitignore` 白名单里显式列出。
   独立 git 仓库的 checkout 只作为本地依赖，不入库、不做 submodule。

