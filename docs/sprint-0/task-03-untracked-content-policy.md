# task-03 · 未跟踪内容定去留

| 字段 | 值 |
|------|-----|
| 状态 | 🔲 待办 |
| 优先级 | P1 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | — |

## 目标

给仓库里三类未跟踪内容定去留，并写进 `.gitignore` 与 `registry/README.md` 的约定。

## 背景

`git status` 目前长期挂着三个未跟踪项，性质各不相同，逐个查过：

| 路径 | 实际内容 | 体积 | 建议 |
|------|----------|------|------|
| `skills/anti-hallucination-gates/` | `SKILL.md` + `evidence-checklist.md` | 2 文件 / 12K | **入库**——手写 skill |
| `skills/browser-skills/` | `README.md` + `cookie-bridge/`（`SKILL.md` + `scripts/cookie-bridge.mjs`，自带 `.gitignore`） | 4 文件 / 28K | **入库**——已按 skill 目录约定组织 |
| `skills/docs/` | `install-devops-skill.md` | 1 文件 / 8K | **入库** |
| `references/vibe-hub-mirror/` | 抓取到的网页镜像（css/js） | 755 文件 | **忽略**——抓取快照 |
| `repos3.txt` | 13 行 GitHub repo 清单，**全仓库零引用** | 13 行 | 待定：长期参考资料 → 移到 `docs/reference/`；一次性待克隆清单 → 忽略 |

`skills/` 下另有 6 个独立 git 仓库（devops-skill、figures-skill、fin-skills、fire-skills、
presentation-skills、wip-skills），已在 task「ignore nested project checkouts」中忽略。

## 验收标准

- [ ] `skills/` 下三个普通目录纳入版本管理
- [ ] `.gitignore` 补 `references/vibe-hub-mirror/`
- [ ] `repos3.txt` 有明确去向（入库并改名，或忽略）
- [ ] `git status` 不再长期挂着这几项
- [ ] `registry/README.md` 的「约定」小节补一条：内容型 skill 目录纳入版本管理，
      独立仓库型 checkout 忽略

## 备注

入库前确认三个目录里没有 `.DS_Store`、缓存或凭据类文件。
