import { NextRequest } from 'next/server';
import { query, execute, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    const isEmpty = async (table: string): Promise<boolean> => {
      const [rows]: any = await conn.execute(`SELECT COUNT(*) as cnt FROM \`${table}\``);
      return rows[0].cnt === 0;
    };

    const [existingWarehouses]: any = await conn.execute('SELECT id, warehouse_code, warehouse_name FROM inv_warehouse WHERE deleted = 0 OR deleted IS NULL LIMIT 10');
    const [existingSuppliers]: any = await conn.execute('SELECT id, supplier_code, supplier_name FROM pur_supplier LIMIT 10');
    const [existingCustomers]: any = await conn.execute('SELECT id, customer_code, customer_name FROM crm_customer LIMIT 10');
    const [existingMaterials]: any = await conn.execute('SELECT id, material_code, material_name, specification, unit, purchase_price, sale_price, material_type FROM inv_material LIMIT 20');
    const [existingEquipment]: any = await conn.execute('SELECT id, equipment_code, equipment_name FROM eqp_equipment LIMIT 10');
    const [existingWorkOrders]: any = await conn.execute('SELECT id, order_no FROM prod_work_order LIMIT 10');
    const [existingDieTemplates]: any = await conn.execute('SELECT id, template_code, template_name FROM prd_die_template LIMIT 10');
    const [existingProcessRoutes]: any = await conn.execute('SELECT id, route_code, route_name FROM prd_process_route LIMIT 10');
    const [existingBoms]: any = await conn.execute('SELECT id, bom_name, product_id FROM prd_bom LIMIT 10');
    const [existingBomDetails]: any = await conn.execute('SELECT id, bom_id, material_id FROM prd_bom_detail LIMIT 20');
    const [existingBomLines]: any = await conn.execute('SELECT id, bom_id, material_id, material_code, material_name FROM bom_line LIMIT 20');
    const [existingProducts]: any = await conn.execute('SELECT id, product_code, product_name FROM mdm_product LIMIT 10');
    const [existingLocations]: any = await conn.execute('SELECT id, location_code, location_name FROM inv_location LIMIT 10');
    const [existingUsers]: any = await conn.execute('SELECT id, username FROM sys_user LIMIT 10');
    const [existingVehicles]: any = await conn.execute('SELECT id, vehicle_no FROM delivery_vehicle LIMIT 10');

    const wh = existingWarehouses[0] || { id: 1 };
    const sup = existingSuppliers[0] || { id: 1, supplier_name: '默认供应商' };
    const cust = existingCustomers[0] || { id: 1, customer_name: '默认客户' };
    const mat = existingMaterials[0] || { id: 1, material_code: 'MAT001', material_name: '默认物料', specification: '默认规格', unit: '张' };
    const eq = existingEquipment[0] || { id: 1, equipment_code: 'EQP001', equipment_name: '默认设备' };
    const wo = existingWorkOrders[0] || { id: 1, order_no: 'WO001' };
    const prod = existingProducts[0] || { id: 1, product_code: 'PRD001', product_name: '默认产品' };

    // ===== base_ink =====
    if (await isEmpty('base_ink')) {
      for (let i = 1; i <= 10; i++) {
        const inkTypes = ['溶剂型', 'UV型', '水性', '导电型', '绝缘型'];
        const colors = ['黑色', '白色', '红色', '蓝色', '绿色', '黄色', '银色', '金色', '透明', '灰色'];
        const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
        await conn.execute(
          `INSERT INTO base_ink (ink_code, ink_name, color_code, color_name, ink_type, supplier_id, supplier_name, specification, unit, unit_price, stock_qty, min_stock, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [`INK00${i}`, `丝印油墨-${colors[i-1]}`, `C${String(i).padStart(3,'0')}`, colors[i-1], inkTypes[(i-1) % inkTypes.length], s.id, s.supplier_name || `供应商${i}`, `SK-${1000+i}`, 'kg', 80 + i * 10, 50 + i * 5, 10]
        );
    }
      stats.base_ink = 10;
    }

    // ===== bom_alternative =====
    if (await isEmpty('bom_alternative') && existingBomLines.length > 0) {
      for (let i = 1; i <= 10; i++) {
        const bl = existingBomLines[(i - 1) % existingBomLines.length];
        const altMat = existingMaterials[(i + 2) % existingMaterials.length] || mat;
        await conn.execute(
          `INSERT INTO bom_alternative (bom_id, bom_line_id, priority, material_id, material_code, material_name, conversion_rate, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
          [bl.bom_id, bl.id, i % 3 + 1, altMat.id, altMat.material_code, altMat.material_name, 1.0]
        );
    }
      stats.bom_alternative = 10;
    }

    // ===== crm_customer_analysis =====
    if (await isEmpty('crm_customer_analysis')) {
      for (let i = 1; i <= 10; i++) {
        const c = existingCustomers[(i - 1) % existingCustomers.length] || cust;
        const levels = ['A', 'A', 'B', 'B', 'C', 'A', 'B', 'C', 'A', 'B'];
        await conn.execute(
          `INSERT INTO crm_customer_analysis (customer_id, customer_name, analysis_period, period_start, period_end, order_count, order_amount, delivery_count, return_count, complaint_count, on_time_rate, satisfaction_score, customer_level, growth_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.customer_name || `客户${i}`, '2026-Q1', '2026-01-01', '2026-03-31', 5 + i, 50000 + i * 10000, 4 + i, i % 3, i % 4, 90 + i * 0.5, 4.0 + (i % 3) * 0.3, levels[i-1], 5 + i * 2]
        );
    }
      stats.crm_customer_analysis = 10;
    }

    // ===== crm_follow_record =====
    const followTypes = ['电话', '拜访', '邮件', '微信', '会议'];
    if (await isEmpty('crm_follow_record')) {
      for (let i = 1; i <= 10; i++) {
        const c = existingCustomers[(i - 1) % existingCustomers.length] || cust;
        await conn.execute(
          `INSERT INTO crm_follow_record (customer_id, customer_name, follow_type, follow_content, contact_name, salesman_name, next_follow_date, opportunity, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [c.id, c.customer_name || `客户${i}`, followTypes[(i-1)%5], `第${i}次跟进，讨论新项目合作方案`, `联系人${i}`, `销售员${String.fromCharCode(65+i%5)}`, '2026-05-01', `新项目机会-${i}`]
        );
    }
      stats.crm_follow_record = 10;
    }

    // ===== delivery_vehicle_cost =====
    if (await isEmpty('delivery_vehicle_cost') && existingVehicles.length > 0) {
      for (let i = 1; i <= 10; i++) {
        const v = existingVehicles[(i - 1) % existingVehicles.length];
        const costTypes = ['加油', '过路费', '保险', '维修', '年检'];
        await conn.execute(
          `INSERT INTO delivery_vehicle_cost (vehicle_id, cost_date, cost_type, amount, mileage, fuel_volume, unit_price, location, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, `2026-04-${String(i).padStart(2,'0')}`, costTypes[(i-1)%5], 200 + i * 50, 1000 + i * 200, i % 2 === 0 ? 50 + i * 5 : null, i % 2 === 0 ? 7.5 : null, `地点${i}`, `司机${i}`]
        );
    }
      stats.delivery_vehicle_cost = 10;
    }

    // ===== delivery_vehicle_repair =====
    if (await isEmpty('delivery_vehicle_repair') && existingVehicles.length > 0) {
      for (let i = 1; i <= 10; i++) {
        const v = existingVehicles[(i - 1) % existingVehicles.length];
        await conn.execute(
          `INSERT INTO delivery_vehicle_repair (vehicle_id, repair_date, repair_type, mileage, repair_content, repair_cost, repair_shop, next_maintain_mileage, next_maintain_date, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [v.id, `2026-04-${String(i).padStart(2,'0')}`, i % 2 === 0 ? '定期保养' : '故障维修', 5000 + i * 1000, `维修内容-${i}`, 500 + i * 100, `修理厂${i}`, 10000 + i * 1000, '2026-10-01', `调度员${i}`]
        );
    }
      stats.delivery_vehicle_repair = 10;
    }

    // ===== eqp_calibration =====
    if (await isEmpty('eqp_calibration')) {
      for (let i = 1; i <= 10; i++) {
        const e = existingEquipment[(i - 1) % existingEquipment.length] || eq;
        await conn.execute(
          `INSERT INTO eqp_calibration (calibration_no, equipment_id, equipment_code, equipment_name, calibration_date, next_calibration_date, calibration_org, calibration_result, certificate_no, calibration_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [`CAL202604${String(i).padStart(3,'0')}`, e.id, e.equipment_code || `EQP00${i}`, e.equipment_name || `设备${i}`, '2026-04-01', '2027-04-01', `计量机构${i}`, 1, `CERT-${2026}${String(i).padStart(4,'0')}`, 500 + i * 100]
        );
    }
      stats.eqp_calibration = 10;
    }

    // ===== eqp_repair =====
    if (await isEmpty('eqp_repair')) {
      for (let i = 1; i <= 10; i++) {
        const e = existingEquipment[(i - 1) % existingEquipment.length] || eq;
        const faultDescs = ['丝印刮刀磨损需更换', 'UV灯管老化需更换', '传送带松动需调整', '模切刀模磨损', '温控系统偏差', '定位系统精度下降', '导轨润滑不足', '传感器灵敏度降低', '气缸压力不足', '电机异响'];
        await conn.execute(
          `INSERT INTO eqp_repair (repair_no, equipment_id, equipment_code, equipment_name, fault_date, fault_desc, repair_type, repair_person, repair_start_time, repair_end_time, repair_cost, repair_result, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`RP202604${String(i).padStart(3,'0')}`, e.id, e.equipment_code || `EQP00${i}`, e.equipment_name || `设备${i}`, '2026-04-01', faultDescs[i-1], i % 2 === 0 ? 2 : 1, `维修工${i}`, '2026-04-02 08:00:00', '2026-04-02 17:00:00', 300 + i * 100, '维修完成，设备恢复正常', 3]
        );
    }
      stats.eqp_repair = 10;
    }

    // ===== eqp_scrap =====
    if (await isEmpty('eqp_scrap')) {
      for (let i = 1; i <= 10; i++) {
        const e = existingEquipment[(i - 1) % existingEquipment.length] || eq;
        await conn.execute(
          `INSERT INTO eqp_scrap (scrap_no, equipment_id, equipment_code, equipment_name, scrap_date, scrap_reason, original_value, net_value, approval_person, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [`SC202604${String(i).padStart(3,'0')}`, e.id, e.equipment_code || `EQP00${i}`, e.equipment_name || `设备${i}`, '2026-04-01', `设备使用年限到期，无法继续维修`, 50000 + i * 10000, 1000 + i * 500, `审批人${i}`]
        );
    }
      stats.eqp_scrap = 10;
    }

    // ===== fin_cost_record =====
    const costTypes = ['material', 'labor', 'equipment', 'energy', 'other'];
    const depts = ['生产部', '工程技术部', '品质部', '仓库管理', '采购部'];
    if (await isEmpty('fin_cost_record')) {
      for (let i = 1; i <= 10; i++) {
        await conn.execute(
          `INSERT INTO fin_cost_record (cost_no, cost_type, source_type, source_no, department, amount, cost_date, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [`COST202604${String(i).padStart(3,'0')}`, costTypes[(i-1)%5], i % 2 === 0 ? '生产工单' : '采购订单', `REF${String(i).padStart(6,'0')}`, depts[(i-1)%5], 1000 + i * 500, '2026-04-01', `成本记录-${i}`]
        );
    }
      stats.fin_cost_record = 10;
    }

    // ===== hr_training =====
    const trainingNames = ['ISO 9001质量体系培训', '丝印工艺技术培训', '安全生产培训', '5S管理培训', 'ERP系统操作培训', '品质检验标准培训', '设备操作规程培训', '化学品安全培训', '团队协作培训', '精益生产培训'];
    if (await isEmpty('hr_training')) {
      for (let i = 1; i <= 10; i++) {
        await conn.execute(
          `INSERT INTO hr_training (training_no, training_name, training_type, training_date, training_hours, trainer, training_content, training_place, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)`,
          [`TR202604${String(i).padStart(3,'0')}`, trainingNames[i-1], (i % 3) + 1, '2026-04-01', 4 + i % 4, `讲师${i}`, `${trainingNames[i-1]}课程内容`, `培训室${i % 3 + 1}`]
        );
    }
      stats.hr_training = 10;
    }

    // ===== hr_training_participant =====
    if (await isEmpty('hr_training_participant')) {
      const [trainingIds]: any = await conn.execute('SELECT id FROM hr_training LIMIT 10');
      const [employeeIds]: any = await conn.execute('SELECT id, name FROM sys_employee LIMIT 10');
      let tpCount = 0;
      for (const t of trainingIds) {
        for (let j = 0; j < Math.min(3, employeeIds.length); j++) {
          const emp = employeeIds[j];
          await conn.execute(
            `INSERT INTO hr_training_participant (training_id, employee_id, employee_name, score, is_qualified) VALUES (?, ?, ?, ?, 1)`,
            [t.id, emp.id, emp.name || `员工${emp.id}`, 70 + Math.floor(Math.random() * 30)]
          );
          tpCount++;
        }
      }
      stats.hr_training_participant = tpCount;
    }

    // ===== ink_mixed_record =====
    if (await isEmpty('ink_mixed_record')) {
      const [baseInks]: any = await conn.execute('SELECT id, ink_code, ink_name FROM base_ink LIMIT 10');
      for (let i = 1; i <= 10; i++) {
        const bi = baseInks[(i - 1) % baseInks.length] || { id: i, ink_code: `INK00${i}`, ink_name: `油墨${i}` };
        const colors = ['黑色', '白色', '红色', '蓝色', '绿色', '黄色', '银色', '金色', '透明', '灰色'];
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const loc = existingLocations[(i - 1) % existingLocations.length] || { id: 1 };
        await conn.execute(
          `INSERT INTO ink_mixed_record (record_no, base_ink_id, base_ink_code, base_ink_name, mix_ratio, color_name, color_code, company_id, company_name, mix_time, operator_name, quantity, unit, warehouse_id, location_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, 2)`,
          [`MX202604${String(i).padStart(3,'0')}`, bi.id, bi.ink_code, bi.ink_name, `配方${i}:A${30+i}%+B${40-i}%+C${30}%`, colors[i-1], `C${String(i).padStart(3,'0')}`, 1, 'DC印刷', `调墨师${i}`, 5 + i, 'kg', w.id, loc.id]
        );
    }
      stats.ink_mixed_record = 10;
    }

    // ===== inv_inventory_log =====
    if (await isEmpty('inv_inventory_log')) {
      for (let i = 1; i <= 10; i++) {
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        await conn.execute(
          `INSERT INTO inv_inventory_log (warehouse_id, material_id, change_type, change_qty, order_no, remark, create_time) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [w.id, m.id, i % 2 === 0 ? 'in' : 'out', 100 + i * 10, `REF${i}`, i % 2 === 0 ? '采购入库' : '生产出库']
        );
    }
      stats.inv_inventory_log = 10;
    }

    // ===== inv_production_inbound + inv_production_inbound_item =====
    if (await isEmpty('inv_production_inbound')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        await conn.execute(
          `INSERT INTO inv_production_inbound (inbound_no, work_order_id, work_order_no, warehouse_id, inbound_date, qc_status, status, operator_name) VALUES (?, ?, ?, ?, ?, 1, 2, ?)`,
          [`PI202604${String(i).padStart(3,'0')}`, woItem.id, woItem.order_no || `WO00${i}`, w.id, '2026-04-01', `操作员${i}`]
        );
        const [piRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const piId = piRows[0].id;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
          `INSERT INTO inv_production_inbound_item (inbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [piId, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 1000 + i * 100, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
        );
    }
      stats.inv_production_inbound = 10;
    }

    // ===== inv_sales_outbound + inv_sales_outbound_item =====
    if (await isEmpty('inv_sales_outbound')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const c = existingCustomers[(i - 1) % existingCustomers.length] || cust;
        await conn.execute(
          `INSERT INTO inv_sales_outbound (outbound_no, order_id, order_no, customer_id, customer_name, warehouse_id, outbound_date, delivery_person, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2)`,
          [`SO202604${String(i).padStart(3,'0')}`, i, `ORD${String(i).padStart(6,'0')}`, c.id, c.customer_name || `客户${i}`, w.id, '2026-04-01', `配送员${i}`]
      );
        const [soRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const soId = soRows[0].id;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO inv_sales_outbound_item (outbound_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [soId, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 500 + i * 50, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
      );
    }
      stats.inv_sales_outbound = 10;
    }

    // ===== inv_stock_adjust + inv_stock_adjust_item =====
    if (await isEmpty('inv_stock_adjust')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        await conn.execute(
        `INSERT INTO inv_stock_adjust (adjust_no, warehouse_id, adjust_date, adjust_type, status, operator_name) VALUES (?, ?, ?, ?, 2, ?)`,
        [`ADJ202604${String(i).padStart(3,'0')}`, w.id, '2026-04-01', (i % 3) + 1, `操作员${i}`]
      );
        const [adjRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const adjId = adjRows[0].id;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO inv_stock_adjust_item (adjust_id, material_id, material_code, material_name, before_qty, adjust_qty, after_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [adjId, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 100, i % 2 === 0 ? 10 : -10, i % 2 === 0 ? 110 : 90, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
      );
    }
      stats.inv_stock_adjust = 10;
    }

    // ===== inv_stocktaking + inv_stocktaking_item =====
    if (await isEmpty('inv_stocktaking')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        await conn.execute(
        `INSERT INTO inv_stocktaking (taking_no, warehouse_id, taking_date, taking_type, status, operator_name) VALUES (?, ?, ?, ?, 4, ?)`,
        [`TK202604${String(i).padStart(3,'0')}`, w.id, '2026-04-01', (i % 3) + 1, `盘点员${i}`]
      );
        const [tkRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const tkId = tkRows[0].id;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        const loc = existingLocations[(i - 1) % existingLocations.length] || { id: 1 };
        await conn.execute(
        `INSERT INTO inv_stocktaking_item (taking_id, material_id, material_code, material_name, system_qty, actual_qty, diff_qty, unit, batch_no, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tkId, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 100, 98 + i % 5, 2 - i % 5, m.unit || '张', `B202604${String(i).padStart(2,'0')}`, loc.id]
      );
    }
      stats.inv_stocktaking = 10;
    }

    // ===== inv_transfer_order + inv_transfer_item =====
    if (await isEmpty('inv_transfer_order')) {
      for (let i = 1; i <= 10; i++) {
        const fromWh = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const toWh = existingWarehouses[i % existingWarehouses.length] || wh;
        await conn.execute(
        `INSERT INTO inv_transfer_order (transfer_no, from_warehouse_id, to_warehouse_id, transfer_date, transfer_type, status, operator_name) VALUES (?, ?, ?, ?, ?, 3, ?)`,
        [`TF202604${String(i).padStart(3,'0')}`, fromWh.id, toWh.id, '2026-04-01', i % 2 === 0 ? 2 : 1, `操作员${i}`]
      );
        const [trRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const trId = trRows[0].id;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO inv_transfer_item (transfer_id, material_id, material_code, material_name, quantity, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [trId, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 50 + i * 10, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
      );
    }
      stats.inv_transfer_order = 10;
    }

    // ===== inv_trace_detail =====
    if (await isEmpty('inv_trace_detail')) {
      const [traceRecords]: any = await conn.execute('SELECT id, trace_no FROM inv_trace_record LIMIT 10');
      if (traceRecords.length > 0) {
        for (let i = 1; i <= 10; i++) {
          const tr = traceRecords[(i - 1) % traceRecords.length];
          const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
          const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
          await conn.execute(
            `INSERT INTO inv_trace_detail (trace_id, label_id, label_no, material_code, material_name, specification, batch_no, supplier_name, receive_date, material_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tr.id, i, `LBL00${i}`, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, m.specification || `规格${i}`, `B202604${String(i).padStart(2,'0')}`, s.supplier_name || `供应商${i}`, '2026-04-01', 1]
          );
        }
      }
      stats.inv_trace_detail = traceRecords.length > 0 ? 10 : 0;
    }
    // ===== mdm_product_bom =====
    if (await isEmpty('mdm_product_bom')) {
      for (let i = 1; i <= 10; i++) {
        const p = existingProducts[(i - 1) % existingProducts.length] || prod;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO mdm_product_bom (product_id, version, material_id, material_code, material_name, specification, unit, quantity, loss_rate, sort_order, is_key_material) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, `V${Math.ceil(i/2)}.0`, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, m.specification || `规格${i}`, m.unit || '张', 1 + i * 0.5, 2 + i * 0.5, i, i % 3 === 0 ? 1 : 0]
      );
    }
      stats.mdm_product_bom = 10;
    }

    // ===== mdm_product_route =====
    if (await isEmpty('mdm_product_route')) {
      const processCodes = ['SCR001', 'INK001', 'PRI001', 'DRY001', 'CUT001', 'INS001', 'SCR002', 'INK002', 'PRI002', 'DRY002'];
      const processNames = ['晒版', '调墨', '丝印印刷', '烘干', '模切', '全检', '晒版2', '调墨2', '丝印印刷2', '烘干2'];
      for (let i = 1; i <= 10; i++) {
        const p = existingProducts[(i - 1) % existingProducts.length] || prod;
        await conn.execute(
          `INSERT INTO mdm_product_route (product_id, route_version, process_seq, process_code, process_name, work_center_id, work_center_name, standard_time, setup_time, is_key_process) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, `V1.0`, i, processCodes[i-1], processNames[i-1], 1, `工作中心${i % 3 + 1}`, 30 + i * 5, 10 + i * 2, i % 3 === 0 ? 1 : 0]
        );
    }
      stats.mdm_product_route = 10;
    }
    // ===== plm_product_lifecycle =====
    if (await isEmpty('plm_product_lifecycle')) {
      const lifecycleStages = ['design', 'trial', 'mass', 'mature', 'decline', 'design', 'trial', 'mass', 'mature', 'mature'];
      for (let i = 1; i <= 10; i++) {
        const p = existingProducts[(i - 1) % existingProducts.length] || prod;
        await conn.execute(
          `INSERT INTO plm_product_lifecycle (product_id, product_code, product_name, lifecycle_stage, stage_status, version, change_type, change_reason, change_desc, approver, effective_date) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.product_code || `PRD00${i}`, p.product_name || `产品${i}`, lifecycleStages[i-1], `V${Math.ceil(i/2)}.0`, i % 3 === 0 ? 'major' : 'minor', `阶段变更原因${i}`, `变更描述${i}`, `审批人${i}`, '2026-04-01']
        );
    }
      stats.plm_product_lifecycle = 10;
    }
    // ===== plm_eco =====
    if (await isEmpty('plm_eco')) {
      const ecoTypes = ['design_change', 'process_change', 'material_change', 'bom_change', 'spec_change'];
      for (let i = 1; i <= 10; i++) {
        const p = existingProducts[(i - 1) % existingProducts.length] || prod;
        await conn.execute(
          `INSERT INTO plm_eco (eco_no, eco_type, product_id, product_code, product_name, old_version, new_version, change_reason, change_content, impact_analysis, status, applicant, apply_time, approver, approve_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 3, ?, NOW(), ?, NOW())`,
          [`ECO202604${String(i).padStart(3,'0')}`, ecoTypes[(i-1)%5], p.id, p.product_code || `PRD00${i}`, p.product_name || `产品${i}`, `V${i}.0`, `V${i+1}.0`, `变更原因${i}`, `变更内容${i}`, `影响分析${i}`, `申请人${i}`, `审批人${i}`]
        );
    }
      stats.plm_eco = 10;
    }
    // ===== prd_die =====
    if (await isEmpty('prd_die')) {
      for (let i = 1; i <= 10; i++) {
        const c = existingCustomers[(i - 1) % existingCustomers.length] || cust;
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const loc = existingLocations[(i - 1) % existingLocations.length] || { id: 1 };
        await conn.execute(
        `INSERT INTO prd_die (die_code, die_name, die_type, size_spec, customer_id, product_name, max_use_count, used_count, remaining_count, maintenance_days, last_maintenance_date, next_maintenance_date, warehouse_id, location_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [`DIE00${i}`, `刀模${i}`, i % 2 === 0 ? 2 : 1, `${100+i*10}×${80+i*5}mm`, c.id, `产品${i}`, 50000 + i * 10000, 10000 + i * 2000, 40000 + i * 8000, 180, '2026-01-01', '2026-07-01', w.id, loc.id]
      );
    }
      stats.prd_die = 10;
    }

    // ===== prd_ink =====
    if (await isEmpty('prd_ink')) {
      for (let i = 1; i <= 10; i++) {
        const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
        const colors = ['黑色', '白色', '红色', '蓝色', '绿色', '黄色', '银色', '金色', '透明', '灰色'];
        const inkTypes = [1, 2, 1, 2, 1, 2, 3, 3, 1, 2];
        await conn.execute(
        `INSERT INTO prd_ink (ink_code, ink_name, ink_type, color_name, color_code, brand, supplier_id, unit, specification, stock_qty, safety_stock, shelf_life, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [`PI00${i}`, `生产油墨-${colors[i-1]}`, inkTypes[i-1], colors[i-1], `C${i}`, `品牌${i}`, s.id, 'kg', `SK-${2000+i}`, 50 + i * 5, 10, 365]
      );
    }
      stats.prd_ink = 10;
    }

    // ===== prd_material_issue + prd_material_issue_item =====
    if (await isEmpty('prd_material_issue')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        await conn.execute(
        `INSERT INTO prd_material_issue (issue_no, work_order_id, work_order_no, warehouse_id, issue_date, issue_type, status, operator_name) VALUES (?, ?, ?, ?, ?, ?, 3, ?)`,
        [`MI202604${String(i).padStart(3,'0')}`, woItem.id, woItem.order_no || `WO00${i}`, w.id, '2026-04-01', 1, `操作员${i}`]
      );
        const [miRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO prd_material_issue_item (issue_id, material_id, material_code, material_name, required_qty, issued_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [miRows[0].id, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 1000 + i * 100, 1000 + i * 100, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
      );
    }
      stats.prd_material_issue = 10;
    }

    // ===== prd_material_return + prd_material_return_item =====
    if (await isEmpty('prd_material_return')) {
      for (let i = 1; i <= 10; i++) {
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        await conn.execute(
        `INSERT INTO prd_material_return (return_no, work_order_id, work_order_no, warehouse_id, return_date, status, operator_name) VALUES (?, ?, ?, ?, ?, 3, ?)`,
        [`MR202604${String(i).padStart(3,'0')}`, woItem.id, woItem.order_no || `WO00${i}`, w.id, '2026-04-01', `操作员${i}`]
      );
        const [mrRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO prd_material_return_item (return_id, material_id, material_code, material_name, return_qty, unit, batch_no) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mrRows[0].id, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 10 + i * 5, m.unit || '张', `B202604${String(i).padStart(2,'0')}`]
      );
    }
      stats.prd_material_return = 10;
    }

    // ===== prd_product_label =====
    if (await isEmpty('prd_product_label')) {
      const [existingLabelCount]: any = await conn.execute('SELECT COUNT(*) as cnt FROM prd_product_label');
      if (existingLabelCount[0].cnt === 0) {
        for (let i = 1; i <= 10; i++) {
          const m = existingMaterials[(i + 9) % existingMaterials.length] || mat;
          const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
          await conn.execute(
            `INSERT INTO prd_product_label (label_no, work_order_id, work_order_no, material_id, material_code, material_name, quantity, unit, batch_no, qc_result, print_time, print_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [`LBL202604${String(i).padStart(3,'0')}`, woItem.id, woItem.order_no || `WO00${i}`, m.id, m.material_code || `MAT00${i+10}`, m.material_name || `产品${i+10}`, 100 + i * 10, m.unit || '张', `B202604${String(i).padStart(2,'0')}`, 1, 1, 2]
          );
        }
      }
      stats.prd_product_label = 10;
    }
    // ===== prd_process_card_material =====
    if (await isEmpty('prd_process_card_material')) {
      const [existingPcmCount]: any = await conn.execute('SELECT COUNT(*) as cnt FROM prd_process_card_material');
      if (existingPcmCount[0].cnt === 0) {
        const [processCards]: any = await conn.execute('SELECT id, card_no FROM prd_process_card LIMIT 10');
        const [productLabels]: any = await conn.execute('SELECT id, label_no FROM prd_product_label LIMIT 10');
        if (processCards.length > 0 && productLabels.length > 0) {
          for (let i = 0; i < Math.min(10, processCards.length); i++) {
            const m = existingMaterials[i % existingMaterials.length] || mat;
            const pl = productLabels[i % productLabels.length];
            await conn.execute(
              `INSERT INTO prd_process_card_material (card_id, card_no, label_id, label_no, material_type, material_code, material_name, specification, batch_no, quantity, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [processCards[i].id, processCards[i].card_no || `PC00${i+1}`, pl.id, pl.label_no || `LBL00${i+1}`, 1, m.material_code || `MAT00${i+1}`, m.material_name || `物料${i+1}`, m.specification || `规格${i+1}`, `B202604${String(i+1).padStart(2,'0')}`, 100 + (i+1) * 10, m.unit || '张']
            );
          }
          stats.prd_process_card_material = Math.min(10, processCards.length);
        }
      } else {
        stats.prd_process_card_material = existingPcmCount[0].cnt;
      }
    }

    // ===== prd_screen_plate =====
    if (await isEmpty('prd_screen_plate')) {
      for (let i = 1; i <= 10; i++) {
        const c = existingCustomers[(i - 1) % existingCustomers.length] || cust;
        const w = existingWarehouses[(i - 1) % existingWarehouses.length] || wh;
        const loc = existingLocations[(i - 1) % existingLocations.length] || { id: 1 };
        await conn.execute(
          `INSERT INTO prd_screen_plate (plate_code, plate_name, plate_type, mesh_count, size_spec, customer_id, product_name, max_use_count, used_count, remaining_count, maintenance_days, last_maintenance_date, next_maintenance_date, warehouse_id, location_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [`SP00${i}`, `网版${i}`, 2, `${200 + i * 20}`, `${100+i*10}×${80+i*5}mm`, c.id, `产品${i}`, 50000 + i * 10000, 10000 + i * 2000, 40000 + i * 8000, 90, '2026-01-01', '2026-04-01', w.id, loc.id]
        );
    }
      stats.prd_screen_plate = 10;
    }

    // ===== prod_work_order_material_req =====
    if (await isEmpty('prod_work_order_material_req')) {
      for (let i = 1; i <= 10; i++) {
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        const bl = existingBomLines[(i - 1) % existingBomLines.length] || { id: i };
        await conn.execute(
        `INSERT INTO prod_work_order_material_req (work_order_id, bom_line_id, material_id, material_name, required_qty, unit) VALUES (?, ?, ?, ?, ?, ?)`,
        [woItem.id, bl.id, m.id, m.material_name || `物料${i}`, 1000 + i * 100, m.unit || '张']
      );
    }
      stats.prod_work_order_material_req = 10;
    }

    // ===== pur_order + pur_order_detail =====
    if (await isEmpty('pur_order')) {
      for (let i = 1; i <= 10; i++) {
        const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
        await conn.execute(
        `INSERT INTO pur_order (order_no, order_date, supplier_id, contact_name, contact_phone, delivery_address, total_amount, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)`,
        [`PO202604${String(i).padStart(3,'0')}`, '2026-04-01', s.id, `联系人${i}`, `1380000${String(i).padStart(4,'0')}`, `地址${i}`, 10000 + i * 2000, '2026-04-15']
      );
        const [poRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        const qty = 100 + i * 10;
        const price = m.purchase_price || 10.00;
        await conn.execute(
        `INSERT INTO pur_order_detail (order_id, material_id, quantity, unit, unit_price, tax_rate, amount, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [poRows[0].id, m.id, qty, m.unit || '张', price, 13.00, qty * price, qty * price * 0.13, qty * price * 1.13]
      );
    }
      stats.pur_order = 10;
    }

    // ===== pur_request + pur_request_item + pur_request_approve =====
    if (await isEmpty('pur_request')) {
      for (let i = 1; i <= 10; i++) {
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO pur_request (request_no, request_date, request_type, request_dept, requester_name, status) VALUES (?, ?, ?, ?, ?, 3)`,
        [`PR202604${String(i).padStart(3,'0')}`, '2026-04-01', `${(i % 3) + 1}`, `部门${i}`, `申请人${i}`]
      );
        const [prRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const qty = 50 + i * 10;
        const price = m.purchase_price || 10.00;
        await conn.execute(
        `INSERT INTO pur_request_item (request_id, line_no, material_code, material_name, material_spec, material_unit, quantity, price, amount, expected_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [prRows[0].id, i, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, m.specification || `规格${i}`, m.unit || '张', qty, price, qty * price, '2026-04-10']
      );
        await conn.execute(
        `INSERT INTO pur_request_approve (request_id, approver_id, approver_name, approve_action, approve_status, approve_remark) VALUES (?, ?, ?, ?, ?, ?)`,
        [prRows[0].id, 1, `审批人${i}`, 'approve', 1, `审批通过${i}`]
      );
    }
      stats.pur_request = 10;
    }

    // ===== pur_return_order =====
    if (await isEmpty('pur_return_order')) {
      for (let i = 1; i <= 10; i++) {
        const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
        const returnTypes = ['qc_fail', 'damage', 'wrong_item', 'over_order', 'other', 'qc_fail', 'damage', 'wrong_item', 'over_order', 'other'];
        await conn.execute(
        `INSERT INTO pur_return_order (rtv_no, po_id, po_no, supplier_id, supplier_name, return_date, total_qty, total_amount, status, return_type, return_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?)`,
        [`RTV202604${String(i).padStart(3,'0')}`, i, `PO202604${String(i).padStart(3,'0')}`, s.id, s.supplier_name || `供应商${i}`, '2026-04-01', 10 + i, 500 + i * 100, returnTypes[i-1], `退货原因${i}`]
      );
    }
      stats.pur_return_order = 10;
    }

    // ===== qc_incoming_inspection + qc_incoming_inspection_item =====
    if (await isEmpty('qc_incoming_inspection')) {
      for (let i = 1; i <= 10; i++) {
        const s = existingSuppliers[(i - 1) % existingSuppliers.length] || sup;
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO qc_incoming_inspection (inspection_no, inspection_date, supplier_id, supplier_name, material_id, material_code, material_name, specification, batch_no, quantity, unit, inspection_type, inspection_result, qualified_qty, unqualified_qty, inspector_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`QCI202604${String(i).padStart(3,'0')}`, '2026-04-01', s.id, s.supplier_name || `供应商${i}`, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, m.specification || `规格${i}`, `B202604${String(i).padStart(2,'0')}`, 100 + i * 10, m.unit || '张', 1, 1, 98 + i, 2 + (10 - i), `检验员${i}`]
      );
        const [qciRows]: any = await conn.execute('SELECT LAST_INSERT_ID() as id');
        const items = ['外观检查', '尺寸测量', '色差检测', '附着力测试', '耐溶剂性'];
      for (let j = 0; j < Math.min(3, items.length); j++) {
        await conn.execute(
          `INSERT INTO qc_incoming_inspection_item (inspection_id, item_name, standard, actual_value, result) VALUES (?, ?, ?, ?, ?)`,
          [qciRows[0].id, items[j], `标准${j+1}`, `实际值${j+1}`, 1]
        );
    }
    }
      stats.qc_incoming_inspection = 10;
    }

    // ===== qc_process_inspection =====
    if (await isEmpty('qc_process_inspection')) {
      for (let i = 1; i <= 10; i++) {
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        const m = existingMaterials[(i + 9) % existingMaterials.length] || mat;
        const processNames = ['晒版', '调墨', '丝印印刷', '烘干', '模切', '全检', '晒版', '调墨', '丝印印刷', '烘干'];
        await conn.execute(
        `INSERT INTO qc_process_inspection (inspection_no, inspection_date, work_order_id, work_order_no, process_name, product_id, product_code, product_name, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`QCP202604${String(i).padStart(3,'0')}`, '2026-04-01', woItem.id, woItem.order_no || `WO00${i}`, processNames[i-1], m.id, m.material_code || `MAT00${i+10}`, m.material_name || `产品${i+10}`, 1000 + i * 100, 980 + i * 10, 20 + (10 - i), 1, `检验员${i}`]
      );
    }
      stats.qc_process_inspection = 10;
    }

    // ===== qc_final_inspection =====
    if (await isEmpty('qc_final_inspection')) {
      for (let i = 1; i <= 10; i++) {
        const woItem = existingWorkOrders[(i - 1) % existingWorkOrders.length] || wo;
        const m = existingMaterials[(i + 9) % existingMaterials.length] || mat;
        await conn.execute(
        `INSERT INTO qc_final_inspection (inspection_no, inspection_date, work_order_id, work_order_no, product_id, product_code, product_name, batch_no, inspection_qty, qualified_qty, unqualified_qty, inspection_result, inspector_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`QCF202604${String(i).padStart(3,'0')}`, '2026-04-01', woItem.id, woItem.order_no || `WO00${i}`, m.id, m.material_code || `MAT00${i+10}`, m.material_name || `产品${i+10}`, `B202604${String(i).padStart(2,'0')}`, 1000 + i * 100, 990 + i * 5, 10 + (10 - i), 1, `检验员${i}`]
      );
    }
      stats.qc_final_inspection = 10;
    }

    // ===== qc_unqualified_handle =====
    if (await isEmpty('qc_unqualified_handle')) {
      const [unqualifiedRecords]: any = await conn.execute('SELECT id, unqualified_no FROM qc_unqualified LIMIT 10');
      const handleTypes = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1];
      for (let i = 1; i <= 10; i++) {
        const m = existingMaterials[(i - 1) % existingMaterials.length] || mat;
        await conn.execute(
          `INSERT INTO qc_unqualified_handle (handle_no, inspection_id, material_id, material_code, material_name, unqualified_qty, handle_type, handle_status, responsible_dept, responsible_person, handle_result, cost_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`UQH202604${String(i).padStart(3,'0')}`, unqualifiedRecords.length > 0 ? unqualifiedRecords[(i-1) % unqualifiedRecords.length].id : i, m.id, m.material_code || `MAT00${i}`, m.material_name || `物料${i}`, 10 + i, handleTypes[i-1], 3, `部门${i % 5 + 1}`, `责任人${i}`, `处理结果${i}`, 100 + i * 50]
        );
    }
      stats.qc_unqualified_handle = 10;
    }
    // ===== sys_notice =====
    if (await isEmpty('sys_notice')) {
      const noticeTitles = ['系统升级通知', '五一放假通知', '质量月活动通知', '安全生产通知', '设备维护通知', '培训安排通知', '新功能上线通知', '库存盘点通知', '供应商评审通知', '月度例会通知'];
      for (let i = 1; i <= 10; i++) {
        await conn.execute(
          `INSERT INTO sys_notice (notice_title, notice_type, notice_content, status) VALUES (?, ?, ?, 1)`,
          [noticeTitles[i-1], (i % 3) + 1, `${noticeTitles[i-1]}内容详情，请相关人员注意查看。`]
        );
    }
      stats.sys_notice = 10;
    }
    // ===== sys_oper_log =====
    if (await isEmpty('sys_oper_log')) {
      const operMethods = ['GET', 'POST', 'PUT', 'DELETE'];
      const operModules = ['订单管理', '仓库管理', '生产管理', '采购管理', '品质管理', '财务管理', '设备管理', '客户管理', '供应商管理', '系统设置'];
      for (let i = 1; i <= 10; i++) {
        await conn.execute(
          `INSERT INTO sys_oper_log (title, business_type, method, request_method, oper_name, oper_url, oper_ip, status, oper_time) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
          [operModules[i-1], (i % 4), `/api/${operModules[i-1]}/operation`, operMethods[(i-1)%4], `操作员${i}`, `/api/v1/module${i}`, `192.168.0.${100+i}`]
        );
    }
      stats.sys_oper_log = 10;
    }
    // ===== sys_operation_log =====
    if (await isEmpty('sys_operation_log')) {
      const opTypes = ['create', 'update', 'delete', 'query', 'export', 'create', 'update', 'delete', 'query', 'export'];
      const opModules = ['订单管理', '仓库管理', '生产管理', '采购管理', '品质管理', '财务管理', '设备管理', '客户管理', '供应商管理', '系统设置'];
      const opMethods = ['GET', 'POST', 'PUT', 'DELETE'];
      for (let i = 1; i <= 10; i++) {
        await conn.execute(
          `INSERT INTO sys_operation_log (title, oper_name, oper_type, oper_method, oper_url, oper_ip, status, oper_time) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
          [opModules[i-1], 'admin', opTypes[i-1], opMethods[(i-1)%4], `/api/v1/module${i}`, `192.168.0.${100+i}`]
        );
    }
      stats.sys_operation_log = 10;
    }

    return stats;
  });

  return successResponse(result);
});