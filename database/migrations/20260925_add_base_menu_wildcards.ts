import type { Connection } from 'mysql2/promise';

/**
 * 阶段三（收敛）最小改动草案：补基础级菜单通配（类别 A + D）
 * ------------------------------------------------------------------
 * 背景：
 *  - API 路由使用 2 段基础码（如 `outsource:view`），而 sys_menu 只登记了
 *    3 段子类型通配（如 `outsource:order:*`）。matchPermission 的 3 段规则只匹配尾段，
 *    导致基础 CRUD 码被服务器 fail-closed 网关（withPermission）拦截。
 *  - 阶段三分析（qa-results/field-alignment/权限码词汇表阶段三收敛-20260925.md）：
 *    24 个未覆盖码中，A+D 类（outsource/equipment/supplier/material/workflow）共 21 个，
 *    几乎全部已被按钮轨（sys_role.permissions）实际使用，仅差“菜单轨词汇表”缺失基础通配。
 *
 * 做法（仅“补”，不改任何既有菜单/权限，完全可逆）：
 *  - 为 5 个模块段各插入 1 条 visible=0 的“权限锚点”菜单，permission = '<seg>:*'。
 *  - 经 sys_role_menu 把这些锚点授权给“已拥有同源子菜单”的角色，使既有角色的菜单权限
 *    词汇表覆盖到对应基础 API 码。
 *  - getUserInfo 收集权限时不过滤 visible（src/lib/auth.ts:228-234），故 visible=0 锚点
 *    仍能正常授权；且因 visible=0 不会进导航，可避免为尚无基础列表页的模块制造破窗链接。
 *
 * 待产品确认项（草案，未 apply）：
 *  - material / workflow 的 parent_id（当前分别挂 仓库管理(5)/系统设置(10)，仅作逻辑归类；
 *    锚点 invisible 不影响导航，可后续调整）。
 *  - workflow:* 授权范围（当前按“系统设置模块角色”传播，仅 super_admin 命中；
 *    若工作流任务需开放给审批人，请补充角色清单）。
 *  - 是否接受 visible=0 锚点方案（vs. 后续补真实基础列表页后改为 visible=1）。
 */

interface AnchorDef {
  code: string;
  name: string;
  permission: string;
  parentId: number;
  path: string;
  sort: number;
  /** 已有同源菜单 id，用于把锚点授权传播给这些菜单的现有角色 */
  sourceMenuIds: number[];
  /** workflow 无同源菜单：改用“系统设置模块（parent_id=10）菜单”作为传播源 */
  sourceByParentId?: number;
}

const ANCHORS: AnchorDef[] = [
  {
    code: 'zz_anchor_outsource',
    name: '权限锚点-委外基础',
    permission: 'outsource:*',
    parentId: 6, // 采购部
    path: '/outsource',
    sort: 100,
    sourceMenuIds: [67, 68, 69, 70],
  },
  {
    code: 'zz_anchor_equipment',
    name: '权限锚点-设备基础',
    permission: 'equipment:*',
    parentId: 4, // 生产部
    path: '/equipment',
    sort: 100,
    sourceMenuIds: [50, 51, 52, 53],
  },
  {
    code: 'zz_anchor_supplier',
    name: '权限锚点-供应商基础',
    permission: 'supplier:*',
    parentId: 6, // 采购部
    path: '/purchase/suppliers',
    sort: 100,
    sourceMenuIds: [64],
  },
  {
    code: 'zz_anchor_material',
    name: '权限锚点-物料基础',
    permission: 'material:*',
    parentId: 5, // 仓库管理（物料/库存域，parent 待确认）
    path: '/material',
    sort: 100,
    sourceMenuIds: [44, 45, 56, 93],
  },
  {
    code: 'zz_anchor_workflow',
    name: '权限锚点-工作流基础',
    permission: 'workflow:*',
    parentId: 10, // 系统设置（parent 待确认）
    path: '/workflow',
    sort: 100,
    sourceMenuIds: [],
    sourceByParentId: 10, // 系统设置模块
  },
];

export async function up(conn: Connection): Promise<void> {
  for (const a of ANCHORS) {
    const [res] = await conn.query(
      `INSERT INTO sys_menu
        (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission,
         sort_order, status, visible, is_external, is_cache, is_visible, keep_alive,
         create_time, update_time, create_by, update_by, deleted)
       VALUES (?, ?, ?, 2, '', ?, '', ?, ?, 1, 0, 0, 1, 0, 1, NOW(), NOW(), 1, 1, 0)`,
      [a.parentId, a.name, a.code, a.path, a.permission, a.sort]
    );
    const menuId = Number((res as any).insertId);

    let srcIds: number[] = a.sourceMenuIds;
    if (a.sourceByParentId !== undefined) {
      const [srcRows]: any = await conn.query(
        `SELECT id FROM sys_menu WHERE parent_id = ? AND deleted = 0`,
        [a.sourceByParentId]
      );
      srcIds = (srcRows as any[]).map((r: any) => Number(r.id));
    }

    if (srcIds.length > 0) {
      const idList = srcIds.join(',');
      await conn.query(
        `INSERT INTO sys_role_menu (role_id, menu_id, create_time)
         SELECT DISTINCT rm.role_id, ?, NOW()
         FROM sys_role_menu rm
         WHERE rm.menu_id IN (${idList})
           AND NOT EXISTS (
             SELECT 1 FROM sys_role_menu x WHERE x.role_id = rm.role_id AND x.menu_id = ?
           )`,
        [menuId, menuId]
      );
    }
  }
}

export async function down(conn: Connection): Promise<void> {
  const [rows]: any = await conn.query(
    `SELECT id FROM sys_menu WHERE menu_code LIKE 'zz_anchor_%' AND deleted = 0`
  );
  const ids = (rows as any[]).map((r: any) => Number(r.id));
  if (ids.length > 0) {
    const idList = ids.join(',');
    await conn.query(`DELETE FROM sys_role_menu WHERE menu_id IN (${idList})`);
    await conn.query(`DELETE FROM sys_menu WHERE id IN (${idList})`);
  }
}
