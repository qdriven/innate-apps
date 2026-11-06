#!/usr/bin/env node
// Registry 校验：字段是否符合 schema.json，local_path 是否在磁盘上真实存在，
// 可选调用 GitHub API 核对 repo 的真实状态（存在性 / 改名 / 可见性 / 归档 / fork）。
//
// 用法：
//   node scripts/validate-registry.mjs [--root <innate-apps 所在目录>] [--verbose]
//   node scripts/validate-registry.mjs --skip-paths      # 跳过 local_path 磁盘存在性校验（CI 用）
//   node scripts/validate-registry.mjs --check-remote    # 核对 repo 在 GitHub 上的真实状态
//   node scripts/validate-registry.mjs --check-remote --remote-token <token>
//
// 退出码：0 = 通过（可能带警告），1 = 存在校验失败项。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, "..");

const argv = process.argv.slice(2);

function flagValue(name) {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const next = argv[i + 1];
  return next === undefined || next.startsWith("--") ? undefined : next;
}
const hasFlag = (name) => argv.includes(name);

const root = path.resolve(flagValue("--root") ?? defaultRoot);
const skipPaths = hasFlag("--skip-paths");
const checkRemote = hasFlag("--check-remote");
const verbose = hasFlag("--verbose");
const remoteToken =
  flagValue("--remote-token") ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";

const registryDir = path.join(root, "registry");
const appsFile = path.join(registryDir, "apps.json");
const schemaFile = path.join(registryDir, "schema.json");

const problems = [];
const warnings = [];
const notes = [];

const apps = JSON.parse(fs.readFileSync(appsFile, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8"));

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "innate-apps-validate-registry";

/**
 * 取仓库信息。返回 { ok: true, data } / { ok: false, status } / { ok: false, network: reason }
 */
async function fetchRepo(repo) {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (remoteToken) headers.Authorization = `Bearer ${remoteToken}`;
  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}`, { headers });
    if (res.ok) return { ok: true, data: await res.json() };
    return { ok: false, status: res.status };
  } catch (err) {
    return { ok: false, network: err?.message ?? String(err) };
  }
}

/** 字段校验：任何环境都能跑 */
function checkFields() {
  for (const key of schema.required) {
    if (!(key in apps)) problems.push(`顶层缺少必填字段 ${key}`);
  }
  if (!Array.isArray(apps.collections)) {
    problems.push("collections 必须是数组");
    return false;
  }

  const seenNames = new Set();
  const seenRepos = new Set();

  for (const [index, entry] of apps.collections.entries()) {
    const where = `collections[${index}] (${entry.name ?? "<no name>"})`;

    for (const key of schema.properties.collections.items.required) {
      if (!(key in entry)) problems.push(`${where}: 缺少必填字段 ${key}`);
    }

    for (const key of ["category", "status", "visibility"]) {
      const allowed = schema.properties.collections.items.properties[key].enum;
      if (entry[key] !== undefined && !allowed.includes(entry[key])) {
        problems.push(`${where}: ${key}=${entry[key]} 不在允许值 ${JSON.stringify(allowed)} 内`);
      }
    }

    const repoPattern = schema.properties.collections.items.properties.repo.pattern;
    if (entry.repo !== undefined && !new RegExp(repoPattern).test(entry.repo)) {
      problems.push(`${where}: repo="${entry.repo}" 不匹配 ${repoPattern}`);
    }

    if (entry.url !== undefined) {
      try {
        new URL(entry.url);
      } catch {
        problems.push(`${where}: url="${entry.url}" 不是合法 URI`);
      }
    }

    if (entry.name !== undefined) {
      if (seenNames.has(entry.name)) problems.push(`${where}: name 重复`);
      seenNames.add(entry.name);
    }
    if (entry.repo !== undefined) {
      if (seenRepos.has(entry.repo)) problems.push(`${where}: repo 重复`);
      seenRepos.add(entry.repo);
    }
  }
  return true;
}

/** 路径校验：依赖本地工作区布局，只在本地跑 */
function checkPaths() {
  if (skipPaths) {
    notes.push("已跳过 local_path 磁盘存在性校验（--skip-paths）");
    return;
  }
  for (const [index, entry] of apps.collections.entries()) {
    const where = `collections[${index}] (${entry.name ?? "<no name>"})`;
    if (entry.local_path !== undefined && entry.local_path !== null) {
      const resolved = path.resolve(root, entry.local_path);
      if (!fs.existsSync(resolved)) {
        problems.push(`${where}: local_path 不存在 -> ${resolved}`);
      } else {
        notes.push(`${where}: ${entry.local_path} ✓`);
      }
    } else if (entry.local_path === null) {
      notes.push(`${where}: local_path 为 null（远程存在，本地未检出）`);
    }
  }
}

/**
 * 探测当前凭据能否读到「安装范围之外」的公开仓库。
 *
 * GitHub 的「安装令牌」（Actions 里的 GITHUB_TOKEN 就是一种）只对安装范围内的仓库有读权限，
 * 对范围外的公开仓库也可能返回 404 —— 此时 404 无法区分「仓库不存在」与「看不见」，
 * 直接判错会让 CI 因为令牌类型而全红。
 * 用一个确定存在、且几乎不可能在安装范围内的公开仓库做探针，先把这件事问清楚。
 */
const CANARY_REPO = "github/gitignore";

async function canSeePublicOutsideInstallation() {
  const res = await fetchRepo(CANARY_REPO);
  if (res.network) return { ok: false, reason: `探针请求失败（${res.network}）` };
  if (res.ok) return { ok: true };
  if (res.status === 404 || res.status === 403) {
    return { ok: false, reason: `探针 ${CANARY_REPO} 返回 ${res.status}，当前凭据读不到安装范围外的公开仓库` };
  }
  return { ok: false, reason: `探针 ${CANARY_REPO} 返回 ${res.status}` };
}

/** 远程校验：核对 repo 在 GitHub 上的真实状态 */
async function checkRemoteState() {
  if (!checkRemote) return;

  if (!remoteToken) {
    warnings.push(
      "未使用 token：GitHub 未认证请求限速 60 次/小时，连续运行可能触发限流（CI 里请传 GITHUB_TOKEN）",
    );
  }

  const probe = await canSeePublicOutsideInstallation();
  if (probe.ok) {
    notes.push(`探针通过：当前凭据可读取安装范围外的公开仓库，404 判定为「仓库不存在」`);
  } else {
    warnings.push(
      `远程校验降级：${probe.reason} —— 公开条目的 404 只作警告，不判定为「不存在」`,
    );
  }

  for (const [index, entry] of apps.collections.entries()) {
    const where = `collections[${index}] (${entry.name ?? "<no name>"})`;
    const repo = entry.repo;
    if (!repo) continue;

    const res = await fetchRepo(repo);

    if (res.network) {
      warnings.push(`${where}: GitHub API 请求失败（${res.network}），跳过远程校验`);
      continue;
    }

    if (res.status === 404) {
      // 404 有歧义：public 条目在探针通过时是真不存在；
      // private 条目、或探针未通过时，只说明「当前看不见」
      if (entry.visibility === "private") {
        notes.push(`${where}: 私有仓库，当前凭据无权访问，跳过远程校验`);
      } else if (!probe.ok) {
        warnings.push(`${where}: "${repo}" 返回 404，当前凭据无法确认其是否存在`);
      } else {
        problems.push(
          `${where}: 仓库不存在 —— "${repo}" 在 GitHub 上返回 404（已删除、已转私有，或拼写有误）`,
        );
      }
      continue;
    }

    if (res.status === 403 || res.status === 429) {
      warnings.push(
        `${where}: GitHub API 返回 ${res.status}（权限不足或触发限流），跳过该条的远程校验`,
      );
      continue;
    }

    if (!res.ok) {
      warnings.push(`${where}: GitHub API 返回 ${res.status}，跳过该条的远程校验`);
      continue;
    }

    const data = res.data;

    // 改名检测：GitHub 会把旧路径重定向到新路径，API 返回的 full_name 即新名字
    if (data.full_name && data.full_name.toLowerCase() !== repo.toLowerCase()) {
      problems.push(
        `${where}: 仓库已改名 —— registry 写的是 "${repo}"，GitHub 上现在是 "${data.full_name}"（请更新 repo 字段）`,
      );
    } else if (data.full_name && data.full_name !== repo) {
      warnings.push(
        `${where}: repo 大小写与 GitHub 实际不一致（registry "${repo}" / GitHub "${data.full_name}"）`,
      );
    }

    if (data.visibility && entry.visibility && data.visibility !== entry.visibility) {
      problems.push(
        `${where}: visibility 不一致 —— registry 写的是 "${entry.visibility}"，GitHub 上实际是 "${data.visibility}"`,
      );
    }

    if (data.archived && entry.status !== "archived") {
      problems.push(`${where}: 仓库已归档，但 status 仍为 "${entry.status}"`);
    } else if (!data.archived && entry.status === "archived") {
      warnings.push(`${where}: status 标为 "archived"，但 GitHub 上仓库未归档`);
    }

    if (data.fork) {
      problems.push(`${where}: 是 fork —— 违反收录标准第 1 条（非 fork 才收录）`);
    }

    if (data.pushed_at) {
      const year = new Date(data.pushed_at).getUTCFullYear();
      const thisYear = new Date().getUTCFullYear();
      if (year !== thisYear) {
        warnings.push(
          `${where}: 最后一次 push 在 ${year} 年 —— 收录标准第 2 条要求 ${thisYear} 年内有更新`,
        );
      }
    }
  }
}

function report() {
  console.log(`registry: ${path.join(root, "registry", "apps.json")}`);
  console.log(`collections: ${apps.collections.length}`);
  console.log(
    `schema 必填/枚举/格式校验: ${problems.length ? "FAIL" : "PASS"}` +
      (skipPaths ? "  (local_path 路径校验已跳过)" : ""),
  );
  if (checkRemote) console.log(`GitHub 远程状态校验: 已启用${remoteToken ? "（已带 token）" : "（未带 token）"}`);

  if (warnings.length) {
    console.log("\n警告（不阻塞）:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (problems.length) {
    console.log("\n问题:");
    for (const p of problems) console.log(`  ✗ ${p}`);
  }
  if (verbose) {
    console.log("\nlocal_path 解析:");
    for (const n of notes) console.log(`  ${n}`);
  }
  process.exit(problems.length ? 1 : 0);
}

async function main() {
  if (!checkFields()) {
    report();
    return;
  }
  checkPaths();
  await checkRemoteState();
  report();
}

await main();
