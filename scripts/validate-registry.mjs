#!/usr/bin/env node
// Registry 校验：字段是否符合 schema.json，local_path 是否在磁盘上真实存在。
// 用法：node scripts/validate-registry.mjs [--root <innate-apps 所在目录>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, "..");

const rootArgIndex = process.argv.indexOf("--root");
const root = path.resolve(rootArgIndex >= 0 ? process.argv[rootArgIndex + 1] : defaultRoot);

const registryDir = path.join(root, "registry");
const appsFile = path.join(registryDir, "apps.json");
const schemaFile = path.join(registryDir, "schema.json");

const problems = [];
const notes = [];

const apps = JSON.parse(fs.readFileSync(appsFile, "utf8"));
const schema = JSON.parse(fs.readFileSync(schemaFile, "utf8"));

// --- 顶层 ---
for (const key of schema.required) {
  if (!(key in apps)) problems.push(`顶层缺少必填字段 ${key}`);
}
if (!Array.isArray(apps.collections)) {
  problems.push("collections 必须是数组");
  report();
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

  // --- local_path 必须真实存在 ---
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

report();

function report() {
  console.log(`registry: ${path.join(root, "registry", "apps.json")}`);
  console.log(`collections: ${apps.collections.length}`);
  console.log(`schema 必填/枚举/格式校验: ${problems.length ? "FAIL" : "PASS"}`);
  if (problems.length) {
    console.log("\n问题:");
    for (const p of problems) console.log(`  ✗ ${p}`);
  }
  if (process.argv.includes("--verbose")) {
    console.log("\nlocal_path 解析:");
    for (const n of notes) console.log(`  ${n}`);
  }
  process.exit(problems.length ? 1 : 0);
}
