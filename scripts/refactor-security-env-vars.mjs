/**
 * refactor-security-env-vars.mjs
 *
 * 自动扫描 login/route.ts 和 csrf.ts，将 7 个硬编码安全参数替换为 env 变量引用。
 *
 * 替换清单：
 *   1. LOCKOUT_MINUTES = 15                         → Number(process.env.LOGIN_LOCKOUT_MINUTES || 15)
 *   2. windowMs: 15 * 60 * 1000                     → Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)
 *   3. maxRequests: 20                              → Number(process.env.LOGIN_RATE_LIMIT_MAX || 20)
 *   4. setExpirationTime('24h')                     → setExpirationTime(process.env.JWT_ACCESS_TOKEN_TTL || '24h')
 *   5. maxAge: 7 * 24 * 60 * 60 (refresh cookie)    → Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE || 7 * 24 * 60 * 60)
 *   6. maxAge: 60 * 60 * 24 * 7 (csrf cookie)       → Number(process.env.CSRF_COOKIE_MAX_AGE || 60 * 60 * 24 * 7)
 *   7. secure: NODE_ENV === 'production'            → COOKIE_SECURE 三元（3 处：login ×2 + csrf ×1）
 *
 * 用法: node scripts/refactor-security-env-vars.mjs
 * 验证: npx tsc --noEmit
 */

import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(import.meta.dirname, '..');

const FILES = [
  {
    path: 'src/app/api/auth/login/route.ts',
    label: 'login/route.ts',
    replacements: [
      {
        id: 1,
        name: 'LOGIN_LOCKOUT_MINUTES',
        from: 'const LOCKOUT_MINUTES = 15;',
        to: 'const LOCKOUT_MINUTES = Number(process.env.LOGIN_LOCKOUT_MINUTES || 15);',
      },
      {
        id: 2,
        name: 'LOGIN_RATE_LIMIT_WINDOW_MS',
        from: 'windowMs: 15 * 60 * 1000,',
        to: 'windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),',
      },
      {
        id: 3,
        name: 'LOGIN_RATE_LIMIT_MAX',
        from: 'maxRequests: 20,',
        to: 'maxRequests: Number(process.env.LOGIN_RATE_LIMIT_MAX || 20),',
      },
      {
        id: 4,
        name: 'JWT_ACCESS_TOKEN_TTL',
        from: ".setExpirationTime('24h')",
        to: ".setExpirationTime(process.env.JWT_ACCESS_TOKEN_TTL || '24h')",
      },
      {
        id: 5,
        name: 'JWT_REFRESH_COOKIE_MAX_AGE',
        from: 'maxAge: 7 * 24 * 60 * 60, // 7d',
        to: 'maxAge: Number(process.env.JWT_REFRESH_COOKIE_MAX_AGE || 7 * 24 * 60 * 60), // 7d default',
      },
      {
        id: 7,
        name: 'COOKIE_SECURE (login route, 2 occurrences)',
        from: 'secure: process.env.NODE_ENV === \'production\',',
        to: 'secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === \'true\' : process.env.NODE_ENV === \'production\',',
        replaceAll: true,
      },
    ],
  },
  {
    path: 'src/lib/csrf.ts',
    label: 'csrf.ts',
    replacements: [
      {
        id: 6,
        name: 'CSRF_COOKIE_MAX_AGE',
        from: 'maxAge: 60 * 60 * 24 * 7, // 7 天',
        to: 'maxAge: Number(process.env.CSRF_COOKIE_MAX_AGE || 60 * 60 * 24 * 7), // 7 天 default',
      },
      {
        id: 7,
        name: 'COOKIE_SECURE (csrf route, 1 occurrence)',
        from: 'secure: process.env.NODE_ENV === \'production\',',
        to: 'secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === \'true\' : process.env.NODE_ENV === \'production\',',
      },
    ],
  },
];

// ============================================================
// 执行替换
// ============================================================

const results = [];

for (const file of FILES) {
  const fullPath = path.join(projectRoot, file.path);
  if (!fs.existsSync(fullPath)) {
    console.error(`[SKIP] 文件不存在: ${file.path}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;
  const fileResults = [];

  for (const rep of file.replacements) {
    const occurrences = rep.replaceAll
      ? content.split(rep.from).length - 1
      : content.includes(rep.from) ? 1 : 0;

    if (occurrences === 0) {
      fileResults.push({ id: rep.id, name: rep.name, status: 'already-replaced', count: 0 });
      continue;
    }

    if (rep.replaceAll) {
      content = content.split(rep.from).join(rep.to);
    } else {
      content = content.replace(rep.from, rep.to);
    }

    changed = true;
    fileResults.push({ id: rep.id, name: rep.name, status: 'replaced', count: occurrences });
  }

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
  }

  results.push({ file: file.label, path: file.path, changed, replacements: fileResults });
}

// ============================================================
// 输出报告
// ============================================================

console.log('\n========== 安全参数 env 化重构报告 ==========\n');

let totalReplaced = 0;
let totalSkipped = 0;

for (const r of results) {
  console.log(`📄 ${r.file} (${r.path})`);
  console.log(`   状态: ${r.changed ? '✅ 已修改' : '⏭️  无需改动（已是 env 引用）'}`);
  for (const rep of r.replacements) {
    const icon = rep.status === 'replaced' ? '✅' : '⏭️';
    console.log(`   ${icon} #${rep.id} ${rep.name}: ${rep.status} (${rep.count} 处)`);
    if (rep.status === 'replaced') totalReplaced += rep.count;
    else totalSkipped++;
  }
  console.log('');
}

console.log(`合计: ${totalReplaced} 处替换, ${totalSkipped} 处跳过\n`);

// 输出新增 env 变量清单
console.log('========== 新增 env 变量清单（需同步到 .env.example）==========\n');
const envVars = [
  ['JWT_ACCESS_TOKEN_TTL', "'24h'", 'JWT access token 过期时间（jose 字符串格式）'],
  ['JWT_REFRESH_COOKIE_MAX_AGE', '604800', 'refresh_token Cookie maxAge（秒，默认 7 天）'],
  ['LOGIN_LOCKOUT_MINUTES', '15', '登录失败锁定时长（分钟）'],
  ['LOGIN_RATE_LIMIT_WINDOW_MS', '900000', '登录限流窗口（毫秒，默认 15 分钟）'],
  ['LOGIN_RATE_LIMIT_MAX', '20', '登录限流最大请求数'],
  ['CSRF_COOKIE_MAX_AGE', '604800', 'CSRF Cookie maxAge（秒，默认 7 天）'],
  ['COOKIE_SECURE', 'auto', 'Cookie secure 标志（true/false，未设置时跟随 NODE_ENV）'],
];
for (const [name, def, desc] of envVars) {
  console.log(`  ${name}=  # 默认: ${def} — ${desc}`);
}

console.log('\n========== 下一步 ==========');
console.log('1. 运行 tsc 验证: npx tsc --noEmit');
console.log('2. 将新增 env 变量同步到 .env.example 和 .env.production.example');
console.log('3. 运行单元测试: npx vitest run src/app/api/auth/login');
console.log('4. 手动验证: 登录 → 确认 token TTL + Cookie maxAge 与 env 配置一致');
console.log('\n注意: refresh/route.ts 和 logout/route.ts 中的 secure 标志未处理（不在本次范围）。');
console.log('      建议后续手动替换或扩展本脚本。');
