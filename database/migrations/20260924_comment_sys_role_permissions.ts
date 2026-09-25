/**
 * sys_role.permissions 列注释补全（词汇表统一 P1 · 「阶段二 冻结」）
 *
 * 正向迁移 (up):
 *   为 `sys_role.permissions` 补 COLUMN_COMMENT（原值为空串 ''），
 *   把该列的真实语义固化进 schema 元数据，防止后续治理把它误判为
 *   「废弃冗余列」而清空。
 *
 *   核准事实（2026-09-24，证据见
 *   qa-results/field-alignment/权限码词汇表阶段二冻结-20260924.md）：
 *     1. 该列是【按钮权限码】（JSON 数组，通配形态如 `warehouse:*` /
 *        `orders:sales:*`），正式读写入口 `/api/role-permissions/buttons`，
 *        是前端按钮显隐的唯一数据源；
 *     2. 【不参与服务端鉴权】—— 鉴权链路 `getUserInfo`（src/lib/auth.ts）
 *        只读 `sys_role_menu` + `sys_menu`；
 *     3. `sys_menu` 不存在按钮型记录（实测 `menu_type` 仅 1=目录 10 行 /
 *        2=菜单 101 行），故本列**不是**菜单权限的冗余副本，
 *        二者互补而非双写，**不可互相清空**。
 *   同批代码侧收敛：`organization/role` 与 `system/roles` 的 POST/PUT
 *   均已停止写该列（消除「编辑角色 → 静默覆盖按钮权限」）。
 *
 * 反向迁移 (down): 把列注释还原为空串 ''。
 *
 * 幂等性：up 先探测当前 COLUMN_COMMENT，已是目标值则跳过；
 * down 直接置空串，可重复执行。
 *
 * 纯元数据变更：不改任何数据行（ALTER ... MODIFY COLUMN 仅改注释）。
 *
 * 迁移前留痕：
 *   SELECT COLUMN_COMMENT, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
 *    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role' AND COLUMN_NAME = 'permissions';
 *   -- 期望（迁移前）：COLUMN_COMMENT = ''（空串），COLUMN_TYPE = json，IS_NULLABLE = YES
 * 迁移后自检：
 *   -- 期望：COLUMN_COMMENT 以「按钮权限码（JSON 数组」开头，其余两列不变
 *   SELECT COLUMN_COMMENT, COLUMN_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
 *    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role' AND COLUMN_NAME = 'permissions';
 */
import type { Connection } from 'mysql2/promise';

const TARGET_COMMENT =
  '按钮权限码（JSON 数组，通配形态如 warehouse:* / orders:sales:*）。' +
  '正式读写入口 /api/role-permissions/buttons，前端按钮显隐唯一数据源；' +
  '不参与服务端鉴权（鉴权以 sys_role_menu + sys_menu 为准）。' +
  '2026-09-24 起 organization/role 与 system/roles 的写入通道已关闭。';

// 列定义（与迁移前完全一致，仅追加 COMMENT）
const COLUMN_DEF = '`permissions` JSON NULL';

/** 目标列不存在则返回 null（区别于「存在但注释为空」） */
async function currentComment(conn: Connection): Promise<string | null> {
  const [rows] = await conn.query(
    `SELECT COLUMN_COMMENT AS c FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sys_role' AND COLUMN_NAME = 'permissions'`
  );
  const arr = rows as Array<{ c: string | null }>;
  return arr.length > 0 ? (arr[0].c ?? '') : null;
}

export async function up(conn: Connection): Promise<void> {
  const before = await currentComment(conn);
  if (before === null) {
    throw new Error('sys_role.permissions 列不存在，迁移中止（schema 与预期不符）');
  }
  if (before === TARGET_COMMENT) {
    console.log('  [skip] sys_role.permissions 注释已是目标值，幂等跳过');
    return;
  }

  await conn.query(
    `ALTER TABLE \`sys_role\` MODIFY COLUMN ${COLUMN_DEF} COMMENT '${TARGET_COMMENT.replace(/'/g, "''")}'`
  );

  const after = await currentComment(conn);
  if (after !== TARGET_COMMENT) {
    throw new Error('列注释写入后校验失败：读回值与目标不一致');
  }
  console.log(
    `  [ok] sys_role.permissions 列注释 ${JSON.stringify(before)} -> 目标值（${Buffer.byteLength(TARGET_COMMENT)} bytes）`
  );
}

export async function down(conn: Connection): Promise<void> {
  await conn.query(`ALTER TABLE \`sys_role\` MODIFY COLUMN ${COLUMN_DEF} COMMENT ''`);
  const after = await currentComment(conn);
  if (after !== '') {
    throw new Error('回滚后校验失败：列注释未清空');
  }
  console.log("  [rollback] sys_role.permissions 列注释已还原为空串 ''");
}
