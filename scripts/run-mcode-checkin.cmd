@echo off
REM MiniMax Code (mcode) 每日签到 —— 计划任务入口
REM 计划任务：MiniMax Code Daily Checkin（每天 09:00）
setlocal
REM 脚本路径以本文件所在目录为准（%~dp0），便于仓库整体迁移
set "SCRIPT=%~dp0daily-checkin.ts"
REM 优先用 PATH 上的 bun，其次用常见安装位置
set "BUN="
where bun.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 set "BUN=bun.exe"
if not defined BUN if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not defined BUN if exist "%LOCALAPPDATA%\bun\bin\bun.exe" set "BUN=%LOCALAPPDATA%\bun\bin\bun.exe"
if not defined BUN if exist "%USERPROFILE%\.local\opt\node\node_modules\bun\bin\bun.exe" set "BUN=%USERPROFILE%\.local\opt\node\node_modules\bun\bin\bun.exe"
if not defined BUN (
  echo [daily-checkin] bun not found, skipped.
  exit /b 0
)
"%BUN%" run "%SCRIPT%"
exit /b %ERRORLEVEL%
