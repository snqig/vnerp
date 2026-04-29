import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载环境变量
dotenv.config({ path: join(__dirname, '../.env.local') });

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
};

async function fixDepartmentTable() {
  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('数据库连接成功\n');

    // 1. 检查 sys_department 表结构
    console.log('=== 1. 检查 sys_department 表结构 ===');
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'sys_department' 
       AND TABLE_SCHEMA = ?`,
      [DB_CONFIG.database]
    );
    
    const columnNames = (columns as any[]).map(c => c.COLUMN_NAME);
    console.log('现有字段:', columnNames);

    // 2. 检查是否有 description 字段
    if (!columnNames.includes('description')) {
      console.log('\n❌ 缺少 description 字段，正在添加...');
      await connection.execute(
        `ALTER TABLE sys_department 
         ADD COLUMN description VARCHAR(500) NULL COMMENT '部门描述' 
         AFTER sort_order`
      );
      console.log('✅ description 字段添加成功');
    } else {
      console.log('\n✅ description 字段已存在');
    }

    // 3. 检查是否有 deleted 字段
    if (!columnNames.includes('deleted')) {
      console.log('\n❌ 缺少 deleted 字段，正在添加...');
      await connection.execute(
        `ALTER TABLE sys_department 
         ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '是否删除' 
         AFTER description`
      );
      console.log('✅ deleted 字段添加成功');
    } else {
      console.log('\n✅ deleted 字段已存在');
    }

    console.log('\n✅ 表结构修复完成');

  } catch (error) {
    console.error('修复失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixDepartmentTable();
