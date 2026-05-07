import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

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

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const [deptRows]: any = await conn.execute('SELECT id, dept_code, dept_name FROM sys_department ORDER BY id');
    const deptMap: Record<string, number> = {};
    for (const row of deptRows) deptMap[row.dept_name] = row.id;

    const [roleRows]: any = await conn.execute('SELECT id, role_code, role_name FROM sys_role ORDER BY id');
    const roleMap: Record<string, number> = {};
    for (const row of roleRows) roleMap[row.role_code] = row.id;

    const [userRows]: any = await conn.execute('SELECT id, username, real_name, department_id FROM sys_user ORDER BY id');
    const usersByDept: Record<number, any[]> = {};
    for (const u of userRows) {
      if (!usersByDept[u.department_id]) usersByDept[u.department_id] = [];
      usersByDept[u.department_id].push(u);
    }

    const [catRows]: any = await conn.execute('SELECT id, code, name FROM sys_warehouse_category WHERE deleted = 0 ORDER BY id');
    const whCats: any[] = catRows;

    const [matCatRows]: any = await conn.execute('SELECT id, category_code, category_name, category_type FROM inv_material_category ORDER BY id');
    const matCats: any[] = matCatRows;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);

    // ===== 1. 仓库分类 - 额外5条 =====
    const extraWhCats = [
      { code: 'WH-CAT-011', name: '包材仓', description: '存放纸箱、木托盘、缠绕膜等包装材料', sort_order: 11 },
      { code: 'WH-CAT-012', name: '备件仓', description: '存放设备备件、模具配件、网框等维修备件', sort_order: 12 },
      { code: 'WH-CAT-013', name: '样品仓', description: '存放客户样品、色卡、材料样板等', sort_order: 13 },
      { code: 'WH-CAT-014', name: '暂存仓', description: '生产过程中临时存放待流转物料', sort_order: 14 },
      { code: 'WH-CAT-015', name: '外协仓', description: '存放外协加工发出的物料和收回的成品', sort_order: 15 },
    ];
    for (const cat of extraWhCats) {
      await conn.execute(
        `INSERT INTO sys_warehouse_category (code, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?)`,
        [cat.code, cat.name, cat.description, cat.sort_order, 1]
      );
    }
    stats.warehouse_category_added = 5;

    // ===== 2. 仓库 (inv_warehouse) - 200条 =====
    const whNames = ['原材料仓', '半成品仓', '成品仓', '辅料仓', '油墨仓', '危化品仓', '冷藏仓', '待检仓', '退货仓', '废品仓', '包材仓', '备件仓', '样品仓', '暂存仓', '外协仓'];
    const cities = ['东莞', '深圳', '广州', '佛山', '惠州', '中山', '珠海', '江门'];
    const whManagerId = userRows.find((u: any) => u.username === 'zhaolei')?.id || null;
    for (let i = 1; i <= 200; i++) {
      const catIdx = (i - 1) % whCats.length;
      const cat = whCats[catIdx];
      const city = randomItem(cities);
      const whType = (catIdx % 10) + 1;
      await conn.execute(
        `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, warehouse_type, province, city, address, manager_id, contact_phone, status, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`WH${pad(i, 4)}`, `${whNames[catIdx % whNames.length]}${i <= 15 ? '' : '-' + pad(i, 3)}`, whType, '广东省', city, `广东省${city}市工业园区${i}号`, whManagerId, `0769-${randomInt(22000000, 22999999)}`, i % 20 === 0 ? 0 : 1, null]
      );
    }
    stats.inv_warehouse = 200;

    const [whRows]: any = await conn.execute('SELECT id, warehouse_code FROM inv_warehouse ORDER BY id');
    const warehouses: any[] = whRows;

    // ===== 3. 物料 (inv_material) - 200条 =====
    const matTypes = [
      { prefix: 'PET', name: 'PET薄膜', unit: '张', cat_type: 1, specs: ['0.1mm×500mm', '0.125mm×600mm', '0.188mm×700mm', '0.25mm×800mm', '0.05mm×400mm'], price_range: [0.5, 5.0] },
      { prefix: 'PVC', name: 'PVC薄膜', unit: '张', cat_type: 1, specs: ['0.1mm×500mm', '0.15mm×600mm', '0.2mm×700mm'], price_range: [0.3, 3.5] },
      { prefix: 'INK', name: '丝印油墨', unit: 'kg', cat_type: 2, specs: ['溶剂型-黑色', '溶剂型-白色', 'UV-透明', 'UV-彩色', '导电银浆'], price_range: [50, 500] },
      { prefix: 'SOL', name: '溶剂', unit: 'L', cat_type: 2, specs: ['783慢干水', '719快干水', '洗网水', '开油水'], price_range: [15, 80] },
      { prefix: 'AUX', name: '辅助材料', unit: '个', cat_type: 3, specs: ['网框-铝合金', '网纱-77T', '刮胶-65度', '保护膜-50μm', '不干胶-透明'], price_range: [5, 200] },
      { prefix: 'LBL', name: '标签成品', unit: '张', cat_type: 4, specs: ['空调面板标签', '洗衣机面板标签', '冰箱贴标', '电子产品标签', '酒类防伪标'], price_range: [0.05, 2.0] },
    ];
    for (let i = 1; i <= 200; i++) {
      const mt = matTypes[(i - 1) % matTypes.length];
      const spec = mt.specs[(i - 1) % mt.specs.length];
      const catType = matCats.find(c => c.category_type === mt.cat_type);
      const wh = warehouses[(i - 1) % warehouses.length];
      const purchasePrice = randomAmount(mt.price_range[0], mt.price_range[1]);
      const salePrice = Math.round(purchasePrice * (1.3 + Math.random() * 0.7) * 100) / 100;
      const costPrice = Math.round(purchasePrice * (1.05 + Math.random() * 0.1) * 100) / 100;
      await conn.execute(
        `INSERT INTO inv_material (material_code, material_name, specification, category_id, material_type, unit, brand, safety_stock, max_stock, min_stock, purchase_price, sale_price, cost_price, warehouse_id, is_batch_managed, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`MAT-${mt.prefix}-${pad(i, 4)}`, `${mt.name}${pad(i, 3)}`, spec, catType?.id || null, mt.cat_type, mt.unit, randomItem(['3M', '杜邦', '东洋', '精工', '国产', '理光', '大日本', 'DIC']), randomInt(100, 1000), randomInt(5000, 50000), randomInt(50, 500), purchasePrice, salePrice, costPrice, wh.id, mt.cat_type <= 2 ? 1 : 0, 1]
      );
    }
    stats.inv_material = 200;

    const [matRows]: any = await conn.execute('SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price FROM inv_material ORDER BY id');
    const materials: any[] = matRows;

    // ===== 4. 客户 (crm_customer) - 业务部 200条 =====
    const industries = ['家电制造', '电子产品', '汽车配件', '食品饮料', '日化用品', '医药保健', '物流快递', '商超零售', '通信设备', '新能源'];
    const provinces = ['广东', '江苏', '浙江', '上海', '北京', '山东', '福建', '四川', '湖北', '安徽'];
    const citiesByProv: Record<string, string[]> = {
      '广东': ['深圳', '广州', '东莞', '佛山', '惠州'], '江苏': ['南京', '苏州', '无锡', '常州', '昆山'],
      '浙江': ['杭州', '宁波', '温州', '绍兴', '嘉兴'], '上海': ['浦东', '闵行', '松江', '嘉定'],
      '北京': ['朝阳', '海淀', '大兴', '顺义'], '山东': ['青岛', '济南', '烟台', '潍坊'],
      '福建': ['厦门', '福州', '泉州', '漳州'], '四川': ['成都', '绵阳', '德阳'],
      '湖北': ['武汉', '宜昌', '襄阳'], '安徽': ['合肥', '芜湖', '蚌埠'],
    };
    const creditLevels = ['AAA', 'AA', 'A', 'BBB', 'BB'];
    const scales = ['大型', '中型', '小型', '微型'];
    const bizUserId = userRows.find((u: any) => u.username === 'zhangwei')?.id || userRows.find((u: any) => u.username === 'lina')?.id || null;
    const customerIds: number[] = [];
    for (let i = 1; i <= 200; i++) {
      const prov = provinces[(i - 1) % provinces.length];
      const city = randomItem(citiesByProv[prov] || ['未知']);
      const industry = industries[(i - 1) % industries.length];
      const scale = randomItem(scales);
      const credit = randomItem(creditLevels);
      const salesmanId = i <= 100 ? bizUserId : userRows.find((u: any) => u.username === 'lina')?.id || bizUserId;
      await conn.execute(
        `INSERT INTO crm_customer (customer_code, customer_name, short_name, customer_type, industry, scale, credit_level, province, city, address, contact_name, contact_phone, contact_email, tax_number, bank_name, bank_account, salesman_id, follow_up_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`CUS-${pad(i, 5)}`, `${city}${industry}有限公司`, `${city}${industry.substring(0, 2)}`, (i % 3) + 1, industry, scale, credit, prov, city, `${prov}省${city}市工业区${i}号`, `联系人${i}`, `1${randomInt(3000000000, 3999999999)}`, `contact${i}@example.com`, `91440100MA5C${pad(i, 6)}`, randomItem(['工商银行', '建设银行', '农业银行', '中国银行', '招商银行']), `6222${String(randomInt(1000000000000, 9999999999999))}`, salesmanId, (i % 5) + 1, i % 15 === 0 ? 0 : 1]
      );
      const [cusRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      customerIds.push(cusRow[0].id);
    }
    stats.crm_customer = 200;

    // ===== 5. 销售订单 (sal_order) + 订单明细 - 业务部 200条 =====
    const paymentTerms = ['货到付款', '月结30天', '月结60天', '月结90天', '预付款50%'];
    const orderStatuses = [1, 2, 3, 4, 5];
    for (let i = 1; i <= 200; i++) {
      const customerId = customerIds[(i - 1) % customerIds.length];
      const orderDate = randomDate(yearStart, now);
      const deliveryDate = new Date(new Date(orderDate).getTime() + randomInt(7, 60) * 86400000).toISOString().slice(0, 10);
      const salesmanId = i <= 100 ? bizUserId : userRows.find((u: any) => u.username === 'lina')?.id || bizUserId;
      const itemQty = randomInt(1, 5);
      let totalAmount = 0;
      let taxAmount = 0;
      const items: any[] = [];
      for (let j = 0; j < itemQty; j++) {
        const mat = materials[(i + j) % materials.length];
        const qty = randomInt(500, 50000);
        const unitPrice = mat.sale_price || randomAmount(0.1, 10);
        const amount = Math.round(qty * unitPrice * 100) / 100;
        const taxRate = 13;
        const tax = Math.round(amount * taxRate / 100 * 100) / 100;
        const total = Math.round((amount + tax) * 100) / 100;
        totalAmount += amount;
        taxAmount += tax;
        items.push({ mat, qty, unitPrice, amount, taxRate, tax, total, deliveryDate });
      }
      const totalWithTax = Math.round((totalAmount + taxAmount) * 100) / 100;
      const discount = i % 10 === 0 ? Math.round(totalWithTax * 0.02 * 100) / 100 : 0;
      const status = randomItem(orderStatuses);
      await conn.execute(
        `INSERT INTO sal_order (order_no, order_date, customer_id, contact_name, contact_phone, delivery_address, salesman_id, total_amount, tax_amount, total_with_tax, discount_amount, currency, payment_terms, delivery_date, contract_no, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`ORD-${pad(i, 5)}`, orderDate, customerId, `联系人${(i - 1) % 200 + 1}`, `1${randomInt(3000000000, 3999999999)}`, `收货地址${i}`, salesmanId, totalAmount, taxAmount, totalWithTax, discount, 'CNY', randomItem(paymentTerms), deliveryDate, `CT-${now.getFullYear()}-${pad(i, 4)}`, status]
      );
      const [orderRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const orderId = orderRow[0].id;
      for (const item of items) {
        const deliveredQty = status >= 3 ? Math.round(item.qty * (0.5 + Math.random() * 0.5)) : 0;
        await conn.execute(
          `INSERT INTO sal_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, delivered_qty, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.mat.id, item.qty, item.mat.unit, item.unitPrice, item.taxRate, item.amount, item.tax, item.total, deliveredQty, item.deliveryDate]
        );
      }
    }
    stats.sal_order = 200;

    // ===== 6. 供应商 (pur_supplier) - 采购部 200条 =====
    const supplierTypes = ['原材料', '油墨', '设备', '辅料', '包材'];
    const settlementMethods = ['月结30天', '月结60天', '月结90天', '货到付款', '预付款'];
    const supplierIds: number[] = [];
    for (let i = 1; i <= 200; i++) {
      const prov = provinces[(i - 1) % provinces.length];
      const city = randomItem(citiesByProv[prov] || ['未知']);
      const sType = supplierTypes[(i - 1) % supplierTypes.length];
      await conn.execute(
        `INSERT INTO pur_supplier (supplier_code, supplier_name, short_name, supplier_type, province, city, address, contact_name, contact_phone, contact_email, tax_number, bank_name, bank_account, credit_level, cooperation_status, settlement_method, payment_terms, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`SUP-${pad(i, 5)}`, `${city}${sType}供应商有限公司`, `${city}${sType.substring(0, 2)}`, (i % 3) + 1, prov, city, `${prov}省${city}市供应商路${i}号`, `供应商联系人${i}`, `1${randomInt(3800000000, 3999999999)}`, `supplier${i}@example.com`, `91440100MA5D${pad(i, 6)}`, randomItem(['工商银行', '建设银行', '农业银行', '中国银行']), `6228${String(randomInt(1000000000000, 9999999999999))}`, randomItem(creditLevels), i % 20 === 0 ? 0 : 1, randomItem(settlementMethods), randomItem(paymentTerms), i % 15 === 0 ? 0 : 1]
      );
      const [supRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      supplierIds.push(supRow[0].id);
    }
    stats.pur_supplier = 200;

    // ===== 7. 采购订单 (pur_order) + 明细 - 采购部 200条 =====
    for (let i = 1; i <= 200; i++) {
      const supplierId = supplierIds[(i - 1) % supplierIds.length];
      const orderDate = randomDate(yearStart, now);
      const deliveryDate = new Date(new Date(orderDate).getTime() + randomInt(5, 30) * 86400000).toISOString().slice(0, 10);
      const itemQty = randomInt(1, 4);
      let totalAmount = 0;
      let taxAmount = 0;
      const purItems: any[] = [];
      for (let j = 0; j < itemQty; j++) {
        const mat = materials[(i + j) % materials.length];
        const qty = randomInt(100, 20000);
        const unitPrice = mat.purchase_price || randomAmount(0.5, 50);
        const amount = Math.round(qty * unitPrice * 100) / 100;
        const taxRate = 13;
        const tax = Math.round(amount * taxRate / 100 * 100) / 100;
        const total = Math.round((amount + tax) * 100) / 100;
        totalAmount += amount;
        taxAmount += tax;
        purItems.push({ mat, qty, unitPrice, amount, taxRate, tax, total, deliveryDate });
      }
      const totalWithTax = Math.round((totalAmount + taxAmount) * 100) / 100;
      const status = randomItem([1, 2, 3, 4, 5]);
      await conn.execute(
        `INSERT INTO pur_order (order_no, order_date, supplier_id, contact_name, contact_phone, delivery_address, total_amount, tax_amount, total_with_tax, currency, payment_terms, delivery_date, settlement_method, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`PO-${pad(i, 5)}`, orderDate, supplierId, `供应商联系人${(i - 1) % 200 + 1}`, `1${randomInt(3800000000, 3999999999)}`, `供应商地址${i}`, totalAmount, taxAmount, totalWithTax, 'CNY', randomItem(paymentTerms), deliveryDate, randomItem(settlementMethods), status]
      );
      const [poRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const poId = poRow[0].id;
      for (const item of purItems) {
        const receivedQty = status >= 3 ? Math.round(item.qty * (0.3 + Math.random() * 0.7)) : 0;
        await conn.execute(
          `INSERT INTO pur_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount, received_qty, delivery_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [poId, item.mat.id, item.qty, item.mat.unit, item.unitPrice, item.taxRate, item.amount, item.tax, item.total, receivedQty, item.deliveryDate]
        );
      }
    }
    stats.pur_order = 200;

    // ===== 8. 生产工单 (prod_work_order) - 生产部 200条 =====
    const [salOrderRows]: any = await conn.execute('SELECT id, order_no, customer_id FROM sal_order ORDER BY id LIMIT 200');
    const woStatuses = ['pending', 'confirmed', 'preparing', 'producing', 'completed', 'cancelled', 'paused'];
    const woPriorities = ['urgent', 'high', 'normal', 'low'];
    const productNames = ['空调面板标签', '洗衣机面板标签', '冰箱贴标', '电子产品标签', '酒类防伪标', '食品包装标签', '日化用品标签', '药品标签', '物流快递面单', '商超价签'];
    const units = ['张', '卷', '个', '片'];
    for (let i = 1; i <= 200; i++) {
      const salOrder = salOrderRows[(i - 1) % salOrderRows.length] || null;
      const [custRow]: any = salOrder ? await conn.execute('SELECT customer_name FROM crm_customer WHERE id = ?', [salOrder.customer_id]) : [[]];
      const customerName = custRow[0]?.customer_name || `客户${i}`;
      const productName = productNames[(i - 1) % productNames.length];
      const quantity = randomInt(1000, 100000);
      const planStart = randomDate(yearStart, now);
      const planEnd = new Date(new Date(planStart).getTime() + randomInt(3, 30) * 86400000).toISOString().slice(0, 10);
      const status = randomItem(woStatuses);
      const actualStart = ['confirmed', 'preparing', 'producing', 'completed'].includes(status) ? planStart : null;
      const actualEnd = status === 'completed' ? new Date(new Date(actualStart || planStart).getTime() + randomInt(2, 25) * 86400000).toISOString().slice(0, 10) : null;
      await conn.execute(
        `INSERT INTO prod_work_order (work_order_no, order_id, order_no, customer_name, product_name, quantity, unit, status, priority, plan_start_date, plan_end_date, actual_start_date, actual_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`WO-${pad(i, 5)}`, salOrder?.id || null, salOrder?.order_no || null, customerName, productName, quantity, randomItem(units), status, randomItem(woPriorities), planStart, planEnd, actualStart, actualEnd]
      );
    }
    stats.prod_work_order = 200;

    // ===== 9. 入库单 (inv_inbound_order) + 明细 - 仓库管理 200条 =====
    const [poRows]: any = await conn.execute('SELECT id, order_no, supplier_id FROM pur_order ORDER BY id LIMIT 200');
    const inboundStatuses = ['draft', 'pending', 'approved', 'completed', 'cancelled'];
    for (let i = 1; i <= 200; i++) {
      const po = poRows[(i - 1) % poRows.length] || null;
      const [supRow]: any = po?.supplier_id ? await conn.execute('SELECT id, supplier_name FROM pur_supplier WHERE id = ?', [po.supplier_id]) : [[]];
      const supplierName = supRow[0]?.supplier_name || null;
      const wh = warehouses[(i - 1) % warehouses.length];
      const orderDate = randomDate(yearStart, now);
      const status = randomItem(inboundStatuses);
      const itemQty = randomInt(1, 3);
      let totalAmount = 0;
      let totalQuantity = 0;
      const inbItems: any[] = [];
      for (let j = 0; j < itemQty; j++) {
        const mat = materials[(i + j) % materials.length];
        const qty = randomInt(100, 10000);
        const unitPrice = mat.purchase_price || randomAmount(0.5, 50);
        const totalPrice = Math.round(qty * unitPrice * 100) / 100;
        totalAmount += totalPrice;
        totalQuantity += qty;
        inbItems.push({ mat, qty, unitPrice, totalPrice });
      }
      await conn.execute(
        `INSERT INTO inv_inbound_order (order_no, order_type, warehouse_id, supplier_id, supplier_name, po_id, po_no, grn_type, total_amount, total_quantity, status, inbound_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`INB-${pad(i, 5)}`, i % 5 === 0 ? 'return' : 'purchase', wh.id, po?.supplier_id || null, supplierName, po?.id || null, po?.order_no || null, i % 5 === 0 ? 'return' : 'po', totalAmount, totalQuantity, status, orderDate]
      );
      const [inbRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const inbId = inbRow[0].id;
      for (const item of inbItems) {
        await conn.execute(
          `INSERT INTO inv_inbound_item (order_id, material_id, material_name, material_spec, batch_no, quantity, unit, unit_price, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [inbId, item.mat.id, item.mat.material_name, item.mat.specification, `B${now.getFullYear()}${pad(i, 4)}-${pad(Math.floor(Math.random() * 100), 3)}`, item.qty, item.mat.unit, item.unitPrice, item.totalPrice]
        );
      }
    }
    stats.inv_inbound_order = 200;

    // ===== 10. 出库单 (inv_outbound_order) + 明细 - 仓库管理 200条 =====
    const outboundStatuses = ['draft', 'pending', 'completed', 'cancelled'];
    const outboundTypes = ['sale', 'production', 'transfer'];
    for (let i = 1; i <= 200; i++) {
      const wh = warehouses[(i - 1) % warehouses.length];
      const orderDate = randomDate(yearStart, now);
      const status = randomItem(outboundStatuses);
      const itemQty = randomInt(1, 3);
      let totalQty = 0;
      let totalAmount = 0;
      const outItems: any[] = [];
      for (let j = 0; j < itemQty; j++) {
        const mat = materials[(i + j) % materials.length];
        const qty = randomInt(50, 5000);
        const unitPrice = mat.sale_price || randomAmount(0.1, 10);
        const amount = Math.round(qty * unitPrice * 100) / 100;
        totalQty += qty;
        totalAmount += amount;
        outItems.push({ mat, qty, unitPrice, amount });
      }
      await conn.execute(
        `INSERT INTO inv_outbound_order (order_no, order_date, outbound_type, warehouse_id, warehouse_code, warehouse_name, total_qty, total_amount, status, operator_name, audit_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`OTB-${pad(i, 5)}`, orderDate, randomItem(outboundTypes), wh.id, wh.warehouse_code, `仓库${i}`, totalQty, totalAmount, status, randomItem(['陈明', '赵磊']), status === 'completed' ? 'approved' : 'pending']
      );
      const [otbRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      const otbId = otbRow[0].id;
      for (const item of outItems) {
        await conn.execute(
          `INSERT INTO inv_outbound_item (order_id, material_id, material_name, material_spec, quantity, unit, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [otbId, item.mat.id, item.mat.material_name, item.mat.specification, item.qty, item.mat.unit, item.unitPrice, item.amount]
        );
      }
    }
    stats.inv_outbound_order = 200;

    // ===== 11. 来料检验 (qc_incoming_inspection) - 品质部 200条 =====
    const inspectionTypes = [1, 2, 3];
    const inspectionResults = [0, 1, 2, 3];
    const qcUserId = userRows.find((u: any) => u.username === 'zhoujie')?.id || null;
    for (let i = 1; i <= 200; i++) {
      const mat = materials[(i - 1) % materials.length];
      const supId = supplierIds[(i - 1) % supplierIds.length];
      const [supNameRow]: any = await conn.execute('SELECT supplier_name FROM pur_supplier WHERE id = ?', [supId]);
      const supName = supNameRow[0]?.supplier_name || `供应商${i}`;
      const inspDate = randomDate(yearStart, now);
      const qty = randomInt(100, 50000);
      const result = randomItem(inspectionResults);
      const qualifiedQty = result === 1 ? qty : Math.round(qty * (0.7 + Math.random() * 0.25));
      const unqualifiedQty = qty - qualifiedQty;
      await conn.execute(
        `INSERT INTO qc_incoming_inspection (inspection_no, inspection_date, supplier_id, supplier_name, material_id, material_code, material_name, specification, batch_no, quantity, unit, inspection_type, inspection_result, qualified_qty, unqualified_qty, inspector_id, inspector_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`QC-IN-${pad(i, 5)}`, inspDate, supId, supName, mat.id, mat.material_code, mat.material_name, mat.specification, `B${now.getFullYear()}${pad(i, 4)}`, qty, mat.unit, randomItem(inspectionTypes), result, qualifiedQty, unqualifiedQty, qcUserId, '周杰']
      );
    }
    stats.qc_incoming_inspection = 200;

    // ===== 12. 设备 (eqp_equipment) - 工程技术部 200条 =====
    const eqpTypes = [1, 2, 3, 4, 5];
    const eqpTypeNames: Record<number, { prefix: string; names: string[]; brands: string[] }> = {
      1: { prefix: 'SMP', names: ['半自动丝印机', '全自动丝印机', '曲面丝印机'], brands: ['东远', '永创', '精工'] },
      2: { prefix: 'DIE', names: ['平压平模切机', '圆压圆模切机', '激光模切机'], brands: ['海德堡', '博斯特', '亚华'] },
      3: { prefix: 'DRY', names: ['UV固化机', 'IR红外干燥机', '热风干燥机'], brands: ['东远', '永创', '国产'] },
      4: { prefix: 'INS', names: ['品检机', '色差仪', '厚度仪'], brands: ['爱色丽', '三恩驰', '国产'] },
      5: { prefix: 'AUX', names: ['覆膜机', '分条机', '复卷机', '切纸机'], brands: ['海德堡', '博斯特', '国产'] },
    };
    const workshops = ['模切车间', '商标车间', '丝印车间', '检验车间'];
    for (let i = 1; i <= 200; i++) {
      const eqpType = eqpTypes[(i - 1) % eqpTypes.length];
      const info = eqpTypeNames[eqpType];
      const eqpName = info.names[(i - 1) % info.names.length];
      const brand = randomItem(info.brands);
      const purchaseDate = randomDate(new Date(2018, 0, 1), now);
      const warrantyExpire = new Date(new Date(purchaseDate).getTime() + randomInt(365, 1825) * 86400000).toISOString().slice(0, 10);
      const status = i % 20 === 0 ? 0 : 1;
      const currentStatus = status === 0 ? 3 : randomItem([1, 1, 1, 2]);
      const oee = randomAmount(60, 95);
      const availability = randomAmount(85, 99);
      const performance = randomAmount(75, 98);
      const qualityRate = randomAmount(90, 99.9);
      const totalRunHours = randomInt(1000, 50000);
      const lastMaint = randomDate(new Date(2025, 0, 1), now);
      const nextMaint = new Date(new Date(lastMaint).getTime() + randomInt(30, 180) * 86400000).toISOString().slice(0, 10);
      const workshopId = deptMap['模切车间'] || deptMap['生产部'] || null;
      await conn.execute(
        `INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, serial_no, workshop_id, location, purchase_date, manufacturer, warranty_expire, rated_capacity, current_status, oee, availability, performance, quality_rate, total_run_hours, last_maintenance_date, next_maintenance_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`EQP-${info.prefix}-${pad(i, 4)}`, eqpName, eqpType, brand, `MODEL-${pad(i, 3)}`, `SN-${pad(i, 6)}`, workshopId, randomItem(workshops), purchaseDate, `${brand}制造有限公司`, warrantyExpire, randomInt(500, 5000), currentStatus, oee, availability, performance, qualityRate, totalRunHours, lastMaint, nextMaint, status]
      );
    }
    stats.eqp_equipment = 200;

    // ===== 13. 应收款 (fin_receivable) - 财务管理 200条 =====
    const [salOrderForFin]: any = await conn.execute('SELECT id, order_no, customer_id, total_with_tax FROM sal_order ORDER BY id LIMIT 200');
    for (let i = 1; i <= 200; i++) {
      const salOrd = salOrderForFin[(i - 1) % salOrderForFin.length] || null;
      const amount = salOrd?.total_with_tax || randomAmount(5000, 500000);
      const receivedPct = randomItem([0, 0.3, 0.5, 0.7, 1.0]);
      const receivedAmount = Math.round(amount * receivedPct * 100) / 100;
      const balance = Math.round((amount - receivedAmount) * 100) / 100;
      const dueDate = new Date(now.getTime() + randomInt(-60, 90) * 86400000).toISOString().slice(0, 10);
      const status = balance === 0 ? 3 : (new Date(dueDate) < now ? 2 : 1);
      await conn.execute(
        `INSERT INTO fin_receivable (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`REC-${pad(i, 5)}`, 1, salOrd?.order_no || `ORD-${pad(i, 5)}`, salOrd?.customer_id || customerIds[(i - 1) % customerIds.length], amount, receivedAmount, balance, dueDate, status]
      );
    }
    stats.fin_receivable = 200;

    // ===== 14. 应付款 (fin_payable) - 财务管理 200条 =====
    const [poForFin]: any = await conn.execute('SELECT id, order_no, supplier_id, total_with_tax FROM pur_order ORDER BY id LIMIT 200');
    for (let i = 1; i <= 200; i++) {
      const po = poForFin[(i - 1) % poForFin.length] || null;
      const amount = po?.total_with_tax || randomAmount(3000, 300000);
      const paidPct = randomItem([0, 0.3, 0.5, 0.8, 1.0]);
      const paidAmount = Math.round(amount * paidPct * 100) / 100;
      const balance = Math.round((amount - paidAmount) * 100) / 100;
      const dueDate = new Date(now.getTime() + randomInt(-30, 120) * 86400000).toISOString().slice(0, 10);
      const status = balance === 0 ? 3 : (new Date(dueDate) < now ? 2 : 1);
      await conn.execute(
        `INSERT INTO fin_payable (payable_no, source_type, source_no, supplier_id, amount, paid_amount, balance, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`PAY-${pad(i, 5)}`, 1, po?.order_no || `PO-${pad(i, 5)}`, po?.supplier_id || supplierIds[(i - 1) % supplierIds.length], amount, paidAmount, balance, dueDate, status]
      );
    }
    stats.fin_payable = 200;

    // ===== 15. 培训 (hr_training) - 人事行政部 200条 =====
    const trainingTypes = [1, 2, 3, 4];
    const trainingNames = ['新员工入职培训', '安全生产培训', 'ERP系统操作培训', '品质标准培训', '丝印工艺培训', '5S管理培训', '消防安全培训', '设备操作培训', '化学品安全培训', '团队建设培训', '管理技能培训', '成本控制培训', '客户服务培训', '精益生产培训', 'ISO质量体系培训'];
    const trainers = ['张伟', '刘洋', '王强', '周杰', '赵磊', '吴芳', '外部讲师'];
    const places = ['公司培训室A', '公司培训室B', '生产车间', '会议室1', '会议室2', '线上培训'];
    for (let i = 1; i <= 200; i++) {
      const trainingDate = randomDate(yearStart, now);
      const hours = randomItem([2, 4, 6, 8, 16, 24, 32]);
      await conn.execute(
        `INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`TRN-${pad(i, 5)}`, `${trainingNames[(i - 1) % trainingNames.length]}第${Math.ceil(i / 15)}期`, trainingTypes[(i - 1) % trainingTypes.length], trainingDate, hours, randomItem(trainers), `${trainingNames[(i - 1) % trainingNames.length]}内容，涵盖理论讲解和实操演练`, randomItem(places), i % 10 === 0 ? 0 : 1]
      );
    }
    stats.hr_training = 200;

    return stats;
  });

  return successResponse(result, '业务数据初始化成功');
});
