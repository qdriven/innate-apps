# 08 — 打包与分发：桌面版与 Web 版

## 1. 双端产品定义

| | 桌面版（首发） | Web 版（第二阶段） |
|---|----------------|--------------------|
| 宿主 | keepthem-desktop（Tauri v2） | FastAPI 单进程容器 |
| 渠道能力 | 全部 14 渠道 + 登录型（本机 CloakBrowser） | 仅无头渠道（D8） |
| 常驻性 | 应用开启时调度 | 7×24（订阅/Bot/远程阅读的价值来源） |
| 用户 | 个人情报站 | 自托管服务器/NAS/VPS |
| Bot | 推送器姿态 | 推送器 + 交互命令 |

**首发桌面、Web 随后**的理由：agent-reach 的差异化价值恰在登录墙渠道，
那需要桌面环境；Web 版解决的是常驻性与多端访问，属于第二阶段需求。
但架构从第一天双端同构（02 §6 不变量 4），Web 版启动时零重构。

## 2. 桌面版打包（Tauri）

### 2.1 Python sidecar 的交付

业务核心是 Python，必须随应用分发。三份候选，选 **B**：

| 方案 | 描述 | 评估 |
|------|------|------|
| A. 系统依赖 | 要求用户自装 Python + contentforge | ❌ 违背桌面开箱即用 |
| B. **bundled sidecar（选）** | Tauri sidecar 机制打包独立 Python 运行时（uv `python-build-standalone` 产物）+ contentforge-core 及依赖 zipapp | ✅ vYtDL 已有 bundled yt-dlp 经验；无系统污染 |
| C. PyO3 嵌入 | Rust 进程内嵌 Python | ❌ 与「子进程隔离」设计冲突，GIL/ABI 维护重 |

sidecar 组成：

```
Contents/Resources/sidecar/          （macOS 示例）
├── python/                          # standalone CPython 3.12（含 stdlib）
├── contentforge.pyz                 # contentforge-core + 依赖（pip install -t 后 zipapp）
└── run_sidecar                      # 启动脚本：PYTHONPATH=… exec python -m contentforge.sidecar
```

Tauri 配置 `externalBin` 指向 run_sidecar；宿主管理生命周期
（启动/健康检查（stdin/stdout 心跳行）/崩溃重启（≤3 次/5 分钟，超出则 UI 报障））。

### 2.2 agent-reach 的交付

agent-reach **不打进应用**，首启向导安装（05 §5）：

```
uv tool install https://github.com/Panniantong/Agent-Reach/archive/refs/tags/v1.6.0.zip
agent-reach setup
（按需）agent-reach add <channel>
```

理由：① agent-reach 自带重工具链（Node/OpenCLI/CloakBrowser），
  `add` 按渠道按需装，打包全部渠道会撑爆安装包；
  ② 上游迭代快（周级发版），`agent-reach update` 独立于应用升级；
  ③ submodule `services/agent-reach` 在仓库内供开发参考/测试，
  用户的运行时副本走 uv tool 独立安装，版本由 doctor 检测
  （catalog 静态层标注最低兼容版本）。
- 向导检测已安装则跳过；支持自定义 binary 路径（设置项 `reach_binary_path`）。
- Windows：uv 安装路径加入 PATH 的引导写进向导文案。

### 2.3 构建管线

```
pnpm reach:sidecar    # 1) uv python download + pip install -t + zipapp 打包
pnpm reach:desktop    # 2) tauri build（Next.js 静态导出 + sidecar 资源）
产物：dmg / msi(nsis) / AppImage —— 沿用 contentforge-desktop 既有 targets
CI：GitHub Actions matrix（mac arm64 / win x64 / linux x64）
```

安装包体积预估：Tauri 壳+前端 ~10MB，Python sidecar ~60-80MB
（含 pydantic/httpx 级依赖；无 torch 类重依赖），可接受。

## 3. Web 版打包（Docker + FastAPI）

### 3.1 为什么 FastAPI 单进程（而不是 Hono 双进程）

收敛决策给出的两个候选（Hono 或 FastAPI）中选 FastAPI：

- scheduler / 插件内核 / store 门面全是 Python——同进程直调，零桥接协议；
- Hono 方案需要 Node↔Python 双进程（IPC/HTTP 桥 + 两个 runtime 镜像层），
  唯一收益是「与 vytdl-web 同栈」，但 vytdl-web 无插件内核诉求，模式不可复制；
- Web 版的 API 面就是 Store 层门面（03 §5 的 REST 列），FastAPI 自动
  OpenAPI 文档是免费收益（Bot/第三方消费的契约文档）。

### 3.2 镜像与运行

```dockerfile
# apps/reach-web/Dockerfile（多阶段）
FROM node:22-slim AS frontend      # Next.js 静态导出（复用桌面同一套组件）
FROM python:3.12-slim
  pip install contentforge-core（本地 wheel 或 git+https）
  pip install fastapi uvicorn
  COPY --from=frontend /out /app/static
EXPOSE 8000
VOLUME /data                       # SQLite + feeds 输出
ENV KEEPTHEM_DB=/data/keepthem.db  KEEPTHEM_FEEDS=/data/feeds
CMD ["uvicorn", "reach_web.server:app", "--host", "0.0.0.0", "--port", "8000"]
```

FastAPI lifespan 内启动 SubscriptionScheduler + Telegram 长轮询（如启用）。
compose 示例附 `docker-compose.yml`（含可选反代与 TLS 说明）。

### 3.3 前端复用策略

- 桌面与 Web 共用 `components/pulse/*` 与 `store/pulseStore`；
- 访问层走既有 api-client 抽象模式（Tauri IPC ↔ HTTP fetch，vytdl 已验证同型方案）：
  桌面 `apiInvoke('item_query', …)` ↔ Web `GET /api/items`；
- 构建产物两种：Tauri 内嵌（`next build` 常规）/ Web 静态导出（`output: 'export'`），
  差异仅在 `api-client` 的 mode 分支与路由 base，组件零改动。

### 3.4 Web 版的能力边界（如实呈现）

- 订阅向导的渠道卡片墙把 desktop_only 渠道置灰 + 标注「需桌面版」；
- 已在桌面创建的登录型订阅若数据目录被 Web 版复用（同 /data 卷），
  状态显示 `needs_login` 且无法在 Web 恢复（设计使然，不是 bug）；
- 发布 target 只显示静态类（static_site/rss/json），xhs/wechat 置灰同上。

## 4. Web API 面（REST，= Store 门面直映射）

```
GET/POST/PATCH/DELETE  /api/subscriptions[/{id}]      POST …/{id}/run
GET                    /api/items                     （item_query 全参数）
PATCH                  /api/items/{id}                （status/star/tags）
POST                   /api/items/{id}/deepen | /process
GET/POST/…             /api/delivery/*                （channels/rules/runs）
POST                   /api/publish                   （publish_dispatch）
GET                    /api/digest[?date=…]
GET                    /api/catalog                   （渠道能力 + 健康）
GET                    /feeds/{slug}.xml[.atom]       （RSS 出口，无认证或 token）
GET                    /api/openapi.json
认证：单用户 token（环境变量 INIT_TOKEN，首次登录可改）——自托管单租户定位，
      多用户明确不做（YAGNI；多租户会推翻 Store 层与桌面同构假设）。
```

## 5. 版本与更新策略

| 组件 | 更新通道 | 说明 |
|------|----------|------|
| 桌面应用 | 应用自动更新（Tauri updater） | 含前端 + sidecar（zipapp 随包） |
| agent-reach | `agent-reach update`（独立） | doctor 提示（envelope meta.update 字段透传到 UI 角标） |
| contentforge-core | 随应用 / 随镜像 | Web 版重建镜像即更新 |
| 数据库迁移 | 应用启动时自动 | 双端同一迁移器（03 §3） |
