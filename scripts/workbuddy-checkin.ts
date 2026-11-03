#!/usr/bin/env bun
/**
 * WorkBuddy（腾讯 Buddy 加油站）每日签到 —— Bun / Node 双兼容脚本。
 *
 * 运行方式：
 *   bun run scripts/workbuddy-checkin.ts
 *   node scripts/workbuddy-checkin.ts          # Node 24+ 内置类型剥离，同样可跑
 *
 * 日常触发：Windows 计划任务「WorkBuddy Daily Checkin」（每天 09:05）。
 *
 * 原理：签到接口需要 WorkBuddy 账号的 SSO Bearer 与设备风控令牌，这些只存在于官方客户端进程内，
 * 落盘部分用编译期内置的对称密钥加密、无法在进程外解密。
 * 所以本脚本不去破解凭据，而是**驱动官方客户端自己发请求**：
 * 启动（复用）官方客户端 → 通过 Chrome DevTools Protocol 调用渲染进程里的官方 IPC 通道
 *   wb.invoke('auth:getCheckinStatus')   查询今日签到状态
 *   wb.invoke('auth:claimDailyCheckin')  领取今日奖励
 * → 关闭窗口（进程保留在托盘，下次可复用）。
 *
 * 用法：
 *   --status   只查询状态不领取
 *   --force    强制再调一次领取接口
 *
 * 环境变量：
 *   WB_CHECKIN_FORCE=1            等价 --force
 *   WB_CHECKIN_STATUS_ONLY=1      等价 --status
 *   WB_CHECKIN_DEBUG=1            打印原始返回
 *   WB_CHECKIN_RESTART_RUNNING=1  客户端在运行但未开调试端口时，强制重启它（默认跳过）
 *   WB_CHECKIN_KEEP_APP=1         签到后不隐藏客户端窗口
 *   WB_CDP_PORT=0                 固定调试端口（默认 0 = 每次随机空闲端口）
 *   WORKBUDDY_EXE                 指定 WorkBuddy.exe 路径
 */

import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

type Json = any;

type CheckinStatus = {
  active?: boolean;
  today_checked_in?: boolean;
  streak_days?: number;
  daily_credit?: number;
  today_credit?: number;
  checkin_dates?: string[];
  total_credits?: number;
  season?: number;
  activity_name?: string;
  end_time?: string;
};

type ClaimResult = { code?: number; msg?: string; credit?: number; streak_days?: number };

type CdpTarget = { type: string; title?: string; url?: string; webSocketDebuggerUrl?: string };

const WANT_PORT = Number(process.env.WB_CDP_PORT || 0);
const HOME_DIR = process.env.WORKBUDDY_HOME || path.join(os.homedir(), '.workbuddy');
const USER_DATA_DIR = path.join(HOME_DIR, 'app');
const STATE_DIR = path.join(HOME_DIR, 'checkin');
const STATE_FILE = path.join(STATE_DIR, 'daily-checkin-state.json');
const CDP_STATE_FILE = path.join(STATE_DIR, 'cdp-instance.json');
const LOG_FILE = path.join(STATE_DIR, 'daily-checkin.log');
const APP_CONFIG = path.join(USER_DATA_DIR, 'app-config.json');

const argv = new Set(process.argv.slice(2));
const FORCE = argv.has('--force') || process.env.WB_CHECKIN_FORCE === '1';
const STATUS_ONLY = argv.has('--status') || process.env.WB_CHECKIN_STATUS_ONLY === '1';
const DEBUG = process.env.WB_CHECKIN_DEBUG === '1';
const KEEP_APP = process.env.WB_CHECKIN_KEEP_APP === '1';
const RESTART_RUNNING = process.env.WB_CHECKIN_RESTART_RUNNING === '1';

const log = (...args: unknown[]): void => {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
  console.log(line);
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `${line}\n`, 'utf8');
  } catch {
    /* 日志失败不影响主流程 */
  }
};

const today = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/* ------------------------------------------------------------------ 客户端路径 */

function findWorkBuddyExe(): string | null {
  const candidates: string[] = [];
  if (process.env.WORKBUDDY_EXE) candidates.push(process.env.WORKBUDDY_EXE);
  const pf = process.env.ProgramFiles || 'C:\\Program Files';
  const pf86 = process.env['ProgramFiles(x86)'];
  candidates.push(path.join(pf, 'WorkBuddy', 'WorkBuddy.exe'));
  if (pf86) candidates.push(path.join(pf86, 'WorkBuddy', 'WorkBuddy.exe'));
  for (const c of candidates) if (c && fs.existsSync(c)) return c;
  return null;
}

/**
 * 处理「启动时强制自动更新」。
 *
 * 客户端启动时若发现待装更新包，会静默拉起安装器并立刻退出（自更新自杀循环）；
 * 无提权时安装器还会挂死。可行解法是关掉这个开关，等客户端正常运行后再在会话内更新。
 * 但只在**确实存在更高版本的待装包**时才关；否则保持默认，让客户端能正常自动升级。
 */
function ensureStartupUpdateSetting(): void {
  try {
    let cfg: Json = {};
    if (fs.existsSync(APP_CONFIG)) {
      cfg = JSON.parse(fs.readFileSync(APP_CONFIG, 'utf8')) || {};
    }
    const pending = findPendingInstaller();
    const installed = readInstalledVersion();
    const needsBlock = pending && installed && compareVersions(pending.version, installed) > 0;

    if (needsBlock) {
      if (cfg.startupForceAutoUpdate === false) return;
      cfg.startupForceAutoUpdate = false;
      fs.mkdirSync(path.dirname(APP_CONFIG), { recursive: true });
      fs.writeFileSync(APP_CONFIG, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
      log(`[setup] 存在待装更新包 ${pending.version}（当前 ${installed}），已关闭「启动时强制自动更新」`);
      return;
    }

    if (cfg.startupForceAutoUpdate === false) {
      delete cfg.startupForceAutoUpdate;
      fs.writeFileSync(APP_CONFIG, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
      log('[setup] 已恢复客户端默认的自动更新设置');
    }
  } catch (e: any) {
    log('[setup] 调整 app-config.json 失败（不致命）：', e.message);
  }
}

/** 更新缓存里待装的安装包（文件名形如 WorkBuddy-Setup-5.9.3.42398134.exe） */
function findPendingInstaller(): { version: string; file: string } | null {
  const tmp = os.tmpdir();
  let dirs: string[] = [];
  try {
    dirs = fs
      .readdirSync(tmp)
      .filter((name) => name.startsWith('workbuddy-update-'))
      .map((name) => path.join(tmp, name));
  } catch {
    return null;
  }
  for (const dir of dirs) {
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of files) {
      const m = /^WorkBuddy-Setup-(.+)\.exe$/i.exec(name);
      if (m) return { version: m[1], file: path.join(dir, name) };
    }
  }
  return null;
}

/** 当前已安装版本（install-manifest.json 里有 appVersion） */
function readInstalledVersion(): string | null {
  try {
    const exe = findWorkBuddyExe();
    if (!exe) return null;
    const manifest = path.join(path.dirname(exe), 'resources', 'install-manifest.json');
    const obj = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    return typeof obj?.appVersion === 'string' ? obj.appVersion : null;
  } catch {
    return null;
  }
}

/** 语义化版本比较：只比 major.minor.patch 三段（构建号不比，5.9.3 与 5.9.3.42398134 视为同版本） */
function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map((x) => Number(x) || 0).slice(0, 3);
  const pb = b.split(/[.-]/).map((x) => Number(x) || 0).slice(0, 3);
  for (let i = 0; i < 3; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

/* -------------------------------------------------------------------- CDP */

async function tryCdpPort(port: number): Promise<CdpTarget[] | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const targets = (await res.json()) as CdpTarget[];
    return Array.isArray(targets) && targets.length ? targets : null;
  } catch {
    return null;
  }
}

/** 读取 Chromium 写下的实际调试端口（客户端可能把端口改成随机值） */
function readDevToolsPortFile(): number | null {
  try {
    const p = path.join(USER_DATA_DIR, 'DevToolsActivePort');
    if (!fs.existsSync(p)) return null;
    const first = fs.readFileSync(p, 'utf8').split(/\r?\n/)[0]?.trim();
    return first && /^\d+$/.test(first) ? Number(first) : null;
  } catch {
    return null;
  }
}

/** 读取上次记录的调试端口（客户端关窗后仍在托盘运行，端口不变） */
function readSavedCdpPort(): number | null {
  try {
    if (!fs.existsSync(CDP_STATE_FILE)) return null;
    const obj = JSON.parse(fs.readFileSync(CDP_STATE_FILE, 'utf8'));
    return Number.isInteger(obj?.port) && obj.port > 0 ? obj.port : null;
  } catch {
    return null;
  }
}

function saveCdpPort(port: number, pid?: number): void {
  try {
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(
      CDP_STATE_FILE,
      `${JSON.stringify({ port, pid: pid ?? null, updatedAt: new Date().toISOString() }, null, 2)}\n`,
      'utf8',
    );
  } catch {
    /* ignore */
  }
}

/** 探测可用调试端口：候选端口 → 上次记录 → DevToolsActivePort 文件 */
async function discoverCdp(candidatePort?: number): Promise<{ port: number; targets: CdpTarget[] } | null> {
  const candidates: number[] = [];
  if (candidatePort) candidates.push(candidatePort);
  if (WANT_PORT) candidates.push(WANT_PORT);
  const saved = readSavedCdpPort();
  if (saved) candidates.push(saved);
  const filePort = readDevToolsPortFile();
  if (filePort) candidates.push(filePort);
  for (const port of [...new Set(candidates)]) {
    const t = await tryCdpPort(port);
    if (t) return { port, targets: t };
  }
  return null;
}

function evaluate(target: CdpTarget, expression: string, { timeoutMs = 30000 } = {}): Promise<Json> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(target.webSocketDebuggerUrl!);
    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error('CDP evaluate 超时'));
    }, timeoutMs);
    let done = false;

    ws.addEventListener('open', () => {
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: { expression, awaitPromise: true, returnByValue: true, userGesture: true },
        }),
      );
    });
    ws.addEventListener('message', (ev: any) => {
      let msg: Json;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id !== 1) return;
      done = true;
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (msg.error) return reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
      const details = msg.result?.exceptionDetails;
      if (details) {
        return reject(new Error(details.exception?.description || details.text || 'page exception'));
      }
      resolve(msg.result?.result?.value);
    });
    ws.addEventListener('error', () => {
      if (done) return;
      clearTimeout(timer);
      reject(new Error('CDP WebSocket 错误'));
    });
  });
}

/** 在页面目标里找到暴露 wb API 的主窗口 */
async function findAppTarget(targets: CdpTarget[], timeoutMs = 60000): Promise<CdpTarget> {
  const deadline = Date.now() + timeoutMs;
  let lastErr = '没有可用的页面目标';
  while (Date.now() < deadline) {
    const pages = (targets || []).filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    for (const page of pages) {
      try {
        const probe = await evaluate(page, 'typeof window.wb === "object" ? 1 : 0', { timeoutMs: 8000 });
        if (probe === 1) return page;
      } catch (e: any) {
        lastErr = e.message;
      }
    }
    const cdp = await discoverCdp();
    if (!cdp) {
      await sleep(1500);
      continue;
    }
    targets = cdp.targets;
  }
  throw new Error(`未找到 WorkBuddy 主窗口：${lastErr}`);
}

/* -------------------------------------------------------------- 客户端生命周期 */

function isAppRunning(): boolean {
  try {
    const out = execFileSync('tasklist', ['/FI', 'IMAGENAME eq WorkBuddy.exe', '/NH'], {
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return /WorkBuddy\.exe/i.test(out);
  } catch {
    return false;
  }
}

function killApp(): void {
  try {
    execFileSync('taskkill', ['/IM', 'WorkBuddy.exe', '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
  } catch {
    /* 忽略 */
  }
}

/** 等客户端进程真正退干净：守护进程残留会把新实例的启动参数吃掉 */
async function waitAppExit(timeoutMs = 30000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAppRunning()) return true;
    await sleep(1000);
  }
  return !isAppRunning();
}

function launchApp(exe: string, port: number): number {
  const child = spawn(exe, [`--remote-debugging-port=${port}`], { detached: true, stdio: 'ignore' });
  child.unref();
  log(`[launch] 已启动客户端：${exe} (pid=${child.pid}, 调试端口 ${port})`);
  return child.pid!;
}

/**
 * 选一个当前空闲的端口。
 * Chromium 绑定调试端口失败时会静默关闭 DevTools（不报错、不写 DevToolsActivePort），
 * 固定端口容易撞上上次实例留下的 TIME_WAIT，所以每次用随机空闲端口。
 */
function pickFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}

/**
 * 启动客户端并等待调试端口就绪。
 * 客户端若把启动参数交给了还活着的守护进程，调试端口就不会开，
 * 这时换端口 + 等旧进程退干净后重启即可恢复。
 */
async function launchAndConnect(exe: string, attempts = 3): Promise<{ port: number; targets: CdpTarget[] }> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const port = WANT_PORT || (await pickFreePort());
    const pid = launchApp(exe, port);
    saveCdpPort(port, pid);
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const cdp = await discoverCdp(port);
      if (cdp) return cdp;
      if (!isAppRunning()) break; // 客户端自己退了（多半是自更新）
      await sleep(2000);
    }
    log(`[launch] 第 ${attempt}/${attempts} 次启动未就绪调试端口`);
    if (attempt === attempts) break;
    // 重新评估：若待装更新包会触发"启动即自杀"，先关掉它再重试
    ensureStartupUpdateSetting();
    killApp();
    await waitAppExit();
    await sleep(5000);
  }
  if (!isAppRunning()) throw new Error('客户端启动后立刻退出，请查看 ~/.workbuddy/logs 下的日志');
  throw new Error('客户端已启动，但调试端口始终未就绪（可能是端口绑定失败或提权重启吃掉了启动参数）');
}

/* ------------------------------------------------------------------- 主流程 */

async function main(): Promise<number> {
  ensureStartupUpdateSetting();

  const exe = findWorkBuddyExe();
  if (!exe) throw new Error('未找到 WorkBuddy.exe（可用 WORKBUDDY_EXE 指定）');

  let startedByUs = false;
  let cdp = await discoverCdp();

  if (cdp) {
    log(`[connect] 复用已在运行的客户端（调试端口 ${cdp.port}）`);
  } else {
    if (isAppRunning()) {
      if (!RESTART_RUNNING) {
        log('[skip] 客户端正在运行但未开启调试端口（多半是你手动打开的），本次跳过；');
        log('       WorkBuddy 自身在启动时也会自动签到，通常不受影响。');
        log('       需要强制接管请设 WB_CHECKIN_RESTART_RUNNING=1。');
        return 0;
      }
      log('[restart] 客户端正在运行但未开启调试端口，强制重启以接管');
      killApp();
      await waitAppExit();
      await sleep(5000);
    }
    startedByUs = true;
    cdp = await launchAndConnect(exe);
    log(`[connect] 已连接客户端（调试端口 ${cdp.port}）`);
  }

  const target = await findAppTarget(cdp.targets, 60000);
  log(`[connect] 主窗口：${(target.url || '').slice(0, 90)}`);

  if (startedByUs && !KEEP_APP) {
    try {
      await evaluate(
        target,
        '(async()=>{const w=await window.workbuddyDesktop.window.getCurrentWindow();await w.minimize();return 1})()',
      );
      log('[window] 窗口已最小化（后台静默运行）');
    } catch (e: any) {
      log('[window] 最小化失败（不影响签到）：', e.message);
    }
  }

  const rawStatus = await evaluate(target, '(async()=>await window.wb.invoke("auth:getCheckinStatus"))()');
  const status = (typeof rawStatus === 'string' ? JSON.parse(rawStatus) : rawStatus) as CheckinStatus;
  if (DEBUG) log('[debug] status =', JSON.stringify(status));

  const alreadyToday = Boolean(status?.today_checked_in);
  log(
    `[status] 今日已签到=${alreadyToday}｜连胜 ${status?.streak_days ?? '-'} 天｜` +
      `今日积分 ${status?.today_credit ?? 0}/${status?.daily_credit ?? '-'}｜` +
      `活动「${status?.activity_name ?? '-'}」第 ${status?.season ?? '-'} 季（${status?.end_time ?? '-'} 截止）`,
  );

  let claim: ClaimResult | null = null;
  if (!STATUS_ONLY && (!alreadyToday || FORCE)) {
    const rawClaim = await evaluate(target, '(async()=>await window.wb.invoke("auth:claimDailyCheckin"))()');
    claim = (typeof rawClaim === 'string' ? JSON.parse(rawClaim) : rawClaim) as ClaimResult;
    if (DEBUG) log('[debug] claim =', JSON.stringify(claim));
    if (claim?.code === 0) {
      log(`[claim] 签到成功，获得 ${claim.credit ?? 0} 积分，连胜 ${claim.streak_days ?? '-'} 天`);
    } else if (claim?.code === 10001) {
      log('[claim] 服务端提示今天已签到（code=10001）');
    } else {
      log(`[claim] 领取未成功：code=${claim?.code} msg=${claim?.msg ?? '-'}`);
    }
  } else if (STATUS_ONLY) {
    log('[claim] --status 模式，未执行领取');
  } else {
    log('[claim] 今日已签到，跳过领取');
  }

  const after = await evaluate(target, '(async()=>await window.wb.invoke("auth:getCheckinStatus"))()');
  const finalStatus = (typeof after === 'string' ? JSON.parse(after) : after) as CheckinStatus;

  const state = {
    date: today(),
    checkedIn: Boolean(finalStatus?.today_checked_in),
    todayCredit: finalStatus?.today_credit ?? 0,
    dailyCredit: finalStatus?.daily_credit ?? 0,
    streakDays: finalStatus?.streak_days ?? 0,
    totalCredits: finalStatus?.total_credits ?? 0,
    claimCode: claim?.code ?? null,
    updatedAt: new Date().toISOString(),
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  log(`[done] 状态已写入 ${STATE_FILE}`);

  if (startedByUs && !KEEP_APP) {
    try {
      await evaluate(
        target,
        '(async()=>{const w=await window.workbuddyDesktop.window.getCurrentWindow();await w.close();return 1})()',
      );
      log('[close] 客户端窗口已关闭（进程保留在托盘，可继续复用）');
    } catch (e: any) {
      log('[close] 关闭窗口失败（不影响签到）：', e.message);
    }
  }
  return 0;
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err: any) => {
    log('[error]', err?.stack || String(err));
    process.exit(0); // 定时任务下不制造噪音失败退出
  });
