/**
 * 数据库字段值类型 — MySQL 返回的基础类型联合
 */
export type DbValue = string | number | null | boolean | Date | Buffer;

/**
 * 数据库查询结果通用行类型
 *
 * mysql2 返回的 RowDataPacket 本质上是 Record<string, DbValue>。
 * 项目既有使用方式通过 String()/Number()/parseFloat() 等做运行时转换，
 * 此类型与该模式对齐，避免 any 在全项目传染。
 */
export type DbRow = Record<string, DbValue>;

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
 * query/execute 采用与 mysql2 一致的泛型签名（T 默认 DbRow[]），
 * 保证 mysql.PoolConnection 可直接赋值给 DbConnection（结构兼容），
 * 同时支持调用方显式指定 <ResultSetHeader> / <RowDataPacket[]> 泛型。
 */
export interface DbConnection {
  query<T = DbRow[]>(sql: string, values?: readonly unknown[]): Promise<[T, unknown]>;
  execute<T = DbRow[]>(sql: string, values?: readonly unknown[]): Promise<[T, unknown]>;
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
