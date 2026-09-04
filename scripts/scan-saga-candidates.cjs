#!/usr/bin/env node
/**
 * Saga 编排候选事件扫描
 *
 * 目标：从 EventRegistry 解析订阅关系，找出「多 handler + 有状态副作用」的事件，
 *      并检查是否已有对应的反审核/取消 handler 可复用为逆操作。
 *
 * 判据：
 *   - handler 数 >= 2：单 handler 失败无「兄弟副作用」，不需要 Saga 补偿
 *   - 有状态副作用：handler 里有 INSERT/UPDATE 写库（排除纯日志/缓存）
 *   - 逆操作可用性：是否存在 *.unapproved / *.cancelled / *.voided 兄弟事件
 *
 * 只读扫描。用法：node scripts/scan-saga-candidates.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REGISTRY = 'src/application/EventRegistry.ts';
const HANDLER_DIRS = ['src/application/handlers', 'src/lib'];

/** 解析 EventRegistry 中的 subscribe 调用 */
function parseSubscriptions() {
  const src = fs.readFileSync(path.join(ROOT, REGISTRY), 'utf8');
  const subs = [];
  // 匹配 subscribe('event', ...Handler()) 或 subscribe('event', new Handler())
  const re = /subscribe\(\s*['"]([^'"]+)['"]\s*,\s*([^)]*(?:new\s+\w+|[\w.]+)\s*\(?[^)]*\)?)\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    let expr = m[2];
    // 剥掉 IdempotentHandler(...) 包装，取出内层真实 handler
    const inner = expr.match(/IdempotentHandler\(\s*new\s+(\w+)/);
    const direct = expr.match(/new\s+(\w+Handler|\w+)/);
    const name = inner ? inner[1] : direct ? direct[1] : expr.trim().slice(0, 30);
    subs.push({ event: m[1], handler: name, wrapped: !!inner });
  }
  return subs;
}

/** 判断 handler 是否有状态写操作 */
function handlerWrites(handlerName) {
  for (const dir of HANDLER_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    const files = fs.readdirSync(abs).filter((f) => f.endsWith('.ts'));
    const file = files.find((f) => f.replace('.ts', '') === handlerName);
    if (!file) continue;
    const src = fs.readFileSync(path.join(abs, file), 'utf8');
    const writes = /INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i.test(src);
    const tables = new Set();
    const re = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+`?(\w+)`?/gi;
    let m;
    while ((m = re.exec(src))) tables.add(m[1]);
    return { writes, tables: [...tables] };
  }
  return { writes: false, tables: [] };
}

/** 纯基础设施 handler，失败无需补偿 */
const INFRA_HANDLERS = new Set([
  'AuditLogHandler',
  'CacheInvalidationHandler',
  'SagaCompensationHandler',
]);

function main() {
  const subs = parseSubscriptions();

  // 聚合：event -> handlers
  const byEvent = new Map();
  for (const s of subs) {
    if (!byEvent.has(s.event)) byEvent.set(s.event, []);
    const list = byEvent.get(s.event);
    if (!list.includes(s.handler)) list.push(s.handler);
  }

  // 已有逆操作事件（*.unapproved / *.cancelled / *.voided / *.rejected）
  const reversalEvents = [...byEvent.keys()].filter((e) =>
    /\.(unapproved|cancelled|voided|rejected|rollback|reversed)$/i.test(e)
  );
  const baseOf = (e) => e.replace(/\.(unapproved|cancelled|voided|rejected|rollback|reversed)$/i, '');
  const hasReversal = new Set(reversalEvents.map(baseOf));

  // 已纳入编排的事件
  const busSrc = fs.readFileSync(path.join(ROOT, 'src/infrastructure/event-bus/EventBus.ts'), 'utf8');
  const orchestrated = new Set();
  const ore = /^\s*'([a-z_.]+)',/gm;
  const blockMatch = busSrc.match(/SAGA_ORCHESTRATED_EVENTS = new Set<string>\(\[([\s\S]*?)\]\)/);
  if (blockMatch) {
    let m;
    while ((m = ore.exec(blockMatch[1]))) orchestrated.add(m[1]);
  }

  console.log('===== Saga 编排候选事件扫描 =====\n');
  console.log(`订阅事件总数: ${byEvent.size}`);
  console.log(`已纳入编排: ${orchestrated.size} 个 → ${[...orchestrated].join(', ')}\n`);

  // 筛选：多 handler 且有状态写（排除纯基础设施）
  const candidates = [];
  for (const [event, handlers] of byEvent) {
    if (event.startsWith('saga.')) continue;
    if (orchestrated.has(event)) continue;

    const biz = handlers.filter((h) => !INFRA_HANDLERS.has(h));
    if (biz.length < 2) continue; // 单业务 handler 无「兄弟副作用」问题

    const info = biz.map((h) => ({ h, ...handlerWrites(h) }));
    const writable = info.filter((x) => x.writes);
    if (writable.length < 2) continue; // 需至少 2 个会写库的 handler

    const tables = [...new Set(writable.flatMap((x) => x.tables))];
    candidates.push({
      event,
      handlers: biz,
      writable: writable.map((x) => x.h),
      tables,
      hasReversal: hasReversal.has(event.replace(/\.(approved|completed|submitted|confirmed)$/i, '')),
      reversalEvents: reversalEvents.filter((r) => baseOf(r) === event.replace(/\.(approved|completed|submitted|confirmed)$/i, '')),
    });
  }

  candidates.sort((a, b) => b.writable.length - a.writable.length);

  console.log(`----- 候选事件（多 handler + 有状态写）：${candidates.length} 个 -----`);
  for (const c of candidates) {
    const rev = c.reversalEvents.length ? `🔄 已有逆操作事件: ${c.reversalEvents.join(', ')}` : '⚠️  无现成逆操作事件，需自实现';
    console.log(`\n${c.event}`);
    console.log(`   写库 handler(${c.writable.length}): ${c.writable.join(', ')}`);
    console.log(`   涉及表: ${c.tables.slice(0, 8).join(', ')}${c.tables.length > 8 ? ' …' : ''}`);
    console.log(`   ${rev}`);
  }

  console.log('\n----- 建议优先级 -----');
  const withRev = candidates.filter((c) => c.reversalEvents.length > 0);
  const withoutRev = candidates.filter((c) => c.reversalEvents.length === 0);
  console.log(`① 优先（已有逆操作可复用，成本低）: ${withRev.length} 个`);
  withRev.forEach((c) => console.log(`     ${c.event} ← ${c.reversalEvents.join(', ')}`));
  console.log(`② 次优先（需自实现逆操作，成本高）: ${withoutRev.length} 个`);
  withoutRev.forEach((c) => console.log(`     ${c.event} (${c.writable.length} 个写库 handler)`));
}

main();
