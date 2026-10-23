/**
 * 并发测试库隔离（必须在 @/lib/db 求值前生效）
 *
 * 原理：src/lib/db/index.ts 的 dbConfig 在模块求值期固化 process.env.DB_NAME，
 * 连接池（getPool 单例）据此建连。本文件作为 concurrency project 的专属
 * setupFile（排在 tests/setup-env.ts 之后、任何被测模块 import 之前执行），
 * 把 DB_NAME 指到独立测试库，使 tests/concurrency/* 的全部读写落在测试库，
 * 不再污染主库（vnerpdacahng）——主库清道夫（pnpm db:clean-e2e）随之退化为兜底。
 *
 * ⚠ 无条件覆盖 DB_NAME：tests/setup-env.ts 的 process.loadEnvFile() 会先把
 *   .env 的 DB_NAME=vnerpdacahng 写入 process.env，无法与「用户显式指定」区分
 *   （2026-09-30 实测据此误判跳过隔离、写穿主库 13 单）。
 *   跳过隔离的唯一出口：E2E_DB_ISOLATION=off（临时调试用，写完记得清）。
 *
 * 建库（一次性）：DB_NAME=vnerpdacahng_test node scripts/setup-db.mjs --schema=database/ci_schema.sql
 *
 * 零依赖：不得 import 任何业务模块，否则先于 env 生效前求值。
 */
const ISOLATED_DB = process.env.E2E_DB_NAME || 'vnerpdacahng_test';

if (process.env.E2E_DB_ISOLATION === 'off') {
  console.log(
    `[concurrency-isolation] E2E_DB_ISOLATION=off，跳过隔离（写入 ${process.env.DB_NAME || 'vnerpdacahng'}，慎用）`
  );
} else {
  process.env.DB_NAME = ISOLATED_DB;
  console.log(`[concurrency-isolation] DB_NAME → ${ISOLATED_DB}（独立测试库，主库不受影响）`);
}

export const ISOLATED_TEST_DB = ISOLATED_DB;
