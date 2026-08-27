/**
 * MysqlDbExecutor — DbExecutor 接口的 MySQL 实现
 *
 * 委托给 `@/lib/db` 导出的 query / execute / queryOne / transaction 函数。
 * 作为 BaseRepository 的默认 DbExecutor，使基类不再直接依赖 `@/lib/db`。
 *
 * 使用单例模式导出 `mysqlDbExecutor`，供 BaseRepository 默认注入。
 */

import { query, execute, queryOne, transaction } from '@/lib/db';
import type { DbExecutor, ResultSetHeader, PoolConnection, SqlValue } from './DbExecutor';

export class MysqlDbExecutor implements DbExecutor {
  async query<T = unknown>(sql: string, params?: SqlValue[]): Promise<T[]> {
    return query<T>(sql, params);
  }

  async execute(sql: string, params?: SqlValue[]): Promise<ResultSetHeader> {
    return execute(sql, params);
  }

  async queryOne<T = unknown>(sql: string, params?: SqlValue[]): Promise<T | null> {
    return queryOne<T>(sql, params);
  }

  async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
    return transaction<T>(callback);
  }
}

/** 默认 MySQL 执行器单例 */
export const mysqlDbExecutor = new MysqlDbExecutor();
