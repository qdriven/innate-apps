// 校验 registry/README.md 里的「工作区布局」树与 registry/apps.json 是否一致。
// 从 README 反解出 (local_path -> repo) 集合，与 apps.json 逐条对拍，
// 防止文档与数据源各走各的。
import fs from "node:fs";

const readme = fs.readFileSync("registry/README.md", "utf8");
const registry = JSON.parse(fs.readFileSync("registry/apps.json", "utf8"));

// --- 从 README 抽出布局树所在的代码块 ---
const block = readme.match(/```\n<workspace>\/[\s\S]*?```/);
if (!block) {
  console.error("FAIL: README 里找不到布局树代码块");
  process.exit(1);
}
const lines = block[0].split("\n");

const stack = [];
const docEntries = new Map();

for (const line of lines) {
  // 行尾可能是 `→ owner/repo (private)` 或 `← 说明`
  const arrowIdx = line.indexOf("→");
  const left = arrowIdx >= 0 ? line.slice(0, arrowIdx) : line;
  const right = arrowIdx >= 0 ? line.slice(arrowIdx + 1) : "";

  const m = left.match(/^([│ ]*)(?:├── |└── )([^─]*?)\s*(?:←.*)?$/);
  if (!m) continue;
  const [, indent, nameRaw] = m;

  const clean = nameRaw.trim().replace(/\/$/, "");
  if (!clean || clean === "<workspace>") continue;

  const depth = Math.floor(indent.length / 4) + 1;
  stack.length = depth - 1;
  stack[depth - 1] = clean;

  const repo = right.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (repo) {
    const path = "../" + stack.slice(0, depth).join("/");
    docEntries.set(path, repo);
  }
}

// --- 与 registry 对拍 ---
const problems = [];
const expected = new Map();
for (const e of registry.collections) {
  if (e.local_path !== null && e.local_path !== undefined) {
    expected.set(e.local_path, e.repo);
  }
}

for (const [path, repo] of expected) {
  if (!docEntries.has(path)) {
    problems.push(`README 布局树缺少路径 ${path}（${repo}）`);
  } else if (docEntries.get(path) !== repo) {
    problems.push(
      `README 布局树里 ${path} 指向 ${docEntries.get(path)}，但 registry 是 ${repo}`,
    );
  }
}
for (const [path, repo] of docEntries) {
  if (!expected.has(path)) {
    problems.push(`README 布局树多出路径 ${path}（${repo}）—— registry 里没有对应条目`);
  }
}

// null 条目必须在文档里被说明
const nullRepos = registry.collections
  .filter((e) => e.local_path === null)
  .map((e) => e.repo);
for (const repo of nullRepos) {
  if (!readme.includes("`null`")) {
    problems.push(`README 未说明 local_path 为 null 的含义（条目 ${repo}）`);
  }
}

console.log(`registry 有路径条目: ${expected.size}`);
console.log(`README 布局树条目: ${docEntries.size}`);
console.log(`local_path=null 条目: ${nullRepos.length}（${nullRepos.join(", ") || "无"}）`);
if (problems.length) {
  console.log("\n问题:");
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(1);
}
console.log("\n布局树与 registry 一致 ✓");
