import mysql from 'mysql2/promise';

// MySQL 数据库连接配置
const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'Snqig521223',
  database: process.env.MYSQL_DATABASE || 'vnerpdacahng',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 创建连接池
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

// 执行查询
export async function query<T = any>(sql: string, values?: any[]): Promise<T[]> {
  const pool = getPool();
  const [rows] = await pool.execute(sql, values);
  return rows as T[];
}

// 执行插入/更新/删除
export async function execute(sql: string, values?: any[]): Promise<mysql.ResultSetHeader> {
  const pool = getPool();
  const [result] = await pool.execute(sql, values);
  return result as mysql.ResultSetHeader;
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

export { dbConfig };
