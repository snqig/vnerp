/**
 * 数据库备份脚本
 * 使用 Node.js 执行 MySQL 备份
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// 数据库配置
const DB_CONFIG = {
  host: '127.0.0.1',
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `backup_${timestamp}.sql`);

  // 创建备份目录
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('========================================');
  console.log('数据库备份');
  console.log('========================================\n');
  console.log(`数据库: ${DB_CONFIG.database}`);
  console.log(`备份文件: ${backupFile}\n`);

  try {
    // 构建 mysqldump 命令
    const cmd = `mysqldump -h ${DB_CONFIG.host} -u ${DB_CONFIG.user} -p${DB_CONFIG.password} ${DB_CONFIG.database}`;

    console.log('正在执行备份...');

    // 执行备份
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });

    if (stderr && !stderr.includes('Warning')) {
      console.error('备份警告:', stderr);
    }

    // 写入文件
    fs.writeFileSync(backupFile, stdout);

    // 获取文件大小
    const stats = fs.statSync(backupFile);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('✓ 备份完成！');
    console.log(`文件大小: ${sizeMB} MB`);
    console.log(`保存位置: ${backupFile}\n`);

    // 列出最近的备份
    listRecentBackups(backupDir);

    return backupFile;

  } catch (error: any) {
    if (error.message.includes('mysqldump')) {
      console.error('错误: 找不到 mysqldump 命令');
      console.error('请确保 MySQL 已安装并添加到系统 PATH');
      console.error('\n或者手动执行备份命令:');
      console.error(`mysqldump -h ${DB_CONFIG.host} -u ${DB_CONFIG.user} -p ${DB_CONFIG.database} > ${backupFile}`);
    } else {
      console.error('备份失败:', error.message);
    }
    throw error;
  }
}

function listRecentBackups(backupDir: string) {
  console.log('最近的备份文件:');
  console.log('-'.repeat(60));

  if (!fs.existsSync(backupDir)) {
    console.log('无');
    return;
  }

  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.sql'))
    .map(f => {
      const stat = fs.statSync(path.join(backupDir, f));
      return {
        name: f,
        size: (stat.size / 1024 / 1024).toFixed(2) + ' MB',
        time: stat.mtime.toLocaleString(),
      };
    })
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 5);

  if (files.length === 0) {
    console.log('无');
  } else {
    files.forEach(f => {
      console.log(`${f.name} | ${f.size} | ${f.time}`);
    });
  }
  console.log('');
}

// 主函数
async function main() {
  try {
    await backupDatabase();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
