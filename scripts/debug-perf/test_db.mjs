/**
 * Direct DB test to capture the actual login error.
 * Mimics the login route's DB queries against the same DB.
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// manually load .env
const envPath = path.resolve('d:/dcprint/erp-project/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'vnerpdacahng',
  charset: 'utf8mb4',
  connectTimeout: 8000,
};

console.log('DB config:', { ...dbConfig, password: '***' });

async function main() {
  let conn;
  try {
    console.log('1. Connecting to MySQL...');
    const t0 = Date.now();
    conn = await mysql.createConnection(dbConfig);
    console.log(`   connected in ${Date.now() - t0}ms`);

    console.log('\n2. Checking sys_user table columns...');
    const [cols] = await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_user' ORDER BY ORDINAL_POSITION", [dbConfig.database]);
    console.log('   sys_user columns:', cols.map(c => c.COLUMN_NAME).join(', '));

    console.log('\n3. Running login query (admin)...');
    const t1 = Date.now();
    try {
      const [users] = await conn.query(
        'SELECT id, username, password, real_name, avatar, email, phone, department_id, status, first_login, login_fail_count, lock_time FROM sys_user WHERE username = ? AND deleted = 0',
        ['admin']
      );
      console.log(`   query took ${Date.now() - t1}ms, rows: ${users.length}`);
      if (users.length > 0) {
        const u = users[0];
        console.log('   user:', { id: u.id, username: u.username, status: u.status, first_login: u.first_login, lock_time: u.lock_time, fail_count: u.login_fail_count });
        console.log('   password hash prefix:', String(u.password).slice(0, 20));
        console.log('\n4. Verifying password admin123...');
        const ok = await bcrypt.compare('admin123', u.password);
        console.log('   password valid:', ok);

        console.log('\n5. Querying roles...');
        const [roles] = await conn.query(
          'SELECT r.id, r.role_code, r.role_name, r.data_scope FROM sys_user_role ur JOIN sys_role r ON ur.role_id = r.id WHERE ur.user_id = ? AND r.status = 1',
          [u.id]
        );
        console.log('   roles:', roles);

        console.log('\n6. Querying permissions...');
        if (roles.length > 0) {
          const roleIds = roles.map(r => r.id);
          const placeholders = roleIds.map(() => '?').join(',');
          const [perms] = await conn.query(
            `SELECT DISTINCT m.permission FROM sys_menu m JOIN sys_role_menu rm ON m.id = rm.menu_id WHERE rm.role_id IN (${placeholders}) AND m.permission IS NOT NULL AND m.permission != ''`,
            roleIds
          );
          console.log(`   permissions count: ${perms.length}`);
        }

        console.log('\n7. Testing login_fail_count update...');
        try {
          const [r1] = await conn.execute('UPDATE sys_user SET login_fail_count = ? WHERE id = ?', [0, u.id]);
          console.log('   update ok, affectedRows:', r1.affectedRows);
        } catch (e) {
          console.log('   update FAILED:', e.code, e.message);
        }

        console.log('\n8. Testing last_login_ip update...');
        try {
          const [r2] = await conn.execute('UPDATE sys_user SET login_fail_count = 0, lock_time = NULL, last_login_ip = ?, last_login_time = NOW() WHERE id = ?', ['127.0.0.1', u.id]);
          console.log('   update ok, affectedRows:', r2.affectedRows);
        } catch (e) {
          console.log('   update FAILED:', e.code, e.message);
        }

        console.log('\n9. Testing sys_login_log insert...');
        try {
          const [r3] = await conn.execute(
            'INSERT INTO sys_login_log (username, ip_address, user_agent, login_status, fail_reason) VALUES (?, ?, ?, ?, ?)',
            ['admin', '127.0.0.1', 'test', 1, '']
          );
          console.log('   insert ok, insertId:', r3.insertId);
        } catch (e) {
          console.log('   insert FAILED:', e.code, e.message);
        }

        console.log('\n10. Testing sys_notification insert (abnormal login)...');
        try {
          const [r4] = await conn.execute(
            `INSERT INTO sys_notification (type, title, content, user_id, is_read, create_time) VALUES ('security', '异地登录提醒', ?, ?, 0, NOW())`,
            ['test', u.id]
          );
          console.log('   insert ok, insertId:', r4.insertId);
        } catch (e) {
          console.log('   insert FAILED:', e.code, e.message);
        }
      }
    } catch (e) {
      console.log(`   query FAILED in ${Date.now() - t1}ms:`, e.code, e.message);
    }

    console.log('\n11. Checking sys_login_log table columns...');
    try {
      const [llCols] = await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_login_log' ORDER BY ORDINAL_POSITION", [dbConfig.database]);
      console.log('   sys_login_log columns:', llCols.map(c => c.COLUMN_NAME).join(', '));
    } catch (e) {
      console.log('   FAILED:', e.code, e.message);
    }

    console.log('\n12. Checking sys_notification table columns...');
    try {
      const [nCols] = await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_notification' ORDER BY ORDINAL_POSITION", [dbConfig.database]);
      console.log('   sys_notification columns:', nCols.map(c => c.COLUMN_NAME).join(', '));
    } catch (e) {
      console.log('   FAILED:', e.code, e.message);
    }

    console.log('\n13. Checking sys_user has last_login_ip / last_login_time / pwd_update_time...');
    const [uCols] = await conn.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sys_user' AND COLUMN_NAME IN ('last_login_ip','last_login_time','pwd_update_time','login_fail_count','lock_time','deleted')", [dbConfig.database]);
    console.log('   present columns:', uCols.map(c => c.COLUMN_NAME).join(', '));

  } catch (e) {
    console.error('FATAL:', e.code, e.message);
  } finally {
    if (conn) await conn.end();
  }
}

main();
