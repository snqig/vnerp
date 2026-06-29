/**
 * 数据库备份脚本
 * 用法: npx tsx scripts/backup-database.ts
 * 
 * 支持功能:
 * - 全量备份（mysqldump）
 * - 自动清理过期备份（默认保留7天）
 * - 备份文件压缩
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// 配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerp',
  backupDir: process.env.BACKUP_DIR || './backups',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
};

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${config.database}_${timestamp}.sql.gz`;
  const filepath = path.join(config.backupDir, filename);

  // 确保备份目录存在
  if (!fs.existsSync(config.backupDir)) {
    fs.mkdirSync(config.backupDir, { recursive: true });
  }

  console.log(`[${new Date().toISOString()}] 开始备份数据库: ${config.database}`);

  try {
    const dumpCommand = `mysqldump -h${config.host} -P${config.port} -u${config.user} ${config.password ? `-p${config.password}` : ''} --single-transaction --routines --triggers --events ${config.database} | gzip > "${filepath}"`;

    const { stdout, stderr } = await execAsync(dumpCommand);

    if (stderr && !stderr.includes('Warning')) {
      console.error('备份警告:', stderr);
    }

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`[${new Date().toISOString()}] 备份完成: ${filename} (${sizeMB}MB)`);

    // 清理过期备份
    await cleanupOldBackups();

    return { success: true, filename, size: sizeMB };
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] 备份失败:`, error.message);
    return { success: false, error: error.message };
  }
}

async function cleanupOldBackups() {
  if (!fs.existsSync(config.backupDir)) return;

  const files = fs.readdirSync(config.backupDir);
  const now = Date.now();
  const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

  let cleaned = 0;
  for (const file of files) {
    const filepath = path.join(config.backupDir, file);
    const stats = fs.statSync(filepath);

    if (now - stats.mtimeMs > retentionMs) {
      fs.unlinkSync(filepath);
      cleaned++;
      console.log(`清理过期备份: ${file}`);
    }
  }

  if (cleaned > 0) {
    console.log(`已清理 ${cleaned} 个过期备份（保留${config.retentionDays}天内）`);
  }
}

// 执行备份
backup().then((result) => {
  process.exit(result.success ? 0 : 1);
});
