import mysql from 'mysql2/promise';

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  });

  try {
    const columns = [
      { name: 'login_fail_count', type: 'INT DEFAULT 0', comment: '登录失败次数' },
      { name: 'lock_time', type: 'DATETIME DEFAULT NULL', comment: '账号锁定时间' },
      { name: 'last_login_time', type: 'DATETIME DEFAULT NULL', comment: '最后登录时间' },
      { name: 'pwd_update_time', type: 'DATETIME DEFAULT NULL', comment: '密码修改时间' },
    ];

    for (const col of columns) {
      try {
        await connection.execute(
          `ALTER TABLE sys_user ADD COLUMN ${col.name} ${col.type} COMMENT '${col.comment}'`
        );
        console.log(`✓ Added column: ${col.name}`);
      } catch (e: any) {
        if (e.code === 'ER_DUP_FIELD_NAME' || e.code === 'ER_DUP_FIELDNAME') {
          console.log(`⊘ Column already exists, skipping: ${col.name}`);
        } else {
          throw e;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();
