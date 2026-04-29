import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const qrCode = searchParams.get('qrCode') || '';
  const batchNo = searchParams.get('batchNo') || '';
  const queryType = searchParams.get('queryType') || 'all';

  if (!qrCode && !batchNo) {
    return errorResponse('请提供qrCode或batchNo', 400, 400);
  }

  let actualBatchNo = batchNo;

  if (qrCode && !batchNo) {
    const qrRows: any = await query(
      "SELECT batch_no, qr_type, ref_id, ref_no, extra_data FROM qrcode_record WHERE qr_code = ? AND deleted = 0",
      [qrCode]
    );
    if (qrRows.length === 0) {
      return errorResponse('二维码不存在', 404, 404);
    }
    actualBatchNo = qrRows[0].batch_no;
  }

  if (!actualBatchNo) {
    return errorResponse('无法确定批次号', 400, 400);
  }

  const result: any = {};

  if (queryType === 'all' || queryType === 'formula') {
    result.formula = await queryFormulaTrace(actualBatchNo);
  }

  if (queryType === 'all' || queryType === 'process') {
    result.process = await queryProcessGuide(actualBatchNo);
  }

  if (queryType === 'all' || queryType === 'quality') {
    result.quality = await queryQualityTrace(actualBatchNo);
  }

  if (queryType === 'all' || queryType === 'inventory') {
    result.inventory = await queryInventoryExpiry(actualBatchNo);
  }

  return successResponse(result);
});

async function queryFormulaTrace(batchNo: string) {
  const trace: any = { batch_no: batchNo, formula: null, raw_inks: [], dispatch: null };

  const dispatchRows: any = await query(
    'SELECT * FROM ink_dispatch WHERE batch_no = ? AND deleted = 0',
    [batchNo]
  );

  if (dispatchRows.length > 0) {
    const dispatch = dispatchRows[0];
    trace.dispatch = {
      dispatch_no: dispatch.dispatch_no,
      workorder_no: dispatch.workorder_no,
      color_name: dispatch.color_name,
      pantone_code: dispatch.pantone_code,
      total_weight: dispatch.total_weight,
      net_weight: dispatch.net_weight,
      operator_name: dispatch.operator_name,
      create_time: dispatch.create_time,
    };

    if (dispatch.formula_id) {
      const formulaRows: any = await query(
        'SELECT * FROM ink_formula WHERE id = ? AND deleted = 0',
        [dispatch.formula_id]
      );
      if (formulaRows.length > 0) {
        const formula = formulaRows[0];
        const items: any = await query(
          'SELECT * FROM ink_formula_item WHERE formula_id = ? AND deleted = 0 ORDER BY sort_order',
          [formula.id]
        );

        trace.formula = {
          formula_no: formula.formula_no,
          formula_name: formula.formula_name,
          pantone_code: formula.pantone_code,
          color_name: formula.color_name,
          ink_type: formula.ink_type,
          total_weight: formula.total_weight,
          shelf_life_hours: formula.shelf_life_hours,
          items: items.map((item: any) => ({
            ink_name: item.ink_name,
            ink_code: item.ink_code,
            brand: item.brand,
            ratio_percent: item.ratio_percent,
            weight: item.weight,
            is_base: item.is_base,
          })),
        };
      }
    }

    const dispatchItems: any = await query(
      'SELECT * FROM ink_dispatch_item WHERE dispatch_id = ? AND deleted = 0 ORDER BY sort_order',
      [dispatch.id]
    );

    trace.raw_inks = dispatchItems.map((item: any) => ({
      ink_name: item.ink_name,
      ink_code: item.ink_code,
      brand: item.brand,
      formula_weight: item.formula_weight,
      actual_weight: item.actual_weight,
      source_type: item.source_type,
      source_batch_no: item.source_batch_no,
      is_surplus: item.is_surplus,
    }));
  }

  const mixedRows: any = await query(
    'SELECT * FROM ink_mixed_record WHERE record_no = ? AND deleted = 0',
    [batchNo]
  );

  if (mixedRows.length > 0 && !trace.dispatch) {
    const mixed = mixedRows[0];
    trace.dispatch = {
      record_no: mixed.record_no,
      color_name: mixed.color_name,
      color_code: mixed.color_code,
      quantity: mixed.quantity,
      operator_name: mixed.operator_name,
      mix_time: mixed.mix_time,
    };
    trace.raw_inks = mixed.mix_ratio ? [{ description: mixed.mix_ratio }] : [];
  }

  return trace;
}

async function queryProcessGuide(batchNo: string) {
  const guide: any = { batch_no: batchNo, workorder: null, sop: null, process_card: null };

  const dispatchRows: any = await query(
    'SELECT workorder_id, workorder_no, formula_id FROM ink_dispatch WHERE batch_no = ? AND deleted = 0',
    [batchNo]
  );

  if (dispatchRows.length > 0 && dispatchRows[0].workorder_id) {
    const woRows: any = await query(
      'SELECT * FROM prod_work_order WHERE id = ? AND deleted = 0',
      [dispatchRows[0].workorder_id]
    );

    if (woRows.length > 0) {
      const wo = woRows[0];
      guide.workorder = {
        order_no: wo.order_no,
        product_name: wo.product_name,
        plan_qty: wo.plan_qty,
        status: wo.status,
        plan_start_date: wo.plan_start_date,
        plan_end_date: wo.plan_end_date,
      };

      if (wo.process_card_id) {
        const pcRows: any = await query(
          'SELECT * FROM prd_process_card WHERE id = ? AND deleted = 0',
          [wo.process_card_id]
        );
        if (pcRows.length > 0) {
          guide.process_card = {
            card_no: pcRows[0].card_no,
            product_name: pcRows[0].product_name,
            process_steps: pcRows[0].process_steps,
            standard_params: pcRows[0].standard_params,
          };
        }
      }

      if (wo.standard_card_id) {
        const scRows: any = await query(
          'SELECT * FROM eng_standard_card WHERE id = ? AND deleted = 0',
          [wo.standard_card_id]
        );
        if (scRows.length > 0) {
          guide.sop = {
            card_no: scRows[0].card_no,
            product_name: scRows[0].product_name,
            printing_params: scRows[0].printing_params,
            quality_standard: scRows[0].quality_standard,
            notes: scRows[0].notes,
          };
        }
      }
    }
  }

  return guide;
}

async function queryQualityTrace(batchNo: string) {
  const trace: any = { batch_no: batchNo, inspection: null, usage_history: [], supplier: null };

  const batchRows: any = await query(
    'SELECT * FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
    [batchNo]
  );

  if (batchRows.length > 0) {
    const batch = batchRows[0];

    if (batch.inspection_id) {
      const inspRows: any = await query(
        'SELECT * FROM qc_incoming_inspection WHERE id = ? AND deleted = 0',
        [batch.inspection_id]
      );
      if (inspRows.length > 0) {
        trace.inspection = {
          inspection_no: inspRows[0].inspection_no,
          inspection_result: inspRows[0].inspection_result,
          inspector_name: inspRows[0].inspector_name,
          inspection_date: inspRows[0].inspection_date,
        };
      }
    }

    const usageRows: any = await query(
      `SELECT usage_type, workorder_no, weight, operator_name, machine_name, usage_time
       FROM ink_usage WHERE batch_no = ? AND deleted = 0 ORDER BY usage_time DESC`,
      [batchNo]
    );
    trace.usage_history = usageRows;

    const dispatchRows: any = await query(
      'SELECT id FROM ink_dispatch WHERE batch_no = ? AND deleted = 0',
      [batchNo]
    );

    if (dispatchRows.length > 0) {
      const dispatchItems: any = await query(
        'SELECT source_batch_no, ink_name, brand FROM ink_dispatch_item WHERE dispatch_id = ? AND deleted = 0',
        [dispatchRows[0].id]
      );

      for (const item of dispatchItems) {
        if (item.source_batch_no) {
          const sourceBatch: any = await query(
            'SELECT supplier_name FROM inv_inventory_batch WHERE batch_no = ? AND deleted = 0',
            [item.source_batch_no]
          );
          if (sourceBatch.length > 0 && sourceBatch[0].supplier_name) {
            trace.supplier = {
              name: sourceBatch[0].supplier_name,
              source_batch: item.source_batch_no,
              ink_name: item.ink_name,
              brand: item.brand,
            };
            break;
          }
        }
      }
    }
  }

  return trace;
}

async function queryInventoryExpiry(batchNo: string) {
  const info: any = { batch_no: batchNo, inventory: null, expiry: null, opening: null };

  const batchRows: any = await query(
    `SELECT ib.*, w.warehouse_name
     FROM inv_inventory_batch ib
     LEFT JOIN inv_warehouse w ON ib.warehouse_id = w.id
     WHERE ib.batch_no = ? AND ib.deleted = 0`,
    [batchNo]
  );

  if (batchRows.length > 0) {
    const batch = batchRows[0];
    const now = new Date();
    const isExpired = batch.expire_date && new Date(batch.expire_date) < now;
    const daysUntilExpiry = batch.expire_date
      ? Math.ceil((new Date(batch.expire_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    info.inventory = {
      warehouse_name: batch.warehouse_name,
      available_qty: batch.available_qty,
      quantity: batch.quantity,
      unit_price: batch.unit_price,
      inbound_date: batch.inbound_date,
      status: batch.status,
      freeze_reason: batch.freeze_reason,
    };

    info.expiry = {
      expire_date: batch.expire_date,
      is_expired: isExpired,
      days_until_expiry: daysUntilExpiry,
      warning_level: daysUntilExpiry !== null
        ? daysUntilExpiry <= 0 ? 'expired'
          : daysUntilExpiry <= 7 ? 'critical'
          : daysUntilExpiry <= 30 ? 'warning'
          : 'normal'
        : 'no_expiry',
    };
  }

  const openingRows: any = await query(
    'SELECT * FROM ink_opening_record WHERE batch_no = ? AND deleted = 0 ORDER BY open_time DESC LIMIT 1',
    [batchNo]
  );

  if (openingRows.length > 0) {
    const opening = openingRows[0];
    info.opening = {
      record_no: opening.record_no,
      open_time: opening.open_time,
      expire_hours: opening.expire_hours,
      expire_time: opening.expire_time,
      remaining_qty: opening.remaining_qty,
      status: opening.status,
      ink_type: opening.ink_type,
    };
  }

  return info;
}
