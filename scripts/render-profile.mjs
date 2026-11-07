#!/usr/bin/env node
// 从 registry/apps.json 渲染 GitHub profile README 的 innate_apps 段落。
//
// 渲染逻辑放在数据源仓库这边，执行端（profile 仓库的 workflow）只负责跑它并提交结果。
//
// 用法：
//   node scripts/render-profile.mjs                        # 打印渲染结果到 stdout
//   node scripts/render-profile.mjs --out README.md        # 就地替换 README.md 里的标记段落
//   node scripts/render-profile.mjs --out README.md --check # 只检查是否已是最新（漂移则退出码 1）
//   node scripts/render-profile.mjs --profile org          # 组织 profile 视图
//
// 参数：
//   --registry <apps.json>   数据源路径，默认 registry/apps.json
//   --out <file>             目标 README，省略则渲染到 stdout
//   --profile user|org       视图，默认 user
//   --marker <name>          标记名，默认 innate_apps
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(here, "..");

/** 单条 description 在表格里的最大长度（含省略号）。 */
export const MAX_DESC = 110;

/**
 * 两种视图。
 *
 * - user：个人 profile。列 registry 里的公开条目，含第三方参考项目。
 * - org：组织 profile。只列该组织自己名下的条目，不含第三方参考项目。
 *
 * 两种视图都**排除 private 条目**——公开 profile 里放私有仓库，链接对访客恒为 404，
 * 只是噪音。
 *
 * **reference 类条目（第三方参考项目）不上公开 profile**：那些是本地检出的上游项目
 * （AIHOT、khazix-skills、ai-aug-edu、word-atlas 等），是取材用的参考，不是本人维护的
 * 项目。registry 里仍然保留它们，用来记录本地 checkout 位置。
 */
export const PROFILES = {
  user: {
    owner: null,
    excludeCategories: ["reference"],
    sections: [
      { title: "### Apps (maintained)", match: (e) => e.category === "app" && e.status === "maintained" },
      { title: "### Apps (experimental)", match: (e) => e.category === "app" && e.status === "experimental" },
      { title: "### Apps (archived)", match: (e) => e.category === "app" && e.status === "archived" },
      { title: "### Base Frameworks", match: (e) => e.category === "base" },
    ],
    headers: ["Project", "What it does", "Status"],
  },
  org: {
    owner: "variableway",
    excludeCategories: ["reference"],
    sections: [
      { title: "### Apps", match: (e) => e.category === "app" },
      { title: "### Base Frameworks", match: (e) => e.category === "base" },
    ],
    headers: ["Project", "Description", "Status"],
  },
};

export function escapeCell(text) {
  // 竖线会截断 markdown 表格单元格
  return String(text).replace(/\|/g, "\\|");
}

export function truncate(text) {
  if (text.length <= MAX_DESC) return text;
  return `${text.slice(0, MAX_DESC - 3)}...`;
}

function row(entry) {
  const url = entry.url ?? `https://github.com/${entry.repo}`;
  const desc = truncate(entry.description ?? "");
  return `| [${entry.name}](${url}) | ${escapeCell(desc)} | ${entry.status} |`;
}

/**
 * 把 registry 投影成 profile 段落。
 * @returns {{ body: string, excluded: string[], visible: object[] }}
 */
export function render(registry, profileKind = "user") {
  const config = PROFILES[profileKind];
  if (!config) throw new Error(`未知的视图 "${profileKind}"`);

  const all = registry.collections ?? [];
  const excluded = [];
  const visible = [];

  for (const entry of all) {
    if (entry.visibility !== "public") {
      excluded.push(`${entry.name}（private）`);
      continue;
    }
    if (config.excludeCategories?.includes(entry.category)) {
      excluded.push(`${entry.name}（${entry.category} 类，不上公开 profile）`);
      continue;
    }
    if (config.owner && !entry.repo.startsWith(`${config.owner}/`)) continue;
    visible.push(entry);
  }

  const lines = [];
  for (const section of config.sections) {
    const entries = visible.filter(section.match);
    if (!entries.length) continue;
    lines.push(section.title);
    lines.push(`| ${config.headers.join(" | ")} |`);
    lines.push(`|${config.headers.map(() => "---").join("|")}|`);
    for (const entry of entries) lines.push(row(entry));
    lines.push("");
  }
  while (lines.length && lines[lines.length - 1] === "") lines.pop();

  return { body: lines.join("\n"), excluded, visible };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 用新块替换标记段落；标记不存在时返回 null。 */
export function replaceBlock(content, block, marker = "innate_apps") {
  const start = `<!-- ${marker} starts -->`;
  const end = `<!-- ${marker} ends -->`;
  // 全局替换：同名标记块可能不止一处，都要同步
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, "g");
  if (!pattern.test(content)) return null;
  return content.replace(new RegExp(pattern.source, "g"), block);
}

/** 渲染成完整块（含标记）。 */
export function renderBlock(registry, profileKind = "user", marker = "innate_apps") {
  const { body } = render(registry, profileKind);
  return `<!-- ${marker} starts -->\n${body}\n<!-- ${marker} ends -->`;
}

function flagValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const next = argv[i + 1];
  return next === undefined || next.startsWith("--") ? undefined : next;
}
const hasFlag = (argv, name) => argv.includes(name);

export function main(argv = process.argv.slice(2)) {
  const registryPath = path.resolve(
    flagValue(argv, "--registry") ?? path.join(defaultRoot, "registry", "apps.json"),
  );
  const outArg = flagValue(argv, "--out");
  const outPath = outArg ? path.resolve(outArg) : null;
  const checkOnly = hasFlag(argv, "--check");
  const profileKind = flagValue(argv, "--profile") ?? "user";
  const marker = flagValue(argv, "--marker") ?? "innate_apps";

  if (!PROFILES[profileKind]) {
    console.error(`未知的 --profile "${profileKind}"（可选：${Object.keys(PROFILES).join(", ")}）`);
    return 2;
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const { excluded, visible } = render(registry, profileKind);
  const block = renderBlock(registry, profileKind, marker);

  if (excluded.length) {
    console.error(`已排除 private 条目（不进入公开 profile）：${excluded.join("、")}`);
  }
  console.error(
    `渲染 ${profileKind} 视图：${visible.length} 条可见 / ${registry.collections.length} 条总计`,
  );

  if (!outPath) {
    process.stdout.write(`${block}\n`);
    return 0;
  }

  const original = fs.readFileSync(outPath, "utf8");
  const updated = replaceBlock(original, block, marker);

  if (updated === null) {
    console.error(`目标文件里找不到标记段落 ${marker}：${outPath}`);
    return 1;
  }

  if (checkOnly) {
    if (updated === original) {
      console.error(`${path.relative(process.cwd(), outPath)} 已是最新 ✓`);
      return 0;
    }
    console.error(`${path.relative(process.cwd(), outPath)} 与 registry 不一致（需重新渲染）`);
    return 1;
  }

  if (updated === original) {
    console.error(`${path.relative(process.cwd(), outPath)} 无变化`);
  } else {
    fs.writeFileSync(outPath, updated);
    console.error(`已更新 ${path.relative(process.cwd(), outPath)}`);
  }
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) process.exit(main());
