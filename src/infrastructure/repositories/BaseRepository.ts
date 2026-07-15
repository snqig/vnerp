/**
 * T003: 通用基础仓储 CRUD 模板
 *
 * 提供基础的增删改查、分页、状态更新方法，三个模块（印前/生产/打样）的仓储实现可直接继承复用。
 * 子类需实现 abstract 方法提供表名、列映射等元数据。
 *
 * 设计原则：
 * - 子类通过 protected 方法访问 SQL 构建能力
 * - 列名映射使用 fieldColumnMap（camelCase → snake_case）
 * - 软删除统一使用 deleted = 0 过滤
 * - 参数化查询防注入
 * - 依赖 DbExecutor 抽象接口而非 @/lib/db，便于测试注入与未来替换执行器
 */

import type { DbExecutor, SqlValue } from './DbExecutor';
import { mysqlDbExecutor } from './MysqlDbExecutor';

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

export interface BaseFilters {
  keyword?: string;
  status?: number | string;
  startDate?: string;
  endDate?: string;
}

export abstract class BaseRepository<T, F extends BaseFilters = BaseFilters> {
  constructor(
    protected readonly tableName: string,
    protected readonly idColumn: string = 'id',
    protected readonly codeColumn: string = 'code',
    protected readonly deletedColumn: string = 'deleted',
    protected readonly dbExecutor: DbExecutor = mysqlDbExecutor
  ) {}

  /**
   * 子类实现：将数据库行映射为领域对象
   */
  protected abstract mapRow(row: Record<string, unknown>): T;

  /**
   * 子类实现：构建 WHERE 条件片段
   *
   * 子类必须声明自身的过滤语义，包括软删除条件、关键字搜索、状态过滤等。
   * 返回的 clause 应为完整的 WHERE 子句（以 "WHERE" 开头），参数使用 ? 占位符。
   *
   * @param filters - 过滤条件对象
   * @returns { clause: string; params: SqlValue[] } — WHERE 子句与对应参数
   */
  protected abstract buildWhereClause(filters: F): { clause: string; params: SqlValue[] };

  /**
   * 根据 ID 查询单条记录
   */
  async findById(id: number): Promise<T | null> {
    const rows = await this.dbExecutor.query<Record<string, unknown>>(
      `SELECT * FROM \`${this.tableName}\` WHERE \`${this.idColumn}\` = ? AND ${this.deletedColumn} = 0`,
      [id]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * 根据编码查询单条记录
   */
  async findByCode(code: string): Promise<T | null> {
    const rows = await this.dbExecutor.query<Record<string, unknown>>(
      `SELECT * FROM \`${this.tableName}\` WHERE \`${this.codeColumn}\` = ? AND ${this.deletedColumn} = 0`,
      [code]
    );
    return rows.length > 0 ? this.mapRow(rows[0]) : null;
  }

  /**
   * 分页查询列表
   */
  async findList(
    filters: F,
    pagination: PaginationParams
  ): Promise<PaginatedResult<T>> {
    const { clause, params } = this.buildWhereClause(filters);
    const { page, pageSize } = pagination;

    const countSql = `SELECT COUNT(*) as total FROM \`${this.tableName}\` ${clause}`;
    const countResult = await this.dbExecutor.query<{ total: number }>(countSql, params);
    const total = countResult[0]?.total || 0;

    const dataSql = `SELECT * FROM \`${this.tableName}\` ${clause} ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    const rows = await this.dbExecutor.query<Record<string, unknown>>(dataSql, [
      ...params,
      pageSize,
      (page - 1) * pageSize,
    ]);

    return {
      data: rows.map((r) => this.mapRow(r)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 查询全部（不分页，用于下拉选项等小数据集）
   */
  async findAll(): Promise<T[]> {
    const rows = await this.dbExecutor.query<Record<string, unknown>>(
      `SELECT * FROM \`${this.tableName}\` WHERE ${this.deletedColumn} = 0 ORDER BY create_time DESC`
    );
    return rows.map((r) => this.mapRow(r));
  }

  /**
   * 新增记录，返回插入 ID
   */
  protected async insertRow(columns: string[], values: SqlValue[]): Promise<number> {
    const placeholders = columns.map(() => '?').join(', ');
    const columnList = columns.map((c) => `\`${c}\``).join(', ');
    const result = await this.dbExecutor.execute(
      `INSERT INTO \`${this.tableName}\` (${columnList}) VALUES (${placeholders})`,
      values
    );
    return result.insertId;
  }

  /**
   * 根据 ID 更新指定字段
   */
  protected async updateFields(id: number, fields: Record<string, SqlValue>): Promise<boolean> {
    const columns = Object.keys(fields);
    if (columns.length === 0) return false;

    const setClause = columns.map((c) => `\`${c}\` = ?`).join(', ');
    const values = columns.map((c) => fields[c]);

    const result = await this.dbExecutor.execute(
      `UPDATE \`${this.tableName}\` SET ${setClause}, update_time = NOW() WHERE \`${this.idColumn}\` = ? AND ${this.deletedColumn} = 0`,
      [...values, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 更新状态
   */
  async updateStatus(id: number, status: number): Promise<boolean> {
    return this.updateFields(id, { status });
  }

  /**
   * 软删除
   */
  async softDelete(id: number): Promise<boolean> {
    const result = await this.dbExecutor.execute(
      `UPDATE \`${this.tableName}\` SET ${this.deletedColumn} = 1, update_time = NOW() WHERE \`${this.idColumn}\` = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * 检查编码是否已存在
   */
  async existsByCode(code: string, excludeId?: number): Promise<boolean> {
    let sql = `SELECT COUNT(*) as cnt FROM \`${this.tableName}\` WHERE \`${this.codeColumn}\` = ? AND ${this.deletedColumn} = 0`;
    const params: SqlValue[] = [code];
    if (excludeId) {
      sql += ` AND \`${this.idColumn}\` != ?`;
      params.push(excludeId);
    }
    const result = await this.dbExecutor.queryOne<{ cnt: number }>(sql, params);
    return (result?.cnt || 0) > 0;
  }

  /**
   * 按状态统计数量
   */
  async countByStatus(status: number): Promise<number> {
    const result = await this.dbExecutor.queryOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM \`${this.tableName}\` WHERE status = ? AND ${this.deletedColumn} = 0`,
      [status]
    );
    return result?.cnt || 0;
  }

  /**
   * 通用分页查询辅助方法（子类可调用构建复杂查询）
   */
  protected async queryPaginatedRaw(
    dataSql: string,
    countSql: string,
    params: SqlValue[],
    pagination: PaginationParams
  ): Promise<PaginatedResult<T>> {
    const { page, pageSize } = pagination;
    const countResult = await this.dbExecutor.query<{ total: number }>(countSql, params);
    const total = countResult[0]?.total || 0;

    const rows = await this.dbExecutor.query<Record<string, unknown>>(`${dataSql} LIMIT ? OFFSET ?`, [
      ...params,
      pageSize,
      (page - 1) * pageSize,
    ]);

    return {
      data: rows.map((r) => this.mapRow(r)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
