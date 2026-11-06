# task-03 · 未跟踪内容定去留

| 字段 | 值 |
|------|-----|
| 状态 | ✅ 已完成（2026-11-06） |
| 优先级 | P1 |
| 目标仓库 | [qdriven/innate-apps](https://github.com/qdriven/innate-apps) |
| 关联 issue | [#7](https://github.com/qdriven/innate-apps/issues/7) |

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

- [x] `skills/` 下三个普通目录纳入版本管理
- [x] `.gitignore` 补 `references/vibe-hub-mirror/`
- [x] `repos3.txt` 有明确去向（入库并改名，或忽略）
- [x] `git status` 不再长期挂着这几项
- [x] `registry/README.md` 的「约定」小节补一条：内容型 skill 目录纳入版本管理，
      独立仓库型 checkout 忽略

## 备注

入库前确认三个目录里没有 `.DS_Store`、缓存或凭据类文件。

## 执行记录

1. 开 issue [#7](https://github.com/qdriven/innate-apps/issues/7) 记录背景与验收标准
2. **入库前扫描**：三个目录里无 `.DS_Store`、无 cookie 产物、无
   `ghp_`/`github_pat_`/私钥一类凭据；`cookie-bridge/` 自带的 `.gitignore`
   把 `cookies-*.json` 排除在外
3. `.gitignore` 改为**默认忽略 + 白名单**：`/skills/*/` 与 `/references/*/` 两条规则
   覆盖全部目录，白名单只列三个内容型 skill 目录。替代了原先逐条硬编码的 9 条
   嵌套仓库路径——新目录进来默认被忽略，要入库得显式加白名单
4. `references/vibe-hub-mirror/`（抓取快照，3666 文件）随默认忽略规则排除
5. `repos3.txt` 判定为**调研候选清单**（13 行第三方仓库，与 registry 无关、全仓库
   零引用、既未收录也未克隆），归档为 `docs/reference/repos-research.md` 而非忽略
   ——内容只有 13 行，保留成本极低，忽略等于丢信息
6. `registry/README.md` 约定补第 5 条：内容型目录入库，独立仓库型 checkout 忽略
7. 提交 `e01329a`（`Closes #7`），issue 自动关闭

> 验证 `.gitignore` 行为：用 `git check-ignore` 逐条确认 5 个应忽略路径确实被忽略、
> 5 个应追踪路径确实可追踪；`git status` 不再有任何未跟踪项。
