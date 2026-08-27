/**
 * DbExecutor — 数据库执行器抽象接口
 *
 * 将 BaseRepository 对 `@/lib/db` 的直接依赖抽象为接口，使基类依赖抽象而非具体实现。
 * 便于在单元测试中注入 mock，并允许未来替换底层执行器（如 Drizzle、其他驱动）。
 *
 * 接口契约与 `@/lib/db` 导出的 query / execute / queryOne / transaction 一致。
 */

import type { ResultSetHeader, PoolConnection } from 'mysql2/promise';
import type { SqlValue } from '@/lib/db';

export type { SqlValue, ResultSetHeader, PoolConnection };

/**
 * 数据库执行器接口
 * @description 提供查询、写入、单条查询和事务能力的抽象契约。
 *   BaseRepository 通过此接口访问数据库，而非直接依赖 `@/lib/db`。
 */
export interface DbExecutor {
  /**
   * 执行查询语句（SELECT）
   * @param sql - SQL 查询语句，使用 ? 作为参数占位符
   * @param params - 查询参数数组
   * @returns 查询结果数组
   */
  query<T = unknown>(sql: string, params?: SqlValue[]): Promise<T[]>;

  /**
   * 执行写入语句（INSERT/UPDATE/DELETE）
   * @param sql - SQL 语句，使用 ? 作为参数占位符
   * @param params - 参数数组
   * @returns 执行结果元数据（包含 affectedRows、insertId 等）
   */
  execute(sql: string, params?: SqlValue[]): Promise<ResultSetHeader>;

  /**
   * 查询单条记录
   * @param sql - SQL 查询语句
   * @param params - 查询参数
   * @returns 第一条记录或 null
   */
  queryOne<T = unknown>(sql: string, params?: SqlValue[]): Promise<T | null>;

  /**
   * 事务处理
   * @param callback - 事务回调函数，接收数据库连接作为参数
   * @returns 回调函数的返回值
   */
  transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T>;
}
