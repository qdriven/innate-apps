/**
 * WorkBuddy CDP 调试工具：在 WorkBuddy 主窗口里执行一段表达式并打印结果。
 *
 *   bun run scripts/workbuddy-cdp.ts --list
 *   bun run scripts/workbuddy-cdp.ts 'JSON.stringify(Object.keys(window.workbuddyDesktop))'
 *
 * 需要客户端以 --remote-debugging-port 启动（签到脚本会自动这么做，并把端口记在
 * ~/.workbuddy/checkin/cdp-instance.json；本工具会自动读取该端口）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const HOME_DIR = process.env.WORKBUDDY_HOME || path.join(os.homedir(), '.workbuddy');
const CDP_STATE_FILE = path.join(HOME_DIR, 'checkin', 'cdp-instance.json');

/** 调试端口：环境变量 > 签到脚本记录的端口 > 9222 */
function resolvePort(): number {
  const explicit = Number(process.env.WB_CDP_PORT || 0);
  if (explicit) return explicit;
  try {
    const obj = JSON.parse(fs.readFileSync(CDP_STATE_FILE, 'utf8'));
    if (Number.isInteger(obj?.port) && obj.port > 0) return obj.port;
  } catch {
    /* ignore */
  }
  return 9222;
}

const PORT = resolvePort();
const HOST = `127.0.0.1:${PORT}`;

async function listTargets() {
  const res = await fetch(`http://${HOST}/json/list`);
  if (!res.ok) throw new Error(`CDP /json/list HTTP ${res.status}`);
  return res.json();
}

/** 选取 WorkBuddy 主界面页面（workbuddy.cn 域名的 page 目标） */
export async function pickPageTarget(targets: any[] | null = null): Promise<any> {
  const list = targets || (await listTargets());
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  const preferred =
    pages.find((t) => /workbuddy\.cn|codebuddy\.cn/i.test(t.url || '')) ||
    pages.find((t) => t.url && !/^devtools:/i.test(t.url)) ||
    pages[0];
  if (!preferred) throw new Error('no CDP page target found');
  return preferred;
}

/** 在指定调试目标里执行表达式，返回其值 */
export async function evaluate(target: any, expression: string, { awaitPromise = true } = {}): Promise<any> {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const result = await new Promise((resolve, reject) => {
    let id = 0;
    const pending = new Map();
    const timer = setTimeout(() => {
      for (const [, p] of pending) p.reject(new Error('CDP evaluate timeout'));
      try { ws.close(); } catch {}
    }, 30000);

    ws.addEventListener('open', () => {
      id += 1;
      pending.set(id, { resolve, reject });
      ws.send(
        JSON.stringify({
          id,
          method: 'Runtime.evaluate',
          params: {
            expression,
            awaitPromise,
            returnByValue: true,
            userGesture: true,
          },
        }),
      );
    });

    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      if (!msg.id || !pending.has(msg.id)) return;
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      clearTimeout(timer);
      try { ws.close(); } catch {}
      if (msg.error) return p.reject(new Error(`CDP error: ${JSON.stringify(msg.error)}`));
      const res = msg.result?.result;
      if (msg.result?.exceptionDetails) {
        const d = msg.result.exceptionDetails;
        return p.reject(new Error(`page exception: ${d.exception?.description || d.text}`));
      }
      p.resolve(res?.value);
    });

    ws.addEventListener('error', (ev) => {
      clearTimeout(timer);
      reject(new Error(`websocket error: ${ev?.message || 'unknown'}`));
    });
  });
  return result;
}

/** 等待 CDP 就绪（端口可连且存在 page 目标） */
export async function waitForCdp({ timeoutMs = 90000, intervalMs = 1000 } = {}): Promise<any[]> {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const targets = await listTargets();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return targets;
    } catch (e) {
      lastErr = e;
    }
    await sleep(intervalMs);
  }
  throw new Error(`CDP not ready within ${timeoutMs}ms: ${lastErr?.message || 'timeout'}`);
}

if (process.argv[1] && import.meta.url === new URL(`file:///${process.argv[1].replace(/\\/g, '/')}`).href) {
  const arg = process.argv[2];
  if (arg === '--list') {
    const targets = await listTargets();
    for (const t of targets) {
      console.log(`${t.type}\t${t.title}\t${t.url}`);
    }
  } else {
    const targets = await listTargets();
    const page = await pickPageTarget(targets);
    const value = await evaluate(page, arg ?? '1+1');
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }
}
