/**
 * 自动清理脚本
 * 直接删除所有未使用的空表（无需交互确认）
 * 使用方法: npx tsx scripts/cleanup-auto.ts
 */

import { query, execute } from '../src/lib/db';

// 未使用的表列表
const UNUSED_TABLES: Record<string, { module: string; description: string; safeToDelete: boolean }> = {
  // 客户管理
  'crm_customer_contact': { module: '客户管理', description: '客户联系人表', safeToDelete: true },
  'crm_customer_follow_up': { module: '客户管理', description: '客户跟进记录表', safeToDelete: true },

  // 供应商管理
  'pur_supplier': { module: '供应商管理', description: '供应商表', safeToDelete: true },
  'pur_supplier_material': { module: '供应商管理', description: '供应商物料关联表', safeToDelete: true },

  // 采购管理
  'pur_request_detail': { module: '采购管理', description: '采购申请明细表', safeToDelete: true },
  'pur_order': { module: '采购管理', description: '采购订单表', safeToDelete: true },
  'pur_order_detail': { module: '采购管理', description: '采购订单明细表', safeToDelete: true },
  'pur_receipt': { module: '采购管理', description: '采购入库单表', safeToDelete: true },
  'pur_receipt_detail': { module: '采购管理', description: '采购入库明细表', safeToDelete: true },

  // 销售管理
  'sal_order': { module: '销售管理', description: '销售订单表', safeToDelete: true },
  'sal_order_detail': { module: '销售管理', description: '销售订单明细表', safeToDelete: true },
  'sal_delivery': { module: '销售管理', description: '销售出库单表', safeToDelete: true },
  'sal_delivery_detail': { module: '销售管理', description: '销售出库明细表', safeToDelete: true },

  // 生产管理
  'prd_work_order': { module: '生产管理', description: '生产工单表', safeToDelete: true },
  'prd_bom': { module: '生产管理', description: 'BOM表', safeToDelete: true },
  'prd_bom_detail': { module: '生产管理', description: 'BOM明细表', safeToDelete: true },

  // 财务管理
  'fin_receivable': { module: '财务管理', description: '应收款表', safeToDelete: true },
  'fin_payable': { module: '财务管理', description: '应付款表', safeToDelete: true },
  'fin_receipt_record': { module: '财务管理', description: '收款记录表', safeToDelete: true },
  'fin_payment_record': { module: '财务管理', description: '付款记录表', safeToDelete: true },

  // 质量管理
  'qc_inspection': { module: '质量管理', description: '质检记录表', safeToDelete: true },
  'qc_unqualified': { module: '质量管理', description: '不合格品记录表', safeToDelete: true },
};

async function cleanup() {
  console.log('========================================');
  console.log('自动清理未使用的空表');
  console.log('========================================\n');

  const tablesToDelete: { name: string; info: typeof UNUSED_TABLES[string] }[] = [];

  // 找出所有未使用的空表
  for (const [tableName, info] of Object.entries(UNUSED_TABLES)) {
    if (!info.safeToDelete) continue;

    try {
      const result = await query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = (result as any[])[0]?.count || 0;

      if (rowCount === 0) {
        tablesToDelete.push({ name: tableName, info });
      } else {
        console.log(`跳过 ${tableName}: 包含 ${rowCount} 条数据`);
      }
    } catch (error: any) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log(`跳过 ${tableName}: 表不存在`);
      } else {
        console.error(`检查 ${tableName} 失败:`, error.message);
      }
    }
  }

  if (tablesToDelete.length === 0) {
    console.log('\n没有需要删除的空表');
    return;
  }

  console.log(`\n准备删除 ${tablesToDelete.length} 个空表:\n`);
  for (const { name, info } of tablesToDelete) {
    console.log(`  - ${name} (${info.module})`);
  }

  console.log('\n开始删除...\n');

  let successCount = 0;
  let failCount = 0;

  for (const { name } of tablesToDelete) {
    try {
      await execute(`DROP TABLE IF EXISTS \`${name}\``);
      console.log(`✓ 已删除: ${name}`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ 删除失败: ${name} - ${error.message}`);
      failCount++;
    }
  }

  console.log('\n========================================');
  console.log('清理完成');
  console.log('========================================');
  console.log(`成功: ${successCount} 个表`);
  console.log(`失败: ${failCount} 个表`);
  console.log(`\n数据库表数量: 51 → ${51 - successCount} 个`);
}

// 主函数
async function main() {
  try {
    await cleanup();
    process.exit(0);
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  }
}

main();
