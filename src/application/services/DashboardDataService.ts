import { CacheManager, getCacheManager } from '@/infrastructure/cache/CacheManager';
import { CacheGuard } from '@/infrastructure/cache/CacheGuard';
import { query } from '@/lib/db';

export class DashboardDataService {
  private cache: CacheManager;
  private cacheGuard: CacheGuard;

  constructor() {
    this.cache = getCacheManager();
    this.cacheGuard = new CacheGuard(this.cache);
  }

  async getOverview() {
    return this.cacheGuard.getOrLoad('dashboard:overview', 300, () => this.computeOverview());
  }

  async getProductionStats() {
    return this.cacheGuard.getOrLoad('dashboard:production', 180, () => this.computeProductionStats());
  }

  async getOrderTrend(days: number = 30) {
    return this.cacheGuard.getOrLoad(`dashboard:trend:${days}`, 600, () => this.computeOrderTrend(days));
  }

  async invalidateCache(eventType: string): Promise<void> {
    const invalidationMap: Record<string, string[]> = {
      'inbound.approved': ['dashboard:overview', 'dashboard:inventory'],
      'inbound.cancelled': ['dashboard:overview'],
      'outbound.confirmed': ['dashboard:overview', 'dashboard:inventory'],
    };

    const keysToDelete = invalidationMap[eventType] || [];
    for (const key of keysToDelete) {
      await this.cache.delete(key);
    }
  }

  private async computeOverview() {
    try {
      const orderCount: any = await query(
        'SELECT COUNT(*) as count FROM sal_order WHERE DATE(create_time) = CURDATE() AND deleted = 0'
      );
      const inventoryValue: any = await query(
        'SELECT COALESCE(SUM(stock_qty * unit_price), 0) as value FROM inv_material WHERE deleted = 0'
      );
      const deliveryCount: any = await query(
        'SELECT COUNT(*) as count FROM inv_outbound_order WHERE DATE(create_time) = CURDATE() AND deleted = 0'
      );

      return {
        todayOrders: orderCount?.[0]?.count || 0,
        inventoryValue: inventoryValue?.[0]?.value || 0,
        todayDeliveries: deliveryCount?.[0]?.count || 0,
      };
    } catch {
      return { todayOrders: 0, inventoryValue: 0, todayDeliveries: 0 };
    }
  }

  private async computeProductionStats() {
    try {
      const production: any = await query(
        `SELECT COALESCE(SUM(plan_qty), 0) as planned, COALESCE(SUM(completed_qty), 0) as completed
         FROM prd_process_card WHERE DATE(create_time) = CURDATE() AND deleted = 0`
      );
      return {
        planned: production?.[0]?.planned || 0,
        completed: production?.[0]?.completed || 0,
      };
    } catch {
      return { planned: 0, completed: 0 };
    }
  }

  private async computeOrderTrend(days: number) {
    try {
      const trend: any = await query(
        `SELECT DATE(create_time) as date, COUNT(*) as count
         FROM sal_order
         WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted = 0
         GROUP BY DATE(create_time) ORDER BY date`,
        [days]
      );
      return trend;
    } catch {
      return [];
    }
  }
}
