@echo off
REM WorkBuddy 每日签到 —— 计划任务入口
REM 计划任务：WorkBuddy Daily Checkin（每天 09:05）
REM WB_CHECKIN_RESTART_RUNNING=1：若客户端在运行但没开调试端口，强制重启接管，
REM 否则本次跳过（WorkBuddy 自己在启动时也会签到，但跨天运行时可能漏签）。
setlocal
set "WB_CHECKIN_RESTART_RUNNING=1"
REM 脚本路径以本文件所在目录为准（%~dp0），便于仓库整体迁移
set "SCRIPT=%~dp0workbuddy-checkin.ts"
REM 优先用 PATH 上的 bun，其次用常见安装位置
set "BUN="
where bun.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 set "BUN=bun.exe"
if not defined BUN if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not defined BUN if exist "%LOCALAPPDATA%\bun\bin\bun.exe" set "BUN=%LOCALAPPDATA%\bun\bin\bun.exe"
if not defined BUN if exist "%USERPROFILE%\.local\opt\node\node_modules\bun\bin\bun.exe" set "BUN=%USERPROFILE%\.local\opt\node\node_modules\bun\bin\bun.exe"
if not defined BUN (
  echo [workbuddy-checkin] bun not found, skipped.
  exit /b 0
)
"%BUN%" run "%SCRIPT%"
exit /b %ERRORLEVEL%
