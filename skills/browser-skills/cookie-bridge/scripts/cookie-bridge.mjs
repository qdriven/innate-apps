#!/usr/bin/env node
// cookie-bridge: 在"共享自动化 Chrome profile"与各工具内置浏览器之间搬运登录态。
// 零依赖（Node >= 22，用全局 fetch + WebSocket），只走 CDP，不解密任何文件。
// 用法:
//   cookie-bridge launch  [--profile DIR] [--port 9222] [--headless]
//   cookie-bridge status  [--port 9222]
//   cookie-bridge export  [--port 9222] --domains github.com,google.com [--out FILE]
//   cookie-bridge export  [--port 9222] --all [--out FILE]
//   cookie-bridge import  [--port TARGET] --file FILE [--domains ...]
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, chmodSync, writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_PORT = 9222;
const DEFAULT_PROFILE = join(homedir(), ".cookie-bridge", "profile");

const args = process.argv.slice(2);
const cmd = args[0];
function opt(name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
}
const has = (name) => args.includes(name);
if (!cmd || has("--help") || has("-h")) {
  console.log(`cookie-bridge — 通过 CDP 在浏览器之间同步登录态 cookie

  launch  启动共享自动化 Chrome（非默认 user-data-dir + 调试口，符合 Chrome 136+ 规则）
  status  查看某端口上的浏览器信息
  export  从源浏览器导出 cookie（必须 --domains 白名单或显式 --all）
  import  把 cookie 注入目标浏览器（内置浏览器/托管 Chromium 均可）

安全约束：cookie 明文只写 0600 权限的本地文件；绝不打印 cookie 值；导出必须有域名白名单。`);
  process.exit(cmd ? 0 : 1);
}

// ---------- CDP 极简客户端 ----------
const http = (port, path) => fetch(`http://127.0.0.1:${port}${path}`).then((r) => {
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}（新版 Chrome 要求 PUT /json/new，或目标不是浏览器）`);
  return r.json();
});

async function openSession(port) {
  let targets = await http(port, "/json/list");
  let page = targets.find((t) => t.type === "page");
  if (!page) {
    await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })
      .then((r) => { if (!r.ok) throw new Error("无法自动开新标签页"); });
    targets = await http(port, "/json/list");
    page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("找不到可用的 page target");
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onerror = () => rej(new Error(`无法连接 ${page.webSocketDebuggerUrl}`));
    ws.onopen = res;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(`${msg.error.message}`)) : res(msg.result);
    }
  };
  return {
    send: (method, params = {}) =>
      new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, { res, rej });
        ws.send(JSON.stringify({ id: mid, method, params }));
      }),
    close: () => ws.close(),
  };
}

// ---------- 域名白名单匹配：d 匹配 cookie domain 及其所有子域 ----------
function domainAllowed(cookieDomain, domains) {
  if (!domains) return true;
  const host = cookieDomain.replace(/^\./, "").toLowerCase();
  return domains.some((d) => {
    d = d.toLowerCase();
    return host === d || host.endsWith(`.${d}`);
  });
}

async function getCookies(session) {
  // Storage.getCookies 返回当前 browser context 全部明文 cookie；旧版本退化用 Network
  try {
    return (await session.send("Storage.getCookies")).cookies;
  } catch {
    await session.send("Network.enable");
    return (await session.send("Network.getCookies")).cookies;
  }
}

// ---------- 子命令 ----------
async function launch() {
  const port = Number(opt("--port", DEFAULT_PORT));
  const profile = opt("--profile", DEFAULT_PROFILE);
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  const bin = candidates.find(existsSync);
  if (!bin) throw new Error("找不到 Chrome/Chromium，请用 --profile 外部启动后直接 export/import");
  mkdirSync(profile, { recursive: true });
  // Chrome 136+ 要求调试口必须配非默认 user-data-dir，否则静默忽略 —— 这正是共享 profile 模式的合规基础
  const chromeArgs = [
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`,
    "--no-first-run", "--no-default-browser-check",
    ...(has("--headless") ? ["--headless=new"] : []),
    "about:blank",
  ];
  const child = spawn(bin, chromeArgs, { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const v = await http(port, "/json/version");
      console.log(`已启动 pid=${child.pid} port=${port}`);
      console.log(`浏览器: ${v.Browser}\nprofile: ${profile}`);
      console.log(has("--headless") ? "" : "在打开的窗口里登录需要的网站，然后 export。");
      return;
    } catch { /* 等待端口就绪 */ }
  }
  throw new Error(`等待端口 ${port} 超时`);
}

async function status() {
  const port = Number(opt("--port", DEFAULT_PORT));
  const v = await http(port, "/json/version");
  const list = await http(port, "/json/list");
  console.log(`port=${port}  ${v.Browser}`);
  console.log(`targets: ${list.length} 个（page: ${list.filter((t) => t.type === "page").length}）`);
}

async function exportCookies() {
  const port = Number(opt("--port", DEFAULT_PORT));
  const domains = (opt("--domains", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!has("--all") && domains.length === 0)
    throw new Error("必须指定 --domains a.com,b.com 白名单，或显式 --all（确认导出全部站点）");
  const allow = has("--all") ? null : domains;
  if (!allow) console.warn("⚠ 导出全部 cookie，请确认这是你想要的");
  const session = await openSession(port);
  const all = await getCookies(session);
  session.close();
  const cookies = all
    .filter((c) => domainAllowed(c.domain, allow))
    .map((c) => ({
      name: c.name, value: c.value, domain: c.domain, path: c.path,
      secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite,
      ...(c.expires > 0 ? { expires: c.expires } : {}),
    }));
  const out = opt("--out", join(homedir(), ".cookie-bridge", `cookies-${Date.now()}.json`));
  mkdirSync(join(out, ".."), { recursive: true });
  writeFileSync(out, JSON.stringify({ exportedAt: new Date().toISOString(), source: `127.0.0.1:${port}`, cookies }, null, 2));
  chmodSync(out, 0o600);
  const hosts = [...new Set(cookies.map((c) => c.domain.replace(/^\./, "")))];
  console.log(`已导出 ${cookies.length} 条 cookie，涉及 ${hosts.length} 个域名 → ${out}`);
  console.log(`域名: ${hosts.join(", ")}`);
}

async function importCookies() {
  const port = Number(opt("--port", DEFAULT_PORT));
  const file = opt("--file", "");
  if (!file || !existsSync(file)) throw new Error("需要 --file <cookies.json>");
  const domains = (opt("--domains", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const jar = JSON.parse(readFileSync(file, "utf8"));
  const cookies = (jar.cookies || jar).filter((c) => domainAllowed(c.domain, domains.length ? domains : null));
  const session = await openSession(port);
  let ok = 0, fail = 0;
  for (const c of cookies) {
    const base = { name: c.name, value: c.value, path: c.path || "/", secure: !!c.secure, httpOnly: !!c.httpOnly };
    if (c.sameSite && ["Strict", "Lax", "None"].includes(c.sameSite)) base.sameSite = c.sameSite;
    if (c.expires > 0) base.expires = c.expires;
    try {
      // 常规 cookie 用 domain+path；__Host- 前缀 cookie 拒绝 domain，必须改用 url 形式
      let res;
      if (c.name.startsWith("__Host-")) {
        res = await session.send("Network.setCookie", { ...base, url: `https://${c.domain.replace(/^\./, "")}/` });
      } else {
        res = await session.send("Network.setCookie", { ...base, domain: c.domain });
        if (!res.success) res = await session.send("Network.setCookie", { ...base, url: `https://${c.domain.replace(/^\./, "")}${c.path || "/"}` });
      }
      res.success ? ok++ : fail++;
    } catch { fail++; }
  }
  session.close();
  console.log(`已注入 ${ok} 条到 127.0.0.1:${port}${fail ? `（${fail} 条失败，多为 __Secure- 前缀或 SameSite 约束）` : ""}`);
}

const commands = { launch, status, export: exportCookies, import: importCookies };
try {
  if (!commands[cmd]) throw new Error(`未知命令: ${cmd}`);
  await commands[cmd]();
} catch (e) {
  console.error(`错误: ${e.message}`);
  process.exit(1);
}
