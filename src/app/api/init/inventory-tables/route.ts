import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// 初始化库存相关表
export async function POST(request: NextRequest) {
  try {
    // 读取 SQL 文件
    const sqlFilePath = path.join(process.cwd(), 'database', 'inventory_tables.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // 分割 SQL 语句（按分号分割，但忽略注释中的分号）
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    const results = [];
    const errors = [];

    for (const statement of statements) {
      try {
        // 跳过 CREATE DATABASE 和 USE 语句
        if (statement.toUpperCase().includes('CREATE DATABASE') || 
            statement.toUpperCase().includes('USE ')) {
          continue;
        }

        await query(statement);
        results.push(`执行成功: ${statement.substring(0, 50)}...`);
      } catch (error: any) {
        // 忽略表已存在的错误
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          results.push(`表已存在，跳过: ${statement.substring(0, 50)}...`);
        } else {
          errors.push(`执行失败: ${statement.substring(0, 50)}... - ${error.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: '库存表初始化完成',
      results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('初始化库存表失败:', error);
    return NextResponse.json({
      success: false,
      message: '初始化库存表失败',
      error: String(error)
    }, { status: 500 });
  }
}

// GET - 检查表是否存在
export async function GET(request: NextRequest) {
  try {
    const tables = ['bas_material', 'inv_location', 'inv_inventory_batch'];
    const results = [];

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

    return NextResponse.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('检查表状态失败:', error);
    return NextResponse.json({
      success: false,
      message: '检查表状态失败',
      error: String(error)
    }, { status: 500 });
  }
}
