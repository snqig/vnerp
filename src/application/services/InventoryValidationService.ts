import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';
import type { RowDataPacket } from 'mysql2';

/** 库存行（仅查询所需字段） */
interface InventoryQtyRow {
  quantity: string | number;
  material_name?: string;
}

/** 库存流水行 */
interface InventoryLogRow {
  id: number;
  material_id: number;
  warehouse_id: number;
  batch_no: string | null;
  operation_type: number;
  operation_qty: string | number;
}

export class InventoryValidationService {
  static async checkStock(
    materialId: number,
    warehouseId: number,
    requiredQty: number
  ): Promise<{ sufficient: boolean; available: number; message?: string }> {
    const rows = await query<InventoryQtyRow>(
      'SELECT quantity, material_name FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0',
      [materialId, warehouseId]
    );

    if (!rows || rows.length === 0) {
      return {
        sufficient: false,
        available: 0,
        message: `物料(ID:${materialId})在当前仓库无库存`,
      };
    }

    const available = parseFloat(String(rows[0].quantity));
    const materialName = rows[0].material_name || `物料${materialId}`;

    if (available < requiredQty) {
      return {
        sufficient: false,
        available,
        message: `${materialName}库存不足: 可用${available}, 需要${requiredQty}`,
      };
    }

    return { sufficient: true, available };
  }

  static async checkBatchStock(
    materialId: number,
    warehouseId: number,
    batchNo: string,
    requiredQty: number
  ): Promise<{ sufficient: boolean; available: number; message?: string }> {
    const rows = await query<{ available_qty: string | number; material_name?: string }>(
      'SELECT available_qty, material_name FROM inv_inventory_batch WHERE batch_no = ? AND material_id = ? AND warehouse_id = ? AND deleted = 0',
      [batchNo, materialId, warehouseId]
    );

    if (!rows || rows.length === 0) {
      return {
        sufficient: false,
        available: 0,
        message: `批次${batchNo}不存在或已删除`,
      };
    }

    const available = parseFloat(String(rows[0].available_qty));
    const materialName = rows[0].material_name || `物料${materialId}`;

    if (available < requiredQty) {
      return {
        sufficient: false,
        available,
        message: `${materialName}批次${batchNo}库存不足: 可用${available}, 需要${requiredQty}`,
      };
    }

    return { sufficient: true, available };
  }

  static async batchCheckStock(
    items: Array<{ materialId: number; warehouseId: number; quantity: number }>
  ): Promise<{ allSufficient: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const item of items) {
      const result = await this.checkStock(item.materialId, item.warehouseId, item.quantity);
      if (!result.sufficient && result.message) {
        errors.push(result.message);
      }
    }

    return { allSufficient: errors.length === 0, errors };
  }

  // inv_inventory_log.operation_type: 1-入库, 2-出库, 3-盘点, 4-调拨, 5-报废, 6-锁定, 7-解锁
  private static readonly TRANS_TYPE_MAP: Record<string, number> = {
    in: 1,
    out: 2,
    adjust: 3,
    transfer: 4,
    return: 7,
  };

  private static isStockInType(operationType: number): boolean {
    return operationType === 1 || operationType === 7;
  }

  private static isStockOutType(operationType: number): boolean {
    return operationType === 2 || operationType === 5;
  }

  static async recordTransaction(params: {
    transNo: string;
    transType: 'in' | 'out' | 'transfer' | 'adjust' | 'return';
    sourceType: string;
    sourceId: number;
    materialId: number;
    materialCode: string;
    materialName: string;
    batchNo: string;
    warehouseId: number;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    operatorId?: number;
    operatorName?: string;
    remark?: string;
  }): Promise<void> {
    const operationType = this.TRANS_TYPE_MAP[params.transType];
    if (operationType === undefined) {
      throw new Error(`无效的流水类型: ${params.transType}`);
    }

    await transaction(async (conn) => {
      const [invRows] = await conn.execute<RowDataPacket[]>(
        'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [params.materialId, params.warehouseId]
      );
      const beforeQty = invRows.length > 0 ? parseFloat(String(invRows[0].quantity)) : 0;
      const absQty = Math.abs(params.quantity);
      const signedQty = this.isStockOutType(operationType)
        ? -absQty
        : this.isStockInType(operationType)
          ? absQty
          : params.quantity;
      const afterQty = beforeQty + signedQty;

      await conn.execute(
        `INSERT INTO inv_inventory_log
         (material_id, warehouse_id, batch_no, operation_type, operation_qty, before_qty, after_qty,
          business_type, business_no, remark, operator_id, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.materialId,
          params.warehouseId,
          params.batchNo || null,
          operationType,
          absQty,
          beforeQty,
          afterQty,
          params.sourceType,
          params.transNo,
          params.remark || null,
          params.operatorId || null,
        ]
      );
    });

    secureLog('info', 'Inventory transaction recorded', {
      transNo: params.transNo,
      transType: params.transType,
      materialId: params.materialId,
      quantity: params.quantity,
    });
  }

  static async reverseTransaction(originalTransNo: string, operatorId?: number): Promise<void> {
    await transaction(async (conn) => {
      const [rows] = await conn.execute<RowDataPacket[]>(
        'SELECT id, material_id, warehouse_id, batch_no, operation_type, operation_qty FROM inv_inventory_log WHERE business_no = ? ORDER BY id DESC LIMIT 1',
        [originalTransNo]
      );

      if (!rows || rows.length === 0) {
        throw new Error(`流水${originalTransNo}不存在`);
      }

      const original = rows[0] as unknown as InventoryLogRow;
      const reverseType = this.isStockInType(original.operation_type)
        ? 2
        : this.isStockOutType(original.operation_type)
          ? 1
          : original.operation_type;

      const [invRows] = await conn.execute<RowDataPacket[]>(
        'SELECT quantity FROM inv_inventory WHERE material_id = ? AND warehouse_id = ? AND deleted = 0 FOR UPDATE',
        [original.material_id, original.warehouse_id]
      );
      const beforeQty = invRows.length > 0 ? parseFloat(String(invRows[0].quantity)) : 0;
      const absQty = Math.abs(parseFloat(String(original.operation_qty)));
      const signedQty = this.isStockOutType(reverseType)
        ? -absQty
        : this.isStockInType(reverseType)
          ? absQty
          : -absQty;
      const afterQty = beforeQty + signedQty;

      const reverseTransNo = 'RV' + Date.now();
      await conn.execute(
        `INSERT INTO inv_inventory_log
         (material_id, warehouse_id, batch_no, operation_type, operation_qty, before_qty, after_qty,
          business_type, business_no, remark, operator_id, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'reversal', ?, ?, ?, NOW())`,
        [
          original.material_id,
          original.warehouse_id,
          original.batch_no,
          reverseType,
          absQty,
          beforeQty,
          afterQty,
          reverseTransNo,
          `冲销流水 ${originalTransNo}`,
          operatorId || null,
        ]
      );
    });

    secureLog('info', 'Inventory transaction reversed', { originalTransNo, operatorId });
  }
}
