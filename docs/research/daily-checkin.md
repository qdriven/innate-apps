# 每日签到自动化（mcode + WorkBuddy）

> 两个客户端的每日积分签到，统一用 **Bun 脚本 + Windows 计划任务**驱动，不再依赖 mcode hook。

## 总览

| 目标 | 脚本 | 计划任务 | 时间 | 状态文件 |
| --- | --- | --- | --- | --- |
| MiniMax Code（mcode）积分 | `scripts/daily-checkin.ts` | `MiniMax Code Daily Checkin` | 每天 09:00 | `~/.minimax/v2/hook-data/user/daily-checkin-state.json` |
| WorkBuddy（Buddy加油站）积分 | `scripts/workbuddy-checkin.ts` | `WorkBuddy Daily Checkin` | 每天 09:05 | `~/.workbuddy/checkin/daily-checkin-state.json` |

两者都满足：

- **Bun 优先**：`bun run scripts/xxx.ts`；Node 24+ 内置类型剥离，也能直接 `node scripts/xxx.ts`。
- **退出码恒为 0**：失败只写日志，不会让计划任务报错。
- **当天幂等**：状态文件记录当天结果，重复触发不会重复领取。
- **错过时间补跑**：计划任务开启 `StartWhenAvailable`，电脑睡眠/关机时错过时间会在开机后补跑。

## 直接运行

```powershell
# mcode
bun run scripts/daily-checkin.ts

# WorkBuddy
bun run scripts/workbuddy-checkin.ts
bun run scripts/workbuddy-checkin.ts --status   # 只查状态
```

计划任务入口是 `scripts/run-mcode-checkin.cmd` / `scripts/run-workbuddy-checkin.cmd`
（里面定位 bun 可执行文件并设置环境变量；脚本路径按 `%~dp0` 定位，可整仓迁移）。

常用环境变量：

| 变量 | 作用 |
| --- | --- |
| `MCODE_CHECKIN_FORCE=1` | mcode：当天已签也强制再跑一次 |
| `MCODE_CHECKIN_FORCE_REFRESH=1` | mcode：强制走 OAuth 刷新 token |
| `MCODE_CHECKIN_DEBUG=1` | mcode：打印原始接口返回 |
| `WB_CHECKIN_FORCE=1` | WorkBuddy：强制再调一次领取接口 |
| `WB_CHECKIN_STATUS_ONLY=1` | WorkBuddy：只查状态不领取 |
| `WB_CHECKIN_DEBUG=1` | WorkBuddy：打印原始返回 |
| `WB_CHECKIN_RESTART_RUNNING=1` | WorkBuddy：客户端在跑但没开调试端口时强制接管（计划任务已默认开启） |
| `WB_CHECKIN_KEEP_APP=1` | WorkBuddy：签到后不隐藏客户端窗口 |

## 计划任务管理

```powershell
schtasks /query /tn "MiniMax Code Daily Checkin" /v   # 查看
schtasks /run   /tn "WorkBuddy Daily Checkin"          # 手动触发
schtasks /delete /tn "WorkBuddy Daily Checkin" /f      # 删除
```

重建：

```powershell
$action = New-ScheduledTaskAction -Execute (Resolve-Path '.\scripts\run-workbuddy-checkin.cmd') -WorkingDirectory (Get-Location)
$trigger = New-ScheduledTaskTrigger -Daily -At '09:05'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 10) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'WorkBuddy Daily Checkin' -Action $action -Trigger $trigger -Settings $settings -Force
```

## mcode 侧要点

- 接口与签名与客户端 `/checkin` 命令一致：
  `GET/POST https://agent.minimaxi.com/minimax-cloud/api/v1/signin/{status,claim}`，
  请求头 `yy` / `x-timestamp` / `x-signature`（MD5）。
- token 来自 `~/.minimax/auth/prod/<region>/mcode-public/auth.json`，过期时走 OAuth 刷新。
- 回写刷新结果时**不递增记录里的 generation**：客户端的 `auth-state.json` 存着同一个 generation，
  改了会被判定为登录态异常。
- 账号身份（`realUserID`）缓存 6 小时：`daily-checkin-identity.json`。
- 调试开关：`MCODE_CHECKIN_FORCE` / `MCODE_CHECKIN_FORCE_REFRESH` / `MCODE_CHECKIN_DEBUG`。

### 踩坑记录：`path` → `pathname` 解构 bug

`.ts` 移植时，`signedRequest` 的选项解构误写成：

```ts
const { region, pathname, query, method = 'GET', body, style, token } = options;
```

而选项名其实是 `path`，`pathname` 恒为 `undefined`，导致请求打到 `undefined` 上：

```
GET undefined failed with HTTP 404
```

2026-11-03 10:26 的计划任务因此失败（`Last Result` 非 0）。修正为：

```ts
const { region, path: pathname, query, method = 'GET', body, style, token } = options;
```

修正后实测返回「第 4 天，今日已获得 1000 积分」，计划任务 `Last Result: 0`。
教训：解构重命名写成 `path: pathname` 时，重命名目标必须与下游用法一致，不能想当然地按同名写。

### 已移除的 hook

原先靠 mcode 用户级 hook 触发（`~/.minimax/hooks.json` 的 `SessionStart`），现已改为计划任务，
`hooks.json` 中的签到条目已清空（文件内容为 `{"enabled":true,"hooks":{}}`），
`~/.minimax/hooks/daily-checkin.mjs` 副本也已删除。需要恢复 hook 时，把下面片段加回 `hooks.json` 即可：

```json
{
  "enabled": true,
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "name": "MiniMax 每日签到",
            "command": "bun run \"$HOME/innate-workspace/refine-factory/scripts/daily-checkin.ts\"",
            "commandWindows": "%USERPROFILE%\\.bun\\bin\\bun.exe run %USERPROFILE%\\innate-workspace\\refine-factory\\scripts\\daily-checkin.ts",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## WorkBuddy 侧要点

见 [workbuddy-checkin.md](workbuddy-checkin.md)：接口逆向、为什么必须借助官方客户端、
CDP 通道、调试端口策略与客户端自动更新的处理。

## 仓库约定

- `scripts/` 默认不入库（`.gitignore` 中 `/scripts/*`），
  仅白名单下列出的仓库级脚本纳入版本管理：
  `validate-registry.mjs`、`package.json`、`daily-checkin.ts`、`workbuddy-checkin.ts`、
  `workbuddy-cdp.ts`、`run-mcode-checkin.cmd`、`run-workbuddy-checkin.cmd`；
  文档在 `docs/research/` 下会被跟踪。
- 脚本与文档统一使用 CRLF 行尾。
- `.cmd` 入口不写死用户名与仓库路径：脚本路径用 `%~dp0`（脚本所在目录），
  bun 依次从 `PATH`、`%USERPROFILE%\.bun\bin`、`%LOCALAPPDATA%\bun\bin`、
  `%USERPROFILE%\.local\opt\node\node_modules\bun\bin` 中查找，
  因此仓库整体迁移到别的机器也能直接用。
- 敏感信息：脚本与文档都不落 token 明文，只记录长度 / 前缀等元信息；
  日志同理。唯一的常量是 mcode 客户端签名用的 `SIGN_SALT`（属于客户端公开常量，非用户凭据）。
