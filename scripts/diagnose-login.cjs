/**
 * Login diagnostic script — tests each step of the login flow to find the 500 error.
 * Run: node scripts/diagnose-login.cjs
 */
const fs = require('fs');
const path = require('path');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = value;
}

async function main() {
  console.log('=== Login Diagnostic ===\n');

  // Step 1: Database connection
  console.log('Step 1: Testing MySQL connection...');
  let mysql;
  try {
    mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'vnerpdacahng',
      multipleStatements: true,
    });
    console.log('  ✓ MySQL connected');

    // Step 2: Query admin user
    console.log('\nStep 2: Querying admin user...');
    let userRows;
    try {
      [userRows] = await conn.execute(
        'SELECT id, username, password, real_name, status, first_login, login_fail_count, lock_time FROM sys_user WHERE username = ? AND deleted = 0',
        ['admin']
      );
    } catch (e) {
      if (e.code === 'ER_BAD_FIELD_ERROR') {
        [userRows] = await conn.execute(
          'SELECT id, username, password, real_name, status, 1 as first_login, 0 as login_fail_count, NULL as lock_time FROM sys_user WHERE username = ? AND deleted = 0',
          ['admin']
        );
      } else {
        throw e;
      }
    }

    if (userRows.length === 0) {
      console.log('  ✗ admin user NOT FOUND');
      await conn.end();
      return;
    }
    const user = userRows[0];
    console.log('  ✓ admin user found:', { id: user.id, username: user.username, status: user.status, lock_time: user.lock_time, fail_count: user.login_fail_count });
    console.log('  password hash prefix:', user.password ? user.password.slice(0, 20) + '...' : 'NULL');

    // Step 3: bcrypt comparison
    console.log('\nStep 3: Testing bcrypt.compare("admin123", hash)...');
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare('admin123', user.password);
    console.log('  password valid:', isValid);

    if (!isValid) {
      // Also try 521223
      const isValid2 = await bcrypt.compare('521223', user.password);
      console.log('  password "521223" valid:', isValid2);

      // Generate a new hash for admin123 to show what it should look like
      const newHash = await bcrypt.hash('admin123', 10);
      console.log('  new hash for admin123 would be:', newHash);
    }

    // Step 4: Test JWT signing
    console.log('\nStep 4: Testing JWT signing...');
    try {
      const { SignJWT } = require('jose');
      const token = await new SignJWT({ userId: user.id, username: user.username })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(new TextEncoder().encode(process.env.JWT_SECRET));
      console.log('  ✓ JWT signed successfully, length:', token.length);
    } catch (e) {
      console.log('  ✗ JWT signing failed:', e.message);
    }

    // Step 5: Test role/permission queries
    console.log('\nStep 5: Testing role/permission queries...');
    try {
      const [roles] = await conn.execute(
        'SELECT r.id, r.role_code, r.role_name, r.data_scope FROM sys_user_role ur JOIN sys_role r ON ur.role_id = r.id WHERE ur.user_id = ? AND r.status = 1',
        [user.id]
      );
      console.log('  ✓ roles found:', roles.length, roles.map(r => r.role_code));
    } catch (e) {
      console.log('  ✗ role query failed:', e.message);
    }

    // Step 6: Test login log insert
    console.log('\nStep 6: Testing sys_login_log insert...');
    try {
      await conn.execute(
        'INSERT INTO sys_login_log (username, ip, user_agent, status, error_msg) VALUES (?, ?, ?, ?, ?)',
        ['admin', '127.0.0.1', 'diagnostic', 1, '']
      );
      console.log('  ✓ login log inserted');
    } catch (e) {
      console.log('  ✗ login log insert failed:', e.message);
      console.log('    error code:', e.code);
    }

    // Step 7: Test sys_notification insert (for abnormal login)
    console.log('\nStep 7: Testing sys_notification table...');
    try {
      await conn.execute(
        "SELECT COUNT(*) as c FROM sys_notification"
      );
      console.log('  ✓ sys_notification table exists');
    } catch (e) {
      console.log('  ✗ sys_notification query failed:', e.message);
      console.log('    error code:', e.code);
    }

    // Step 8: Test sys_department query
    console.log('\nStep 8: Testing sys_department query...');
    try {
      if (user.department_id) {
        const [dept] = await conn.execute(
          'SELECT dept_name FROM sys_department WHERE id = ?',
          [user.department_id]
        );
        console.log('  ✓ department found:', dept[0]?.dept_name || 'N/A');
      } else {
        console.log('  ✓ no department_id (skipped)');
      }
    } catch (e) {
      console.log('  ✗ department query failed:', e.message);
      console.log('    error code:', e.code);
    }

    // Step 9: Test sys_config queries
    console.log('\nStep 9: Testing sys_config queries...');
    try {
      const [cfg] = await conn.execute(
        "SELECT config_value FROM sys_config WHERE config_key = 'system.password_expire_days'"
      );
      console.log('  ✓ password_expire_days:', cfg[0]?.config_value || 'not set');
    } catch (e) {
      console.log('  ✗ sys_config query failed:', e.message);
      console.log('    error code:', e.code);
    }

    // Step 10: Test update login info
    console.log('\nStep 10: Testing UPDATE sys_user login info...');
    try {
      await conn.execute(
        'UPDATE sys_user SET login_fail_count = 0, lock_time = NULL WHERE id = ?',
        [user.id]
      );
      console.log('  ✓ update succeeded');
    } catch (e) {
      console.log('  ✗ update failed:', e.message);
      console.log('    error code:', e.code);
    }

    await conn.end();
  } catch (e) {
    console.log('  ✗ FATAL:', e.message);
    console.log('  error code:', e.code);
  }

  // Step 11: Test cache manager (storeRefreshToken)
  console.log('\nStep 11: Testing cache manager (storeRefreshToken)...');
  try {
    // Simulate what the app does
    const cacheManager = require('../src/lib/cache-manager.ts');
    console.log('  cache manager loaded');
  } catch (e) {
    console.log('  (cannot load TS module via require, expected)');
  }

  console.log('\n=== Diagnostic Complete ===');
}

main().catch(e => console.error('Unexpected error:', e));
