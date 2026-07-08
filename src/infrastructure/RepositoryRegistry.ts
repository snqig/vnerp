/**
 * RepositoryRegistry
 *
 * 仓储工厂注册中心：基于 REPOSITORY_IMPL 环境变量返回 Drizzle 或 MySQL 仓储实例。
 *
 * 用途：
 *   - 统一仓储实例化入口，便于在 MySQL raw SQL 与 Drizzle ORM 之间切换
 *   - 默认 mysql 保持向后兼容；显式设置 REPOSITORY_IMPL=drizzle 启用 Drizzle 路径
 *
 * 覆盖范围（3 个有 Drizzle 对应实现的仓储）：
 *   - InboundOrderRepository
 *   - SalesOrderRepository
 *   - PurchaseOrderRepository
 *
 * 其他 15 个 MySQL 仓储（Return/Receivable/Payable/Delivery/Reconciliation 等）
 *   保持直接 new 调用，不在本次扩展范围。
 *
 * 使用示例：
 *   const orderRepo = RepositoryRegistry.getPurchaseOrderRepository();
 *   const service = new PurchaseApplicationService(orderRepo);
 */

import { MysqlInboundOrderRepository } from './repositories/MysqlInboundOrderRepository';
import { DrizzleInboundOrderRepository } from './repositories/DrizzleInboundOrderRepository';
import { MysqlSalesOrderRepository } from './repositories/MysqlSalesOrderRepository';
import { DrizzleSalesOrderRepository } from './repositories/DrizzleSalesOrderRepository';
import { MysqlPurchaseOrderRepository } from './repositories/MysqlPurchaseOrderRepository';
import { DrizzlePurchaseOrderRepository } from './repositories/DrizzlePurchaseOrderRepository';
import { IInboundOrderRepository } from '@/domain/warehouse/repositories/IInboundOrderRepository';
import { ISalesOrderRepository } from '@/domain/sales/repositories/ISalesOrderRepository';
import { IPurchaseOrderRepository } from '@/domain/purchase/repositories/IPurchaseOrderRepository';

type ImplType = 'mysql' | 'drizzle';

const impl: ImplType =
  (process.env.REPOSITORY_IMPL as ImplType) === 'drizzle' ? 'drizzle' : 'mysql';

// 启动时打印一次激活的实现类型，便于确认 env 是否生效
console.log(
  `[RepoRegistry] active impl = ${impl}` +
    (impl === 'drizzle' ? ' (set via REPOSITORY_IMPL=drizzle)' : ' (default; set REPOSITORY_IMPL=drizzle to switch)')
);

function logReturn(method: string, type: string) {
  console.log(`[RepoRegistry] ${method}() → ${type} (${impl})`);
}

export const RepositoryRegistry = {
  /**
   * 入库订单仓储
   */
  getInboundOrderRepository(): IInboundOrderRepository {
    const type = impl === 'drizzle' ? 'DrizzleInboundOrderRepository' : 'MysqlInboundOrderRepository';
    logReturn('getInboundOrderRepository', type);
    return impl === 'drizzle'
      ? new DrizzleInboundOrderRepository()
      : new MysqlInboundOrderRepository();
  },

  /**
   * 销售订单仓储
   * 注意：当前无 API 路由调用此方法（/api/orders/sales 走裸 SQL），
   * 待 Sales 路由重构为仓储模式后接入。
   */
  getSalesOrderRepository(): ISalesOrderRepository {
    const type = impl === 'drizzle' ? 'DrizzleSalesOrderRepository' : 'MysqlSalesOrderRepository';
    logReturn('getSalesOrderRepository', type);
    return impl === 'drizzle'
      ? new DrizzleSalesOrderRepository()
      : new MysqlSalesOrderRepository();
  },

  /**
   * 采购订单仓储
   */
  getPurchaseOrderRepository(): IPurchaseOrderRepository {
    const type = impl === 'drizzle' ? 'DrizzlePurchaseOrderRepository' : 'MysqlPurchaseOrderRepository';
    logReturn('getPurchaseOrderRepository', type);
    return impl === 'drizzle'
      ? new DrizzlePurchaseOrderRepository()
      : new MysqlPurchaseOrderRepository();
  },

  /**
   * 当前激活的实现类型（用于日志/调试）
   */
  getActiveImpl(): ImplType {
    return impl;
  },
};
