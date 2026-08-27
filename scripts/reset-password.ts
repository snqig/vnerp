/**
 * 重置用户密码
 * 使用方法: npx tsx scripts/reset-password.ts <用户名> <新密码>
 */

import { query, execute } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function resetPassword(username: string, newPassword: string) {
  console.log(`重置密码: ${username}\n`);

  try {
    // 检查用户是否存在
    const users = await query(
      'SELECT id, username, real_name FROM sys_user WHERE username = ? AND deleted = 0',
      [username]
    );

    if (users.length === 0) {
      console.error(`❌ 用户 "${username}" 不存在`);
      return;
    }

    const user = users[0];
    console.log(`找到用户: ${user.username} (${user.real_name})`);

    // 生成新密码哈希
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await execute(
      'UPDATE sys_user SET password = ? WHERE id = ?',
      [hashedPassword, user.id]
    );

    console.log(`✓ 密码已重置为: ${newPassword}`);

  } catch (error: any) {
    console.error('❌ 重置失败:', error.message);
  }
}

// 主函数
const username = process.argv[2] || 'admin';
const newPassword = process.argv[3] || 'admin123';

resetPassword(username, newPassword);
