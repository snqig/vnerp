import { query, transaction } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export class InventoryValidationService {
  static async checkStock(
    materialId: number,
    warehouseId: number,
    requiredQty: number
  ): Promise<{ sufficient: boolean; available: number; message?: string }> {
    const rows: any = await query(
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

    const available = parseFloat(rows[0].quantity);
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
    const rows: any = await query(
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

    const available = parseFloat(rows[0].available_qty);
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
    await transaction(async (conn) => {
      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, material_id, material_code, material_name,
          batch_no, warehouse_id, quantity, unit_price, total_amount, operator_id, operator_name, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          params.transNo,
          params.transType,
          params.sourceType,
          params.sourceId,
          params.materialId,
          params.materialCode,
          params.materialName,
          params.batchNo,
          params.warehouseId,
          params.quantity,
          params.unitPrice,
          params.totalAmount,
          params.operatorId || null,
          params.operatorName || null,
          params.remark || null,
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
      const [rows]: any = await conn.execute(
        'SELECT id, trans_no, trans_type, source_type, source_id, material_id, material_code, material_name, batch_no, warehouse_id, quantity, unit_price, total_amount FROM inv_inventory_transaction WHERE trans_no = ? AND is_reversed = 0',
        [originalTransNo]
      );

      if (!rows || rows.length === 0) {
        throw new Error(`流水${originalTransNo}不存在或已被冲销`);
      }

      const original = rows[0];
      const reverseType = original.trans_type === 'in' ? 'out' : 'in';
      const reverseTransNo = 'RV' + Date.now();

      await conn.execute(
        `INSERT INTO inv_inventory_transaction
         (trans_no, trans_type, source_type, source_id, material_id, material_code, material_name,
          batch_no, warehouse_id, quantity, unit_price, total_amount, is_reversed, reversed_by, operator_id, remark, create_time)
         VALUES (?, ?, 'reversal', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NOW())`,
        [
          reverseTransNo,
          reverseType,
          original.source_id,
          original.material_id,
          original.material_code,
          original.material_name,
          original.batch_no,
          original.warehouse_id,
          original.quantity,
          original.unit_price,
          original.total_amount,
          original.id,
          operatorId || null,
          `冲销流水 ${originalTransNo}`,
        ]
      );

      await conn.execute(
        'UPDATE inv_inventory_transaction SET is_reversed = 1, reversed_by = ? WHERE id = ?',
        [original.id, original.id]
      );
    });

    secureLog('info', 'Inventory transaction reversed', { originalTransNo, operatorId });
  }
}
