// 幂等迁移：为 sys_role 补齐 role_type / sort_order 两列
// （组织设置-角色页渲染 role_type 类型徽标与 sort_order 排序，但原表无这两列）
const mysql = require('mysql2/promise');

const COLS = [
  { name: 'role_type', type: 'TINYINT', def: '2', comment: '角色类型：1-系统角色 2-自定义' },
  { name: 'sort_order', type: 'INT', def: '0', comment: '排序号' },
];

(async () => {
  const conn = await mysql.createConnection({
    host: '127.0.0.1', port: 3306, user: 'root', password: 'Snqig521223', database: 'vnerpdacahng'
  });
  let changed = 0;
  for (const c of COLS) {
    const [rows] = await conn.query(
      'SELECT 1 FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',
      ['vnerpdacahng', 'sys_role', c.name]
    );
    if (rows.length === 0) {
      await conn.query(
        `ALTER TABLE sys_role ADD COLUMN ${c.name} ${c.type} NOT NULL DEFAULT ${c.def} COMMENT '${c.comment}'`
      );
      console.log('ADDED sys_role.' + c.name);
      changed++;
    } else {
      console.log('EXISTS sys_role.' + c.name + ' (skip)');
    }
  }
  await conn.end();
  console.log(changed === 0 ? 'NO_CHANGES' : `DONE (${changed} column(s) added)`);
})().catch(e => { console.error(e); process.exit(1); });
