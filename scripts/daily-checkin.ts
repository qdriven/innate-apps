#!/usr/bin/env bun
/**
 * MiniMax Code (mcode) 每日自动签到 —— Bun / Node 双兼容脚本。
 *
 * 运行方式：
 *   bun run scripts/daily-checkin.ts
 *   node scripts/daily-checkin.ts            # Node 24+ 内置类型剥离，同样可跑
 *
 * 日常触发：Windows 计划任务「MiniMax Code Daily Checkin」（每天 09:00）。
 * 也可手动执行，或被 skill / 其它脚本调用。
 *
 * 调用与 TUI `/checkin` 命令相同的接口：
 *   GET  https://agent.minimaxi.com/minimax-cloud/api/v1/signin/status
 *   POST https://agent.minimaxi.com/minimax-cloud/api/v1/signin/claim
 *
 * 请求签名与 mcode 客户端一致（yy / x-timestamp / x-signature，MD5）。
 *
 * 鉴权：access token 从 <data-dir>/auth/prod/<region>/mcode-public/auth.json 读取；
 * 过期时通过 MiniMax 账号 OAuth token 接口刷新。Token 不会被打印或写入日志。
 *
 * 退出码始终为 0，签到失败不会阻塞其它任务。
 * 状态与日志：<data-dir>/v2/hook-data/user/daily-checkin-{state,log}.json|.log
 */

import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const APP_VERSION = '0.7.4';
const CLIENT_ID = 'mcode-public';
const SCOPE = 'agent.default';
const AUDIENCE = 'agent-backend';
const SIGN_SALT = 'I*7Cf%WZ#S&%1RlZJ&C2';

const ORIGIN: Record<string, string> = {
  cn: 'https://agent.minimaxi.com',
  en: 'https://agent.minimax.io',
};
const ACCOUNT_ORIGIN: Record<string, string> = {
  cn: 'https://account.minimax.cn',
  en: 'https://account.minimax.io',
};

const STARTED_AT = Date.now();
const BUDGET_MS = 8500;
const IDENTITY_TTL_MS = 6 * 60 * 60 * 1000;

type Json = any;

const md5 = (value: string): string => createHash('md5').update(value).digest('hex');

function remainingMs(): number {
  return BUDGET_MS - (Date.now() - STARTED_AT);
}

function dataDir(): string {
  const explicit = process.env.MINIMAX_DATA_DIR?.trim() || process.env.MAVIS_DATA_DIR?.trim();
  return explicit || path.join(homedir(), '.minimax');
}

function stateDir(): string {
  return process.env.MINIMAX_HOOKS_DATA?.trim() || path.join(dataDir(), 'v2', 'hook-data', 'user');
}

function log(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  const target = path.join(stateDir(), 'daily-checkin.log');
  appendFile(target, line).catch(() => {});
  process.stderr.write(`[daily-checkin] ${message}\n`);
}

async function readJson(file: string): Promise<Json | null> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return null;
  }
}

async function writeJsonAtomic(file: string, value: Json): Promise<void> {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ------------------------------------------------------------------ auth */

async function resolveRegion(): Promise<string> {
  const state = await readJson(path.join(dataDir(), 'auth', 'prod', 'region-scan.json'));
  if (state?.region) return state.region;
  const { readdir } = await import('node:fs/promises');
  try {
    const dirs = await readdir(path.join(dataDir(), 'auth', 'prod'));
    const region = dirs.find((name) => name === 'cn' || name === 'en');
    if (region) return region;
  } catch {
    /* fall through */
  }
  return 'cn';
}

function authFilePath(region: string): string {
  return path.join(dataDir(), 'auth', 'prod', region, 'mcode-public', 'auth.json');
}

function pickRecord(document: Json): { key: string; record: Json } | null {
  const records = document?.records;
  if (!records || typeof records !== 'object') return null;
  let best: { key: string; record: Json } | null = null;
  for (const [key, record] of Object.entries(records as Record<string, Json>)) {
    if (!record || typeof record !== 'object') continue;
    if (!best || Number(record.generation ?? 0) > Number(best.record.generation ?? 0)) {
      best = { key, record };
    }
  }
  return best;
}

async function loadAuth(region: string): Promise<{ file: string; document: Json; key: string; record: Json }> {
  const file = authFilePath(region);
  const document = await readJson(file);
  const picked = pickRecord(document);
  if (!picked) throw new Error('no MiniMax OAuth record found; run "mcode login"');
  return { file, document, ...picked };
}

async function refreshAccessToken(
  region: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresAtMs?: number }> {
  const response = await fetch(`${ACCOUNT_ORIGIN[region]}/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'MiniMaxCode',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      scope: SCOPE,
      audience: AUDIENCE,
    }).toString(),
    signal: AbortSignal.timeout(Math.min(4000, Math.max(1000, remainingMs()))),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`OAuth refresh failed with HTTP ${response.status}`);
  let payload: Json;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('OAuth refresh returned a non-JSON response');
  }
  const accessToken = payload?.access_token;
  if (!accessToken) throw new Error('OAuth refresh returned no access token');
  const expiresInSeconds = Number(payload?.expires_in);
  return {
    accessToken,
    refreshToken: typeof payload?.refresh_token === 'string' ? payload.refresh_token : undefined,
    expiresAtMs:
      Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
        ? Date.now() + expiresInSeconds * 1000
        : undefined,
  };
}

async function ensureAccessToken(region: string): Promise<{ accessToken: string; region: string }> {
  const auth = await loadAuth(region);
  const token = auth.record.accessToken?.trim();
  const expiresAtMs = Number(auth.record.expiresAtMs);
  const force = process.env.MCODE_CHECKIN_FORCE_REFRESH === '1';
  if (!force && token && Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() > 60_000) {
    return { accessToken: token, region };
  }

  const refreshToken = auth.record.refreshToken?.trim();
  if (!refreshToken) throw new Error('access token expired and no refresh token; run "mcode login"');

  let refreshed: Awaited<ReturnType<typeof refreshAccessToken>>;
  try {
    refreshed = await refreshAccessToken(region, refreshToken);
  } catch (error) {
    // 客户端可能并发刷新并轮换了 token：重新读一次本地凭据再判断。
    const retry = await loadAuth(region);
    const retryToken = retry.record.accessToken?.trim();
    const retryExpiry = Number(retry.record.expiresAtMs);
    if (retryToken && Number.isFinite(retryExpiry) && retryExpiry - Date.now() > 60_000) {
      return { accessToken: retryToken, region };
    }
    throw error;
  }

  // 只有服务端轮换了 refresh token 时才回写，避免破坏客户端自己的凭据库。
  // 以 record generation 做 compare-and-swap，且**不递增 generation**：
  // auth-state.json 里存着同一个 generation，改了会被客户端判定为登录态异常。
  log(
    `OAuth refresh succeeded (rotated refresh token: ${refreshed.refreshToken ? 'yes' : 'no'})`,
  );
  if (refreshed.refreshToken) {
    const latest = await readJson(auth.file);
    const latestPicked = pickRecord(latest);
    if (
      latestPicked &&
      latestPicked.key === auth.key &&
      Number(latestPicked.record.generation ?? 0) === Number(auth.record.generation ?? 0)
    ) {
      latestPicked.record.accessToken = refreshed.accessToken;
      latestPicked.record.refreshToken = refreshed.refreshToken;
      if (refreshed.expiresAtMs) latestPicked.record.expiresAtMs = refreshed.expiresAtMs;
      try {
        await writeJsonAtomic(auth.file, latest);
        log('refreshed OAuth access token and updated the local auth store');
      } catch (error: any) {
        log(`could not persist the refreshed token: ${error?.message}`);
      }
    }
  }

  return { accessToken: refreshed.accessToken, region };
}

/* --------------------------------------------------------------- requests */

function commonQuery(nowMs: number, region: string, realUserId: string | null): Record<string, string> {
  const lang = region === 'cn' ? 'zh' : 'en';
  return {
    biz_id: '3',
    app_id: '3001',
    version_code: '22201',
    unix: String(nowMs),
    timezone_offset: String(new Date().getTimezoneOffset() * -60),
    sys_language: lang,
    lang,
    device_id: '0',
    os_name: process.platform,
    browser_name: 'mcode',
    user_id: realUserId?.trim() || '0',
    client: 'mcode',
  };
}

/**
 * style "client" 复现账号身份接口的签名；
 * style "signin" 复现签到接口的签名。
 */
async function signedRequest(options: {
  region: string;
  path: string;
  query: Record<string, string>;
  method?: 'GET' | 'POST';
  body?: string;
  style: 'client' | 'signin';
  token: string;
}): Promise<Json> {
  const { region, path: pathname, query, method = 'GET', body, style, token } = options;
  const nowMs = Date.now();
  const url = new URL(pathname, ORIGIN[region]);
  url.search = new URLSearchParams(query).toString();
  const signed = `${url.pathname}${url.search}`;
  const ts = Math.floor(nowMs / 1000);
  const bodyText = body === undefined ? undefined : body;

  let yy: string;
  let signature: string;
  if (style === 'client') {
    yy = md5(`${encodeURIComponent(signed)}_${md5(String(nowMs) + 'ooui')}`);
    signature = md5(`${ts}${SIGN_SALT}`);
  } else {
    const payload = bodyText ?? '{}';
    yy = md5(`${encodeURIComponent(signed)}_${payload}${md5(String(nowMs) + 'ooui')}`);
    signature = md5(`${ts}${SIGN_SALT}${bodyText ?? ''}`);
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MiniMaxCode',
      Authorization: `Bearer ${token}`,
      yy,
      'x-timestamp': String(ts),
      'x-signature': signature,
    },
    ...(bodyText === undefined ? {} : { body: bodyText }),
    signal: AbortSignal.timeout(Math.min(3000, Math.max(800, remainingMs()))),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${pathname} failed with HTTP ${response.status}`);
  let payload: Json;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`${method} ${pathname} returned a non-JSON response`);
  }
  const statusCode = payload?.base_resp?.status_code;
  if (typeof statusCode === 'number' && statusCode !== 0) {
    throw new Error(payload?.base_resp?.status_msg || `${pathname} returned status ${statusCode}`);
  }
  return payload?.data;
}

/* -------------------------------------------------------------- identity */

async function resolveRealUserId(region: string, token: string): Promise<string> {
  const cacheFile = path.join(stateDir(), 'daily-checkin-identity.json');
  const cached = await readJson(cacheFile);
  if (
    cached?.realUserId &&
    Number.isFinite(Number(cached.fetchedAtMs)) &&
    Date.now() - Number(cached.fetchedAtMs) < IDENTITY_TTL_MS
  ) {
    return cached.realUserId;
  }

  const nowMs = Date.now();
  const query = { device_platform: 'mcode', ...commonQuery(nowMs, region, null) };
  const data = await signedRequest({
    region,
    path: '/v1/api/user/info',
    query,
    method: 'GET',
    style: 'client',
    token,
  });

  const userInfo =
    data?.userInfo ?? data?.user_info ?? data?.data?.userInfo ?? data?.data?.user_info ?? data;
  const realUserId = userInfo?.realUserID ?? userInfo?.real_user_id;
  if (!realUserId) throw new Error('account identity response contained no account id');

  try {
    await mkdir(stateDir(), { recursive: true });
    await writeJsonAtomic(cacheFile, { realUserId, fetchedAtMs: Date.now() });
  } catch {
    /* cache is optional */
  }
  return realUserId;
}

/* ---------------------------------------------------------------- signin */

function signinQuery(region: string, realUserId: string): Record<string, string> {
  const nowMs = Date.now();
  return {
    device_platform: 'web',
    ...commonQuery(nowMs, region, realUserId),
    is_desktop: '1',
    desktop_version: APP_VERSION,
  };
}

// 面板日状态（客户端枚举）：1 = Upcoming, 2 = Claimable, 3 = Claimed, 4 = Disabled。
// 领取结果（客户端枚举）：1 = Claimed, 2 = AlreadyClaimed。
const DAY_STATUS = { UPCOMING: 1, CLAIMABLE: 2, CLAIMED: 3, DISABLED: 4 };
const CLAIM_RESULT = { CLAIMED: 1, ALREADY_CLAIMED: 2 };

type CheckinResult = {
  outcome: 'claimed' | 'already-claimed' | 'unavailable';
  points: number | null;
  dayNo: number | null;
  expireAtMs?: number | null;
};

function readPanelState(data: Json): { claimed: boolean; claimable: boolean; dayNo: number | null; points: number | null } {
  const panel = data?.panel && typeof data.panel === 'object' ? data.panel : data;
  const days = Array.isArray(panel?.days) ? panel.days : [];
  if (!days.length) return { claimed: false, claimable: false, dayNo: null, points: null };
  const today = days.find((day: Json) => day?.is_today === true);
  return {
    claimed: today?.status === DAY_STATUS.CLAIMED,
    claimable: days.some((day: Json) => day?.status === DAY_STATUS.CLAIMABLE),
    dayNo: today?.day_no ?? null,
    points: today?.points ?? null,
  };
}

async function runCheckin(region: string, token: string, realUserId: string): Promise<CheckinResult> {
  const status = await signedRequest({
    region,
    path: '/minimax-cloud/api/v1/signin/status',
    query: signinQuery(region, realUserId),
    method: 'GET',
    style: 'signin',
    token,
  });
  if (process.env.MCODE_CHECKIN_DEBUG === '1') log(`status payload: ${JSON.stringify(status)}`);

  const panelState = readPanelState(status);
  if (panelState.claimed) {
    return {
      outcome: 'already-claimed',
      points: panelState.points ?? status?.points ?? null,
      dayNo: panelState.dayNo ?? null,
    };
  }
  if (!panelState.claimable) {
    return { outcome: 'unavailable', points: null, dayNo: panelState.dayNo ?? null };
  }

  const claim = await signedRequest({
    region,
    path: '/minimax-cloud/api/v1/signin/claim',
    query: signinQuery(region, realUserId),
    method: 'POST',
    body: '{}',
    style: 'signin',
    token,
  });
  if (process.env.MCODE_CHECKIN_DEBUG === '1') log(`claim payload: ${JSON.stringify(claim)}`);

  const claimResult = claim?.claim_result ?? claim?.claimResult;
  if (claimResult === CLAIM_RESULT.ALREADY_CLAIMED) {
    return { outcome: 'already-claimed', points: claim?.points ?? null, dayNo: claim?.day_no ?? null };
  }
  if (typeof claimResult === 'string' && /already/i.test(claimResult)) {
    return { outcome: 'already-claimed', points: claim?.points ?? null, dayNo: claim?.day_no ?? null };
  }
  return {
    outcome: 'claimed',
    points: claim?.points ?? null,
    dayNo: claim?.day_no ?? null,
    expireAtMs: claim?.expire_at_ms ?? null,
  };
}

/* ------------------------------------------------------------------ main */

async function main(): Promise<void> {
  await mkdir(stateDir(), { recursive: true });
  const stateFile = path.join(stateDir(), 'daily-checkin-state.json');
  const state = (await readJson(stateFile)) ?? {};
  const today = localDateKey();
  const force = process.env.MCODE_CHECKIN_FORCE === '1';

  if (
    !force &&
    state.lastLocalDate === today &&
    (state.outcome === 'claimed' || state.outcome === 'already-claimed')
  ) {
    log(`already handled for ${today} (${state.outcome}); skipping`);
    process.exit(0);
  }

  const region = await resolveRegion();
  const { accessToken } = await ensureAccessToken(region);
  const realUserId = await resolveRealUserId(region, accessToken);
  const result = await runCheckin(region, accessToken, realUserId);

  const nextState = {
    lastLocalDate: today,
    outcome: result.outcome,
    points: result.points ?? null,
    dayNo: result.dayNo ?? null,
    at: new Date().toISOString(),
  };
  await writeJsonAtomic(stateFile, nextState);

  if (result.outcome === 'claimed') {
    const points = typeof result.points === 'number' ? `${result.points} 积分` : '积分奖励';
    const dayNo = typeof result.dayNo === 'number' ? `第 ${result.dayNo} 天` : '每日';
    const message = `MiniMax 每日签到完成：${dayNo}，获得 ${points}。`;
    log(message);
    process.stdout.write(`${message}\n`);
  } else if (result.outcome === 'already-claimed') {
    const dayNo = typeof result.dayNo === 'number' ? `（第 ${result.dayNo} 天）` : '';
    const points = typeof result.points === 'number' ? `，今日已获得 ${result.points} 积分` : '';
    const message = `MiniMax 今日已签到${dayNo}${points}，无需重复签到。`;
    log(message);
    process.stdout.write(`${message}\n`);
  } else {
    const message = 'MiniMax 签到暂不可用（今日无待领取的签到奖励），稍后会自动重试。';
    log(message);
  }
}

main().catch(async (error: any) => {
  log(`failed: ${error?.message ?? error}`);
  const stateFile = path.join(stateDir(), 'daily-checkin-state.json');
  try {
    await writeJsonAtomic(stateFile, {
      lastLocalDate: localDateKey(),
      outcome: 'failed',
      error: String(error?.message ?? error),
      at: new Date().toISOString(),
    });
  } catch {
    /* ignore */
  }
  process.exit(0);
});
