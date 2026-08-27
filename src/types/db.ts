/**
 * 数据库查询结果通用行类型
 *
 * mysql2 返回的 RowDataPacket 本质上是 Record<string, any>，
 * 此类型提供比 any 更安全的基础：允许属性访问，但值为 unknown，
 * 调用方需在使用前做类型收窄（as string / Number() / Boolean() 等）。
 */
export type DbRow = Record<string, unknown>;

/**
 * 数据库查询结果数组
 */
export type DbRowArray = DbRow[];

/**
 * SQL 查询返回的元组 [rows, fields]（conn.execute / conn.query 返回值）
 */
export type DbResult<T = DbRow> = [T[], unknown];

/**
 * 通用数据库连接接口（mysql.PoolConnection 子集）
 */
export interface DbConnection {
  query: (sql: string, values?: unknown[]) => Promise<DbResult>;
  execute: (sql: string, values?: unknown[]) => Promise<DbResult>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  release: () => void;
}

/**
 * ResultSetHeader for INSERT/UPDATE/DELETE results
 */
export interface DbResultSetHeader {
  affectedRows: number;
  insertId: number;
  info: string;
  serverStatus: number;
  warningStatus: number;
}
