import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withPermission } from '@/lib/api-permissions';
import { logger } from '@/lib/logger';
export const POST = withPermission(async (_request: NextRequest) => {
  const ts = await getTranslations('Common');
  const startTime = Date.now();
  logger.info(ts('k_1vfxxoh'));
  logger.info(`[MENU_INIT] 时间: ${new Date().toISOString()}`);

  try {
    const result = await transaction(async (conn) => {
      const results: string[] = [];
      logger.info(ts('k_5dd3ag'));

      const topLevelMenus = [
        { menu_name: ts('k_1nwl7pb'), menu_code: 'dashboard_center', icon: 'BarChart3', sort_order: 1 },
        { menu_name: ts('k_axb29w'), menu_code: 'orders', icon: 'ShoppingCart', sort_order: 2 },
        { menu_name: ts('k_boxyuc'), menu_code: 'engineering', icon: 'Wrench', sort_order: 3 },
        { menu_name: ts('k_18glq49'), menu_code: 'production', icon: 'Factory', sort_order: 4 },
        { menu_name: ts('k_1wg46ow'), menu_code: 'warehouse', icon: 'Warehouse', sort_order: 5 },
        { menu_name: ts('k_1rgc4zf'), menu_code: 'purchase', icon: 'ShoppingBag', sort_order: 6 },
        { menu_name: ts('k_11g5fpo'), menu_code: 'quality', icon: 'ShieldCheck', sort_order: 7 },
        { menu_name: ts('k_p1ttj7'), menu_code: 'finance', icon: 'Banknote', sort_order: 8 },
        { menu_name: ts('k_bv4mdx'), menu_code: 'hr', icon: 'Users', sort_order: 9 },
        { menu_name: ts('k_1a2tyf'), menu_code: 'settings', icon: 'Settings', sort_order: 10 },
      ];

      for (const menu of topLevelMenus) {
        const [existing] = await conn.execute(
          'SELECT id, parent_id FROM sys_menu WHERE menu_code = ?',
          [menu.menu_code]
        );
        if (existing && existing.length > 0) {
          const existingMenu = existing[0];
          if (existingMenu.parent_id === 0) {
            await conn.execute(
              'UPDATE sys_menu SET menu_name = ?, icon = ?, sort_order = ?, path = ? WHERE menu_code = ?',
              [
                menu.menu_name,
                menu.icon,
                menu.sort_order,
                menu.menu_code === 'dashboard_center' ? '/dashboard_center' : `/${menu.menu_code}`,
                menu.menu_code,
              ]
            );
            results.push(`${menu.menu_code}: 已更新`);
          } else {
            await conn.execute('DELETE FROM sys_role_menu WHERE menu_id = ?', [existingMenu.id]);
            await conn.execute('DELETE FROM sys_menu WHERE id = ?', [existingMenu.id]);
            await conn.execute(
              'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                0,
                menu.menu_name,
                menu.menu_code,
                1,
                menu.icon,
                menu.menu_code === 'dashboard_center' ? '/dashboard_center' : `/${menu.menu_code}`,
                null,
                `${menu.menu_code}:*`,
                menu.sort_order,
                1,
              ]
            );
            results.push(`${menu.menu_code}: 重复菜单已删除并重建为顶级菜单`);
          }
        } else {
          await conn.execute(
            'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              0,
              menu.menu_name,
              menu.menu_code,
              1,
              menu.icon,
              menu.menu_code === 'dashboard_center' ? '/dashboard_center' : `/${menu.menu_code}`,
              null,
              `${menu.menu_code}:*`,
              menu.sort_order,
              1,
            ]
          );
          results.push(`${menu.menu_code}: 创建成功`);
        }
      }
      logger.info(`[MENU_INIT] 步骤1完成: 顶级菜单处理完毕, 数量: ${topLevelMenus.length}`);

      const menuMigrations: { from: string; to: string; new_name?: string }[] = [
        { from: 'dashboard', to: 'dashboard_center', new_name: ts('k_1nwl7pb') },
        { from: 'sample', to: 'engineering' },
        { from: 'prepress', to: 'engineering' },
        { from: 'plm', to: 'engineering' },
        { from: 'dcprint', to: 'production' },
        { from: 'equipment', to: 'production' },
        { from: 'base_data', to: 'settings' },
        { from: 'outsource', to: 'purchase' },
        { from: 'qrcode', to: 'quality' },
        { from: 'crm', to: 'orders' },
        { from: 'srm', to: 'purchase' },
      ];

      for (const mig of menuMigrations) {
        const [fromMenu] = await conn.execute('SELECT id FROM sys_menu WHERE menu_code = ?', [
          mig.from,
        ]);
        const [toMenu] = await conn.execute('SELECT id FROM sys_menu WHERE menu_code = ?', [
          mig.to,
        ]);

        if (fromMenu && fromMenu.length > 0 && toMenu && toMenu.length > 0) {
          const fromId = fromMenu[0].id;
          const toId = toMenu[0].id;

          await conn.execute(
            'UPDATE sys_menu SET parent_id = ? WHERE parent_id = ? AND menu_type = 2',
            [toId, fromId]
          );

          if (mig.new_name) {
            await conn.execute('UPDATE sys_menu SET menu_name = ? WHERE id = ?', [
              mig.new_name,
              toId,
            ]);
          }

          await conn.execute('DELETE FROM sys_role_menu WHERE menu_id = ?', [fromId]);
          await conn.execute('DELETE FROM sys_menu WHERE id = ?', [fromId]);
          results.push(`${mig.from} -> ${mig.to}: 合并完成`);
        } else if (fromMenu && fromMenu.length > 0 && (!toMenu || toMenu.length === 0)) {
          if (mig.new_name) {
            await conn.execute('UPDATE sys_menu SET menu_name = ?, menu_code = ? WHERE id = ?', [
              mig.new_name,
              mig.to,
              fromMenu[0].id,
            ]);
          }
          results.push(`${mig.from}: 重命名为 ${mig.to}`);
        } else {
          results.push(`${mig.from} -> ${mig.to}: 无需迁移`);
        }
      }
      logger.info(`[MENU_INIT] 步骤2完成: 菜单迁移处理完毕, 迁移数: ${menuMigrations.length}`);

      const duplicateDeletes = [
        'dashboard',
        'finance_main',
        'settings_users',
        'settings_logs',
        'orders_sample',
        'dcprint_cards',
        'dcprint_screen_plate',
        'dcprint_die',
        'base_data_material_category',
      ];

      for (const code of duplicateDeletes) {
        const [dup] = await conn.execute('SELECT id FROM sys_menu WHERE menu_code = ?', [code]);
        if (dup && dup.length > 0) {
          await conn.execute('DELETE FROM sys_role_menu WHERE menu_id = ?', [dup[0].id]);
          await conn.execute('DELETE FROM sys_menu WHERE id = ?', [dup[0].id]);
          results.push(`${code}: 已删除重复菜单`);
        }
      }
      logger.info(ts('k_vy28t9'));

      const [pathDups] = await conn.execute(
        `SELECT m1.id, m1.menu_code, m1.menu_name, m1.path
       FROM sys_menu m1
       JOIN sys_menu m2 ON m1.path = m2.path AND m1.id > m2.id AND m1.path IS NOT NULL AND m1.path != ''
       WHERE m1.status = 1 AND m1.menu_type = 2`
      );
      for (const dup of pathDups) {
        await conn.execute('DELETE FROM sys_role_menu WHERE menu_id = ?', [dup.id]);
        await conn.execute('DELETE FROM sys_menu WHERE id = ?', [dup.id]);
        results.push(`${dup.menu_code}(${dup.menu_name}): 路径重复删除, path=${dup.path}`);
      }
      logger.info(ts('k_vpjo4l'), pathDups.length || 0);

      const moveMenusToEngineering = ['dcprint_ink', 'dcprint_process_cards', 'dcprint_labels'];

      const [engMenu] = await conn.execute(
        "SELECT id FROM sys_menu WHERE menu_code = 'engineering' AND parent_id = 0"
      );
      if (engMenu && engMenu.length > 0) {
        const engId = engMenu[0].id;
        for (const code of moveMenusToEngineering) {
          const [menuItem] = await conn.execute('SELECT id FROM sys_menu WHERE menu_code = ?', [
            code,
          ]);
          if (menuItem && menuItem.length > 0) {
            await conn.execute('UPDATE sys_menu SET parent_id = ? WHERE id = ?', [
              engId,
              menuItem[0].id,
            ]);
            results.push(`${code}: 已移至工程技术部`);
          }
        }
      }
      logger.info(ts('k_hht2fe'));

      logger.info(ts('k_og6zxy'));
      const newMenus = [
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_16va3ew'),
          menu_code: 'dashboard_main',
          menu_type: 2,
          icon: null,
          path: '/dashboard',
          component: '/dashboard',
          permission: 'dashboard:main:*',
          sort_order: 1,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_1ovr9sd'),
          menu_code: 'dashboard_production',
          menu_type: 2,
          icon: null,
          path: '/dashboard/production',
          component: '/dashboard/production',
          permission: 'dashboard:production:*',
          sort_order: 2,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_fj3blx'),
          menu_code: 'dashboard_warehouse',
          menu_type: 2,
          icon: null,
          path: '/dashboard/warehouse',
          component: '/dashboard/warehouse',
          permission: 'dashboard:warehouse:*',
          sort_order: 3,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_75z0jp'),
          menu_code: 'dashboard_sales',
          menu_type: 2,
          icon: null,
          path: '/dashboard/sales',
          component: '/dashboard/sales',
          permission: 'dashboard:sales:*',
          sort_order: 4,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_14loasy'),
          menu_code: 'dashboard_quality',
          menu_type: 2,
          icon: null,
          path: '/dashboard/quality',
          component: '/dashboard/quality',
          permission: 'dashboard:quality:*',
          sort_order: 5,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_19symku'),
          menu_code: 'dashboard_finance',
          menu_type: 2,
          icon: null,
          path: '/dashboard/finance',
          component: '/dashboard/finance',
          permission: 'dashboard:finance:*',
          sort_order: 6,
        },
        {
          parent_code: 'dashboard_center',
          menu_name: ts('k_ptw9yx'),
          menu_code: 'dashboard_ceo',
          menu_type: 2,
          icon: null,
          path: '/dashboard/ceo',
          component: '/dashboard/ceo',
          permission: 'dashboard:ceo:*',
          sort_order: 7,
        },

        {
          parent_code: 'orders',
          menu_name: ts('k_m6144y'),
          menu_code: 'orders_sales',
          menu_type: 2,
          icon: null,
          path: '/orders/sales',
          component: '/orders/sales',
          permission: 'orders:sales:*',
          sort_order: 1,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_1mow4yx'),
          menu_code: 'orders_customers',
          menu_type: 2,
          icon: null,
          path: '/orders/customers',
          component: '/orders/customers',
          permission: 'orders:customers:*',
          sort_order: 2,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_1356gf2'),
          menu_code: 'orders_products',
          menu_type: 2,
          icon: null,
          path: '/orders/products',
          component: '/orders/products',
          permission: 'orders:products:*',
          sort_order: 3,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_15fkb2y'),
          menu_code: 'orders_bom',
          menu_type: 2,
          icon: null,
          path: '/orders/bom',
          component: '/orders/bom',
          permission: 'orders:bom:*',
          sort_order: 4,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_1btk7qy'),
          menu_code: 'orders_contract_review',
          menu_type: 2,
          icon: null,
          path: '/business/contract-review',
          component: '/business/contract-review',
          permission: 'orders:contract-review:*',
          sort_order: 5,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_zztljm'),
          menu_code: 'orders_delivery',
          menu_type: 2,
          icon: null,
          path: '/sales/delivery',
          component: '/sales/delivery',
          permission: 'orders:delivery:*',
          sort_order: 6,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_1yzad7b'),
          menu_code: 'orders_return',
          menu_type: 2,
          icon: null,
          path: '/sales/return',
          component: '/sales/return',
          permission: 'orders:return:*',
          sort_order: 7,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_zk784p'),
          menu_code: 'orders_reconciliation',
          menu_type: 2,
          icon: null,
          path: '/sales/reconciliation',
          component: '/sales/reconciliation',
          permission: 'orders:reconciliation:*',
          sort_order: 8,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_1ey5t8w'),
          menu_code: 'crm_follow',
          menu_type: 2,
          icon: null,
          path: '/crm/follow',
          component: '/crm/follow',
          permission: 'crm:follow:*',
          sort_order: 9,
        },
        {
          parent_code: 'orders',
          menu_name: ts('k_gi0aw0'),
          menu_code: 'crm_analysis',
          menu_type: 2,
          icon: null,
          path: '/crm/analysis',
          component: '/crm/analysis',
          permission: 'crm:analysis:*',
          sort_order: 10,
        },

        {
          parent_code: 'engineering',
          menu_name: ts('k_1nojqmc'),
          menu_code: 'sample_management',
          menu_type: 2,
          icon: null,
          path: '/sample/management',
          component: '/sample/management',
          permission: 'sample:management:*',
          sort_order: 1,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1gvmwiu'),
          menu_code: 'sample_orders',
          menu_type: 2,
          icon: null,
          path: '/sample/orders',
          component: '/sample/orders',
          permission: 'sample:orders:*',
          sort_order: 2,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_19s2wpf'),
          menu_code: 'sample_standard_card',
          menu_type: 2,
          icon: null,
          path: '/sample/standard-card',
          component: '/sample/standard-card',
          permission: 'sample:standard-card:*',
          sort_order: 3,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1eaagm9'),
          menu_code: 'engineering_sample_to_mass',
          menu_type: 2,
          icon: null,
          path: '/engineering/sample-to-mass',
          component: '/engineering/sample-to-mass',
          permission: 'engineering:sample-to-mass:*',
          sort_order: 4,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_fv8yn2'),
          menu_code: 'engineering_sop',
          menu_type: 2,
          icon: null,
          path: '/engineering/sop',
          component: '/engineering/sop',
          permission: 'engineering:sop:*',
          sort_order: 5,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1pzl8mh'),
          menu_code: 'prepress_die_template',
          menu_type: 2,
          icon: null,
          path: '/prepress/die-template',
          component: '/prepress/die-template',
          permission: 'prepress:die-template:*',
          sort_order: 6,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_ttcrbf'),
          menu_code: 'dcprint_ink',
          menu_type: 2,
          icon: null,
          path: '/dcprint/ink',
          component: '/dcprint/ink',
          permission: 'dcprint:ink:*',
          sort_order: 7,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_7xqxy5'),
          menu_code: 'dcprint_ink_formula',
          menu_type: 2,
          icon: null,
          path: '/dcprint/ink-formula',
          component: '/dcprint/ink-formula',
          permission: 'dcprint:ink-formula:*',
          sort_order: 7.5,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1dv147v'),
          menu_code: 'dcprint_tool',
          menu_type: 2,
          icon: 'Wrench',
          path: '/dcprint/tool',
          component: '/dcprint/tool',
          permission: 'dcprint:tool:*',
          sort_order: 7.6,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_xht4tz'),
          menu_code: 'dcprint_sample_card',
          menu_type: 2,
          icon: 'FileText',
          path: '/sample/standard-card',
          component: '/sample/standard-card',
          permission: 'dcprint:sample-card:*',
          sort_order: 7.7,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_10sjnxf'),
          menu_code: 'dcprint_process_cards',
          menu_type: 2,
          icon: null,
          path: '/dcprint/process-cards',
          component: '/dcprint/process-cards',
          permission: 'dcprint:process-cards:*',
          sort_order: 8,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1nk5mf9'),
          menu_code: 'dcprint_labels',
          menu_type: 2,
          icon: null,
          path: '/dcprint/labels',
          component: '/dcprint/labels',
          permission: 'dcprint:labels:*',
          sort_order: 9,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1oux5gk'),
          menu_code: 'plm_lifecycle',
          menu_type: 2,
          icon: null,
          path: '/plm/lifecycle',
          component: '/plm/lifecycle',
          permission: 'plm:lifecycle:*',
          sort_order: 10,
        },
        {
          parent_code: 'engineering',
          menu_name: ts('k_1o4raco'),
          menu_code: 'plm_eco',
          menu_type: 2,
          icon: null,
          path: '/plm/eco',
          component: '/plm/eco',
          permission: 'plm:eco:*',
          sort_order: 11,
        },

        {
          parent_code: 'production',
          menu_name: ts('k_1h58b1'),
          menu_code: 'production_workorder',
          menu_type: 2,
          icon: null,
          path: '/production/workorder',
          component: '/production/workorder',
          permission: 'production:workorder:*',
          sort_order: 1,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_15gb18w'),
          menu_code: 'production_schedule',
          menu_type: 2,
          icon: null,
          path: '/production/schedule',
          component: '/production/schedule',
          permission: 'production:schedule:*',
          sort_order: 2,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_j9n8zl'),
          menu_code: 'production_process',
          menu_type: 2,
          icon: null,
          path: '/production/process',
          component: '/production/process',
          permission: 'production:process:*',
          sort_order: 3,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_8xhdtp'),
          menu_code: 'production_report',
          menu_type: 2,
          icon: null,
          path: '/production/report',
          component: '/production/report',
          permission: 'production:report:*',
          sort_order: 4,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_e6tnx6'),
          menu_code: 'production_orders',
          menu_type: 2,
          icon: null,
          path: '/production/orders',
          component: '/production/orders',
          permission: 'production:orders:*',
          sort_order: 5,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_jrk0qd'),
          menu_code: 'production_material_issue',
          menu_type: 2,
          icon: null,
          path: '/production/material-issue',
          component: '/production/material-issue',
          permission: 'production:material-issue:*',
          sort_order: 6,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_18y1htk'),
          menu_code: 'production_material_return',
          menu_type: 2,
          icon: null,
          path: '/production/material-return',
          component: '/production/material-return',
          permission: 'production:material-return:*',
          sort_order: 7,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_s7ph9n'),
          menu_code: 'production_product_label',
          menu_type: 2,
          icon: null,
          path: '/production/product-label',
          component: '/production/product-label',
          permission: 'production:product-label:*',
          sort_order: 8,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1c0pvy3'),
          menu_code: 'dcprint_ink_opening',
          menu_type: 2,
          icon: null,
          path: '/dcprint/ink-opening',
          component: '/dcprint/ink-opening',
          permission: 'dcprint:ink-opening:*',
          sort_order: 9,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1ae68l'),
          menu_code: 'dcprint_ink_mixed',
          menu_type: 2,
          icon: null,
          path: '/dcprint/ink-mixed',
          component: '/dcprint/ink-mixed',
          permission: 'dcprint:ink-mixed:*',
          sort_order: 10,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1iaqhub'),
          menu_code: 'dcprint_trace',
          menu_type: 2,
          icon: null,
          path: '/dcprint/trace',
          component: '/dcprint/trace',
          permission: 'dcprint:trace:*',
          sort_order: 11,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1q6ppqq'),
          menu_code: 'equipment_maintenance',
          menu_type: 2,
          icon: null,
          path: '/equipment/maintenance',
          component: '/equipment/maintenance',
          permission: 'equipment:maintenance:*',
          sort_order: 12,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_15hkir8'),
          menu_code: 'equipment_repair',
          menu_type: 2,
          icon: null,
          path: '/equipment/repair',
          component: '/equipment/repair',
          permission: 'equipment:repair:*',
          sort_order: 13,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1knvan8'),
          menu_code: 'equipment_calibration',
          menu_type: 2,
          icon: null,
          path: '/equipment/calibration',
          component: '/equipment/calibration',
          permission: 'equipment:calibration:*',
          sort_order: 14,
        },
        {
          parent_code: 'production',
          menu_name: ts('k_1dfoqke'),
          menu_code: 'equipment_scrap',
          menu_type: 2,
          icon: null,
          path: '/equipment/scrap',
          component: '/equipment/scrap',
          permission: 'equipment:scrap:*',
          sort_order: 15,
        },

        {
          parent_code: 'warehouse',
          menu_name: ts('k_pep7q2'),
          menu_code: 'warehouse_inbound',
          menu_type: 2,
          icon: null,
          path: '/warehouse/inbound',
          component: '/warehouse/inbound',
          permission: 'warehouse:inbound:*',
          sort_order: 1,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_1m5xmhx'),
          menu_code: 'warehouse_outbound',
          menu_type: 2,
          icon: null,
          path: '/warehouse/outbound',
          component: '/warehouse/outbound',
          permission: 'warehouse:outbound:*',
          sort_order: 2,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_197ip7t'),
          menu_code: 'warehouse_inventory',
          menu_type: 2,
          icon: null,
          path: '/warehouse/inventory',
          component: '/warehouse/inventory',
          permission: 'warehouse:inventory:*',
          sort_order: 3,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_1g2rizp'),
          menu_code: 'warehouse_cutting',
          menu_type: 2,
          icon: null,
          path: '/warehouse/inbound/cutting',
          component: '/warehouse/inbound/cutting',
          permission: 'warehouse:cutting:*',
          sort_order: 4,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_1sok5cd'),
          menu_code: 'warehouse_transfer',
          menu_type: 2,
          icon: null,
          path: '/warehouse/transfer',
          component: '/warehouse/transfer',
          permission: 'warehouse:transfer:*',
          sort_order: 5,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_dywdfl'),
          menu_code: 'warehouse_stocktaking',
          menu_type: 2,
          icon: null,
          path: '/warehouse/stocktaking',
          component: '/warehouse/stocktaking',
          permission: 'warehouse:stocktaking:*',
          sort_order: 6,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_leccqh'),
          menu_code: 'warehouse_stock_adjust',
          menu_type: 2,
          icon: null,
          path: '/warehouse/stock-adjust',
          component: '/warehouse/stock-adjust',
          permission: 'warehouse:stock-adjust:*',
          sort_order: 7,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_1k71bbv'),
          menu_code: 'warehouse_production_inbound',
          menu_type: 2,
          icon: null,
          path: '/warehouse/production-inbound',
          component: '/warehouse/production-inbound',
          permission: 'warehouse:production-inbound:*',
          sort_order: 8,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_270k8'),
          menu_code: 'warehouse_sales_outbound',
          menu_type: 2,
          icon: null,
          path: '/warehouse/sales-outbound',
          component: '/warehouse/sales-outbound',
          permission: 'warehouse:sales-outbound:*',
          sort_order: 9,
        },
        {
          parent_code: 'warehouse',
          menu_name: ts('k_76vhek'),
          menu_code: 'warehouse_trace',
          menu_type: 2,
          icon: null,
          path: '/warehouse/trace',
          component: '/warehouse/trace',
          permission: 'trace:qr:view',
          sort_order: 10,
        },

        {
          parent_code: 'purchase',
          menu_name: ts('k_1sy8pjo'),
          menu_code: 'purchase_orders',
          menu_type: 2,
          icon: null,
          path: '/purchase/orders',
          component: '/purchase/orders',
          permission: 'purchase:orders:*',
          sort_order: 1,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_jm06rf'),
          menu_code: 'purchase_suppliers',
          menu_type: 2,
          icon: null,
          path: '/purchase/suppliers',
          component: '/purchase/suppliers',
          permission: 'purchase:suppliers:*',
          sort_order: 2,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_fmaw3'),
          menu_code: 'purchase_request',
          menu_type: 2,
          icon: null,
          path: '/purchase/request',
          component: '/purchase/request',
          permission: 'purchase:request:*',
          sort_order: 3,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_yi8jm8'),
          menu_code: 'srm_evaluation',
          menu_type: 2,
          icon: null,
          path: '/srm/evaluation',
          component: '/srm/evaluation',
          permission: 'srm:evaluation:*',
          sort_order: 4,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_18yqlt2'),
          menu_code: 'outsource_order',
          menu_type: 2,
          icon: null,
          path: '/outsource/order',
          component: '/outsource/order',
          permission: 'outsource:order:*',
          sort_order: 5,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_1tqtq1l'),
          menu_code: 'outsource_issue',
          menu_type: 2,
          icon: null,
          path: '/outsource/issue',
          component: '/outsource/issue',
          permission: 'outsource:issue:*',
          sort_order: 6,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_1d0nr2s'),
          menu_code: 'outsource_receive',
          menu_type: 2,
          icon: null,
          path: '/outsource/receive',
          component: '/outsource/receive',
          permission: 'outsource:receive:*',
          sort_order: 7,
        },
        {
          parent_code: 'purchase',
          menu_name: ts('k_f882wp'),
          menu_code: 'outsource_settlement',
          menu_type: 2,
          icon: null,
          path: '/outsource/settlement',
          component: '/outsource/settlement',
          permission: 'outsource:settlement:*',
          sort_order: 8,
        },

        {
          parent_code: 'finance',
          menu_name: ts('k_18qugw0'),
          menu_code: 'fin_receivable',
          menu_type: 2,
          icon: null,
          path: '/finance/receivable',
          component: '/finance/receivable',
          permission: 'finance:receivable:*',
          sort_order: 1,
        },
        {
          parent_code: 'finance',
          menu_name: ts('k_ei2sa2'),
          menu_code: 'finance_cost',
          menu_type: 2,
          icon: null,
          path: '/finance/cost',
          component: '/finance/cost',
          permission: 'finance:cost:*',
          sort_order: 2,
        },
        {
          parent_code: 'finance',
          menu_name: ts('k_1eujvrt'),
          menu_code: 'finance_report',
          menu_type: 2,
          icon: null,
          path: '/finance/report',
          component: '/finance/report',
          permission: 'finance:report:*',
          sort_order: 3,
        },

        {
          parent_code: 'quality',
          menu_name: ts('k_109mrrr'),
          menu_code: 'quality_incoming',
          menu_type: 2,
          icon: null,
          path: '/quality/incoming',
          component: '/quality/incoming',
          permission: 'quality:incoming:*',
          sort_order: 1,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1q7pfzv'),
          menu_code: 'quality_process',
          menu_type: 2,
          icon: null,
          path: '/quality/process',
          component: '/quality/process',
          permission: 'quality:process:*',
          sort_order: 2,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_nwgik6'),
          menu_code: 'quality_final',
          menu_type: 2,
          icon: null,
          path: '/quality/final',
          component: '/quality/final',
          permission: 'quality:final:*',
          sort_order: 3,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1u4l05c'),
          menu_code: 'quality_trace',
          menu_type: 2,
          icon: null,
          path: '/quality/trace',
          component: '/quality/trace',
          permission: 'quality:trace:*',
          sort_order: 4,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1h21kkl'),
          menu_code: 'quality_unqualified',
          menu_type: 2,
          icon: null,
          path: '/quality/unqualified',
          component: '/quality/unqualified',
          permission: 'quality:unqualified:*',
          sort_order: 5,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1obhpps'),
          menu_code: 'quality_sgs',
          menu_type: 2,
          icon: null,
          path: '/quality/sgs',
          component: '/quality/sgs',
          permission: 'quality:sgs:*',
          sort_order: 6,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1ubms3j'),
          menu_code: 'quality_complaint',
          menu_type: 2,
          icon: null,
          path: '/quality/complaint',
          component: '/quality/complaint',
          permission: 'quality:complaint:*',
          sort_order: 7,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1wnv1gp'),
          menu_code: 'quality_lab_test',
          menu_type: 2,
          icon: null,
          path: '/quality/lab-test',
          component: '/quality/lab-test',
          permission: 'quality:lab-test:*',
          sort_order: 8,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_1qyvet4'),
          menu_code: 'quality_supplier_audit',
          menu_type: 2,
          icon: null,
          path: '/quality/supplier-audit',
          component: '/quality/supplier-audit',
          permission: 'quality:supplier-audit:*',
          sort_order: 9,
        },
        {
          parent_code: 'quality',
          menu_name: ts('k_76vhek'),
          menu_code: 'qrcode_manage',
          menu_type: 2,
          icon: null,
          path: '/qrcode',
          component: '/qrcode',
          permission: 'qrcode:manage:*',
          sort_order: 10,
        },

        {
          parent_code: 'hr',
          menu_name: ts('k_1o93jxx'),
          menu_code: 'hr_employee',
          menu_type: 2,
          icon: null,
          path: '/hr/employee',
          component: '/hr/employee',
          permission: 'hr:employee:*',
          sort_order: 1,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_11exze5'),
          menu_code: 'hr_attendance',
          menu_type: 2,
          icon: null,
          path: '/hr/attendance',
          component: '/hr/attendance',
          permission: 'hr:attendance:*',
          sort_order: 2,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_wt6lbs'),
          menu_code: 'hr_salary',
          menu_type: 2,
          icon: null,
          path: '/hr/salary',
          component: '/hr/salary',
          permission: 'hr:salary:*',
          sort_order: 3,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_b91dg8'),
          menu_code: 'hr_training',
          menu_type: 2,
          icon: null,
          path: '/hr/training',
          component: '/hr/training',
          permission: 'hr:training:*',
          sort_order: 4,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_m2i11q'),
          menu_code: 'hr_organization',
          menu_type: 2,
          icon: null,
          path: '/hr/organization',
          component: '/hr/organization',
          permission: 'hr:organization:*',
          sort_order: 5,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_4ndpw8'),
          menu_code: 'hr_shifts',
          menu_type: 2,
          icon: null,
          path: '/hr/shifts',
          component: '/hr/shifts',
          permission: 'hr:shifts:*',
          sort_order: 6,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_s7o56f'),
          menu_code: 'hr_schedules',
          menu_type: 2,
          icon: null,
          path: '/hr/schedules',
          component: '/hr/schedules',
          permission: 'hr:schedules:*',
          sort_order: 7,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_1g8d66q'),
          menu_code: 'hr_performance',
          menu_type: 2,
          icon: null,
          path: '/hr/performance',
          component: '/hr/performance',
          permission: 'hr:performance:*',
          sort_order: 8,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_4xeq6d'),
          menu_code: 'hr_skills',
          menu_type: 2,
          icon: null,
          path: '/hr/skills',
          component: '/hr/skills',
          permission: 'hr:skills:*',
          sort_order: 9,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_151q2i9'),
          menu_code: 'hr_certificates',
          menu_type: 2,
          icon: null,
          path: '/hr/certificates',
          component: '/hr/certificates',
          permission: 'hr:certificates:*',
          sort_order: 10,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_7n75tj'),
          menu_code: 'hr_reports',
          menu_type: 2,
          icon: null,
          path: '/hr/reports',
          component: '/hr/reports',
          permission: 'hr:reports:*',
          sort_order: 11,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_1bldhxr'),
          menu_code: 'hr_mes_sync',
          menu_type: 2,
          icon: null,
          path: '/hr/mes-sync',
          component: '/hr/mes-sync',
          permission: 'hr:mes-sync:*',
          sort_order: 12,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_n4mh8b'),
          menu_code: 'hr_salary_calculate',
          menu_type: 2,
          icon: null,
          path: '/hr/salary/calculate',
          component: '/hr/salary/calculate',
          permission: 'hr:salary:calculate:*',
          sort_order: 13,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_dlp3dp'),
          menu_code: 'hr_piece_rate',
          menu_type: 2,
          icon: null,
          path: '/hr/salary/piece-rate',
          component: '/hr/salary/piece-rate',
          permission: 'hr:piece-rate:*',
          sort_order: 14,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_8kbc4s'),
          menu_code: 'hr_piece_work',
          menu_type: 2,
          icon: null,
          path: '/hr/salary/piece-work',
          component: '/hr/salary/piece-work',
          permission: 'hr:piece-work:*',
          sort_order: 15,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_b9kvdu'),
          menu_code: 'hr_bank_report',
          menu_type: 2,
          icon: null,
          path: '/hr/salary/bank-report',
          component: '/hr/salary/bank-report',
          permission: 'hr:bank-report:*',
          sort_order: 16,
        },
        {
          parent_code: 'hr',
          menu_name: ts('k_1qarlpz'),
          menu_code: 'hr_payslips',
          menu_type: 2,
          icon: null,
          path: '/hr/salary/payslips',
          component: '/hr/salary/payslips',
          permission: 'hr:payslips:*',
          sort_order: 17,
        },

        {
          parent_code: 'settings',
          menu_name: ts('k_1oim33'),
          menu_code: 'settings_user',
          menu_type: 2,
          icon: null,
          path: '/settings/user',
          component: '/settings/user',
          permission: 'settings:user:*',
          sort_order: 1,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_qea0w6'),
          menu_code: 'settings_roles',
          menu_type: 2,
          icon: null,
          path: '/settings/roles',
          component: '/settings/roles',
          permission: 'settings:roles:*',
          sort_order: 2,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_1u2bhqt'),
          menu_code: 'settings_menus',
          menu_type: 2,
          icon: null,
          path: '/settings/menus',
          component: '/settings/menus',
          permission: 'settings:menus:*',
          sort_order: 3,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_m2i11q'),
          menu_code: 'settings_organization',
          menu_type: 2,
          icon: null,
          path: '/settings/organization',
          component: '/settings/organization',
          permission: 'settings:organization:*',
          sort_order: 4,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_1vvmozw'),
          menu_code: 'settings_warehouse_category',
          menu_type: 2,
          icon: null,
          path: '/settings/warehouse-category',
          component: '/settings/warehouse-category',
          permission: 'settings:warehouse-category:*',
          sort_order: 5,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_195l80o'),
          menu_code: 'settings_material_category',
          menu_type: 2,
          icon: null,
          path: '/base-data/material-category',
          component: '/base-data/material-category',
          permission: 'settings:material-category:*',
          sort_order: 6,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_hldx6d'),
          menu_code: 'settings_dict',
          menu_type: 2,
          icon: null,
          path: '/settings/dict',
          component: '/settings/dict',
          permission: 'settings:dict:*',
          sort_order: 7,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_j28prc'),
          menu_code: 'settings_config',
          menu_type: 2,
          icon: null,
          path: '/settings/config',
          component: '/settings/config',
          permission: 'settings:config:*',
          sort_order: 8,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_11hk6gy'),
          menu_code: 'settings_notice',
          menu_type: 2,
          icon: null,
          path: '/settings/notice',
          component: '/settings/notice',
          permission: 'settings:notice:*',
          sort_order: 9,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_8u1v59'),
          menu_code: 'settings_login_log',
          menu_type: 2,
          icon: null,
          path: '/settings/login-log',
          component: '/settings/login-log',
          permission: 'settings:login-log:*',
          sort_order: 10,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_t9qa38'),
          menu_code: 'settings_oper_log',
          menu_type: 2,
          icon: null,
          path: '/settings/oper-log',
          component: '/settings/oper-log',
          permission: 'settings:oper-log:*',
          sort_order: 11,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_p0ffp4'),
          menu_code: 'settings_consistency_monitor',
          menu_type: 2,
          icon: 'Activity',
          path: '/monitoring/consistency',
          component: '/monitoring/consistency',
          permission: 'settings:consistency-monitor:*',
          sort_order: 12,
        },
        {
          parent_code: 'settings',
          menu_name: ts('k_8yyqfr'),
          menu_code: 'settings_label_template',
          menu_type: 2,
          icon: null,
          path: '/settings/label-template',
          component: '/settings/label-template',
          permission: 'trace:label:template',
          sort_order: 13,
        },
      ];

      for (const menu of newMenus) {
        const [parentRow] = await conn.execute(
          'SELECT id FROM sys_menu WHERE menu_code = ? AND parent_id = 0',
          [menu.parent_code]
        );
        if (!parentRow || parentRow.length === 0) continue;

        const parentId = parentRow[0].id;
        const [existing] = await conn.execute('SELECT id FROM sys_menu WHERE menu_code = ?', [
          menu.menu_code,
        ]);

        if (existing && existing.length > 0) {
          await conn.execute(
            'UPDATE sys_menu SET parent_id = ?, menu_name = ?, menu_type = ?, icon = ?, path = ?, component = ?, permission = ?, sort_order = ? WHERE menu_code = ?',
            [
              parentId,
              menu.menu_name,
              menu.menu_type,
              menu.icon,
              menu.path,
              menu.component,
              menu.permission,
              menu.sort_order,
              menu.menu_code,
            ]
          );
          results.push(`${menu.menu_code}: 已更新`);
        } else {
          try {
            await conn.execute(
              'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status, is_visible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [
                parentId,
                menu.menu_name,
                menu.menu_code,
                menu.menu_type,
                menu.icon,
                menu.path,
                menu.component,
                menu.permission,
                menu.sort_order,
                1,
                1,
              ]
            );
            results.push(`${menu.menu_code}: 创建成功(含is_visible)`);
          } catch (_insertErr) {
            try {
              await conn.execute(
                'INSERT INTO sys_menu (parent_id, menu_name, menu_code, menu_type, icon, path, component, permission, sort_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  parentId,
                  menu.menu_name,
                  menu.menu_code,
                  menu.menu_type,
                  menu.icon,
                  menu.path,
                  menu.component,
                  menu.permission,
                  menu.sort_order,
                  1,
                ]
              );
              results.push(`${menu.menu_code}: 创建成功`);
            } catch (insertErr2) {
              results.push(`${menu.menu_code}: 创建失败 - ${(insertErr2 as Error).message}`);
            }
          }
        }
      }
      logger.info(`[MENU_INIT] 步骤6完成: 二级菜单项处理完毕, 总数: ${newMenus.length}`);

      logger.info(ts('k_1im9wz9'));
      const [roles] = await conn.execute(
        "SELECT id FROM sys_role WHERE role_code = 'super_admin' LIMIT 1"
      );
      if (roles && roles.length > 0) {
        const adminRoleId = roles[0].id;

        const [allMenus] = await conn.execute('SELECT id FROM sys_menu WHERE status = 1');
        for (const menu of allMenus) {
          const [existing] = await conn.execute(
            'SELECT id FROM sys_role_menu WHERE role_id = ? AND menu_id = ?',
            [adminRoleId, menu.id]
          );
          if (!existing || existing.length === 0) {
            await conn.execute('INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)', [
              adminRoleId,
              menu.id,
            ]);
          }
        }
        results.push(ts('k_1839e12'));
      }
      logger.info(ts('k_wk9i1x'));

      return results;
    });

    const endTime = Date.now();
    logger.info(ts('k_5hym9y'));
    logger.info(`[MENU_INIT] 耗时: ${(endTime - startTime) / 1000} 秒`);
    logger.info(`[MENU_INIT] 结果记录数: ${result.length}`);

    return successResponse(result, ts('k_1ibpbfb'));
  } catch (error) {
    const endTime = Date.now();
    logger.error(ts('k_2ebbpk'));
    logger.error(`[MENU_INIT] 耗时: ${(endTime - startTime) / 1000} 秒`);
    logger.error(`[MENU_INIT] 错误: ${error}`);

    return errorResponse(ts('k_1q4mmhw') + (error as Error).message, 500);
  }
});
