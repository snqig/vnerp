import { getTranslations } from 'next-intl/server';

;
import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
export const POST = withPermission(async (_request: NextRequest) => {
  const tc = await getTranslations('Common');
  const ts = await getTranslations('Common');
  const result = await transaction(async (conn) => {
    const results: string[] = [];

    const createTable = async (name: string, sql: string) => {
      try {
        await conn.execute(sql);
        results.push(`${name}: 创建成功`);
      } catch (e) {
        if ((e as Error & { code?: string }).code === 'ER_TABLE_EXISTS_ERROR') {
          results.push(`${name}: 已存在，跳过`);
        } else {
          results.push(`${name}: 创建失败 - ${(e as Error).message}`);
        }
      }
    };

    await createTable(
      'inv_material_category',
      ts('k_19ypidn')
    );

    await createTable(
      'inv_transfer_order',
      ts('k_d86vae')
    );

    await createTable(
      'inv_transfer_item',
      ts('k_6nn4sa')
    );

    await createTable(
      'inv_stocktaking',
      ts('k_3wwj2v')
    );

    await createTable(
      'inv_stocktaking_item',
      ts('k_6k35wf')
    );

    await createTable(
      'inv_stock_adjust',
      ts('k_zgrf65')
    );

    await createTable(
      'inv_stock_adjust_item',
      ts('k_71kv7l')
    );

    await createTable(
      'prd_material_issue',
      ts('k_9o99az')
    );

    await createTable(
      'prd_material_issue_item',
      ts('k_tfch7v')
    );

    await createTable(
      'prd_material_return',
      ts('k_1xuibv4')
    );

    await createTable(
      'prd_material_return_item',
      ts('k_jz4i3g')
    );

    await createTable(
      'prd_product_label',
      ts('k_1g156v8')
    );

    await createTable(
      'qc_incoming_inspection',
      ts('k_ed5jfn')
    );

    await createTable(
      'qc_incoming_inspection_item',
      ts('k_18d1h3k')
    );

    await createTable(
      'qc_process_inspection',
      ts('k_1j0evfd')
    );

    await createTable(
      'qc_final_inspection',
      ts('k_3sefh5')
    );

    await createTable(
      'eqp_repair',
      ts('k_x7qa4p')
    );

    await createTable(
      'eqp_calibration',
      ts('k_1lhurm5')
    );

    await createTable(
      'eqp_scrap',
      ts('k_qgbmhm')
    );

    await createTable(
      'prd_ink',
      ts('k_5067bi')
    );

    await createTable(
      'prd_screen_plate',
      ts('k_1ia2vxr')
    );

    await createTable(
      'prd_die',
      ts('k_1h3fj10')
    );

    await createTable(
      'hr_training',
      ts('k_10sf2fq')
    );

    await createTable(
      'hr_training_participant',
      ts('k_1er0fa6')
    );

    await createTable(
      'inv_production_inbound',
      ts('k_1u20uhc')
    );

    await createTable(
      'inv_production_inbound_item',
      ts('k_1g1hisq')
    );

    await createTable(
      'inv_sales_outbound',
      ts('k_i0oj0w')
    );

    await createTable(
      'inv_sales_outbound_item',
      ts('k_19eh66y')
    );

    await createTable(
      'outsource_order',
      ts('k_1n3gskt')
    );

    await createTable(
      'outsource_issue',
      ts('k_t70a7c')
    );

    await createTable(
      'outsource_issue_item',
      ts('k_19fm5ic')
    );

    await createTable(
      'outsource_receive',
      ts('k_1wiqc52')
    );

    await createTable(
      'outsource_settlement',
      ts('k_9pcuwp')
    );

    await createTable(
      'fin_cost_record',
      ts('k_bxfu2u')
    );

    await createTable(
      'qrcode_record',
      ts('k_rmd1s2')
    );

    await createTable(
      'qrcode_scan_log',
      ts('k_18fhdk0')
    );

    await createTable(
      'sys_operation_log',
      ts('k_130c5y9')
    );

    const addColumn = async (table: string, column: string, definition: string) => {
      try {
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        results.push(`${table}.${column}: 列已添加`);
      } catch (e) {
        if ((e as Error & { code?: string }).code === 'ER_DUP_FIELDNAME') {
          results.push(`${table}.${column}: 列已存在，跳过`);
        } else {
          results.push(`${table}.${column}: 添加失败 - ${(e as Error).message}`);
        }
      }
    };

    const addIndex = async (table: string, indexName: string, columns: string) => {
      try {
        await conn.execute(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
        results.push(`${table}.${indexName}: 索引已添加`);
      } catch (e) {
        if ((e as Error & { code?: string }).code === 'ER_DUP_KEYNAME') {
          results.push(`${table}.${indexName}: 索引已存在，跳过`);
        } else {
          results.push(`${table}.${indexName}: 添加失败 - ${(e as Error).message}`);
        }
      }
    };

    await addColumn('sys_login_log', 'user_name', ts('k_kre24x'));
    await addColumn('sys_login_log', 'ipaddr', ts('k_1w293jg'));
    await addColumn('sys_login_log', 'login_location', ts('k_1t7z34b'));
    await addColumn('sys_login_log', 'browser', ts('k_1drzaey'));
    await addColumn('sys_login_log', 'os', ts('k_ddmewi'));
    await addColumn('sys_login_log', 'msg', ts('k_3whvpr'));
    await addColumn(
      'sys_login_log',
      'login_time',
      ts('k_3ba28u')
    );
    await addColumn('sys_login_log', 'deleted', ts('k_1le0fn7'));

    await addColumn(
      'inv_material_category',
      'category_type',
      ts('k_buotpa')
    );
    await addColumn('inv_material_category', 'category_code', ts('k_12tsr41'));
    await addColumn(
      'inv_material_category',
      'parent_id',
      ts('k_140nyv1')
    );
    await addColumn('inv_material_category', 'sort_order', ts('k_shlfal'));
    await addColumn(
      'inv_material_category',
      'status',
      ts('k_23riqf')
    );
    await addColumn('inv_material_category', 'remark', ts('k_zxtlxn'));
    await addColumn('inv_material_category', 'deleted', ts('k_1le0fn7'));
    await addColumn(
      'sys_operation_log',
      'oper_time',
      ts('k_1ijwpr9')
    );
    await addColumn('sys_operation_log', 'oper_name', ts('k_2mkank'));
    await addColumn('sys_operation_log', 'oper_type', ts('k_1a7ga5o'));
    await addColumn('sys_operation_log', 'oper_method', ts('k_11ztzhc'));
    await addColumn('sys_operation_log', 'oper_url', ts('k_1vvzct6'));
    await addColumn('sys_operation_log', 'oper_ip', ts('k_2b5fr8'));
    await addColumn('sys_operation_log', 'oper_param', ts('k_dqq3vu'));
    await addColumn('sys_operation_log', 'oper_result', ts('k_1wkocls'));
    await addColumn('sys_operation_log', 'deleted', ts('k_1le0fn7'));
    await addColumn('sys_notice', 'deleted', ts('k_1le0fn7'));
    await addColumn(
      'sys_menu',
      'is_visible',
      ts('k_s27at2')
    );

    await addColumn('qrcode_record', 'parent_qr_code', ts('k_xmu36t'));
    await addColumn(
      'qrcode_record',
      'split_flag',
      ts('k_1w96e59')
    );
    await addColumn('qrcode_record', 'split_index', ts('k_1wgewpq'));

    await addIndex('qrcode_record', 'idx_ref_no', 'ref_no');
    await addIndex('qrcode_record', 'idx_material_code', 'material_code');
    await addIndex('qrcode_record', 'idx_parent_qr_code', 'parent_qr_code');
    await addIndex('qrcode_record', 'idx_work_order', 'work_order_no, qr_type');
    await addIndex('qrcode_record', 'idx_create_time', 'create_time');

    await addIndex('qrcode_scan_log', 'idx_qr_code', 'qr_code');
    await addIndex('qrcode_scan_log', 'idx_scan_type', 'scan_type');
    await addIndex('qrcode_scan_log', 'idx_create_time', 'create_time');

    // ============================================================
    // P0 库存联动补齐：批次/库位/二维码/原始入库日期
    // ============================================================

    // inv_transfer_item 补齐批次、库位、二维码、原始入库日期字段
    await addColumn('inv_transfer_item', 'batch_id', ts('k_cbs0xr'));
    await addColumn('inv_transfer_item', 'location_id', ts('k_bfpi9p'));
    await addColumn(
      'inv_transfer_item',
      'original_inbound_date',
      ts('k_1ruybob')
    );
    await addColumn('inv_transfer_item', 'qr_code', ts('k_1mz0uh3'));
    await addIndex('inv_transfer_item', 'idx_transfer_batch', 'batch_id');

    // inv_stocktaking_item 补齐批次ID、原始入库日期、二维码字段
    await addColumn('inv_stocktaking_item', 'batch_id', ts('k_cbs0xr'));
    await addColumn('inv_stocktaking_item', 'original_inbound_date', ts('k_1ah94s8'));
    await addColumn('inv_stocktaking_item', 'qr_code', ts('k_x0udiw'));
    await addIndex('inv_stocktaking_item', 'idx_stk_batch', 'batch_id');

    // inv_stock_adjust_item 补齐批次、库位、原始入库日期、二维码字段
    await addColumn('inv_stock_adjust_item', 'batch_id', ts('k_cbs0xr'));
    await addColumn('inv_stock_adjust_item', 'location_id', ts('k_bfpi9p'));
    await addColumn(
      'inv_stock_adjust_item',
      'original_inbound_date',
      ts('k_1ah94s8')
    );
    await addColumn('inv_stock_adjust_item', 'qr_code', ts('k_x0udiw'));
    await addIndex('inv_stock_adjust_item', 'idx_adj_batch', 'batch_id');

    await createTable(
      'qms_sgs_cert',
      ts('k_1wn8upb')
    );

    await createTable(
      'qms_sgs_cert_item',
      ts('k_154qbh9')
    );

    const seedCategories = async () => {
      const [existing] = await conn.execute(
        'SELECT COUNT(*) as cnt FROM inv_material_category WHERE deleted = 0'
      );
      if (existing.cnt > 0) {
        results.push(ts('k_u6thfx'));
        return;
      }
      const categories = [
        { code: 'RM-01', name: ts('k_p0xrm1'), type: 1, sort: 1, remark: ts('k_mwxv90') },
        { code: 'RM-02', name: ts('k_w1cwb8'), type: 6, sort: 2, remark: ts('k_llkhg7') },
        {
          code: 'RM-03',
          name: tc('solvent'),
          type: 7,
          sort: 3,
          remark: ts('k_1fw1m6x'),
        },
        { code: 'RM-04', name: ts('k_ywxjvb'), type: 8, sort: 4, remark: ts('k_hyx1mv') },
        { code: 'RM-05', name: ts('k_1xcxgzu'), type: 9, sort: 5, remark: ts('k_6rm3d9') },
        { code: 'RM-06', name: ts('k_1pfrbwu'), type: 4, sort: 6, remark: ts('k_19a51kh') },
        {
          code: 'RM-07',
          name: ts('k_1rdp57x'),
          type: 4,
          sort: 7,
          remark: ts('k_lnwh77'),
        },
        { code: 'RM-08', name: ts('k_1ag0f8o'), type: 4, sort: 8, remark: ts('k_1fok2p3') },
        {
          code: 'RM-09',
          name: ts('k_34xcx'),
          type: 10,
          sort: 9,
          remark: ts('k_6j1y5s'),
        },
        { code: 'RM-10', name: ts('k_cf0xu4'), type: 5, sort: 10, remark: ts('k_19xj4vr') },
        { code: 'SP-01', name: ts('k_o584ua'), type: 2, sort: 11, remark: ts('k_wvnjvz') },
        { code: 'FP-01', name: ts('k_19fnn2i'), type: 3, sort: 12, remark: ts('k_1imit22') },
        { code: 'INK-01', name: ts('k_chmbxj'), type: 6, sort: 13, remark: ts('k_1xtwrnh') },
        { code: 'INK-02', name: ts('k_445c63'), type: 6, sort: 14, remark: ts('k_brzyj6') },
        { code: 'INK-03', name: ts('k_12htltx'), type: 6, sort: 15, remark: ts('k_1nsj5pm') },
        { code: 'INK-04', name: ts('k_y2h489'), type: 6, sort: 16, remark: ts('k_605nb3') },
        { code: 'SLV-01', name: ts('k_wh590j'), type: 7, sort: 17, remark: ts('k_1h6at2s') },
        { code: 'SLV-02', name: ts('k_14het1u'), type: 7, sort: 18, remark: ts('k_5tqcow') },
        { code: 'SLV-03', name: ts('k_awij9v'), type: 7, sort: 19, remark: ts('k_1fvnm2t') },
        { code: 'SLV-04', name: ts('k_196oksl'), type: 7, sort: 20, remark: ts('k_vzebjh') },
      ];
      for (const cat of categories) {
        const existing = await conn.execute(
          'SELECT id FROM inv_material_category WHERE category_code = ?',
          [cat.code]
        );
        if (existing[0].length === 0) {
          await conn.execute(
            'INSERT INTO inv_material_category (category_code, category_name, parent_id, category_type, sort_order, status, remark) VALUES (?, ?, 0, ?, ?, 1, ?)',
            [cat.code, cat.name, cat.type, cat.sort, cat.remark]
          );
        }
      }
      results.push(ts('k_nnuopo') + categories.length + ts('k_iqxj2q'));
    };
    await seedCategories();

    await createTable(
      'plm_product_lifecycle',
      ts('k_1sr6bbv')
    );

    await createTable(
      'plm_eco',
      ts('k_3pwmwy')
    );

    await createTable(
      'crm_follow_record',
      ts('k_1lqpbwq')
    );

    await createTable(
      'crm_customer_analysis',
      ts('k_1yfmg5y')
    );

    await createTable(
      'srm_supplier_eval',
      ts('k_70ymx8')
    );

    await createTable(
      'srm_supplier_eval_item',
      ts('k_15m2tup')
    );

    await createTable(
      'eng_sample_to_mass',
      ts('k_hxv8f')
    );

    await createTable(
      'eng_sop',
      ts('k_16s2cww')
    );

    await createTable(
      'prd_schedule',
      ts('k_1uu2zar')
    );

    await createTable(
      'qms_complaint',
      ts('k_ddgnw5')
    );

    await createTable(
      'qms_lab_test',
      ts('k_8qzq4k')
    );

    await createTable(
      'qms_supplier_audit',
      ts('k_r9oh3c')
    );

    await createTable(
      'biz_contract_review',
      ts('k_lms03k')
    );

    await createTable(
      'print_log',
      ts('k_1nxr3b7')
    );

    await createTable(
      'label_template',
      ts('k_13n8wl8')
    );

    await createTable(
      'qrcode_record_archive',
      `CREATE TABLE IF NOT EXISTS qrcode_record_archive LIKE qrcode_record`
    );

    return results;
  });

  return successResponse(result, ts('k_x4d146'));
});
