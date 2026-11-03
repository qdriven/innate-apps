/**
 * mcode 请求签名盐（SIGN_SALT）的解析。
 *
 * 盐本身是 mcode 客户端公开实现里的一个常量，用来生成 `x-signature` 头。
 * 它不是用户凭据，但它固化在公开仓库里就等于对外公开，
 * 因此这里**不内置任何盐值**，只按以下优先级解析：
 *
 *   1. 环境变量 `MCODE_SIGN_SALT`（显式指定，最高优先级）
 *   2. 从本机已安装的 mcode 客户端包中自动提取（saltFromClient）
 *   3. 都拿不到 → 抛出明确错误，并引导运行 scripts/mcode-sign-salt.ts
 *
 * 客户端里盐是以模板字符串字面量出现的，形如：
 *   "x-signature":IE(`${o}<SALT>`)
 * 因此提取规则是：取 `x-signature` 模板中 `${...}` 之后的固定前缀，
 * 去掉尾部的 `${...}` 插值与可能的额外后缀。
 *
 * 首次使用请执行交互式配置：
 *   bun run scripts/mcode-sign-salt.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

/** 找不到盐时的统一提示。 */
export const SALT_NOT_FOUND_MESSAGE =
  '未找到 mcode 请求签名盐。请执行 `bun run scripts/mcode-sign-salt.ts` 进行配置' +
  '（会尝试从本机 mcode 客户端提取，并可写入用户级环境变量 MCODE_SIGN_SALT）；' +
  '或手动设置环境变量 MCODE_SIGN_SALT。';

/** 从 `x-signature` 模板里抽出盐：`"x-signature":IE(`${o}SALT${d}`)` -> SALT */
const SIGNATURE_TEMPLATE = /["']?x-signature["']?\s*:\s*\w+\(`\$\{\w+\}([^`]+)`\)/g;

/** 去掉盐末尾的 `${...}` 插值部分。 */
function trimInterpolation(value: string): string {
  const at = value.indexOf('${');
  return (at >= 0 ? value.slice(0, at) : value).trim();
}

/**
 * 客户端包可能安装在这些位置。
 * 逐个检查是否存在 package.json 且 name 为 @minimax-ai/code。
 */
function candidateClientRoots(): string[] {
  const home = homedir();
  const roots: string[] = [];

  const explicit = process.env.MCODE_CLIENT_DIR?.trim();
  if (explicit) roots.push(explicit);

  // npm global root 的几种常见布局
  roots.push(
    path.join(home, '.local', 'opt', 'node', 'node_modules', '@minimax-ai', 'code'),
    path.join(home, 'AppData', 'Roaming', 'npm', 'node_modules', '@minimax-ai', 'code'),
    path.join(home, '.npm-global', 'lib', 'node_modules', '@minimax-ai', 'code'),
  );
  return roots;
}

/** 递归收集目录下的 js 文件（限制深度与数量，避免扫到无关目录）。 */
function collectJsFiles(root: string, limit = 400): string[] {
  const out: string[] = [];
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
  while (stack.length && out.length < limit) {
    const { dir, depth } = stack.pop()!;
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth >= 3) continue;
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        stack.push({ dir: full, depth: depth + 1 });
      } else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

/**
 * 从本地已安装的 mcode 客户端包中提取签名盐。
 * 返回 null 表示未找到（客户端未安装 / 版本布局变了）。
 */
export function saltFromClient(clientDir?: string): string | null {
  const roots = clientDir ? [clientDir] : candidateClientRoots();
  const found = new Map<string, number>();

  for (const root of roots) {
    if (!existsSync(root)) continue;
    let files: string[];
    try {
      if (!statSync(root).isDirectory()) continue;
      files = collectJsFiles(root);
    } catch {
      continue;
    }
    for (const file of files) {
      let txt: string;
      try {
        txt = readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      if (!txt.includes('x-signature')) continue;
      SIGNATURE_TEMPLATE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = SIGNATURE_TEMPLATE.exec(txt)) !== null) {
        const salt = trimInterpolation(m[1]);
        // 盐是固定长度的非模板字符串；过滤掉插值残留
        if (!salt || salt.includes('${')) continue;
        if (salt.length < 8 || salt.length > 64) continue;
        found.set(salt, (found.get(salt) ?? 0) + 1);
      }
    }
  }

  if (found.size === 0) return null;
  // 出现次数最多的即为客户端实际使用的盐
  const ranked = [...found.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0][0];
}

export type SaltSource = 'env' | 'client';

export interface ResolvedSalt {
  salt: string;
  source: SaltSource;
  /** 来源细节（客户端目录等），用于日志，不含盐内容。 */
  detail: string;
}

/**
 * 解析签名盐。优先级：环境变量 > 客户端自动提取。
 * 两者都拿不到时抛出明确错误（仓库内不内置任何盐值）。
 */
export function resolveSignSalt(options: { clientDir?: string } = {}): ResolvedSalt {
  const fromEnv = process.env.MCODE_SIGN_SALT?.trim();
  if (fromEnv) return { salt: fromEnv, source: 'env', detail: 'MCODE_SIGN_SALT' };

  const fromClient = saltFromClient(options.clientDir);
  if (fromClient) {
    return { salt: fromClient, source: 'client', detail: options.clientDir ?? 'auto' };
  }

  throw new Error(SALT_NOT_FOUND_MESSAGE);
}
