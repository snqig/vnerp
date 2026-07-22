import { transaction, query } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export type VoucherSource =
  | 'sales_outbound' // 销售出库
  | 'purchase_inbound' // 采购入库
  | 'production_inbound' // 生产入库
  | 'material_issue' // 生产领料
  | 'material_return' // 材料退回
  | 'stock_adjust' // 库存调整
  | 'cost_allocation'; // 成本分摊

export interface VoucherLine {
  debit_account: string; // 借方科目
  credit_account: string; // 贷方科目
  amount: number; // 金额
  description?: string; // 摘要
}

export interface VoucherData {
  voucher_no: string;
  voucher_date: string;
  source_type: VoucherSource;
  source_id: number;
  source_no: string;
  lines: VoucherLine[];
  total_amount: number;
  remark?: string;
  operator_id?: number;
  operator_name?: string;
}

export interface VoucherResult {
  success: boolean;
  voucher_id?: number;
  voucher_no?: string;
  error?: string;
}

const _VOUCHER_SOURCE_LABELS: Record<VoucherSource, string> = {
  sales_outbound: '销售出库',
  purchase_inbound: '采购入库',
  production_inbound: '生产入库',
  material_issue: '生产领料',
  material_return: '材料退回',
  stock_adjust: '库存调整',
  cost_allocation: '成本分摊',
};

export class FinanceVoucherHandler {
  static async generateSalesOutboundVoucher(
    outboundId: number,
    outboundNo: string,
    items: Array<{
      material_id: number;
      material_name: string;
      quantity: number;
      total_cost: number;
      avg_cost: number;
      batch_no?: string;
    }>,
    customerId?: number,
    customerName?: string,
    _warehouseId?: number
  ): Promise<VoucherResult> {
    try {
      const voucherNo = await this.generateVoucherNo('FV');
      const lines: VoucherLine[] = [];
      let totalAmount = 0;

      for (const item of items) {
        if (item.total_cost > 0) {
          lines.push({
            debit_account: '应收账款',
            credit_account: '成品库存',
            amount: item.total_cost,
            description: `${outboundNo} - ${item.material_name} × ${item.quantity}`,
          });
          totalAmount += item.total_cost;
        }
      }

      if (lines.length === 0) {
        return { success: false, error: '无有效凭证行项' };
      }

      return await this.createVoucher({
        voucher_no: voucherNo,
        voucher_date: new Date().toISOString().split('T')[0],
        source_type: 'sales_outbound',
        source_id: outboundId,
        source_no: outboundNo,
        lines,
        total_amount: totalAmount,
        remark: `销售出库 - ${customerName || ''}`,
      });
    } catch (error) {
      secureLog('error', '生成销售出库凭证失败', { error: (error as Error).message, outboundId });
      return { success: false, error: (error as Error).message };
    }
  }

  static async generatePurchaseInboundVoucher(
    inboundId: number,
    inboundNo: string,
    items: Array<{
      material_id: number;
      material_name: string;
      quantity: number;
      unit_price: number;
      total_amount: number;
    }>,
    supplierId?: number,
    supplierName?: string
  ): Promise<VoucherResult> {
    try {
      const voucherNo = await this.generateVoucherNo('FV');
      const lines: VoucherLine[] = [];
      let totalAmount = 0;

      for (const item of items) {
        if (item.total_amount > 0) {
          lines.push({
            debit_account: '原材料库存',
            credit_account: '应付账款',
            amount: item.total_amount,
            description: `${inboundNo} - ${item.material_name} × ${item.quantity}`,
          });
          totalAmount += item.total_amount;
        }
      }

      if (lines.length === 0) {
        return { success: false, error: '无有效凭证行项' };
      }

      return await this.createVoucher({
        voucher_no: voucherNo,
        voucher_date: new Date().toISOString().split('T')[0],
        source_type: 'purchase_inbound',
        source_id: inboundId,
        source_no: inboundNo,
        lines,
        total_amount: totalAmount,
        remark: `采购入库 - ${supplierName || ''}`,
      });
    } catch (error) {
      secureLog('error', '生成采购入库凭证失败', { error: (error as Error).message, inboundId });
      return { success: false, error: (error as Error).message };
    }
  }

  static async generateProductionInboundVoucher(
    inboundId: number,
    inboundNo: string,
    workOrderId: number,
    workOrderNo: string,
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      standard_cost: number;
      actual_cost: number;
    }>
  ): Promise<VoucherResult> {
    try {
      const voucherNo = await this.generateVoucherNo('FV');
      const lines: VoucherLine[] = [];
      let totalStandardCost = 0;
      let totalActualCost = 0;

      for (const item of items) {
        if (item.actual_cost > 0) {
          lines.push({
            debit_account: '成品库存',
            credit_account: '生产成本',
            amount: item.actual_cost,
            description: `${workOrderNo} - ${item.product_name} × ${item.quantity}`,
          });
          totalStandardCost += item.standard_cost * item.quantity;
          totalActualCost += item.actual_cost;
        }
      }

      if (totalActualCost > totalStandardCost && totalStandardCost > 0) {
        const variance = totalActualCost - totalStandardCost;
        lines.push({
          debit_account: '成本差异',
          credit_account: '生产成本',
          amount: variance,
          description: `${workOrderNo} - 成本超支差异`,
        });
      }

      if (lines.length === 0) {
        return { success: false, error: '无有效凭证行项' };
      }

      return await this.createVoucher({
        voucher_no: voucherNo,
        voucher_date: new Date().toISOString().split('T')[0],
        source_type: 'production_inbound',
        source_id: inboundId,
        source_no: inboundNo,
        lines,
        total_amount: totalActualCost,
        remark: `生产入库 - 工单${workOrderNo}`,
      });
    } catch (error) {
      secureLog('error', '生成生产入库凭证失败', { error: (error as Error).message, inboundId });
      return { success: false, error: (error as Error).message };
    }
  }

  static async generateMaterialIssueVoucher(
    issueId: number,
    issueNo: string,
    workOrderId: number,
    workOrderNo: string,
    items: Array<{
      material_id: number;
      material_name: string;
      quantity: number;
      total_cost: number;
    }>
  ): Promise<VoucherResult> {
    try {
      const voucherNo = await this.generateVoucherNo('FV');
      const lines: VoucherLine[] = [];
      let totalAmount = 0;

      for (const item of items) {
        if (item.total_cost > 0) {
          lines.push({
            debit_account: '生产成本-直接材料',
            credit_account: '原材料库存',
            amount: item.total_cost,
            description: `${issueNo} - ${item.material_name} × ${item.quantity}`,
          });
          totalAmount += item.total_cost;
        }
      }

      if (lines.length === 0) {
        return { success: false, error: '无有效凭证行项' };
      }

      return await this.createVoucher({
        voucher_no: voucherNo,
        voucher_date: new Date().toISOString().split('T')[0],
        source_type: 'material_issue',
        source_id: issueId,
        source_no: issueNo,
        lines,
        total_amount: totalAmount,
        remark: `生产领料 - 工单${workOrderNo}`,
      });
    } catch (error) {
      secureLog('error', '生成领料凭证失败', { error: (error as Error).message, issueId });
      return { success: false, error: (error as Error).message };
    }
  }

  private static async createVoucher(data: VoucherData): Promise<VoucherResult> {
    return await transaction(async (conn) => {
      const [existing]: Loose = await conn.execute(
        `SELECT id FROM fin_voucher WHERE source_type = ? AND source_id = ? AND deleted = 0`,
        [data.source_type, data.source_id]
      );

      if (existing && existing.length > 0) {
        return {
          success: false,
          error: `该业务已存在凭证（ID: ${existing[0].id}），请勿重复生成`,
        };
      }

      const [result]: Loose = await conn.execute(
        `INSERT INTO fin_voucher (
          voucher_no, voucher_date, source_type, source_id, source_no,
          total_amount, status, remark, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
        [
          data.voucher_no,
          data.voucher_date,
          data.source_type,
          data.source_id,
          data.source_no,
          data.total_amount,
          data.remark || '',
        ]
      );

      const voucherId = result.insertId;

      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        await conn.execute(
          `INSERT INTO fin_voucher_line (
            voucher_id, line_no, debit_account, credit_account, 
            amount, description, create_time
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            voucherId,
            i + 1,
            line.debit_account,
            line.credit_account,
            line.amount,
            line.description || '',
          ]
        );
      }

      secureLog('info', '财务凭证生成成功', {
        voucherId,
        voucherNo: data.voucher_no,
        sourceType: data.source_type,
        sourceId: data.source_id,
        totalAmount: data.total_amount,
        lineCount: data.lines.length,
      });

      return {
        success: true,
        voucher_id: voucherId,
        voucher_no: data.voucher_no,
      };
    });
  }

  private static async generateVoucherNo(prefix: string): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const [rows]: Loose = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(voucher_no, 9) AS UNSIGNED)), 0) as max_no 
       FROM fin_voucher WHERE voucher_no LIKE ?`,
      [`${prefix}${dateStr}%`]
    );

    const nextNo = (rows[0]?.max_no || 0) + 1;
    return `${prefix}${dateStr}${String(nextNo).padStart(4, '0')}`;
  }

  static async getVouchersBySource(sourceType: VoucherSource, sourceId: number): Promise<Loose[]> {
    const rows: Loose = await query(
      `SELECT v.*, 
              GROUP_CONCAT(
                CONCAT(
                  vl.line_no, '|', 
                  vl.debit_account, '|', 
                  vl.credit_account, '|', 
                  vl.amount, '|',
                  COALESCE(vl.description, '')
                ) 
                SEPARATOR ';;'
              ) as lines_data
       FROM fin_voucher v
       LEFT JOIN fin_voucher_line vl ON v.id = vl.voucher_id
       WHERE v.source_type = ? AND v.source_id = ? AND v.deleted = 0
       GROUP BY v.id
       ORDER BY v.create_time DESC`,
      [sourceType, sourceId]
    );

    return rows.map((row: Loose) => ({
      ...row,
      lines: row.lines_data
        ? row.lines_data.split(';;').map((lineStr: string) => {
            const parts = lineStr.split('|');
            return {
              line_no: parseInt(parts[0]),
              debit_account: parts[1],
              credit_account: parts[2],
              amount: parseFloat(parts[3]),
              description: parts[4] || '',
            };
          })
        : [],
      lines_data: undefined,
    }));
  }

  static async reverseVoucher(
    voucherId: number,
    reason: string,
    _operatorName: string
  ): Promise<VoucherResult> {
    try {
      const [voucherRows]: Loose = await query(
        `SELECT * FROM fin_voucher WHERE id = ? AND deleted = 0`,
        [voucherId]
      );

      if (!voucherRows || voucherRows.length === 0) {
        return { success: false, error: '凭证不存在' };
      }

      const voucher = voucherRows[0];
      if (voucher.status === 3) {
        return { success: false, error: '凭证已审核，无法冲销' };
      }

      const [lineRows]: Loose = await query(`SELECT * FROM fin_voucher_line WHERE voucher_id = ?`, [
        voucherId,
      ]);

      const reversedLines: VoucherLine[] = lineRows.map((line: Loose) => ({
        debit_account: line.credit_account,
        credit_account: line.debit_account,
        amount: line.amount,
        description: `冲销原凭证${voucher.voucher_no}: ${line.description || ''}`,
      }));

      const reverseVoucherNo = await this.generateVoucherNo('RV');

      return await this.createVoucher({
        voucher_no: reverseVoucherNo,
        voucher_date: new Date().toISOString().split('T')[0],
        source_type: voucher.source_type as VoucherSource,
        source_id: voucher.source_id,
        source_no: `${voucher.source_no}[冲销]`,
        lines: reversedLines,
        total_amount: voucher.total_amount,
        remark: `冲销原凭证${voucher.voucher_no} - 原因：${reason}`,
      });
    } catch (error) {
      secureLog('error', '冲销凭证失败', { error: (error as Error).message, voucherId });
      return { success: false, error: (error as Error).message };
    }
  }
}
