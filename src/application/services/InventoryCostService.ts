import { CostEngine, CostCalculationResult } from '@/lib/cost-engine';
import { secureLog } from '@/lib/logger';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

interface InventoryRow extends RowDataPacket {
  id: number;
  quantity: string | number;
  unit_cost: string | number;
  total_cost: string | number;
}

/**
 * 库存成本服务
 *
 * 包装 CostEngine，提供入库/出库时的移动加权平均成本联动。
 * 所有方法必须在外部事务连接(conn)内调用，保证与库存数量更新原子提交。
 */
export class InventoryCostService {
  private engine = new CostEngine('moving_average');

  /**
   * 入库时重算移动加权平均成本
   *
   * 公式：新成本单价 = (当前总金额 + 入库金额) / (当前数量 + 入库数量)
   * 写回 inv_inventory.unit_cost 和 inv_inventory.total_cost
   */
  async onInbound(
    conn: PoolConnection,
    inventoryId: number,
    inboundQty: number,
    inboundUnitPrice: number
  ): Promise<CostCalculationResult | null> {
    if (inboundQty <= 0 || inboundUnitPrice < 0) return null;

    const [rows] = await conn.execute<InventoryRow[]>(
      'SELECT id, quantity, unit_cost, total_cost FROM inv_inventory WHERE id = ? AND deleted = 0 FOR UPDATE',
      [inventoryId]
    );
    if (rows.length === 0) return null;

    const inv = rows[0];
    const currentQty = Number(inv.quantity) || 0;
    const currentCostPrice = Number(inv.unit_cost) || 0;
    const currentTotalAmount = Number(inv.total_cost) || 0;

    const result = this.engine.calculateMovingAverage({
      currentQty,
      currentCostPrice,
      currentTotalAmount,
      inQty: inboundQty,
      inPrice: inboundUnitPrice,
    });

    await conn.execute(
      'UPDATE inv_inventory SET unit_cost = ?, total_cost = ?, update_time = NOW() WHERE id = ?',
      [result.newCostPrice, result.newTotalAmount, inventoryId]
    );

    secureLog('debug', 'Inventory cost recalculated (inbound)', {
      inventoryId,
      inboundQty,
      inboundUnitPrice,
      oldCostPrice: currentCostPrice,
      newCostPrice: result.newCostPrice,
      newTotalAmount: result.newTotalAmount,
    });

    return result;
  }

  /**
   * 出库时读取当前成本单价并计算出库总成本
   *
   * 出库不改变单位成本，仅返回当前成本用于流水记录
   */
  async getOutboundCost(
    conn: PoolConnection,
    inventoryId: number,
    outboundQty: number
  ): Promise<{ unitCost: number; totalCost: number } | null> {
    if (outboundQty <= 0) return null;

    const [rows] = await conn.execute<InventoryRow[]>(
      'SELECT id, unit_cost, total_cost, quantity FROM inv_inventory WHERE id = ? AND deleted = 0 FOR UPDATE',
      [inventoryId]
    );
    if (rows.length === 0) return null;

    const inv = rows[0];
    const currentQty = Number(inv.quantity) || 0;
    const unitCost = Number(inv.unit_cost) || 0;

    if (currentQty < outboundQty) {
      secureLog('warn', 'Insufficient inventory for cost calculation', {
        inventoryId,
        currentQty,
        outboundQty,
      });
      return null;
    }

    const totalCost = this.engine.calculateIssueCost(outboundQty, unitCost);

    return { unitCost, totalCost };
  }

  /**
   * 反审核(入库回滚)时重算移动加权平均成本
   *
   * 公式：反向移除入库金额，重算平均成本
   */
  async onInboundRollback(
    conn: PoolConnection,
    inventoryId: number,
    rollbackQty: number,
    rollbackUnitPrice: number
  ): Promise<CostCalculationResult | null> {
    if (rollbackQty <= 0) return null;

    const [rows] = await conn.execute<InventoryRow[]>(
      'SELECT id, quantity, unit_cost, total_cost FROM inv_inventory WHERE id = ? AND deleted = 0 FOR UPDATE',
      [inventoryId]
    );
    if (rows.length === 0) return null;

    const inv = rows[0];
    const currentQty = Number(inv.quantity) || 0;
    const currentCostPrice = Number(inv.unit_cost) || 0;
    const currentTotalAmount = Number(inv.total_cost) || 0;

    const rollbackAmount = rollbackQty * rollbackUnitPrice;
    const newQty = Math.max(0, currentQty - rollbackQty);
    const newTotalAmount = Math.max(0, currentTotalAmount - rollbackAmount);
    const newCostPrice = newQty > 0 ? newTotalAmount / newQty : currentCostPrice;

    await conn.execute(
      'UPDATE inv_inventory SET unit_cost = ?, total_cost = ?, quantity = ?, update_time = NOW() WHERE id = ?',
      [newCostPrice, newTotalAmount, newQty, inventoryId]
    );

    secureLog('debug', 'Inventory cost recalculated (rollback)', {
      inventoryId,
      rollbackQty,
      rollbackUnitPrice,
      oldCostPrice: currentCostPrice,
      newCostPrice,
      newTotalAmount,
    });

    return {
      newQty,
      newCostPrice: Number(newCostPrice.toFixed(4)),
      newTotalAmount: Number(newTotalAmount.toFixed(2)),
      priceChange: Number((newCostPrice - currentCostPrice).toFixed(4)),
      priceChangeRate:
        currentCostPrice > 0
          ? Number(((newCostPrice - currentCostPrice) / currentCostPrice).toFixed(4))
          : 0,
    };
  }
}
