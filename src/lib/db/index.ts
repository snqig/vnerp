import mysql from 'mysql2/promise';

// 调试日志开关
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
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 50,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  connectTimeout: 10000,
};

// 创建连接池 - 使用全局单例模式防止热重载时重复创建
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

export function getPool(): mysql.Pool {
  if (!globalForDb.pool) {
    if (DEBUG_DB) {
      console.log('[DB] Creating new MySQL pool with config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
      });
    }
    globalForDb.pool = mysql.createPool(dbConfig);
  }
  return globalForDb.pool;
}

// 执行查询
export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  let retries = 2;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const pool = getPool();
      if (DEBUG_DB) {
        const sqlStr = typeof sql === 'string' ? sql : String(sql);
        console.log('[DB] Executing query:', sqlStr.substring(0, 100), 'values:', values);
      }
      const [rows] = await pool.query(sql, values);
      if (DEBUG_DB) {
        console.log('[DB] Query returned', (rows as any[]).length, 'rows');
      }
      return rows as T[];
    } catch (error: any) {
      lastError = error;
      // 如果是连接过多错误，等待后重试
      if (error.code === 'ER_CON_COUNT_ERROR' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        retries--;
        if (retries > 0) {
          console.warn(`[DB] Connection error, retrying... (${2 - retries}/2)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
      console.error('[DB] Query error:', error);
      throw error;
    }
  }

  console.error('[DB] Query error after retries:', lastError);
  throw lastError;
}

// 执行插入/更新/删除
export async function execute(sql: string, values?: any[]): Promise<mysql.ResultSetHeader> {
  try {
    const pool = getPool();
    if (DEBUG_DB) {
      // 确保 sql 是字符串类型
      const sqlStr = typeof sql === 'string' ? sql : String(sql);
      console.log('[DB] Executing execute:', sqlStr.substring(0, 100));
    }
    const [result] = await pool.execute(sql, values);
    return result as mysql.ResultSetHeader;
  } catch (error) {
    console.error('[DB] Execute error:', error);
    throw error;
  }
}

// 获取单个记录
export async function queryOne<T = any>(sql: string, values?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows.length > 0 ? rows[0] : null;
}

// 事务处理
export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
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

// 分页查询辅助函数
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function queryPaginated<T = any>(
  sql: string,
  valuesOrCountSql: any[] | string,
  pageOrValues: number | any[],
  pageSizeOrPagination: number | PaginationParams
): Promise<PaginatedResult<T>> {
  let values: any[];
  let page: number;
  let pageSize: number;
  let countSql: string;

  // 处理不同的参数格式
  if (Array.isArray(valuesOrCountSql) && typeof pageOrValues === 'number' && typeof pageSizeOrPagination === 'number') {
    // 旧格式: (sql, values, page, pageSize)
    values = valuesOrCountSql;
    page = pageOrValues;
    pageSize = pageSizeOrPagination;
    // 自动生成countSql
    countSql = `SELECT COUNT(*) as total FROM (${sql}) as count_table`;
  } else if (typeof valuesOrCountSql === 'string' && Array.isArray(pageOrValues) && typeof pageSizeOrPagination === 'object') {
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
  const [countResult] = await query<{ total: number }>(countSql, values);
  const total = countResult?.total || 0;

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

// 为了保持向后兼容，导出 getPool 和 dbConfig
export { dbConfig };
