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

export const POST = withPermission(async (request: NextRequest, userInfo) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const deleteTables = [
      'bom_line',
      'bom_material',
      'sal_delivery_detail',
      'sal_return_detail',
      'sal_reconciliation_writeoff',
      'sal_reconciliation_line',
      'prd_material_return_item',
      'inv_transfer_item',
      'inv_stocktaking_item',
      'inv_stock_adjust_item',
      'inv_sales_outbound_item',
      'pur_purchase_order_line',
      'pur_request_item',
      'hr_training_participant',
      'qc_unqualified_handle',
      'qc_unqualified',
      'qc_final_inspection',
      'bom_header',
      'plm_product_lifecycle',
      'plm_eco',
      'qms_lab_test',
      'mdm_product',
      'ink_mixed_record',
      'ink_formula',
      'ink_opening_record',
      'prd_die',
      'prd_die_template',
      'sal_delivery',
      'sal_return',
      'sal_reconciliation',
      'prd_material_return',
      'inv_transfer_order',
      'inv_stocktaking',
      'inv_stock_adjust',
      'inv_sales_outbound',
      'pur_purchase_order',
      'pur_request',
      'sample_order',
      'crm_follow_record',
      'crm_customer_analysis',
      'eqp_maintenance_record',
      'eqp_repair',
      'eqp_calibration',
      'eqp_scrap',
      'qms_complaint',
      'qms_supplier_audit',
      'qrcode_record',
      'fin_receivable',
      'fin_cost_record',
      'hr_training',
    ];

    for (const table of deleteTables) {
      try {
        await conn.execute(`DELETE FROM ${table}`);
      } catch (e: any) {}
    }

    await conn.execute('SET FOREIGN_KEY_CHECKS=0');

    const [custRows]: any = await conn.execute(
      'SELECT id, customer_code, customer_name FROM crm_customer ORDER BY id'
    );
    const customers: any[] = custRows;

    const [suppRows]: any = await conn.execute(
      'SELECT id, supplier_code, supplier_name FROM pur_supplier ORDER BY id'
    );
    const suppliers: any[] = suppRows;

    const [matRows]: any = await conn.execute(
      'SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price FROM inv_material ORDER BY id'
    );
    const materials: any[] = matRows;

    const [whRows]: any = await conn.execute(
      'SELECT id, warehouse_code, warehouse_name FROM inv_warehouse ORDER BY id'
    );
    const warehouses: any[] = whRows;

    const [woRows]: any = await conn.execute(
      'SELECT id, work_order_no FROM prod_work_order ORDER BY id'
    );
    const workOrders: any[] = woRows;

    const [soRows]: any = await conn.execute(
      'SELECT id, order_no, customer_id FROM sal_order ORDER BY id'
    );
    const salesOrders: any[] = soRows;

    const [eqpRows]: any = await conn.execute(
      'SELECT id, equipment_code, equipment_name FROM eqp_equipment ORDER BY id'
    );
    let equipment: any[] = eqpRows;
    if (equipment.length === 0) {
      const eqpTypes = [
        { code: 'SMP', name: '半自动丝印机' },
        { code: 'SMP', name: '全自动丝印机' },
        { code: 'DIE', name: '平压平模切机' },
        { code: 'DRY', name: 'UV固化机' },
        { code: 'INS', name: '品检机' },
        { code: 'AUX', name: '覆膜机' },
      ];
      for (let i = 1; i <= 20; i++) {
        const et = eqpTypes[(i - 1) % eqpTypes.length];
        await conn.execute(
          `INSERT INTO eqp_equipment (equipment_code, equipment_name, equipment_type, brand, model, serial_no, workshop_id, location, purchase_date, manufacturer, warranty_expire, rated_capacity, current_status, oee, availability, performance, quality_rate, total_run_hours, last_maintenance_date, next_maintenance_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `EQP-${et.code}-${String(i).padStart(4, '0')}`,
            et.name,
            (i % 5) + 1,
            randomItem(['东远', '永创', '精工']),
            `MODEL-${String(i).padStart(3, '0')}`,
            `SN-${String(i).padStart(6, '0')}`,
            null,
            randomItem(['丝印车间', '模切车间', '品检车间']),
            randomDate(new Date(2019, 0, 1), new Date()),
            `${randomItem(['东远', '永创'])}制造`,
            randomDate(new Date(), new Date(2028, 11, 31)),
            randomInt(500, 5000),
            1,
            randomAmount(60, 95),
            randomAmount(85, 99),
            randomAmount(75, 98),
            randomAmount(90, 99.9),
            randomInt(1000, 50000),
            randomDate(new Date(2025, 0, 1), new Date()),
            randomDate(new Date(), new Date(2027, 11, 31)),
            1,
          ]
        );
      }
      const [newEqpRows]: any = await conn.execute(
        'SELECT id, equipment_code, equipment_name FROM eqp_equipment ORDER BY id'
      );
      equipment = newEqpRows;
    }

    const [userRows]: any = await conn.execute(
      'SELECT id, username, real_name FROM sys_user ORDER BY id'
    );
    const users: any[] = userRows;

    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const defaultUserId = users.length > 0 ? users[0].id : 1;
    const defaultUserName = users.length > 0 ? users[0].real_name : '系统管理员';

    if (customers.length === 0 || materials.length === 0 || warehouses.length === 0) {
      throw new Error('基础数据不足，请先初始化客户、物料和仓库数据');
    }

    const productNames = [
      '空调控制面板标签',
      '洗衣机控制面板',
      '手机电池标签',
      '新能源电池标签',
      '医疗设备面板',
      '工业设备铭牌',
      '电子元器件标签',
      '电池防伪标签',
      '汽车仪表盘面板',
      '智能家居面板',
      '冰箱温控面板',
      '微波炉控制面板',
      '电视背光模组标签',
      '笔记本电脑铭牌',
      '无人机操控面板',
      '充电桩标识标签',
      '安防设备面板',
      '电动工具铭牌',
      '智能手表表盘',
      '蓝牙耳机标签',
    ];
    const productSpecs = [
      '120×80mm',
      '180×100mm',
      '50×30mm',
      '150×80mm',
      '200×150mm',
      '100×60mm',
      '40×20mm',
      '80×50mm',
      '250×120mm',
      '150×100mm',
      '160×90mm',
      '200×80mm',
      '300×200mm',
      '80×40mm',
      '120×60mm',
      '200×150mm',
      '100×80mm',
      '60×40mm',
      '45×45mm',
      '30×15mm',
    ];
    const productUnits = [
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '张',
      '片',
      '张',
    ];
    const categoryNames = ['丝印标签', '丝印面板', '丝印铭牌', '导电线路', '防伪标签'];
    const shortNames = [
      '空调面板',
      '洗衣机面板',
      '手机电池标',
      '电池标签',
      '医疗面板',
      '工业铭牌',
      '元器件标',
      '防伪标',
      '仪表盘',
      '智能面板',
      '冰箱面板',
      '微波炉面板',
      '电视标签',
      '笔记本铭牌',
      '无人机面板',
      '充电桩标',
      '安防面板',
      '工具铭牌',
      '手表表盘',
      '耳机标',
    ];

    const productIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      await conn.execute(
        `INSERT INTO mdm_product (product_code, product_name, short_name, specification, unit, category_id, category_name, customer_id, customer_name, bom_version, description, status, cost_price, sale_price, safety_stock, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PRD-${pad(i + 1, 5)}`,
          productNames[i],
          shortNames[i],
          productSpecs[i],
          productUnits[i],
          (i % 5) + 1,
          categoryNames[i % 5],
          cust.id,
          cust.customer_name,
          `V${(i % 3) + 1}.0`,
          `${productNames[i]}，丝印产品`,
          randomItem(['active', 'active', 'active', 'inactive']),
          randomAmount(0.5, 15),
          randomAmount(1, 30),
          randomInt(500, 5000),
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      productIds.push(idRow[0].id);
    }
    stats.mdm_product = 20;

    const sampleTypes = ['新样', '返样', '修改样', '确认样'];
    const printMethods = ['丝印', '移印', '烫印', '丝印+模切', 'UV丝印'];
    const colorSequences = ['单色', '双色', '三色', '四色', '专色+四色'];
    const progressStatuses = ['待接单', '制版中', '印刷中', '待确认', '已完成'];
    const sampleReasons = ['客户新品开发', '产品改版', '材料更换', '工艺优化', '客户确认样'];
    const trackers = ['张跟单', '李跟单', '王跟单', '赵跟单', '刘跟单'];
    const providedMaterials = ['客户供版', '客户供墨', '客户供料', '自备', '部分客供'];
    const mylarInfos = ['Mylar 0.125mm', 'Mylar 0.175mm', 'Mylar 0.25mm', '无Mylar', 'Mylar 0.1mm'];
    const sampleStocks = ['A区货架', 'B区货架', '样品柜', '客户取回', '已寄出'];
    const customerConfirms = ['待确认', '已确认OK', '确认需修改', '确认不OK', '已签回'];

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const orderDate = randomDate(yearStart, now);
      const orderMonth =
        parseInt(orderDate.substring(0, 4)) * 100 + parseInt(orderDate.substring(5, 7));
      const requiredDate = new Date(new Date(orderDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO sample_order (sample_no, order_month, order_date, sample_type, customer_name, print_method, color_sequence, product_name, material_code, size_spec, material_desc, sample_order_no, required_date, progress_status, is_confirmed, is_urgent, is_produce_together, quantity, progress_detail, sample_count, sample_reason, order_tracker, provided_material, receive_time, mylar_info, sample_stock, customer_confirm, remark, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SMP-2026-${pad(i + 1, 5)}`,
          orderMonth,
          orderDate,
          randomItem(sampleTypes),
          cust.customer_name,
          randomItem(printMethods),
          randomItem(colorSequences),
          productNames[i] + '(打样)',
          mat.material_code,
          productSpecs[i],
          mat.material_name,
          `SO-SMP-${pad(i + 1, 5)}`,
          requiredDate,
          randomItem(progressStatuses),
          randomItem([0, 1]),
          randomItem([0, 1, 0]),
          randomItem([0, 1, 0]),
          randomInt(10, 100),
          `制版→印刷→质检→寄样`,
          randomInt(1, 5),
          randomItem(sampleReasons),
          randomItem(trackers),
          randomItem(providedMaterials),
          `${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`,
          randomItem(mylarInfos),
          randomItem(sampleStocks),
          randomItem(customerConfirms),
          `${productNames[i]}打样需求，需首件确认`,
          randomInt(0, 3),
        ]
      );
    }
    stats.sample_order = 20;

    const followTypes = ['visit', 'phone', 'email', 'wechat'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const user = users[i % users.length];
      const nextDate = new Date(now.getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cust.id,
          cust.customer_name,
          randomItem(followTypes),
          `跟进客户${cust.customer_name}，沟通丝印标签订单需求及交期安排`,
          `联系人${i + 1}`,
          user.real_name,
          nextDate,
          randomItem(['新品开发机会', '批量订单机会', '长期合作意向', '样品确认中']),
          randomItem([1, 2]),
          `客户反馈良好，需持续跟进`,
          defaultUserId,
        ]
      );
    }
    stats.crm_follow_record = 20;

    const analysisPeriods = ['2026-Q1', '2026-Q2', '2025-Q4', '2025-Q3', '2026-Q1'];
    const customerLevels = ['A', 'B', 'C', 'D'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const period = randomItem(analysisPeriods);
      const periodYear = parseInt(period.substring(0, 4));
      const periodQ = parseInt(period.substring(6));
      const pStart = `${periodYear}-${String((periodQ - 1) * 3 + 1).padStart(2, '0')}-01`;
      const pEndMonth = periodQ * 3;
      const pEnd = `${periodYear}-${String(pEndMonth).padStart(2, '0')}-${pEndMonth === 2 ? 28 : 30}`;
      await conn.execute(
        `INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cust.id,
          cust.customer_name,
          period,
          pStart,
          pEnd,
          randomInt(5, 50),
          randomAmount(50000, 2000000),
          randomInt(4, 45),
          randomInt(0, 5),
          randomInt(0, 3),
          randomAmount(85, 99.5),
          randomAmount(3.0, 5.0),
          randomItem(customerLevels),
          randomAmount(-10, 30),
        ]
      );
    }
    stats.crm_customer_analysis = 20;

    const templateMaterials = ['钢版', '激光版', '树脂版', '镍版', '钢版'];
    const storageLocations = ['模切车间D1', '模切车间D2', '丝印车间A1', '丝印车间A2', '晒版车间B1'];
    const templateIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const maxUsage = randomInt(50000, 200000);
      const warningUsage = randomInt(10000, 50000);
      const remainingUsage = randomInt(warningUsage, maxUsage);
      const sup = suppliers[i % suppliers.length];
      await conn.execute(
        `INSERT INTO prd_die_template (template_code, template_name, template_type, specification, material, max_usage, remaining_usage, warning_usage, status, storage_location, purchase_date, supplier_id, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DT-${pad(i + 1, 5)}`,
          `${productNames[i]}丝网版`,
          (i % 2) + 1,
          productSpecs[i],
          randomItem(templateMaterials),
          maxUsage,
          remainingUsage,
          warningUsage,
          1,
          randomItem(storageLocations),
          randomDate(yearStart, now),
          sup.id,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      templateIds.push(idRow[0].id);
    }
    stats.prd_die_template = 20;

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const wh = warehouses[i % warehouses.length];
      const maxUseCount = randomInt(50000, 200000);
      const usedCount = randomInt(0, maxUseCount * 0.6);
      const remainingCount = maxUseCount - usedCount;
      const maintenanceDays = randomItem([90, 180, 365]);
      const lastMaintenanceDate = randomDate(yearStart, now);
      const nextMaintenanceDate = new Date(
        new Date(lastMaintenanceDate).getTime() + maintenanceDays * 86400000
      )
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO prd_die (die_code, die_name, die_type, size_spec, customer_id, product_name, max_use_count, used_count, remaining_count, maintenance_days, last_maintenance_date, next_maintenance_date, warehouse_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DIE-${pad(i + 1, 5)}`,
          `${productNames[i]}刀模`,
          (i % 2) + 1,
          productSpecs[i],
          cust.id,
          productNames[i],
          maxUseCount,
          usedCount,
          remainingCount,
          maintenanceDays,
          lastMaintenanceDate,
          nextMaintenanceDate,
          wh.id,
          1,
        ]
      );
    }
    stats.prd_die = 20;

    const formulaNames = [
      '丝印黑色标准配方',
      '丝印白色UV配方',
      '导电银浆配方',
      '丝印红色溶剂配方',
      '丝印蓝色UV配方',
      '丝印金色溶剂配方',
      'UV透明光油配方',
      '丝印绿色UV配方',
      '丝印黄色溶剂配方',
      '导电碳浆配方',
      '丝印银色UV配方',
      '丝印紫色溶剂配方',
      '防伪荧光配方',
      '磁性油墨配方',
      '温变油墨配方',
      '光变油墨配方',
      '夜光油墨配方',
      '导热油墨配方',
      '绝缘油墨配方',
      '可剥胶配方',
    ];
    const pantoneCodes = [
      'PANTONE Black C',
      'PANTONE White C',
      'PANTONE 877 C',
      'PANTONE 185 C',
      'PANTONE 286 C',
      'PANTONE 871 C',
      'PANTONE 801 C',
      'PANTONE 356 C',
      'PANTONE 109 C',
      'PANTONE 432 C',
      'PANTONE 877 C',
      'PANTONE 2685 C',
      'PANTONE 802 C',
      'PANTONE Black 4 C',
      'PANTONE 11-0601 C',
      'PANTONE 16-1546 C',
      'PANTONE 3755 C',
      'PANTONE Cool Gray 8 C',
      'PANTONE 11-0601 C',
      'PANTONE 801 C',
    ];
    const colorNames = [
      '黑色',
      '白色',
      '银色',
      '红色',
      '蓝色',
      '金色',
      '透明',
      '绿色',
      '黄色',
      '碳黑',
      '银色',
      '紫色',
      '荧光绿',
      '磁性黑',
      '温变',
      '光变',
      '夜光绿',
      '导热灰',
      '绝缘白',
      '透明',
    ];
    const inkTypes = ['solvent', 'uv', 'conductive'];
    const baseInkTypes = ['溶剂型基墨', 'UV型基墨', '导电型基墨'];
    const formulaIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const inkType = randomItem(inkTypes);
      await conn.execute(
        `INSERT INTO ink_formula (formula_no, formula_name, pantone_code, color_name, color_code, ink_type, base_ink_type, total_weight, unit, shelf_life_hours, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IF-2026-${pad(i + 1, 5)}`,
          formulaNames[i],
          pantoneCodes[i],
          colorNames[i],
          `C${pad(i + 1, 3)}`,
          inkType,
          baseInkTypes[inkTypes.indexOf(inkType)],
          randomAmount(1, 50),
          'kg',
          randomItem([48, 72, 168, 336, 720]),
          1,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      formulaIds.push(idRow[0].id);
    }
    stats.ink_formula = 20;

    const inkMaterials = materials.filter(
      (m: any) =>
        m.material_name?.includes('油墨') ||
        m.material_name?.includes('银浆') ||
        m.material_name?.includes('光油') ||
        m.material_name?.includes('感光胶')
    );
    const inkMats = inkMaterials.length > 0 ? inkMaterials : materials.slice(0, 5);

    for (let i = 0; i < 20; i++) {
      const mat = inkMats[i % inkMats.length];
      const openTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const expireHours = randomItem([48, 72, 168, 336]);
      const expireTime = new Date(new Date(openTime).getTime() + expireHours * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      const user = users[i % users.length];
      const remainingQty = randomAmount(0.5, 10);
      await conn.execute(
        `INSERT INTO ink_opening_record (record_no, material_id, material_code, material_name, batch_no, ink_type, open_time, expire_hours, expire_time, remaining_qty, unit, status, operator_id, operator_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IOR-2026-${pad(i + 1, 5)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          `B2026${pad(i + 1, 4)}`,
          randomItem(inkTypes),
          openTime,
          expireHours,
          expireTime,
          remainingQty,
          'kg',
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
        ]
      );
    }
    stats.ink_opening_record = 20;

    for (let i = 0; i < 20; i++) {
      const mat = inkMats[i % inkMats.length];
      const cust = customers[i % customers.length];
      const user = users[i % users.length];
      const wh = warehouses[i % warehouses.length];
      const mixTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const quantity = randomAmount(1, 20);
      const expireTime = new Date(new Date(mixTime).getTime() + randomItem([48, 72, 168]) * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      await conn.execute(
        `INSERT INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_id, operator_name, quantity, unit, warehouse_id, status, expire_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `IMR-2026-${pad(i + 1, 5)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomItem(['1:2:1', '3:1', '2:1:1', '4:1', '1:1']),
          colorNames[i % colorNames.length],
          `C${pad(i + 1, 3)}`,
          cust.id,
          cust.customer_name,
          mixTime,
          user.id,
          user.real_name,
          quantity,
          'kg',
          wh.id,
          randomItem([1, 2]),
          expireTime,
        ]
      );
    }
    stats.ink_mixed_record = 20;

    const lifecycleStages = ['design', 'trial', 'production', 'mature', 'decline'];
    const lifecycleStageNames = ['设计阶段', '试产阶段', '量产阶段', '成熟阶段', '衰退阶段'];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const stage = lifecycleStages[i % lifecycleStages.length];
      const effectiveDate = randomDate(yearStart, now);
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO plm_product_lifecycle (product_id, product_code, product_name, lifecycle_stage, stage_status, version, change_type, change_reason, change_desc, approver, approve_time, effective_date, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          stage,
          1,
          `V${(i % 3) + 1}.0`,
          randomItem(['material', 'process', 'design', 'specification']),
          `${productNames[i % 20]}生命周期阶段变更`,
          `${productNames[i % 20]}进入${lifecycleStageNames[i % 5]}`,
          defaultUserName,
          `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:00:00`,
          effectiveDate,
          `${productNames[pIdx]}处于${stage}阶段`,
          defaultUserId,
        ]
      );
    }
    stats.plm_product_lifecycle = 20;

    const ecoTypes = ['material', 'process', 'design', 'specification'];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const user = users[i % users.length];
      const ecoType = randomItem(ecoTypes);
      const oldVer = `V${(i % 3) + 1}.0`;
      const newVer = `V${(i % 3) + 2}.0`;
      const applyTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const statusVal = randomItem([1, 2, 3]);
      const approveTime =
        statusVal >= 2
          ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`
          : null;
      await conn.execute(
        `INSERT INTO plm_eco (eco_no, eco_type, product_id, product_code, product_name, old_version, new_version, change_reason, change_content, impact_analysis, status, applicant, apply_time, approver, approve_time, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ECO-2026-${pad(i + 1, 5)}`,
          ecoType,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          oldVer,
          newVer,
          `${productNames[pIdx]}${ecoType}变更需求`,
          `变更${ecoType}相关参数以满足客户要求`,
          `对生产计划及物料采购有轻微影响`,
          statusVal,
          user.real_name,
          applyTime,
          statusVal >= 2 ? defaultUserName : null,
          approveTime,
          null,
          defaultUserId,
        ]
      );
    }
    stats.plm_eco = 20;

    const bomIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const totalMaterialCount = randomInt(3, 12);
      const totalCost = randomAmount(5, 200);
      await conn.execute(
        `INSERT INTO bom_header (bom_no, product_id, product_code, product_name, product_spec, version, is_default, status, unit, base_qty, total_material_count, total_cost, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `BOM-2026-${pad(i + 1, 5)}`,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          productSpecs[pIdx],
          `V${(i % 3) + 1}.0`,
          i < 10 ? 1 : 0,
          randomItem([10, 20, 20]),
          productUnits[pIdx],
          1,
          totalMaterialCount,
          totalCost,
          `${productNames[pIdx]}BOM`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      bomIds.push(idRow[0].id);
    }
    stats.bom_header = 20;

    const bomMaterialIds: number[] = [];
    for (let i = 0; i < materials.length; i++) {
      const mat = materials[i];
      const matType = i % 5 === 0 ? 'SEMI' : i % 3 === 0 ? 'PKG' : 'RAW';
      await conn.execute(
        `INSERT INTO bom_material (material_code, material_name, material_spec, material_type, category_name, unit, unit_cost, safety_stock, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mat.material_code,
          mat.material_name,
          mat.specification,
          matType,
          randomItem(['薄膜', '油墨', '溶剂', '辅料']),
          mat.unit,
          mat.purchase_price || 0,
          100,
          1,
        ]
      );
      const [bmRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      bomMaterialIds.push(bmRow[0].id);
    }

    const materialTypes = ['RAW', 'SEMI', 'SUB', 'PKG', 'OTHER'];
    const processNames = [
      '丝印',
      '模切',
      'UV固化',
      '烫印',
      '检品',
      '分条',
      '覆膜',
      '冲压',
      '烘干',
      '包装',
    ];
    for (let i = 0; i < 20; i++) {
      const bomId = bomIds[i % bomIds.length];
      const mat = materials[i % materials.length];
      const bmId = bomMaterialIds[i % bomMaterialIds.length];
      const consumptionQty = randomAmount(0.5, 10);
      const lossRate = randomAmount(0, 5);
      const actualQty = Math.round(consumptionQty * (1 + lossRate / 100) * 1000000) / 1000000;
      const unitCost = mat.purchase_price || randomAmount(0.5, 50);
      const totalCost = Math.round(actualQty * unitCost * 10000) / 10000;
      await conn.execute(
        `INSERT INTO bom_line (bom_id, line_no, parent_line_id, level, material_id, material_code, material_name, material_spec, unit, consumption_qty, loss_rate, actual_qty, unit_cost, total_cost, material_type, is_key_material, position_no, process_seq, process_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bomId,
          i + 1,
          null,
          1,
          bmId,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          consumptionQty,
          lossRate,
          actualQty,
          unitCost,
          totalCost,
          randomItem(materialTypes),
          randomItem([0, 1]),
          `P${pad(i + 1, 2)}`,
          i + 1,
          randomItem(processNames),
        ]
      );
    }
    stats.bom_line = 20;

    const deliveryIds: number[] = [];
    const logisticsCompanies = ['顺丰速运', '德邦物流', '中通快递', '圆通速递', '京东物流'];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow]: any = await conn.execute(
        'SELECT customer_name FROM crm_customer WHERE id = ?',
        [so.customer_id]
      );
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const wh = warehouses[i % warehouses.length];
      const totalQty = randomInt(100, 50000);
      const totalAmount = randomAmount(1000, 200000);
      const signStatus = randomItem([0, 1]);
      await conn.execute(
        `INSERT INTO sal_delivery (delivery_no, order_id, order_no, customer_id, customer_name, delivery_date, contact_name, contact_phone, delivery_address, warehouse_id, logistics_company, tracking_no, total_qty, total_amount, sign_status, sign_by, sign_time, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `DN-2026-${pad(i + 1, 5)}`,
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          randomDate(yearStart, now),
          `联系人${i + 1}`,
          `0769-${randomInt(22000000, 22999999)}`,
          `广东省东莞市长安镇${randomItem(['乌沙路', '沙头路', '锦厦路'])}${randomInt(1, 200)}号`,
          wh.id,
          randomItem(logisticsCompanies),
          `SF${randomInt(1000000000, 9999999999)}`,
          totalQty,
          totalAmount,
          signStatus,
          signStatus === 1 ? defaultUserId : null,
          signStatus === 1
            ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:00:00`
            : null,
          randomItem([1, 2, 3]),
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      deliveryIds.push(idRow[0].id);
    }
    stats.sal_delivery = 20;

    for (let i = 0; i < 20; i++) {
      const deliveryId = deliveryIds[i % deliveryIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(100, 50000);
      const unitPrice = mat.sale_price || randomAmount(0.5, 30);
      const amount = Math.round(quantity * unitPrice * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_delivery_detail (delivery_id, line_no, material_id, material_name, material_spec, quantity, unit, unit_price, amount, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          deliveryId,
          i + 1,
          mat.id,
          mat.material_name,
          mat.specification,
          quantity,
          mat.unit,
          unitPrice,
          amount,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.sal_delivery_detail = 20;

    const returnReasons = [
      '丝印偏色超出标准',
      '套位偏差不合格',
      '模切毛刺不符合要求',
      '尺寸偏差超标',
      '表面划痕影响品质',
      '油墨附着力不足',
      '色差超出客户标准',
      '印刷内容错误',
      '材料规格不符',
      '客户需求变更',
    ];
    const returnIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow]: any = await conn.execute(
        'SELECT customer_name FROM crm_customer WHERE id = ?',
        [so.customer_id]
      );
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const deliveryId = deliveryIds[i % deliveryIds.length];
      const totalAmount = randomAmount(500, 50000);
      const wh = warehouses[i % warehouses.length];
      await conn.execute(
        `INSERT INTO sal_return (return_no, status, order_id, order_no, customer_id, customer_name, warehouse_id, delivery_id, delivery_no, reason, return_date, total_amount, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `RT-2026-${pad(i + 1, 5)}`,
          randomItem([1, 2, 3]),
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          wh.id,
          deliveryId,
          `DN-2026-${pad((i % deliveryIds.length) + 1, 5)}`,
          randomItem(returnReasons),
          randomDate(yearStart, now),
          totalAmount,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      returnIds.push(idRow[0].id);
    }
    stats.sal_return = 20;

    for (let i = 0; i < 20; i++) {
      const returnId = returnIds[i % returnIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(10, 5000);
      const unitPrice = mat.sale_price || randomAmount(0.5, 30);
      const amount = Math.round(quantity * unitPrice * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_return_detail (return_id, line_no, material_id, material_name, material_spec, unit, quantity, unit_price, amount, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          i + 1,
          mat.id,
          mat.material_name,
          mat.specification,
          mat.unit,
          quantity,
          unitPrice,
          amount,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.sal_return_detail = 20;

    const reconciliationIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const periodStart = randomDate(yearStart, now);
      const periodEnd = new Date(new Date(periodStart).getTime() + randomInt(28, 31) * 86400000)
        .toISOString()
        .slice(0, 10);
      const deliveryAmount = randomAmount(50000, 1000000);
      const returnAmount = randomAmount(0, deliveryAmount * 0.1);
      const discountAmount = randomAmount(0, deliveryAmount * 0.02);
      const netAmount = Math.round((deliveryAmount - returnAmount - discountAmount) * 100) / 100;
      const receivedAmount = randomAmount(0, netAmount);
      const balanceAmount = Math.round((netAmount - receivedAmount) * 100) / 100;
      await conn.execute(
        `INSERT INTO sal_reconciliation (reconciliation_no, customer_id, customer_name, period_start, period_end, delivery_amount, return_amount, discount_amount, net_amount, received_amount, balance_amount, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `RC-2026-${pad(i + 1, 5)}`,
          cust.id,
          cust.customer_name,
          periodStart,
          periodEnd,
          deliveryAmount,
          returnAmount,
          discountAmount,
          netAmount,
          receivedAmount,
          balanceAmount,
          randomItem([1, 2, 3, 4]),
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      reconciliationIds.push(idRow[0].id);
    }
    stats.sal_reconciliation = 20;

    for (let i = 0; i < 20; i++) {
      const rcId = reconciliationIds[i % reconciliationIds.length];
      const so = salesOrders[i % salesOrders.length];
      const sourceType = randomItem([1, 2]);
      const sourceNo =
        sourceType === 1 ? `DN-2026-${pad((i % 20) + 1, 5)}` : `RT-2026-${pad((i % 20) + 1, 5)}`;
      const amount = randomAmount(1000, 100000);
      await conn.execute(
        `INSERT INTO sal_reconciliation_line (reconciliation_id, source_type, source_id, source_no, source_date, amount) VALUES (?, ?, ?, ?, ?, ?)`,
        [rcId, sourceType, so.id, sourceNo, randomDate(yearStart, now), amount]
      );
    }
    stats.sal_reconciliation_line = 20;

    const materialReturnIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `MR-2026-${pad(i + 1, 5)}`,
          wo.id,
          wo.work_order_no,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          `生产退料-${wo.work_order_no}`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      materialReturnIds.push(idRow[0].id);
    }
    stats.prd_material_return = 20;

    for (let i = 0; i < 20; i++) {
      const returnId = materialReturnIds[i % materialReturnIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO prd_material_return_item (return_id, material_id, material_code, material_name, return_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          returnId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(1, 500),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.prd_material_return_item = 20;

    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const user = users[i % users.length];
      const startTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 12)).padStart(2, '0')}:00:00`;
      const endTime = `${new Date(new Date(startTime).getTime() + randomInt(1, 8) * 3600000).toISOString().slice(0, 19).replace('T', ' ')}`;
      const downtimeHours = randomAmount(0.5, 8);
      await conn.execute(
        `INSERT INTO eqp_maintenance_record (record_no, plan_id, equipment_id, maintenance_type, fault_desc, maintenance_content, start_time, end_time, downtime_hours, cost, responsible_id, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `EMR-2026-${pad(i + 1, 5)}`,
          null,
          eq.id,
          randomItem([1, 2, 3, 4, 5]),
          `${eq.equipment_name}定期保养检查`,
          `清洁润滑关键部件，检查磨损情况并校准参数`,
          startTime,
          endTime,
          downtimeHours,
          randomAmount(200, 5000),
          user.id,
          randomItem([1, 1, 2]),
        ]
      );
    }
    stats.eqp_maintenance_record = 20;

    const faultDescs = [
      '丝印刮刀磨损异常',
      'UV灯管亮度不足',
      '模切刀模断裂',
      '传送带跑偏',
      '温控系统失灵',
      '对位系统精度下降',
      '导轨润滑不足',
      '传感器灵敏度降低',
      '电机异响',
      '气缸漏气',
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const repairCost = randomAmount(200, 15000);
      const repairStartTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 14)).padStart(2, '0')}:00:00`;
      const repairEndTime = `${new Date(new Date(repairStartTime).getTime() + randomInt(2, 48) * 3600000).toISOString().slice(0, 19).replace('T', ' ')}`;
      await conn.execute(
        `INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, repair_start_time, repair_end_time, repair_cost, repair_result, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ERP-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          randomDate(yearStart, now),
          randomItem(faultDescs),
          randomItem([1, 2]),
          randomItem(['张师傅', '李师傅', '王师傅', '赵工', '陈工']),
          repairStartTime,
          repairEndTime,
          repairCost,
          '更换损坏部件，重新校准设备参数',
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_repair = 20;

    const calibrationOrgs = [
      '广东省计量科学研究院',
      '深圳市计量质量检测研究院',
      '东莞市计量所',
      '国家印刷机械质量检验中心',
      '第三方校准机构',
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const cDate = randomDate(yearStart, now);
      const nextCDate = new Date(new Date(cDate).getTime() + randomInt(90, 365) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ECR-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          cDate,
          nextCDate,
          randomItem(calibrationOrgs),
          randomItem([1, 1, 1, 2]),
          `CERT-2026-${pad(i + 1, 5)}`,
          randomAmount(500, 3000),
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_calibration = 20;

    const scrapReasons = [
      '设备老化无法维修',
      '技术淘汰无法满足生产要求',
      '多次维修仍无法正常使用',
      '安全风险无法继续使用',
      '精度严重下降无法校准',
    ];
    for (let i = 0; i < 20; i++) {
      const eq = equipment[i % equipment.length];
      const originalValue = randomAmount(50000, 500000);
      const netValue = randomAmount(0, originalValue * 0.1);
      await conn.execute(
        `INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ESR-2026-${pad(i + 1, 5)}`,
          eq.id,
          eq.equipment_code,
          eq.equipment_name,
          randomDate(yearStart, now),
          randomItem(scrapReasons),
          originalValue,
          netValue,
          defaultUserName,
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.eqp_scrap = 20;

    const transferIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const fromWh = warehouses[i % warehouses.length];
      const toWh = warehouses[(i + 1) % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_transfer_order (transfer_no, from_warehouse_id, to_warehouse_id, transfer_date, transfer_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TRF-2026-${pad(i + 1, 5)}`,
          fromWh.id,
          toWh.id,
          randomDate(yearStart, now),
          randomItem([1, 2]),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          `调拨备注`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      transferIds.push(idRow[0].id);
    }
    stats.inv_transfer_order = 20;

    for (let i = 0; i < 20; i++) {
      const transferId = transferIds[i % transferIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO inv_transfer_item (transfer_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transferId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(10, 5000),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_transfer_item = 20;

    const stocktakingIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_stocktaking (taking_no, warehouse_id, taking_date, taking_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `STK-2026-${pad(i + 1, 5)}`,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          randomItem([1, 2, 3]),
          user.id,
          user.real_name,
          `盘点备注`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      stocktakingIds.push(idRow[0].id);
    }
    stats.inv_stocktaking = 20;

    for (let i = 0; i < 20; i++) {
      const stkId = stocktakingIds[i % stocktakingIds.length];
      const mat = materials[i % materials.length];
      const systemQty = randomInt(100, 50000);
      const diff = randomInt(-500, 500);
      const actualQty = systemQty + diff;
      await conn.execute(
        `INSERT INTO inv_stocktaking_item (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          stkId,
          mat.id,
          mat.material_code,
          mat.material_name,
          systemQty,
          actualQty,
          diff,
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_stocktaking_item = 20;

    const adjustIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, status, operator_id, operator_name, remark, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `ADJ-2026-${pad(i + 1, 5)}`,
          wh.id,
          randomDate(yearStart, now),
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          user.id,
          user.real_name,
          `调整备注`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      adjustIds.push(idRow[0].id);
    }
    stats.inv_stock_adjust = 20;

    for (let i = 0; i < 20; i++) {
      const adjustId = adjustIds[i % adjustIds.length];
      const mat = materials[i % materials.length];
      const beforeQty = randomInt(100, 50000);
      const adjustQty = randomInt(-500, 500);
      const afterQty = beforeQty + adjustQty;
      await conn.execute(
        `INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          adjustId,
          mat.id,
          mat.material_code,
          mat.material_name,
          beforeQty,
          adjustQty,
          afterQty,
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_stock_adjust_item = 20;

    const outboundIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const so = salesOrders[i % salesOrders.length];
      const [custRow]: any = await conn.execute(
        'SELECT customer_name FROM crm_customer WHERE id = ?',
        [so.customer_id]
      );
      const custName = custRow[0]?.customer_name || `客户${i + 1}`;
      const wh = warehouses[i % warehouses.length];
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SOB-2026-${pad(i + 1, 5)}`,
          so.id,
          so.order_no,
          so.customer_id,
          custName,
          wh.id,
          randomDate(yearStart, now),
          user.real_name,
          randomItem([1, 2, 3]),
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      outboundIds.push(idRow[0].id);
    }
    stats.inv_sales_outbound = 20;

    for (let i = 0; i < 20; i++) {
      const outboundId = outboundIds[i % outboundIds.length];
      const mat = materials[i % materials.length];
      await conn.execute(
        `INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          outboundId,
          mat.id,
          mat.material_code,
          mat.material_name,
          randomInt(100, 50000),
          mat.unit,
          `B2026${pad(i + 1, 4)}`,
        ]
      );
    }
    stats.inv_sales_outbound_item = 20;

    const poIds: number[] = [];
    const paymentTermsList = ['月结30天', '月结60天', '月结90天', '货到付款', '预付款50%'];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const orderDate = randomDate(yearStart, now);
      const deliveryDate = new Date(new Date(orderDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      const totalAmount = randomAmount(5000, 500000);
      const totalQuantity = randomInt(100, 50000);
      const taxRate = 13.0;
      const taxAmount = Math.round(((totalAmount * taxRate) / 100) * 100) / 100;
      const grandTotal = Math.round((totalAmount + taxAmount) * 100) / 100;
      await conn.execute(
        `INSERT INTO pur_purchase_order (po_no, supplier_id, supplier_name, supplier_code, order_date, delivery_date, currency, total_amount, total_quantity, tax_rate, tax_amount, grand_total, status, payment_terms, contact_person, contact_phone, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PO-2026-${pad(i + 1, 5)}`,
          sup.id,
          sup.supplier_name,
          sup.supplier_code,
          orderDate,
          deliveryDate,
          'CNY',
          totalAmount,
          totalQuantity,
          taxRate,
          taxAmount,
          grandTotal,
          randomItem([10, 20, 30, 40]),
          randomItem(paymentTermsList),
          `联系人${i + 1}`,
          `0769-${randomInt(22000000, 22999999)}`,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      poIds.push(idRow[0].id);
    }
    stats.pur_purchase_order = 20;

    for (let i = 0; i < 20; i++) {
      const poId = poIds[i % poIds.length];
      const mat = materials[i % materials.length];
      const orderQty = randomInt(100, 20000);
      const receivedQty = randomInt(0, orderQty);
      const unitPrice = mat.purchase_price || randomAmount(0.5, 50);
      const amount = Math.round(orderQty * unitPrice * 100) / 100;
      const taxRate = 13.0;
      const taxAmount = Math.round(((amount * taxRate) / 100) * 100) / 100;
      const lineTotal = Math.round((amount + taxAmount) * 100) / 100;
      const requireDate = randomDate(now, yearEnd);
      await conn.execute(
        `INSERT INTO pur_purchase_order_line (po_id, line_no, material_id, material_code, material_name, material_spec, unit, order_qty, received_qty, unit_price, amount, tax_rate, tax_amount, line_total, require_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          poId,
          i + 1,
          mat.id,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          orderQty,
          receivedQty,
          unitPrice,
          amount,
          taxRate,
          taxAmount,
          lineTotal,
          requireDate,
        ]
      );
    }
    stats.pur_purchase_order_line = 20;

    const requestIds: number[] = [];
    const requestDepts = ['生产部', '品质部', '工程技术部', '仓储部', '采购部'];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const totalAmount = randomAmount(1000, 200000);
      const user = users[i % users.length];
      const requestDate = randomDate(yearStart, now);
      const expectedDate = new Date(new Date(requestDate).getTime() + randomInt(7, 30) * 86400000)
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_name, total_amount, currency, status, priority, expected_date, supplier_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `PR-2026-${pad(i + 1, 5)}`,
          requestDate,
          randomItem(['material', 'equipment', 'supply']),
          randomItem(requestDepts),
          user.real_name,
          totalAmount,
          'CNY',
          randomItem([0, 1, 2, 3, 4]),
          randomItem([1, 2, 3, 4]),
          expectedDate,
          sup.supplier_name,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      requestIds.push(idRow[0].id);
    }
    stats.pur_request = 20;

    for (let i = 0; i < 20; i++) {
      const reqId = requestIds[i % requestIds.length];
      const mat = materials[i % materials.length];
      const sup = suppliers[i % suppliers.length];
      const quantity = randomInt(50, 10000);
      const price = mat.purchase_price || randomAmount(0.5, 50);
      const amount = Math.round(quantity * price * 100) / 100;
      const expectedDate = randomDate(now, yearEnd);
      await conn.execute(
        `INSERT INTO pur_request_item (request_id, line_no, material_code, material_name, material_spec, material_unit, quantity, price, amount, supplier_name, expected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reqId,
          i + 1,
          mat.material_code,
          mat.material_name,
          mat.specification,
          mat.unit,
          quantity,
          price,
          amount,
          sup.supplier_name,
          expectedDate,
        ]
      );
    }
    stats.pur_request_item = 20;

    const inspectionIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const pIdx = i % productIds.length;
      const inspectionQty = randomInt(500, 50000);
      const unqualifiedQty = randomInt(0, Math.round(inspectionQty * 0.05));
      const qualifiedQty = inspectionQty - unqualifiedQty;
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO qc_final_inspection (inspection_no, inspection_date, work_order_id, work_order_no, product_id, product_code, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `QFI-2026-${pad(i + 1, 5)}`,
          randomDate(yearStart, now),
          wo.id,
          wo.work_order_no,
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          `B2026${pad(i + 1, 4)}`,
          inspectionQty,
          qualifiedQty,
          unqualifiedQty,
          randomItem([1, 1, 2, 3]),
          user.real_name,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      inspectionIds.push(idRow[0].id);
    }
    stats.qc_final_inspection = 20;

    const defectTypes = [
      '丝印偏色',
      '套位偏差',
      '模切毛刺',
      '表面划痕',
      '油墨脱落',
      '尺寸偏差',
      '附着力不足',
      '色差超标',
      '印刷模糊',
      '漏印',
    ];
    for (let i = 0; i < 20; i++) {
      const inspId = inspectionIds[i % inspectionIds.length];
      const mat = materials[i % materials.length];
      const quantity = randomInt(10, 2000);
      const handleDate = randomDate(yearStart, now);
      await conn.execute(
        `INSERT INTO qc_unqualified (unqualified_no, inspection_id, source_type, source_no, material_id, material_name, quantity, defect_type, defect_desc, handle_type, handle_result, handler, handle_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `UQ-2026-${pad(i + 1, 5)}`,
          inspId,
          'final_inspection',
          `QFI-2026-${pad((i % inspectionIds.length) + 1, 5)}`,
          mat.id,
          mat.material_name,
          quantity,
          randomItem(defectTypes),
          `${mat.material_name}出现${randomItem(defectTypes)}缺陷`,
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          randomItem(['张质检', '李质检', '王质检', '赵主管']),
          handleDate,
        ]
      );
    }
    stats.qc_unqualified = 20;

    for (let i = 0; i < 20; i++) {
      const inspId = inspectionIds[i % inspectionIds.length];
      const mat = materials[i % materials.length];
      const unqualifiedQty = randomInt(10, 1000);
      const costAmount = randomAmount(100, 10000);
      const user = users[i % users.length];
      await conn.execute(
        `INSERT INTO qc_unqualified_handle (handle_no, inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, handle_status, responsible_dept, responsible_person, handle_result, cost_amount, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `UQH-2026-${pad(i + 1, 5)}`,
          inspId,
          mat.id,
          mat.material_code,
          mat.material_name,
          unqualifiedQty,
          randomItem([1, 2, 3]),
          randomItem([1, 2]),
          randomItem(requestDepts),
          user.real_name,
          `对${mat.material_name}不合格品进行处理`,
          costAmount,
          defaultUserId,
        ]
      );
    }
    stats.qc_unqualified_handle = 20;

    const complaintTypes = ['quality', 'delivery', 'service'];
    const complaintLevels = ['serious', 'major', 'minor'];
    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const so = salesOrders[i % salesOrders.length];
      const pIdx = i % productIds.length;
      const defectQty = randomInt(10, 2000);
      const totalQty = randomInt(defectQty, 50000);
      const defectRate = Math.round((defectQty / totalQty) * 10000) / 100;
      const user = users[i % users.length];
      const reportTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const status = randomItem([1, 2, 3, 4]);
      const closeTime =
        status === 4
          ? `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`
          : null;
      await conn.execute(
        `INSERT INTO qms_complaint (complaint_no, customer_id, customer_name, order_no, product_code, product_name, complaint_type, complaint_level, defect_desc, defect_qty, total_qty, defect_rate, reporter, report_time, handler, contain_action, root_cause, corrective_action, preventive_action, verify_result, verifier, verify_time, status, close_time, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CP-2026-${pad(i + 1, 5)}`,
          cust.id,
          cust.customer_name,
          so.order_no,
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          randomItem(complaintTypes),
          randomItem(complaintLevels),
          `${productNames[pIdx]}出现${randomItem(defectTypes)}问题`,
          defectQty,
          totalQty,
          defectRate,
          user.real_name,
          reportTime,
          randomItem(['品质经理赵六', '品质主管李四', '品质工程师王五']),
          '隔离不合格品并通知客户',
          randomItem(['制程控制不足', '原材料批次问题', '设备参数偏差', '操作人员失误']),
          '加强制程巡检频次',
          '建立预防性检查机制',
          randomItem(['有效', '需持续跟踪']),
          defaultUserName,
          reportTime,
          status,
          closeTime,
          defaultUserId,
        ]
      );
    }
    stats.qms_complaint = 20;

    const testTypes = ['adhesion', 'abrasion', 'color', 'viscosity', 'thickness'];
    const sampleSources = ['production', 'incoming', 'customer'];
    for (let i = 0; i < 20; i++) {
      const pIdx = i % productIds.length;
      const user = users[i % users.length];
      const reviewer = users[(i + 1) % users.length];
      const testTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      const reviewTime = `${randomDate(yearStart, now)} ${String(randomInt(8, 17)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:00`;
      await conn.execute(
        `INSERT INTO qms_lab_test (test_no, test_type, product_id, product_code, product_name, batch_no, sample_source, test_items, test_result, overall_result, tester, test_time, reviewer, review_time, equipment_used, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `LT-2026-${pad(i + 1, 5)}`,
          randomItem(testTypes),
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          productNames[pIdx],
          `B2026${pad(i + 1, 4)}`,
          randomItem(sampleSources),
          randomItem([
            '附着力测试/百格测试',
            '耐磨测试/摩擦测试',
            '色差检测/光谱分析',
            '粘度测试/流变分析',
            '厚度测量/千分尺检测',
          ]),
          randomItem(['合格', '合格', '合格', '不合格']),
          randomItem(['qualified', 'qualified', 'unqualified']),
          user.real_name,
          testTime,
          reviewer.real_name,
          reviewTime,
          randomItem(['百格刀', '摩擦试验机', '色差仪', '粘度计', '千分尺']),
          defaultUserId,
        ]
      );
    }
    stats.qms_lab_test = 20;

    const auditTypes = ['initial', 'routine', 'followup', 'special'];
    for (let i = 0; i < 20; i++) {
      const sup = suppliers[i % suppliers.length];
      const user = users[i % users.length];
      const totalScore = randomAmount(60, 98);
      const deadline = new Date(
        new Date(randomDate(yearStart, now)).getTime() + randomInt(14, 60) * 86400000
      )
        .toISOString()
        .slice(0, 10);
      await conn.execute(
        `INSERT INTO qms_supplier_audit (audit_no, supplier_id, supplier_name, audit_type, audit_scope, audit_date, auditor, audit_items, audit_scores, total_score, conclusion, nonconformities, corrective_request, deadline, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `SA-2026-${pad(i + 1, 5)}`,
          sup.id,
          sup.supplier_name,
          randomItem(auditTypes),
          randomItem(['质量管理体系', '生产过程控制', '原材料管控', '环境与安全']),
          randomDate(yearStart, now),
          user.real_name,
          '质量体系/过程控制/产品检验/交付能力',
          `体系${randomInt(15, 25)}/过程${randomInt(15, 25)}/检验${randomInt(15, 25)}/交付${randomInt(15, 25)}`,
          totalScore,
          randomItem(['qualified', 'conditional', 'unqualified']),
          randomItem(['无', '文件管控不足', '检验记录不完整', '交付偶尔延迟']),
          randomItem(['完善文件管控流程', '补充检验记录', '优化交付计划']),
          deadline,
          randomItem([1, 2]),
          defaultUserId,
        ]
      );
    }
    stats.qms_supplier_audit = 20;

    const qrTypes = ['material', 'product', 'package'];
    for (let i = 0; i < 20; i++) {
      const mat = materials[i % materials.length];
      const wh = warehouses[i % warehouses.length];
      const sup = suppliers[i % suppliers.length];
      const cust = customers[i % customers.length];
      const wo = workOrders[i % workOrders.length];
      const pIdx = i % productIds.length;
      await conn.execute(
        `INSERT INTO qrcode_record (qr_code, qr_type, ref_id, ref_no, batch_no, material_id, material_code, material_name, specification, quantity, unit, warehouse_id, warehouse_name, supplier_id, supplier_name, customer_id, customer_name, work_order_id, work_order_no, production_date, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `QR-${pad(i + 1, 6)}`,
          randomItem(qrTypes),
          productIds[pIdx],
          `PRD-${pad(pIdx + 1, 5)}`,
          `B2026${pad(i + 1, 4)}`,
          mat.id,
          mat.material_code,
          mat.material_name,
          mat.specification,
          randomInt(100, 50000),
          mat.unit,
          wh.id,
          wh.warehouse_name,
          sup.id,
          sup.supplier_name,
          cust.id,
          cust.customer_name,
          wo.id,
          wo.work_order_no,
          randomDate(yearStart, now),
          1,
          defaultUserId,
        ]
      );
    }
    stats.qrcode_record = 20;

    for (let i = 0; i < 20; i++) {
      const cust = customers[i % customers.length];
      const so = salesOrders[i % salesOrders.length];
      const amount = randomAmount(5000, 500000);
      const receivedAmount = randomAmount(0, amount);
      const balance = Math.round((amount - receivedAmount) * 100) / 100;
      const dueDate = new Date(now.getTime() + randomInt(-60, 90) * 86400000)
        .toISOString()
        .slice(0, 10);
      const status = balance === 0 ? 3 : new Date(dueDate) < now ? 2 : 1;
      await conn.execute(
        `INSERT INTO fin_receivable (receivable_no, source_type, source_no, customer_id, amount, received_amount, balance, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `AR-2026-${pad(i + 1, 5)}`,
          1,
          so.order_no,
          cust.id,
          amount,
          receivedAmount,
          balance,
          dueDate,
          status,
        ]
      );
    }
    stats.fin_receivable = 20;

    const costTypes = ['material', 'labor', 'overhead', 'equipment'];
    const sourceTypes = ['work_order', 'purchase', 'maintenance'];
    const departments = ['生产部', '品质部', '工程技术部', '仓储部', '采购部', '财务部'];
    for (let i = 0; i < 20; i++) {
      const wo = workOrders[i % workOrders.length];
      const costType = randomItem(costTypes);
      const sourceType = randomItem(sourceTypes);
      const amount = randomAmount(500, 100000);
      await conn.execute(
        `INSERT INTO fin_cost_record (cost_no, cost_type, source_type, source_no, source_id, department, amount, cost_date, description, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `CR-2026-${pad(i + 1, 5)}`,
          costType,
          sourceType,
          wo.work_order_no,
          wo.id,
          randomItem(departments),
          amount,
          randomDate(yearStart, now),
          `${costType}成本-${wo.work_order_no}`,
          1,
          defaultUserId,
        ]
      );
    }
    stats.fin_cost_record = 20;

    const trainingNames = [
      '新员工入职培训',
      '安全生产培训',
      'ERP系统操作培训',
      '品质标准培训',
      '丝印工艺培训',
      '5S管理培训',
      '消防安全培训',
      '设备操作培训',
      '化学品安全培训',
      '团队建设培训',
      '管理技能培训',
      '成本控制培训',
      '客户服务培训',
      '精益生产培训',
      'ISO质量体系培训',
      '丝印调墨培训',
      '模切操作培训',
      '仓库管理培训',
      '采购流程培训',
      '财务制度培训',
    ];
    const trainers = ['张伟', '刘洋', '王强', '周杰', '赵磊', '吴芳', '外部讲师'];
    const trainingPlaces = [
      '公司培训室A',
      '公司培训室B',
      '生产车间',
      '会议室1',
      '会议室2',
      '线上培训',
    ];
    const trainingIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      await conn.execute(
        `INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status, create_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `TRN-2026-${pad(i + 1, 5)}`,
          trainingNames[i],
          randomItem([1, 2, 3, 4]),
          randomDate(yearStart, now),
          randomItem([2, 4, 6, 8, 16, 24]),
          randomItem(trainers),
          `${trainingNames[i]}内容，涵盖理论讲解和实操演练`,
          randomItem(trainingPlaces),
          1,
          defaultUserId,
        ]
      );
      const [idRow]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
      trainingIds.push(idRow[0].id);
    }
    stats.hr_training = 20;

    for (let i = 0; i < 20; i++) {
      const trainingId = trainingIds[i % trainingIds.length];
      const user = users[i % users.length];
      const score = randomInt(60, 100);
      await conn.execute(
        `INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, ?)`,
        [trainingId, user.id, user.real_name, score, score >= 60 ? 1 : 0]
      );
    }
    stats.hr_training_participant = 20;

    await conn.execute('SET FOREIGN_KEY_CHECKS=1');

    return stats;
  });

  return successResponse(result, '全业务数据初始化成功');
});
