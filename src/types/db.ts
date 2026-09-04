/**
 * 数据库查询结果通用行类型
 *
 * mysql2 返回的 RowDataPacket 本质上是 Record<string, any>。
 * 本类型与项目既有使用方式对齐（宽松类型 + 运行时校验），
 * 避免 unknown 在 30+ 文件间系统性传染（历史存量 tsc 债 H1）。
 */
export type DbRow = Record<string, any>;

/**
 * 数据库查询结果数组
 */
export type DbRowArray = DbRow[];

/**
 * SQL 查询返回的元组 [rows, fields]（conn.execute / conn.query 返回值）
 */
export type DbResult<T = DbRow> = [T[], unknown];

/**
 * 通用数据库连接接口（mysql.PoolConnection 的子集）
 *
 * query/execute 采用与 mysql2 一致的泛型签名（T 默认 any），
 * 保证 mysql.PoolConnection 可直接赋值给 DbConnection（结构兼容），
 * 同时支持调用方显式指定 <ResultSetHeader> / <RowDataPacket[]> 泛型。
 */
export interface DbConnection {
  query<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
  execute<T = any>(sql: string, values?: any[]): Promise<[T, any]>;
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
