#!/usr/bin/env bun
/**
 * mcode 签名盐配置工具 —— 交互式获取 / 校验 / 写入 MCODE_SIGN_SALT。
 *
 * 用法：
 *   bun run scripts/mcode-sign-salt.ts            # 交互式（推荐）
 *   bun run scripts/mcode-sign-salt.ts show       # 只看当前解析结果（不打印盐内容）
 *   bun run scripts/mcode-sign-salt.ts extract    # 只从客户端提取，打印盐（明文）
 *   bun run scripts/mcode-sign-salt.ts set <salt> # 写入用户级环境变量 MCODE_SIGN_SALT
 *   bun run scripts/mcode-sign-salt.ts clear      # 清除用户级环境变量 MCODE_SIGN_SALT
 *   bun run scripts/mcode-sign-salt.ts check      # 自检：确认能解析到盐
 *
 * 背景：
 *   签到接口的 `x-signature` 头需要 mcode 客户端里的一个固定盐。
 *   该盐以字面量形式出现在客户端打包产物中，因此可以从本机安装的客户端自动提取，
 *   无需手抄、也不必把它写死在公开仓库里。
 *
 * 交互流程会依次尝试：
 *   1. 环境变量 MCODE_SIGN_SALT 是否已设置
 *   2. 从本机 mcode 客户端包自动提取
 *   3. 询问是否写入用户级环境变量（写入后计划任务等新进程也能用）
 *
 * 实际取值逻辑见 mcode-sign-salt-lib.ts。
 */

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolveSignSalt, saltFromClient, SALT_NOT_FOUND_MESSAGE } from './mcode-sign-salt-lib.ts';

const ENV_KEY = 'MCODE_SIGN_SALT';
const ENV_KEY_PATH = 'HKCU\\Environment';

function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

function mask(salt: string): string {
  if (!salt) return '(空)';
  return `${salt.slice(0, 2)}…${salt.slice(-2)} (len=${salt.length})`;
}

/**
 * 写用户级环境变量。
 *
 * 注意：不能用 `setx`。setx 会把含 `%` 的值写成 REG_EXPAND_SZ，
 * 而签名盐里恰好含有 `%W`、`%S`、`%1RlZJ` 等片段 ——
 * 新进程读取时会被当作环境变量引用展开，导致取到空值或残缺值。
 * 因此这里用 `reg add /t REG_SZ` 写入，确保按字面量存储。
 */
function writeUserEnv(value: string): void {
  // 先清掉可能存在的旧记录（setx 写的 REG_EXPAND_SZ 也要覆盖掉）
  clearUserEnv();
  execFileSync('reg.exe', ['add', ENV_KEY_PATH, '/v', ENV_KEY, '/t', 'REG_SZ', '/d', value, '/f'], {
    stdio: 'ignore',
  });
}

/**
 * 读用户级环境变量。
 * 同时兼容 REG_SZ 与 REG_EXPAND_SZ（旧版 setx 留下的记录）。
 */
function readUserEnv(): string | null {
  try {
    const out = execFileSync(
      'reg.exe',
      ['query', ENV_KEY_PATH, '/v', ENV_KEY],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const line = out.split(/\r?\n/).find((l) => l.includes(ENV_KEY));
    if (!line) return null;
    const m = line.match(/REG_(?:EXPAND_)?SZ\s+(\S+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function clearUserEnv(): void {
  try {
    execFileSync('reg.exe', ['delete', ENV_KEY_PATH, '/v', ENV_KEY, '/f'], {
      stdio: 'ignore',
    });
  } catch {
    /* 忽略：键不存在 */
  }
}

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await new Promise<string>((resolve) => rl.question(question, resolve));
  } finally {
    rl.close();
  }
}

function report(): void {
  const sourceLabel: Record<string, string> = {
    env: '环境变量 MCODE_SIGN_SALT',
    client: '本机 mcode 客户端自动提取',
  };
  try {
    const resolved = resolveSignSalt();
    log(`盐来源：${sourceLabel[resolved.source]}（${resolved.detail}）`);
    log(`盐内容：${mask(resolved.salt)}`);
  } catch {
    log(`盐来源：未找到`);
    log(`盐内容：${SALT_NOT_FOUND_MESSAGE}`);
  }
}

async function interactive(): Promise<void> {
  log('=== mcode 签名盐配置 ===');
  log('');

  const envNow = process.env[ENV_KEY]?.trim();
  if (envNow) {
    log(`[1/4] 当前进程已设置 ${ENV_KEY}：${mask(envNow)}`);
  } else {
    log(`[1/4] 当前进程未设置 ${ENV_KEY}`);
  }

  const userEnv = readUserEnv();
  if (userEnv) log(`      用户级环境变量存在：${mask(userEnv)}`);

  log('[2/4] 尝试从本机 mcode 客户端提取…');
  const extracted = saltFromClient();
  if (extracted) {
    log(`      提取成功：${mask(extracted)}`);
  } else {
    log('      提取失败：未找到 mcode 客户端，或客户端版本布局已变化。');
    log('      可手动提供盐值，或安装 mcode 客户端后重试。');
  }

  log('[3/4] 汇总当前解析结果：');
  report();
  log(`[4/4] 是否把盐写入用户级环境变量（${ENV_KEY}）？`);
  log('      写入后，Windows 计划任务等新进程也能直接读取，无需再依赖客户端安装。');
  const answer = (await prompt('      写入？[y/N] ')).trim().toLowerCase();

  const chosen = envNow || extracted;
  if (answer === 'y' || answer === 'yes') {
    if (!chosen) {
      log('没有可用的盐值，未做修改。');
      return;
    }
    if (chosen !== envNow) {
      writeUserEnv(chosen);
      log(`已写入用户级环境变量 ${ENV_KEY}（新开的进程/计划任务才会生效）。`);
    } else {
      log(`${ENV_KEY} 已存在于当前进程，未重复写入。`);
    }
  } else {
    log('未写入环境变量。签到脚本会继续从本机 mcode 客户端自动提取签名盐。');
  }

  log('');
  report();
}

async function main(): Promise<void> {
  const [command = 'interactive', ...rest] = process.argv.slice(2);

  switch (command) {
    case 'interactive':
    case 'i':
      await interactive();
      break;

    case 'show':
      report();
      break;

    case 'extract': {
      const salt = saltFromClient();
      if (!salt) {
        log(SALT_NOT_FOUND_MESSAGE);
        process.exit(1);
      }
      log(salt);
      break;
    }

    case 'set': {
      const salt = (rest[0] ?? '').trim();
      if (!salt) {
        log(`用法：${process.argv[1]} set <salt>`);
        process.exit(1);
      }
      writeUserEnv(salt);
      log(`已写入用户级环境变量 ${ENV_KEY}（${mask(salt)}）。`);
      break;
    }

    case 'clear':
      clearUserEnv();
      log(`已清除用户级环境变量 ${ENV_KEY}。`);
      break;

    case 'check': {
      try {
        const resolved = resolveSignSalt();
        log(`OK：已解析到盐，来源=${resolved.source}，${mask(resolved.salt)}`);
      } catch (error: any) {
        log(`FAIL：${error?.message ?? error}`);
        process.exit(1);
      }
      break;
    }

    default:
      log('用法：bun run scripts/mcode-sign-salt.ts [interactive|show|extract|set <salt>|clear|check]');
      process.exit(1);
  }
}

main().catch((error: any) => {
  process.stderr.write(`[mcode-sign-salt] ${error?.message ?? error}\n`);
  process.exit(1);
});
