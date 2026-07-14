/**
 * @module 数据库连接池模块
 * @description 基于 mysql2 的 MySQL 数据库连接池管理模块，提供查询、事务处理、分页查询和 CRUD 辅助方法。
 *   使用全局单例模式管理连接池防止热重载时重复创建，所有查询均使用参数化语句防止 SQL 注入。
 */

import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';
import { isDemoMode, demoQuery, demoExecute } from '@/lib/demo-data';

// SECURITY: All database queries in this module use parameterized prepared statements
// via mysql2's pool.query() and pool.execute() with placeholder values (?).
// This prevents SQL injection attacks by separating SQL logic from data.
// NEVER concatenate user input directly into SQL strings.

/** SQL 参数值类型（mysql2 接受的基本类型；undefined 在预处理前应被替换为 null；数组用于 IN (?) 子句） */
export type SqlValue =
  | string
  | number
  | null
  | boolean
  | Date
  | Buffer
  | undefined
  | readonly SqlValue[];

/** MySQL 错误对象结构（mysql2 抛出的错误非标准 Error 子类） */
interface DbError {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
  message: string;
}

const DEBUG_DB = process.env.DEBUG_DB === 'true' || process.env.NODE_ENV === 'development';

// MySQL 数据库连接配置
// 统一使用 DB_ 前缀的环境变量
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 10,
  idleTimeout: 30000,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 8000,
};

// 创建连接池 - 使用全局单例模式防止热重载时重复创建
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

/**
 * 获取数据库连接池实例（全局单例）
 * @description 使用全局单例模式创建并缓存连接池，避免热重载时重复创建。
 *   连接池配置：最大 20 个连接、最多 10 个空闲连接、空闲超时 30 秒、队列限制 100、连接超时 8 秒。
 * @returns MySQL 连接池实例
 */
export function getPool(): mysql.Pool {
  if (!globalForDb.pool) {
    if (DEBUG_DB) {
    }
    globalForDb.pool = mysql.createPool(dbConfig);
  }
  return globalForDb.pool;
}

/**
 * 获取单个数据库连接
 * @description 从连接池中获取一个连接，适用于需要手动管理连接生命周期的事务场景
 * @returns 数据库连接对象（使用完毕后需调用 connection.release() 释放）
 */
export async function getConnection(): Promise<mysql.PoolConnection> {
  const pool = getPool();
  return pool.getConnection();
}

/**
 * 执行查询语句（SELECT）
 * @description 使用参数化查询执行 SELECT 语句，内置重试机制（最多 2 次）。
 *   当遇到连接数过多或连接丢失错误时自动重试。
 * @param sql - SQL 查询语句，使用 ? 作为参数占位符
 * @param values - 查询参数数组，与 SQL 中的 ? 一一对应
 * @returns 查询结果数组
 * @throws 数据库错误，重试失败后抛出
 * @example
 * const users = await query<User>('SELECT * FROM users WHERE status = ?', [1]);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(sql: string, values?: SqlValue[]): Promise<T[]> {
  if (isDemoMode()) {
    return demoQuery(sql, values) as T[];
  }
  let retries = 2;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const pool = getPool();
      if (DEBUG_DB) {
        const sqlStr = typeof sql === 'string' ? sql : String(sql);
      }
      const [rows] = await pool.query(sql, values);
      if (DEBUG_DB) {
      }
      return rows as T[];
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 如果是连接过多错误，等待后重试
      const dbErr = error as DbError;
      if (dbErr.code === 'ER_CON_COUNT_ERROR' || dbErr.code === 'PROTOCOL_CONNECTION_LOST') {
        retries--;
        if (retries > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
      }
      throw error;
    }
  }

  throw lastError;
}

/**
 * 执行写入语句（INSERT/UPDATE/DELETE）
 * @description 使用参数化查询执行写操作，返回结果集元信息
 * @param sql - SQL 语句，使用 ? 作为参数占位符
 * @param values - 参数数组
 * @returns 执行结果元数据（包含 affectedRows、insertId 等）
 * @throws 数据库错误
 */
export async function execute(sql: string, values?: SqlValue[]): Promise<mysql.ResultSetHeader> {
  if (isDemoMode()) {
    return demoExecute(sql, values) as mysql.ResultSetHeader;
  }
  try {
    const pool = getPool();
    if (DEBUG_DB) {
      const _sqlStr = typeof sql === 'string' ? sql : String(sql);
    }
    // mysql2 的 execute 类型签名比 query 更严格（不接受 undefined），实际运行时支持
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result] = await pool.execute(sql, values as any[]);
    return result as mysql.ResultSetHeader;
  } catch (error) {
    throw error;
  }
}

/**
 * 查询单条记录
 * @description 执行 SELECT 查询并返回第一条结果，无结果时返回 null
 * @param sql - SQL 查询语句
 * @param values - 查询参数
 * @returns 第一条记录或 null
 * @throws 数据库错误
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryOne<T = any>(sql: string, values?: SqlValue[]): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 事务处理
 * @description 在单个数据库事务中执行回调函数。自动管理 beginTransaction、commit 和 rollback。
 *   事务成功时提交，异常时回滚，连接在 finally 中始终释放。
 * @param callback - 事务回调函数，接收数据库连接作为参数
 * @returns 回调函数的返回值
 * @throws 回调函数中的异常或数据库错误，事务会自动回滚
 * @example
 * await transaction(async (conn) => {
 *   await conn.execute('UPDATE accounts SET balance = balance - ? WHERE id = ?', [100, 1]);
 *   await conn.execute('UPDATE accounts SET balance = balance + ? WHERE id = ?', [100, 2]);
 * });
 */
export async function transaction<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  if (isDemoMode()) {
    const mockConnection = {
      execute: async (_sql: string, _values?: unknown[]) => [
        [{ affectedRows: 1, insertId: 1 }],
        undefined,
      ],
      query: async (_sql: string, _values?: unknown[]) => [[], undefined],
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    } as unknown as mysql.PoolConnection;
    return callback(mockConnection);
  }
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 带重试的事务处理
 * @description 在事务失败时自动重试，适用于乐观锁冲突场景。
 *   检测包含 "已被其他操作修改"、"affectedRows"、"version" 等关键字的错误，
 *   以指数退避策略延迟后重试（延迟 = min(100 * 2^attempt + random(0-50), 1000)ms）。
 * @param callback - 事务回调函数
 * @param maxRetries - 最大重试次数，默认为 3
 * @returns 回调函数的返回值
 * @throws 非乐观锁错误立即抛出，或达到最大重试次数后抛出最后一次错误
 */
export async function transactionWithRetry<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await transaction(callback);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      const isOptimisticLockError =
        err.message?.includes('已被其他操作修改') ||
        err.message?.includes('affectedRows') ||
        err.message?.includes('version');
      if (!isOptimisticLockError || attempt >= maxRetries - 1) {
        throw error;
      }
      const delay = Math.min(100 * Math.pow(2, attempt) + Math.random() * 50, 1000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * 分页参数接口
 * @description 定义分页查询的页面参数
 */
export interface PaginationParams {
  /** 当前页码（从 1 开始） */
  page: number;
  /** 每页记录数 */
  pageSize: number;
}

/**
 * 分页查询结果接口
 * @template T - 数据类型
 */
export interface PaginatedResult<T> {
  /** 当前页数据 */
  data: T[];
  /** 分页元信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页记录数 */
    pageSize: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    totalPages: number;
  };
}

/**
 * 分页查询辅助函数
 * @description 执行分页查询并返回含分页元信息的结果。支持两种调用格式：
 *   - 旧格式：(sql, values, page, pageSize) — 自动生成 COUNT 查询
 *   - 新格式：(sql, countSql, values, pagination) — 手动提供 COUNT SQL
 * @param sql - 数据查询 SQL 语句
 * @param valuesOrCountSql - 参数数组（旧格式）或 COUNT SQL 字符串（新格式）
 * @param pageOrValues - 页码（旧格式）或参数数组（新格式）
 * @param pageSizeOrPagination - 每页记录数（旧格式）或分页参数对象（新格式）
 * @returns 分页结果，包含数据和分页元信息
 * @throws 参数格式无效时抛出错误
 * @example
 * // 旧格式
 * const result = await queryPaginated<User>(
 *   'SELECT * FROM users WHERE status = ?',
 *   [1], 1, 20
 * );
 * // 新格式
 * const result = await queryPaginated<User>(
 *   'SELECT * FROM users WHERE status = ?',
 *   'SELECT COUNT(*) as total FROM users WHERE status = ?',
 *   [1], { page: 1, pageSize: 20 }
 * );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryPaginated<T = any>(
  sql: string,
  valuesOrCountSql: SqlValue[] | string,
  pageOrValues: number | SqlValue[],
  pageSizeOrPagination: number | PaginationParams
): Promise<PaginatedResult<T>> {
  let values: SqlValue[];
  let page: number;
  let pageSize: number;
  let countSql: string;

  // 处理不同的参数格式
  if (
    Array.isArray(valuesOrCountSql) &&
    typeof pageOrValues === 'number' &&
    typeof pageSizeOrPagination === 'number'
  ) {
    // 旧格式: (sql, values, page, pageSize)
    values = valuesOrCountSql;
    page = pageOrValues;
    pageSize = pageSizeOrPagination;
    // 自动生成countSql
    countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_table`;
  } else if (
    typeof valuesOrCountSql === 'string' &&
    Array.isArray(pageOrValues) &&
    typeof pageSizeOrPagination === 'object'
  ) {
    // 新格式: (sql, countSql, values, pagination)
    countSql = valuesOrCountSql;
    values = pageOrValues;
    const pagination = pageSizeOrPagination as PaginationParams;
    page = pagination.page;
    pageSize = pagination.pageSize;
  } else {
    throw new Error('Invalid parameters for queryPaginated');
  }

  // 获取总数
  const countResult = await query<{ total: number }>(countSql, values);
  const total = countResult?.[0]?.total || 0;

  // 分页查询
  const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
  const paginatedValues = [...values, pageSize, (page - 1) * pageSize];
  const data = await query<T>(paginatedSql, paginatedValues);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * 数据库连接配置
 * @description 导出连接池配置对象供外部使用（向后兼容）
 */
export { dbConfig };

/**
 * 数据库操作对象（向后兼容）
 * @description 聚合常用数据库操作的便捷对象，提供 query、execute、queryOne、insert、update、delete 方法
 */
export const db = {
  /** 执行查询（委托 query 函数） */
  query,
  /** 执行写入（委托 execute 函数） */
  execute,
  /** 查询单条记录（委托 queryOne 函数） */
  queryOne,
  /**
   * 插入记录
   * @param table - 表名
   * @param data - 键值对数据
   * @returns 包含 insertId 的对象
   */
  insert: async (table: string, data: Record<string, SqlValue>): Promise<{ insertId: number }> => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await execute(sql, values);
    return { insertId: result.insertId };
  },
  /**
   * 更新记录
   * @param table - 表名
   * @param data - 键值对数据
   * @param where - WHERE 条件（使用 ? 占位符）
   * @param whereValues - WHERE 条件参数值
   * @returns 受影响行数
   */
  update: async (
    table: string,
    data: Record<string, SqlValue>,
    where: string,
    whereValues: SqlValue[] = []
  ): Promise<number> => {
    const sets = Object.keys(data)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(data), ...whereValues];
    const sql = `UPDATE ${table} SET ${sets} WHERE ${where}`;
    const result = await execute(sql, values);
    return result.affectedRows;
  },
  /**
   * 删除记录
   * @param table - 表名
   * @param where - WHERE 条件（使用 ? 占位符）
   * @param whereValues - WHERE 条件参数值
   * @returns 受影响行数
   */
  delete: async (table: string, where: string, whereValues: SqlValue[] = []): Promise<number> => {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    const result = await execute(sql, whereValues);
    return result.affectedRows;
  },
};

/**
 * Drizzle ORM 实例
 * @description 基于现有 mysql2 连接池创建的 Drizzle ORM 实例，加载了完整 schema 定义提供类型安全查询。
 *   新代码可使用 drizzleDb 查询构建器；旧代码继续使用 query/execute 保持兼容。
 *   注意：drizzle-orm 0.45.x 仅识别 client 或 connection 参数，传入 pool 会被忽略。
 */
let _drizzleDb: ReturnType<typeof createDrizzleDb> | null = null;
function createDrizzleDb() {
  return drizzle({ client: getPool(), schema, mode: 'default' });
}
export function getDrizzleDb() {
  if (isDemoMode()) {
    throw new Error('Drizzle ORM is not available in demo mode. Use db.query/execute instead.');
  }
  if (!_drizzleDb) {
    _drizzleDb = createDrizzleDb();
  }
  return _drizzleDb;
}
