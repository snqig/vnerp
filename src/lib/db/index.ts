import mysql from 'mysql2/promise';

// MySQL 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Snqig521223',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    console.log('[DB] Creating new MySQL pool with config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
    });
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 执行查询
export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  try {
    const pool = getPool();
    console.log('[DB] Executing query:', sql.substring(0, 100), 'values:', values);
    // 使用 query 而不是 execute，避免 prepared statement 参数绑定问题
    const [rows] = await pool.query(sql, values);
    console.log('[DB] Query returned', (rows as any[]).length, 'rows');
    return rows as T[];
  } catch (error) {
    console.error('[DB] Query error:', error);
    throw error;
  }
}

// 执行插入/更新/删除
export async function execute(sql: string, values?: any[]): Promise<mysql.ResultSetHeader> {
  try {
    const pool = getPool();
    console.log('[DB] Executing execute:', sql.substring(0, 100));
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

// 为了保持向后兼容，导出 pool
export { pool, dbConfig };
