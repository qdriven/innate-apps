# WorkBuddy 每日签到：实现说明

> 目标：每天自动领取 WorkBuddy（腾讯 Buddy 加油站）的每日积分奖励。
> 适用：Windows + 官方客户端 WorkBuddy 5.9.3（`C:\Program Files\WorkBuddy\WorkBuddy.exe`）。
> 运行时：Bun（`bun run scripts/workbuddy-checkin.ts`），Node 24+ 亦可直接跑同一份 `.ts`。
> 触发：Windows 计划任务「WorkBuddy Daily Checkin」（每天 09:05），不再依赖 mcode hook。

## 一句话结论

签到接口的鉴权材料（SSO Bearer + Turing 设备风控令牌）只存在于官方客户端进程内，
落盘部分用编译期内置的对称密钥加密、无法在进程外解密；
因此本方案**不提取凭据**，而是**驱动官方客户端自己发请求**：
启动（复用）WorkBuddy → 通过 CDP 调用渲染进程的官方 IPC 通道 `auth:claimDailyCheckin` → 关闭窗口（进程留在托盘）。

## 签到接口（逆向 `resources/app.asar` 得到）

| 用途 | 方法 | 路径 |
| --- | --- | --- |
| 查询状态 | POST | `https://copilot.tencent.com/v2/billing/meter/checkin-activity-status` |
| 领取奖励 | POST | `https://copilot.tencent.com/v2/billing/meter/daily-checkin` |

- 鉴权：`Authorization: Bearer <SSO accessToken>`，由主进程 `context.http` 统一注入。
- 风控：额外要求 `X-Device-Token`（Turing 设备令牌，由 `native/turing-sdk` 生成）。
- 状态响应字段：`active, today_checked_in, streak_days, daily_credit, today_credit,
  is_streak_day, checkin_dates[], total_credits, season, activity_name, end_time` 等。
- 领取响应：`{ code, msg, credit, streak_days, is_streak_day }`；
  `code=0` 成功，`code=10001` 表示「今天已签到，请明天再来」。
- 活动周期：2026-09-30 ~ 2026-12-31，第 10 季，每日 100 积分。

代码坐标（`C:\Program Files\WorkBuddy\resources\app.asar`）：

- `main/account.js` — `DesktopAccountRepo`，`billingPrefix='/v2'`，`postCheckin()`、`getCheckinRequestHeaders()`。
- `main/tar.js` — `AuthService.getCheckinStatus()` / `claimDailyCheckin()`（实际发起请求处）。
- `main/server.js` — 把鉴权方法注册成 IPC：`authGetCheckinStatus`、`authClaimDailyCheckin`。
- `preload/index.js` — 渲染层桥接 `window.workbuddyDesktop`，渲染进程 API `window.wb`。

## 为什么不能像 mcode 那样纯脚本直连

| 环节 | 结论 |
| --- | --- |
| SSO accessToken 落盘位置 | `%LOCALAPPDATA%\CodeBuddyExtension\Data\Public\auth\workbuddy-desktop.info` |
| 加密方式 | 字段级信封 `{"$wbEncrypted":1,"envelope":"<base64>"}` → AES-256-GCM（suite=1） |
| 密钥来源 | 静态保护者密钥，keyId `9127dea1b44020a7` |
| 保护者密钥 | `key = sha256(atRestSecretKey)`，其中 `atRestSecretKey` 由定制 Electron 的原生模块 `electron.workbuddyStorage.loggerGet()` 提供；该模块源码 `electron_api_workbuddy_storage.cc` 编译进 `WorkBuddy.exe`，字符串不落明文，无法在进程外取得 |
| 结论 | 进程外无法解密 token，只能让客户端自己发请求 |

已排除的路径（不再尝试）：DPAPI 直解 / DPAPI+熵矩阵、Chromium OSCrypt master key + AES-CBC/GCM 各种摆位、
`ELECTRON_RUN_AS_NODE`、`NODE_OPTIONS=--require` 注入（打包版 Electron 明确忽略）、
CLI（`codebuddy`）侧签到接口（CLI 包内不存在签到 API）。

## 实现

脚本：`scripts/workbuddy-checkin.ts`（Bun / Node 双兼容），配套调试工具 `scripts/workbuddy-cdp.ts`，
计划任务入口 `scripts/run-workbuddy-checkin.cmd`。

流程：

1. 自愈式写入 `~/.workbuddy/app/app-config.json` 的 `startupForceAutoUpdate: false`（见下方「环境修复」）。
2. 探测调试端口：优先复用 `cdp-instance.json` 里上次记录的端口；否则随机挑一个空闲端口，
   客户端未运行则以 `--remote-debugging-port` 启动，已在运行且带调试端口则直接复用。
3. 客户端未运行 → 以 `--remote-debugging-port` 启动；已在运行且带调试端口 → 直接复用。
4. 在页面目标里找到暴露 `window.wb` 的主窗口，必要时把窗口最小化（后台静默）。
5. `wb.invoke('auth:getCheckinStatus')` 查状态 → 未签到则 `wb.invoke('auth:claimDailyCheckin')` → 再查一次确认。
6. 写状态文件 `~/.workbuddy/checkin/daily-checkin-state.json`，追加日志 `~/.workbuddy/checkin/daily-checkin.log`。
   另外把本次使用的调试端口记在 `~/.workbuddy/checkin/cdp-instance.json`，供下次复用仍在托盘里的客户端。
7. 客户端窗口关闭（进程保留在托盘，下次可复用）。退出码恒为 0，避免计划任务报错噪音。

调试端口的坑：Chromium 绑定调试端口失败时会**静默关闭 DevTools**（不报错、也不写 `DevToolsActivePort`），
固定 9222 很容易撞上上一次实例留下的 TIME_WAIT。因此脚本每次启动前挑一个随机空闲端口，
并把它记进 `cdp-instance.json`，下次直接复用。

用法：

```powershell
# 手动签到
bun run 'D:\innate-workspace\refine-factory\scripts\workbuddy-checkin.ts'
# node 'D:\innate-workspace\refine-factory\scripts\workbuddy-checkin.ts'   # 同样可跑

# 只看状态 / 强制再调一次 / 打印原始返回
bun run 'D:\innate-workspace\refine-factory\scripts\workbuddy-checkin.ts' --status
$env:WB_CHECKIN_FORCE='1'; $env:WB_CHECKIN_DEBUG='1'
```

可用环境变量：`WB_CHECKIN_FORCE` / `WB_CHECKIN_STATUS_ONLY` / `WB_CHECKIN_DEBUG` /
`WB_CHECKIN_RESTART_RUNNING`（客户端在跑但没开调试端口时强制接管，默认跳过）/
`WB_CHECKIN_KEEP_APP`（签到后不隐藏窗口）/ `WB_CDP_PORT`（固定端口，默认 0 = 随机空闲端口）/ `WORKBUDDY_EXE`。

客户端若把启动参数交给了还活着的守护进程，调试端口就不会开；脚本对此有兜底：
换端口 + 等旧进程退干净后重启，最多试 3 次。

## 自动触发

已创建 Windows 计划任务（用户级，无需管理员）：

- 名称：`WorkBuddy Daily Checkin`
- 触发：每天 09:05（错过时间开机补跑）
- 动作：`D:\innate-workspace\refine-factory\scripts\run-workbuddy-checkin.cmd`
  （里面设置 `WB_CHECKIN_RESTART_RUNNING=1` 后调用 bun）

```powershell
schtasks /run /tn "WorkBuddy Daily Checkin"      # 手动触发
schtasks /query /tn "WorkBuddy Daily Checkin" /v # 查看上次结果
```

脚本自身幂等：当天已签到时只查状态不重复领取。

## 环境修复（本机必须，否则客户端起不来）

2026-11-02 实测本机 WorkBuddy 处于**自更新死循环**：

- 5.9.3 更新包已下载但安装器挂死（`WorkBuddy-Setup-5.9.3.42398134.exe /S --updated /UPDATE=1`，
  无提权时写 `C:\Program Files` 失败且无窗口，进程一直不退出）。
- 客户端启动时命中 `tryEarlySilentStartupUpdate` → 拉起安装器 → `app.quit()`，于是**每次启动都自杀**。

处理与后续：

1. 结束挂死的安装器进程，并手动跑一次安装包完成升级。
2. 期间临时用用户设置压住"启动即自更新"：`~/.workbuddy/app/app-config.json` 的
   `startupForceAutoUpdate: false`（对应 `SETTING_KEY_USER_STARTUP_FORCE_AUTO_UPDATE`，
   在 `resolveStartupForceAutoPreference()` 里优先级最高）。
   客户端日志：`Startup force auto-update: enabled=false source=user-setting`。
3. **最终 5.9.3 已安装成功**（`WorkBuddy.exe` ProductVersion = 5.9.3.0，app.asar 为 10/27 版本），
   客户端更新检查返回 `No update available (HTTP 204)`。
4. 因此 `startupForceAutoUpdate` 的临时开关已被**恢复默认**（app-config.json 回到
   `{"disableAgentTeams":false,"locale":"zh-CN"}`），WorkBuddy 恢复正常自动升级。

脚本里的这套逻辑是自适应的（`ensureStartupUpdateSetting()`）：

- 更新缓存里存在**版本更高**的待装包 → 临时关闭"启动强制自动更新"，避免客户端启动即自杀；
- 否则移除我们加过的开关，保持客户端默认行为；
- 启动过程中若客户端自行退出（多半是自更新），会重新评估并换端口重启，最多试 3 次。

另外注意：**客户端提权自更新会吃掉启动参数**（此时进程命令行在非提权视角下不可见，
调试端口也不会开）。这时换端口重启即可恢复，脚本已覆盖该场景。

## 验证记录

### 2026-11-03

- 客户端冷启动（进程未运行）→ 脚本自启动客户端、开随机调试端口（63612）→ 连上主窗口 → 最小化 →
  查状态 → 幂等跳过领取 → 写状态文件 → 关窗口留托盘进程，退出码 0。
  实测输出：`[status] 今日已签到=true｜连胜 14 天｜今日积分 100/100｜活动「Buddy应用」第 10 季`。
- 当日实际效果：连胜 13 → **14 天**，今日 100 积分到账（`today_checked_in=true, streak_days=14, today_credit=100`）。
- 计划任务 `MiniMax Code Daily Checkin` / `WorkBuddy Daily Checkin` 手动触发后 `Last Result: 0`。

### 2026-11-02

- 客户端直连接口验证：
  - `auth:getCheckinStatus` → `today_checked_in=true, streak_days=13, daily_credit=100, today_credit=100,
    total_credits=1300, activity_name="Buddy加油站", season=10, end_time=2026-12-31 23:59:59`。
  - `auth:claimDailyCheckin` → `{"code":10001,"msg":"今天已签到，请明天再来"}`（当天 17:43 客户端自身已领取 100 积分）。
- 历史规律：本地日志中 `daily-checkin` 领取请求出现在 10/10、10/13、10/14、10/19、11/02，
  与服务端 `checkin_dates` 一一对应，说明客户端启动后会自动签到一次；本脚本是确定性的补齐手段。
- 运行时：Bun 1.3.6 / 1.4.3 与 Node 24 均验证通过；计划任务
  `MiniMax Code Daily Checkin` / `WorkBuddy Daily Checkin` 手动触发后 `Last Result: 0`。

## 未证实 / 风险

- 客户端自动签到与本脚本同时命中时，服务端返回 10001，属正常幂等。
- 客户端窗口会短暂闪现（已最小化处理），完全无感需进一步调用主进程 API。
- 活动周期 2026-12-31 结束；届时接口可能下线或换活动，届时需重新逆向。
- 客户端若在签到时正好处在"提权自更新"窗口内，本次可能取不到调试端口；脚本会换端口重试，
  最坏情况下当天会退化为"由客户端自身在下次启动时签到"。
