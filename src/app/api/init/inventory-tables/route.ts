import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  successResponse,
  errorResponse,
  withErrorHandler,
} from '@/lib/api-response';
import fs from 'fs';
import path from 'path';

// 表状态接口
interface TableStatus {
  table: string;
  exists: boolean;
  error?: string;
}

// 执行结果接口
interface ExecutionResult {
  success: boolean;
  statement: string;
  message?: string;
}

// POST - 初始化库存相关表
export const POST = withErrorHandler(async (request: NextRequest) => {
  // 读取 SQL 文件
  const sqlFilePath = path.join(process.cwd(), 'database', 'inventory_tables.sql');

  // 检查文件是否存在
  if (!fs.existsSync(sqlFilePath)) {
    return errorResponse('SQL文件不存在', 404, 404);
  }

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

  // 分割 SQL 语句（按分号分割，但忽略注释中的分号）
  const statements = sqlContent
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  const results: ExecutionResult[] = [];
  const errors: string[] = [];

  for (const statement of statements) {
    try {
      // 跳过 CREATE DATABASE 和 USE 语句
      if (
        statement.toUpperCase().includes('CREATE DATABASE') ||
        statement.toUpperCase().includes('USE ')
      ) {
        continue;
      }

      await query(statement);
      results.push({
        success: true,
        statement: statement.substring(0, 50) + '...',
      });
    } catch (error: any) {
      // 忽略表已存在的错误
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        results.push({
          success: true,
          statement: statement.substring(0, 50) + '...',
          message: '表已存在，跳过',
        });
      } else {
        errors.push(
          `执行失败: ${statement.substring(0, 50)}... - ${error.message}`
        );
      }
    }
  }

  return successResponse(
    {
      results,
      errors: errors.length > 0 ? errors : undefined,
      totalStatements: statements.length,
      successCount: results.filter((r) => r.success).length,
      errorCount: errors.length,
    },
    '库存表初始化完成'
  );
}, '初始化库存表失败');

// GET - 检查表是否存在
export const GET = withErrorHandler(async (request: NextRequest) => {
  const tables = ['bas_material', 'inv_location', 'inv_inventory_batch'];
  const results: TableStatus[] = [];

  for (const table of tables) {
    try {
      await query(`SELECT 1 FROM ${table} LIMIT 1`);
      results.push({ table, exists: true });
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        results.push({ table, exists: false });
      } else {
        results.push({ table, exists: false, error: error.message });
      }
    }
  }

  const allExist = results.every((r) => r.exists);

  return successResponse({
    tables: results,
    allExist,
    ready: allExist,
  });
}, '检查表状态失败');
