import { NextRequest } from 'next/server';
import { transaction } from '@/lib/db';
import { successResponse } from '@/lib/api-response';

import { withPermission } from '@/lib/api-permissions';
function pad(n: number, len: number = 3): string {
  return String(n).padStart(len, '0');
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export const POST = withPermission(async (_request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const clearTables = [
      'inv_trace_detail',
      'inv_trace_record',
      'inv_scan_log',
      'prd_product_label',
      'inv_production_inbound_item',
      'inv_production_inbound',
      'prd_work_report',
      'prd_material_issue_item',
      'prd_material_issue',
      'prd_material_return_item',
      'prd_material_return',
      'prd_process_card_material',
      'prd_process_card',
      'inv_cutting_detail',
      'inv_cutting_record',
      'inv_material_label',
      'inv_inbound_item',
      'inv_inbound_order',
      'inv_outbound_item',
      'inv_outbound_order',
      'inv_inventory',
      'inv_inventory_log',
      'inv_inventory_transaction',
      'prod_work_order',
      'prod_work_order_item',
      'prod_work_order_material_req',
      'sal_order_detail',
      'sal_order',
      'pur_order_detail',
      'pur_order',
      'crm_customer',
      'pur_supplier',
      'inv_material',
      'inv_warehouse',
      'fin_receivable',
      'fin_payable',
      'hr_training',
      'eqp_equipment',
      'qc_incoming_inspection',
      'qc_incoming_inspection_item',
    ];
    for (const t of clearTables) {
      try {
        await conn.execute(`DELETE FROM ${t}`);
      } catch {
        /* ignore */
      }
    }
    stats.tables_cleared = clearTables.length;

    const [catRows]: any = await conn.execute(
      'SELECT id, code, name FROM sys_warehouse_category WHERE deleted = 0 ORDER BY id'
    );
    const whCats: any[] = catRows;
    const [matCatRows]: any = await conn.execute(
      'SELECT id, category_code, category_name, category_type FROM inv_material_category ORDER BY id'
    );
    const matCats: any[] = matCatRows;
    const [userRows]: any = await conn.execute(
      'SELECT id, username, real_name FROM sys_user WHERE deleted=0 ORDER BY id'
    );
    const adminUser = userRows.find((u: any) => u.username === 'admin') || userRows[0];
    const whUser = userRows.find((u: any) => u.username === 'zhaolei') || userRows[1];
    const prodUser = userRows.find((u: any) => u.username === 'wangqiang') || userRows[2];
    const qcUser = userRows.find((u: any) => u.username === 'zhoujie') || userRows[3];

    // ===== 重建基础数据：仓库 =====
    const whNames = [
      '原材料仓',
      '半成品仓',
      '成品仓',
      '辅料仓',
      '油墨仓',
      '危化品仓',
      '冷藏仓',
      '待检仓',
      '退货仓',
      '废品仓',
      '包材仓',
      '备件仓',
      '样品仓',
      '暂存仓',
      '外协仓',
    ];
    const whCodes = [
      'Y01',
      'B01',
      'C01',
      'A01',
      'M01',
      'H01',
      'L01',
      'Z01',
      'R01',
      'S01',
      'P01',
      'SP01',
      'SM01',
      'T01',
      'O01',
    ];
    const whMap: Record<string, number> = {};
    for (let i = 0; i < whNames.length; i++) {
      const _cat = whCats[i % whCats.length];
      await conn.execute(
        `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, province, city, address, manager_id, contact_phone, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          whCodes[i],
          whNames[i],
          (i % 10) + 1,
          '广东省',
          '东莞',
          `广东省东莞市工业园区${i + 1}号`,
          whUser.id,
          `0769-${randomInt(22000000, 22999999)}`,
          1,
          null,
        ]
      );
      const [whRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      whMap[whCodes[i]] = whRow[0].id;
    }
    stats.inv_warehouse = whNames.length;

    // ===== 重建基础数据：物料 =====
    const matTypes = [
      {
        prefix: 'PET',
        name: 'PET薄膜',
        unit: '张',
        cat_type: 1,
        specs: ['0.1mm×500mm', '0.125mm×600mm', '0.188mm×700mm', '0.25mm×800mm'],
        price_range: [0.5, 5.0],
      },
      {
        prefix: 'PVC',
        name: 'PVC薄膜',
        unit: '张',
        cat_type: 1,
        specs: ['0.1mm×500mm', '0.15mm×600mm', '0.2mm×700mm'],
        price_range: [0.3, 3.5],
      },
      {
        prefix: 'INK',
        name: '丝印油墨',
        unit: 'kg',
        cat_type: 2,
        specs: ['溶剂型-黑色', '溶剂型-白色', 'UV-透明', 'UV-彩色', '导电银浆'],
        price_range: [50, 500],
      },
      {
        prefix: 'SOL',
        name: '溶剂',
        unit: 'L',
        cat_type: 2,
        specs: ['783慢干水', '719快干水', '洗网水', '开油水'],
        price_range: [15, 80],
      },
      {
        prefix: 'AUX',
        name: '辅助材料',
        unit: '个',
        cat_type: 3,
        specs: ['网框-铝合金', '网纱-77T', '刮胶-65度', '保护膜-50μm'],
        price_range: [5, 200],
      },
      {
        prefix: 'LBL',
        name: '标签成品',
        unit: '张',
        cat_type: 4,
        specs: ['空调面板标签', '洗衣机面板标签', '冰箱贴标', '电子产品标签', '酒类防伪标'],
        price_range: [0.05, 2.0],
      },
    ];
    const matMap: Record<string, number> = {};
    const matInfoMap: Record<string, any> = {};
    for (let i = 1; i <= 50; i++) {
      const mt = matTypes[(i - 1) % matTypes.length];
      const spec = mt.specs[(i - 1) % mt.specs.length];
      const catType = matCats.find((c: any) => c.category_type === mt.cat_type);
      const purchasePrice = randomAmount(mt.price_range[0], mt.price_range[1]);
      const salePrice = Math.round(purchasePrice * (1.3 + Math.random() * 0.7) * 100) / 100;
      const code = `MAT-${mt.prefix}-${pad(i, 4)}`;
      await conn.execute(
        `INSERT INTO inv_material (material_code, material_name, specification, category_id, material_type, unit, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, is_batch_managed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code,
          `${mt.name}${pad(i, 3)}`,
          spec,
          catType?.id || null,
          mt.cat_type,
          mt.unit,
          randomItem(['3M', '杜邦', '东洋', '精工', '国产']),
          randomInt(100, 1000),
          randomInt(5000, 50000),
          randomInt(50, 500),
          purchasePrice,
          salePrice,
          Math.round(purchasePrice * 1.05 * 100) / 100,
          whMap['Y01'],
          mt.cat_type <= 2 ? 1 : 0,
          1,
        ]
      );
      const [matRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      matMap[code] = matRow[0].id;
      matInfoMap[code] = {
        id: matRow[0].id,
        material_code: code,
        material_name: `${mt.name}${pad(i, 3)}`,
        specification: spec,
        unit: mt.unit,
        purchase_price: purchasePrice,
        sale_price: salePrice,
        cat_type: mt.cat_type,
      };
    }
    stats.inv_material = 50;
    const materials = Object.values(matInfoMap);
    const mainMats = materials.filter((m: any) => m.cat_type === 1);
    const inkMats = materials.filter((m: any) => m.cat_type === 2);
    const _auxMats = materials.filter((m: any) => m.cat_type === 3);
    const productMats = materials.filter((m: any) => m.cat_type === 4);

    // ===== 重建基础数据：客户 =====
    const industries = [
      '家电制造',
      '电子产品',
      '汽车配件',
      '食品饮料',
      '日化用品',
      '医药保健',
      '物流快递',
      '商超零售',
      '通信设备',
      '新能源',
    ];
    const cusIds: number[] = [];
    for (let i = 1; i <= 30; i++) {
      const industry = industries[(i - 1) % industries.length];
      await conn.execute(
        `INSERT INTO crm_customer (customer_code, customer_name, short_name, customer_type, industry, scale, credit_level, province, city, address, contact_name, contact_phone, contact_email, tax_number, bank_name, bank_account, salesman_id, follow_up_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CUS-${pad(i, 5)}`,
          `东莞${industry}有限公司`,
          `${industry.substring(0, 2)}`,
          (i % 3) + 1,
          industry,
          randomItem(['大型', '中型', '小型']),
          randomItem(['AAA', 'AA', 'A']),
          '广东',
          '东莞',
          `广东省东莞市工业区${i}号`,
          `联系人${i}`,
          `1${randomInt(3000000000, 3999999999)}`,
          `c${i}@example.com`,
          `91440100MA5C${pad(i, 6)}`,
          randomItem(['工商银行', '建设银行']),
          `6222${String(randomInt(1000000000000, 9999999999999))}`,
          adminUser.id,
          (i % 5) + 1,
          1,
        ]
      );
      const [cusRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      cusIds.push(cusRow[0].id);
    }
    stats.crm_customer = 30;

    // ===== 重建基础数据：供应商 =====
    const supIds: number[] = [];
    for (let i = 1; i <= 30; i++) {
      const sType = randomItem(['原材料', '油墨', '设备', '辅料', '包材']);
      await conn.execute(
        `INSERT INTO pur_supplier (supplier_code, supplier_name, short_name, supplier_type, province, city, address, contact_name, contact_phone, contact_email, tax_number, bank_name, bank_account, credit_level, cooperation_status, settlement_method, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SUP-${pad(i, 5)}`,
          `东莞${sType}供应商${i}有限公司`,
          `${sType.substring(0, 2)}`,
          (i % 3) + 1,
          '广东',
          '东莞',
          `广东省东莞市供应商路${i}号`,
          `供应商联系人${i}`,
          `1${randomInt(3800000000, 3999999999)}`,
          `s${i}@example.com`,
          `91440100MA5D${pad(i, 6)}`,
          randomItem(['工商银行', '建设银行']),
          `6228${String(randomInt(1000000000000, 9999999999999))}`,
          randomItem(['AAA', 'AA', 'A']),
          1,
          randomItem(['月结30天', '月结60天']),
          randomItem(['月结30天', '货到付款']),
          1,
        ]
      );
      const [supRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      supIds.push(supRow[0].id);
    }
    stats.pur_supplier = 30;

    const warehouses: any[] = Object.entries(whMap).map(([code, id]) => ({
      id,
      warehouse_code: code,
    }));
    const rawWh = { id: whMap['Y01'], warehouse_code: 'Y01' };
    const finishedWh = { id: whMap['C01'], warehouse_code: 'C01' };
    const fieldWh = { id: whMap['X01'], warehouse_code: 'X01' };
    const customers = cusIds.map((id, i) => ({
      id,
      customer_name: `东莞${industries[i % industries.length]}有限公司`,
    }));
    const suppliers = supIds.map((id, i) => ({
      id,
      supplier_name: `东莞${randomItem(['原材料', '油墨', '辅料'])}供应商${i + 1}有限公司`,
    }));

    const productNames = [
      '空调面板标签',
      '洗衣机控制面板',
      '冰箱温控标签',
      '电子产品铭牌',
      '酒类防伪标',
      '食品包装标签',
      '日化用品标签',
      '药品追溯标',
      '物流快递面单',
      '商超价签',
    ];
    const customerProductMap: Record<string, string> = {};
    for (let i = 0; i < customers.length; i++) {
      customerProductMap[customers[i].id] = productNames[i % productNames.length];
    }

    const _BATCH_SIZE = 50;
    const TOTAL_ORDERS = 50;

    // ===== 1. 销售订单 (sal_order + sal_order_detail) =====
    const orderIds: number[] = [];
    const orderData: any[] = [];
    for (let i = 1; i <= TOTAL_ORDERS; i++) {
      const customer = customers[(i - 1) % customers.length];
      const orderDate = randomDate(yearStart, now);
      const deliveryDate = new Date(new Date(orderDate).getTime() + randomInt(10, 45) * 86400000)
        .toISOString()
        .slice(0, 10);
      const productName = customerProductMap[customer.id] || `产品${i}`;
      const prodMat = productMats[(i - 1) % productMats.length];
      const qty = randomInt(5000, 100000);
      const unitPrice = prodMat?.sale_price || randomAmount(0.05, 2.0);
      const amount = Math.round(qty * unitPrice * 100) / 100;
      const taxRate = 13;
      const tax = Math.round(((amount * taxRate) / 100) * 100) / 100;
      const totalWithTax = Math.round((amount + tax) * 100) / 100;
      const status = randomItem([1, 2, 3, 4, 5]);

      await conn.execute(
        `INSERT INTO sal_order (order_no, order_date, customer_id, contact_name, contact_phone, delivery_address, salesman_id, total_amount, tax_amount, total_with_tax, discount_amount, currency, payment_terms, delivery_date, contract_no, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ORD-${pad(i, 5)}`,
          orderDate,
          customer.id,
          `联系人${i}`,
          `1${randomInt(3000000000, 3999999999)}`,
          `收货地址${i}`,
          adminUser.id,
          amount,
          tax,
          totalWithTax,
          0,
          'CNY',
          randomItem(['月结30天', '月结60天', '货到付款']),
          deliveryDate,
          `CT-${now.getFullYear()}-${pad(i, 4)}`,
          status,
        ]
      );
      const [orderRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = orderRow[0].id;
      orderIds.push(orderId);

      await conn.execute(
        `INSERT INTO sal_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivered_qty, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          prodMat?.id || null,
          qty,
          prodMat?.unit || '张',
          unitPrice,
          taxRate,
          amount,
          tax,
          totalWithTax,
          status >= 3 ? Math.round(qty * 0.6) : 0,
          deliveryDate,
        ]
      );

      orderData.push({
        id: orderId,
        orderNo: `ORD-${pad(i, 5)}`,
        customerId: customer.id,
        customerName: customer.customer_name,
        productName,
        qty,
        orderDate,
        deliveryDate,
        status,
      });
    }
    stats.sal_order = TOTAL_ORDERS;

    // ===== 2. 生产工单 (prod_work_order) =====
    const woIds: number[] = [];
    const woData: any[] = [];
    for (let i = 1; i <= TOTAL_ORDERS; i++) {
      const od = orderData[(i - 1) % orderData.length];
      const planStart = new Date(new Date(od.orderDate).getTime() + randomInt(3, 10) * 86400000)
        .toISOString()
        .slice(0, 10);
      const planEnd = new Date(new Date(planStart).getTime() + randomInt(5, 20) * 86400000)
        .toISOString()
        .slice(0, 10);
      const status = randomItem(['pending', 'confirmed', 'preparing', 'producing', 'completed']);
      const actualStart = ['confirmed', 'preparing', 'producing', 'completed'].includes(status)
        ? planStart
        : null;
      const actualEnd =
        status === 'completed'
          ? new Date(new Date(actualStart || planStart).getTime() + randomInt(3, 15) * 86400000)
              .toISOString()
              .slice(0, 10)
          : null;

      await conn.execute(
        `INSERT INTO prod_work_order (work_order_no, order_id, order_no, customer_name, product_name, quantity, unit, status, priority, plan_start_date, plan_end_date, actual_start_date, actual_end_date, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `WO-${pad(i, 5)}`,
          od.id,
          od.orderNo,
          od.customerName,
          od.productName,
          od.qty,
          '张',
          status,
          randomItem(['urgent', 'high', 'normal', 'low']),
          planStart,
          planEnd,
          actualStart,
          actualEnd,
          adminUser.id,
        ]
      );
      const [woRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      woIds.push(woRow[0].id);
      woData.push({
        id: woRow[0].id,
        woNo: `WO-${pad(i, 5)}`,
        orderId: od.id,
        orderNo: od.orderNo,
        customerName: od.customerName,
        productName: od.productName,
        qty: od.qty,
        status,
        planStart,
        planEnd,
      });
    }
    stats.prod_work_order = TOTAL_ORDERS;

    // ===== 3. 采购入库 (inv_inbound_order + inv_inbound_item + inv_material_label) =====
    const labelIds: number[] = [];
    const labelData: any[] = [];
    for (let i = 1; i <= TOTAL_ORDERS; i++) {
      const wo = woData[(i - 1) % woData.length];
      const supplier = suppliers[(i - 1) % suppliers.length];
      const mainMat = mainMats[(i - 1) % mainMats.length];
      const inkMat = inkMats[(i - 1) % inkMats.length];
      const inboundDate = new Date(new Date(wo.planStart).getTime() - randomInt(5, 15) * 86400000)
        .toISOString()
        .slice(0, 10);
      const totalQty = randomInt(500, 5000);
      const totalAmount = Math.round(totalQty * (mainMat?.purchase_price || 2) * 100) / 100;

      await conn.execute(
        `INSERT INTO inv_inbound_order (order_no, order_type, warehouse_id, supplier_id, supplier_name, po_id, po_no, grn_type, total_amount, total_quantity, status, inbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `INB-${pad(i, 5)}`,
          'purchase',
          rawWh.id,
          supplier.id,
          supplier.supplier_name,
          null,
          null,
          'po',
          totalAmount,
          totalQty,
          'completed',
          inboundDate,
        ]
      );
      const [inbRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const inbId = inbRow[0].id;

      const batchNo = `B${now.getFullYear()}${pad(i, 4)}`;

      await conn.execute(
        `INSERT INTO inv_inbound_item (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inbId,
          mainMat?.id,
          mainMat?.material_name,
          mainMat?.specification,
          batchNo,
          totalQty,
          mainMat?.unit || '张',
          mainMat?.purchase_price || 2,
          totalAmount,
        ]
      );

      const labelNo = `LBL-${pad(i, 5)}`;
      const width = randomItem([500, 600, 700, 800, 1000, 1080, 1090]);
      const lengthPerRoll = randomItem([500, 1000, 2000, 3000]);
      await conn.execute(
        `INSERT INTO inv_material_label (label_no, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, width, length_per_roll, warehouse_id, is_main_material, is_used, is_cut, label_type, remaining_width, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          labelNo,
          `INB-${pad(i, 5)}`,
          supplier.supplier_name,
          inboundDate,
          mainMat?.material_code,
          mainMat?.material_name,
          mainMat?.specification,
          mainMat?.unit || '张',
          batchNo,
          totalQty,
          width,
          lengthPerRoll,
          rawWh.id,
          1,
          0,
          0,
          1,
          width,
          1,
        ]
      );
      const [lblRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      labelIds.push(lblRow[0].id);
      labelData.push({
        id: lblRow[0].id,
        labelNo,
        materialCode: mainMat?.material_code,
        materialName: mainMat?.material_name,
        batchNo,
        qty: totalQty,
        width,
        warehouseId: rawWh.id,
        supplierName: supplier.supplier_name,
        receiveDate: inboundDate,
      });

      if (i <= 30) {
        const inkQty = randomInt(10, 200);
        const inkLabelNo = `LBL-INK-${pad(i, 4)}`;
        await conn.execute(
          `INSERT INTO inv_material_label (label_no, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, warehouse_id, is_main_material, is_used, is_cut, label_type, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inkLabelNo,
            `INB-${pad(i, 5)}`,
            supplier.supplier_name,
            inboundDate,
            inkMat?.material_code,
            inkMat?.material_name,
            inkMat?.specification,
            inkMat?.unit || 'kg',
            `INK-B${now.getFullYear()}${pad(i, 4)}`,
            inkQty,
            rawWh.id,
            0,
            0,
            0,
            2,
            1,
          ]
        );
        const [inkLblRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        labelIds.push(inkLblRow[0].id);
        labelData.push({
          id: inkLblRow[0].id,
          labelNo: inkLabelNo,
          materialCode: inkMat?.material_code,
          materialName: inkMat?.material_name,
          batchNo: `INK-B${now.getFullYear()}${pad(i, 4)}`,
          qty: inkQty,
          width: null,
          warehouseId: rawWh.id,
          supplierName: supplier.supplier_name,
          receiveDate: inboundDate,
        });
      }
    }
    stats.inv_inbound_order = TOTAL_ORDERS;
    stats.inv_material_label = labelIds.length;

    // ===== 4. 分切管理 (inv_cutting_record + inv_cutting_detail) =====
    const cuttingLabelIds: number[] = [];
    const cuttingLabelData: any[] = [];
    for (let i = 1; i <= 30; i++) {
      const srcLabel = labelData[(i - 1) % labelData.length];
      if (!srcLabel.width) continue;
      const cutWidths = [];
      let remainW = srcLabel.width;
      const numCuts = randomInt(2, 4);
      for (let j = 0; j < numCuts && remainW > 100; j++) {
        const cw = Math.round((remainW / (numCuts - j + 1)) * 0.9);
        if (cw > 50) {
          cutWidths.push(cw);
          remainW -= cw;
        }
      }
      const cutWidthStr = cutWidths.join('+');

      await conn.execute(
        `INSERT INTO inv_cutting_record (record_no, source_label_id, source_label_no, cut_width_str, original_width, cut_total_width, remain_width, operator_id, operator_name, cut_time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CUT-${pad(i, 5)}`,
          srcLabel.id,
          srcLabel.labelNo,
          cutWidthStr,
          srcLabel.width,
          srcLabel.width - remainW,
          remainW,
          whUser.id,
          whUser.real_name,
          randomDate(yearStart, now),
          1,
        ]
      );
      const [cutRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const cutId = cutRow[0].id;

      for (let j = 0; j < cutWidths.length; j++) {
        const newLabelNo = `${srcLabel.labelNo}-${pad(j + 1, 2)}`;
        await conn.execute(
          `INSERT INTO inv_material_label (label_no, purchase_order_no, supplier_name, receive_date, material_code, material_name, specification, unit, batch_no, quantity, width, warehouse_id, is_main_material, is_used, is_cut, parent_label_id, label_type, remaining_width, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newLabelNo,
            srcLabel.labelNo.replace('LBL-', 'INB-'),
            srcLabel.supplierName,
            srcLabel.receiveDate,
            srcLabel.materialCode,
            srcLabel.materialName,
            null,
            'M',
            srcLabel.batchNo,
            Math.round((srcLabel.qty * cutWidths[j]) / srcLabel.width),
            cutWidths[j],
            srcLabel.warehouseId,
            1,
            0,
            1,
            srcLabel.id,
            1,
            cutWidths[j],
            1,
          ]
        );
        const [newLblRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        cuttingLabelIds.push(newLblRow[0].id);
        cuttingLabelData.push({
          id: newLblRow[0].id,
          labelNo: newLabelNo,
          materialCode: srcLabel.materialCode,
          materialName: srcLabel.materialName,
          batchNo: srcLabel.batchNo,
          qty: Math.round((srcLabel.qty * cutWidths[j]) / srcLabel.width),
          width: cutWidths[j],
          warehouseId: srcLabel.warehouseId,
          supplierName: srcLabel.supplierName,
          receiveDate: srcLabel.receiveDate,
        });

        await conn.execute(
          `INSERT INTO inv_cutting_detail (record_id, new_label_id, new_label_no, cut_width, sequence) VALUES (?, ?, ?, ?, ?)`,
          [cutId, newLblRow[0].id, newLabelNo, cutWidths[j], j + 1]
        );
      }
    }
    stats.inv_cutting_record = 30;

    // ===== 5. 工艺流程卡 (prd_process_card + prd_process_card_material) =====
    const cardIds: number[] = [];
    const cardData: any[] = [];
    for (let i = 1; i <= TOTAL_ORDERS; i++) {
      const wo = woData[(i - 1) % woData.length];
      const mainLabel = labelData[(i - 1) % labelData.length];
      const cardNo = `PC-${pad(i, 5)}`;
      const burdeningStatus = ['producing', 'completed'].includes(wo.status) ? 1 : 0;
      const lockStatus = wo.status === 'completed' ? 1 : 0;

      await conn.execute(
        `INSERT INTO prd_process_card (card_no, work_order_id, work_order_no, product_code, product_name, material_spec, work_order_date, plan_qty, main_label_id, main_label_no, burdening_status, lock_status, create_user_id, create_user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardNo,
          wo.id,
          wo.woNo,
          wo.productName.substring(0, 2) + '-' + pad(i, 3),
          wo.productName,
          mainMats[(i - 1) % mainMats.length]?.specification,
          wo.planStart,
          wo.qty,
          mainLabel.id,
          mainLabel.labelNo,
          burdeningStatus,
          lockStatus,
          prodUser.id,
          prodUser.real_name,
        ]
      );
      const [cardRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const cardId = cardRow[0].id;
      cardIds.push(cardId);
      cardData.push({
        id: cardId,
        cardNo,
        woId: wo.id,
        woNo: wo.woNo,
        productName: wo.productName,
        planQty: wo.qty,
        mainLabelId: mainLabel.id,
        mainLabelNo: mainLabel.labelNo,
        burdeningStatus,
        lockStatus,
      });

      await conn.execute(
        `INSERT INTO prd_process_card_material (card_id, card_no, label_id, label_no, material_type, material_code, material_name, specification, batch_no, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cardId,
          cardNo,
          mainLabel.id,
          mainLabel.labelNo,
          1,
          mainLabel.materialCode,
          mainLabel.materialName,
          mainMats[(i - 1) % mainMats.length]?.specification,
          mainLabel.batchNo,
          mainLabel.qty,
          'M',
        ]
      );

      if (i <= 30) {
        const inkLabel = labelData.find(
          (l: any) => l.materialCode?.startsWith('MAT-INK') && l.id > mainLabel.id
        );
        if (inkLabel) {
          await conn.execute(
            `INSERT INTO prd_process_card_material (card_id, card_no, label_id, label_no, material_type, material_code, material_name, specification, batch_no, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cardId,
              cardNo,
              inkLabel.id,
              inkLabel.labelNo,
              2,
              inkLabel.materialCode,
              inkLabel.materialName,
              inkMats[(i - 1) % inkMats.length]?.specification,
              inkLabel.batchNo,
              inkLabel.qty,
              'kg',
            ]
          );
        }
      }
    }
    stats.prd_process_card = TOTAL_ORDERS;

    // ===== 6. 扫码配料 (inv_scan_log) =====
    for (let i = 1; i <= 30; i++) {
      const card = cardData[(i - 1) % cardData.length];
      const label = labelData[(i - 1) % labelData.length];
      await conn.execute(
        `INSERT INTO inv_scan_log (scan_type, qr_content, label_no, operation, result, message, operator_id, operator_name, scan_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'burdening',
          label.labelNo,
          label.labelNo,
          card.cardNo,
          1,
          '扫码配料成功',
          prodUser.id,
          prodUser.real_name,
          randomDate(yearStart, now),
        ]
      );
    }
    stats.inv_scan_log = 30;

    // ===== 7. 扫码发料 (prd_material_issue + prd_material_issue_item) =====
    for (let i = 1; i <= 30; i++) {
      const wo = woData[(i - 1) % woData.length];
      const card = cardData[(i - 1) % cardData.length];
      const mainLabel = labelData[(i - 1) % labelData.length];
      const issueDate = randomDate(yearStart, now);
      const issueQty = Math.round(mainLabel.qty * randomAmount(0.3, 0.8));

      await conn.execute(
        `INSERT INTO prd_material_issue (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, status, operator_id, operator_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `MI-${pad(i, 5)}`,
          wo.id,
          wo.woNo,
          rawWh.id,
          issueDate,
          1,
          2,
          whUser.id,
          whUser.real_name,
          whUser.id,
        ]
      );
      const [miRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const miId = miRow[0].id;

      await conn.execute(
        `INSERT INTO prd_material_issue_item (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          miId,
          mainMats[(i - 1) % mainMats.length]?.id,
          mainLabel.materialCode,
          mainLabel.materialName,
          mainLabel.qty,
          issueQty,
          'M',
          mainLabel.batchNo,
        ]
      );

      if (i <= 20) {
        const inkLabel = labelData.find((l: any) => l.materialCode?.startsWith('MAT-INK'));
        if (inkLabel) {
          await conn.execute(
            `INSERT INTO prd_material_issue_item (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              miId,
              inkMats[(i - 1) % inkMats.length]?.id,
              inkLabel.materialCode,
              inkLabel.materialName,
              inkLabel.qty,
              Math.round(inkLabel.qty * 0.5),
              'kg',
              inkLabel.batchNo,
            ]
          );
        }
      }
    }
    stats.prd_material_issue = 30;

    // ===== 8. 生产报工 (prd_work_report) =====
    const reportIds: number[] = [];
    for (let i = 1; i <= 30; i++) {
      const wo = woData[(i - 1) % woData.length];
      const reportDate = randomDate(yearStart, now);
      const planQty = Math.round(wo.qty * randomAmount(0.3, 1.0));
      const completedQty = Math.round(planQty * randomAmount(0.8, 1.0));
      const qualifiedQty = Math.round(completedQty * randomAmount(0.95, 1.0));
      const defectiveQty = completedQty - qualifiedQty;
      const scrapQty = Math.round(defectiveQty * randomAmount(0.1, 0.3));

      await conn.execute(
        `INSERT INTO prd_work_report (report_no, work_order_id, work_order_no, process_name, process_seq, equipment_id, operator_id, operator_name, plan_qty, completed_qty, qualified_qty, defective_qty, scrap_qty, start_time, end_time, work_hours, is_first_piece, first_piece_status, first_piece_inspector) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `WR-${pad(i, 5)}`,
          wo.id,
          wo.woNo,
          randomItem(['丝印', '模切', '分条', '覆膜', '品检']),
          randomInt(1, 5),
          null,
          prodUser.id,
          prodUser.real_name,
          planQty,
          completedQty,
          qualifiedQty,
          defectiveQty,
          scrapQty,
          `${reportDate} 08:00:00`,
          `${reportDate} 17:00:00`,
          randomAmount(7, 9),
          i % 5 === 0 ? 1 : 0,
          i % 5 === 0 ? 1 : null,
          i % 5 === 0 ? qcUser.real_name : null,
        ]
      );
      const [rptRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      reportIds.push(rptRow[0].id);
    }
    stats.prd_work_report = 30;

    // ===== 9. 成品入库 (inv_production_inbound + inv_production_inbound_item + prd_product_label) =====
    for (let i = 1; i <= 30; i++) {
      const wo = woData[(i - 1) % woData.length];
      const _card = cardData[(i - 1) % cardData.length];
      const inboundDate = randomDate(yearStart, now);
      const prodQty = Math.round(wo.qty * randomAmount(0.5, 1.0));
      const prodMat = productMats[(i - 1) % productMats.length];

      await conn.execute(
        `INSERT INTO inv_production_inbound (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, qc_status, status, operator_id, operator_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PI-${pad(i, 5)}`,
          wo.id,
          wo.woNo,
          finishedWh.id,
          inboundDate,
          1,
          2,
          whUser.id,
          whUser.real_name,
          whUser.id,
        ]
      );
      const [piRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const piId = piRow[0].id;

      const prodBatchNo = `PB${now.getFullYear()}${pad(i, 4)}`;
      await conn.execute(
        `INSERT INTO inv_production_inbound_item (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no, remaining_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          piId,
          prodMat?.id,
          prodMat?.material_code,
          prodMat?.material_name,
          prodQty,
          '张',
          prodBatchNo,
          prodQty,
        ]
      );

      const prodLabelNo = `PL-${pad(i, 5)}`;
      await conn.execute(
        `INSERT INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, print_count, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodLabelNo,
          wo.id,
          wo.woNo,
          prodMat?.id,
          prodMat?.material_code,
          prodMat?.material_name,
          prodQty,
          '张',
          prodBatchNo,
          1,
          1,
          1,
          whUser.id,
        ]
      );
    }
    stats.inv_production_inbound = 30;
    stats.prd_product_label = 30;

    // ===== 10. 质量追溯 (inv_trace_record + inv_trace_detail) =====
    for (let i = 1; i <= 30; i++) {
      const wo = woData[(i - 1) % woData.length];
      const card = cardData[(i - 1) % cardData.length];
      const mainLabel = labelData[(i - 1) % labelData.length];
      const traceDate = randomDate(yearStart, now);

      await conn.execute(
        `INSERT INTO inv_trace_record (trace_no, card_id, card_no, work_order_no, product_code, main_label_id, trace_type, operator_id, operator_name, trace_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TR-${pad(i, 5)}`,
          card.id,
          card.cardNo,
          wo.woNo,
          wo.productName.substring(0, 2) + '-' + pad(i, 3),
          mainLabel.id,
          1,
          qcUser.id,
          qcUser.real_name,
          `${traceDate} 10:00:00`,
        ]
      );
      const [trRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const trId = trRow[0].id;

      await conn.execute(
        `INSERT INTO inv_trace_detail (trace_id, label_id, label_no, material_code, material_name, specification, batch_no, supplier_name, receive_date, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          trId,
          mainLabel.id,
          mainLabel.labelNo,
          mainLabel.materialCode,
          mainLabel.materialName,
          mainMats[(i - 1) % mainMats.length]?.specification,
          mainLabel.batchNo,
          mainLabel.supplierName,
          mainLabel.receiveDate,
          1,
        ]
      );

      const inkLabel = labelData.find((l: any) => l.materialCode?.startsWith('MAT-INK'));
      if (inkLabel) {
        await conn.execute(
          `INSERT INTO inv_trace_detail (trace_id, label_id, label_no, material_code, material_name, specification, batch_no, supplier_name, receive_date, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            trId,
            inkLabel.id,
            inkLabel.labelNo,
            inkLabel.materialCode,
            inkLabel.materialName,
            inkMats[(i - 1) % inkMats.length]?.specification,
            inkLabel.batchNo,
            inkLabel.supplierName,
            inkLabel.receiveDate,
            2,
          ]
        );
      }
    }
    stats.inv_trace_record = 30;
    stats.inv_trace_detail = 60;

    // ===== 11. 库存更新 (inv_inventory) =====
    for (let i = 1; i <= Math.min(materials.length, 50); i++) {
      const mat = materials[(i - 1) % materials.length];
      const wh = warehouses[(i - 1) % warehouses.length];
      const qty = randomInt(100, 10000);
      await conn.execute(
        `INSERT INTO inv_inventory (material_id, material_name, warehouse_id, warehouse_name, quantity, available_qty, locked_qty, unit, unit_cost, total_cost, safety_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mat.id,
          mat.material_name,
          wh.id,
          wh.warehouse_code,
          qty,
          qty,
          0,
          mat.unit,
          mat.purchase_price,
          Math.round(qty * mat.purchase_price * 100) / 100,
          100,
        ]
      );
    }
    stats.inv_inventory = Math.min(materials.length, 50);

    return stats;
  });

  return successResponse(result, '核心业务流转数据初始化成功');
});
