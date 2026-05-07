import { NextRequest } from 'next/server';
import { query, execute, queryOne, transaction } from '@/lib/db';
import { successResponse, errorResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    try { await conn.execute(`ALTER TABLE inv_warehouse ADD COLUMN category_id INT UNSIGNED DEFAULT NULL COMMENT '仓库分类ID' AFTER id`); } catch (e: any) {}
    try { await conn.execute(`ALTER TABLE inv_warehouse ADD KEY idx_category_id (category_id)`); } catch (e: any) {}

    try { await conn.execute(`ALTER TABLE inv_inventory ADD COLUMN locked_qty DECIMAL(12,4) DEFAULT 0 COMMENT '锁定数量' AFTER quantity`); } catch (e: any) {}
    try { await conn.execute(`ALTER TABLE inv_inventory ADD COLUMN available_qty DECIMAL(12,4) DEFAULT 0 COMMENT '可用数量' AFTER locked_qty`); } catch (e: any) {}
    try { await conn.execute(`ALTER TABLE inv_inventory ADD COLUMN batch_no VARCHAR(100) DEFAULT NULL COMMENT '批次号' AFTER available_qty`); } catch (e: any) {}

    await conn.execute('DELETE FROM inv_inventory');
    await conn.execute('ALTER TABLE inv_inventory AUTO_INCREMENT = 1');
    await conn.execute('DELETE FROM inv_material');
    await conn.execute('ALTER TABLE inv_material AUTO_INCREMENT = 1');
    await conn.execute('DELETE FROM inv_material_category');
    await conn.execute('ALTER TABLE inv_material_category AUTO_INCREMENT = 1');
    await conn.execute('DELETE FROM inv_warehouse');
    await conn.execute('ALTER TABLE inv_warehouse AUTO_INCREMENT = 1');
    await conn.execute('DELETE FROM sys_warehouse_category');
    await conn.execute('ALTER TABLE sys_warehouse_category AUTO_INCREMENT = 1');

    const warehouseCategories = [
      { code: 'WHCAT001', name: '原材料仓', description: '存放PET薄膜、PVC薄膜、不干胶等原材料', sort_order: 1 },
      { code: 'WHCAT002', name: '半成品仓', description: '存放丝印后待模切的半成品物料', sort_order: 2 },
      { code: 'WHCAT003', name: '成品仓', description: '存放已完成检验的成品标签和包装膜', sort_order: 3 },
      { code: 'WHCAT004', name: '辅料仓', description: '存放网版、刀模、保护膜等辅助材料', sort_order: 4 },
      { code: 'WHCAT005', name: '油墨仓', description: '存放丝印油墨、UV油墨、溶剂型油墨', sort_order: 5 },
      { code: 'WHCAT006', name: '危化品仓', description: '存放易燃易爆化学品，需双人双锁管理', sort_order: 6 },
      { code: 'WHCAT007', name: '冷藏仓', description: '存放需2-8°C低温保存的特殊油墨和银浆', sort_order: 7 },
      { code: 'WHCAT008', name: '待检仓', description: '存放待IQC检验的来料和待FQC检验的成品', sort_order: 8 },
      { code: 'WHCAT009', name: '退货仓', description: '存放客户退货品和供应商退货品', sort_order: 9 },
      { code: 'WHCAT010', name: '废品仓', description: '存放不合格品、生产废料和过期物料', sort_order: 10 },
      { code: 'WHCAT011', name: '包材仓', description: '存放纸箱、木托盘、缠绕膜、气泡袋等包装材料', sort_order: 11 },
      { code: 'WHCAT012', name: '备件仓', description: '存放设备备件、模具配件、网框等维修备件', sort_order: 12 },
      { code: 'WHCAT013', name: '样品仓', description: '存放客户样品、色卡、材料样板、打样成品', sort_order: 13 },
      { code: 'WHCAT014', name: '暂存仓', description: '生产过程中临时存放待流转的半成品', sort_order: 14 },
      { code: 'WHCAT015', name: '外协仓', description: '存放外协加工发出的物料和收回的成品', sort_order: 15 },
      { code: 'WHCAT016', name: '模具仓', description: '存放刀模、烫金版、击凸版等模具', sort_order: 16 },
      { code: 'WHCAT017', name: '网版仓', description: '存放丝印网版、移印钢板等印刷网版', sort_order: 17 },
      { code: 'WHCAT018', name: '溶剂仓', description: '存放稀释剂、洗网水、慢干水等溶剂类', sort_order: 18 },
      { code: 'WHCAT019', name: '光油仓', description: '存放UV光油、水性光油、哑油等表面处理材料', sort_order: 19 },
      { code: 'WHCAT020', name: '银浆仓', description: '存放导电银浆、导热银浆等特殊导电材料', sort_order: 20 },
    ];
    for (const cat of warehouseCategories) {
      await conn.execute(
        `INSERT INTO sys_warehouse_category (code, name, description, sort_order, status) VALUES (?, ?, ?, ?, ?)`,
        [cat.code, cat.name, cat.description, cat.sort_order, 1]
      );
    }
    stats.sys_warehouse_category = warehouseCategories.length;

    const [whCatRows]: any = await conn.execute('SELECT id, code FROM sys_warehouse_category ORDER BY id');
    const whCatMap: Record<string, number> = {};
    for (const row of whCatRows) whCatMap[row.code] = row.id;

    const warehouses = [
      { code: 'WH-RM-001', name: 'PET薄膜原料仓', type: 1, province: '广东', city: '深圳', address: 'A栋1层A区', phone: '13800138001', remark: '存放PET薄膜卷材', catCode: 'WHCAT001' },
      { code: 'WH-RM-002', name: 'PVC薄膜原料仓', type: 1, province: '广东', city: '深圳', address: 'A栋1层B区', phone: '13800138002', remark: '存放PVC薄膜卷材', catCode: 'WHCAT001' },
      { code: 'WH-SF-001', name: '丝印半成品仓', type: 2, province: '广东', city: '深圳', address: 'A栋2层A区', phone: '13800138003', remark: '存放丝印后半成品', catCode: 'WHCAT002' },
      { code: 'WH-SF-002', name: '模切半成品仓', type: 2, province: '广东', city: '深圳', address: 'A栋2层B区', phone: '13800138004', remark: '存放模切后半成品', catCode: 'WHCAT002' },
      { code: 'WH-FG-001', name: '标签成品仓', type: 3, province: '广东', city: '深圳', address: 'B栋1层A区', phone: '13800138005', remark: '存放成品标签', catCode: 'WHCAT003' },
      { code: 'WH-FG-002', name: '包装膜成品仓', type: 3, province: '广东', city: '深圳', address: 'B栋1层B区', phone: '13800138006', remark: '存放成品包装膜', catCode: 'WHCAT003' },
      { code: 'WH-FL-001', name: '网版存放仓', type: 4, province: '广东', city: '深圳', address: 'C栋1层A区', phone: '13800138007', remark: '存放丝印网版', catCode: 'WHCAT004' },
      { code: 'WH-FL-002', name: '刀模存放仓', type: 4, province: '广东', city: '深圳', address: 'C栋1层B区', phone: '13800138008', remark: '存放模切刀模', catCode: 'WHCAT004' },
      { code: 'WH-YM-001', name: 'UV油墨仓', type: 5, province: '广东', city: '深圳', address: 'D栋1层A区', phone: '13800138009', remark: '存放UV油墨', catCode: 'WHCAT005' },
      { code: 'WH-YM-002', name: '溶剂油墨仓', type: 5, province: '广东', city: '深圳', address: 'D栋1层B区', phone: '13800138010', remark: '存放溶剂型油墨', catCode: 'WHCAT005' },
      { code: 'WH-WH-001', name: '危化品主仓', type: 6, province: '广东', city: '深圳', address: 'E栋独立仓A区', phone: '13800138011', remark: '双人双锁管理', catCode: 'WHCAT006' },
      { code: 'WH-WH-002', name: '危化品副仓', type: 6, province: '广东', city: '深圳', address: 'E栋独立仓B区', phone: '13800138012', remark: '双人双锁管理', catCode: 'WHCAT006' },
      { code: 'WH-LC-001', name: '冷藏主仓', type: 7, province: '广东', city: '深圳', address: 'F栋恒温区A区', phone: '13800138013', remark: '2-8°C恒温存储', catCode: 'WHCAT007' },
      { code: 'WH-LC-002', name: '冷藏副仓', type: 7, province: '广东', city: '深圳', address: 'F栋恒温区B区', phone: '13800138014', remark: '2-8°C恒温存储', catCode: 'WHCAT007' },
      { code: 'WH-DJ-001', name: '来料待检仓', type: 8, province: '广东', city: '深圳', address: 'G栋检验区A区', phone: '13800138015', remark: 'IQC来料检验区', catCode: 'WHCAT008' },
      { code: 'WH-DJ-002', name: '成品待检仓', type: 8, province: '广东', city: '深圳', address: 'G栋检验区B区', phone: '13800138016', remark: 'FQC成品检验区', catCode: 'WHCAT008' },
      { code: 'WH-TH-001', name: '客户退货仓', type: 9, province: '广东', city: '深圳', address: 'H栋退货区A区', phone: '13800138017', remark: '客户退货品存放', catCode: 'WHCAT009' },
      { code: 'WH-TH-002', name: '供应商退货仓', type: 9, province: '广东', city: '深圳', address: 'H栋退货区B区', phone: '13800138018', remark: '供应商退货品存放', catCode: 'WHCAT009' },
      { code: 'WH-FP-001', name: '不合格品仓', type: 10, province: '广东', city: '深圳', address: 'I栋废品区A区', phone: '13800138019', remark: '不合格品隔离存放', catCode: 'WHCAT010' },
      { code: 'WH-FP-002', name: '生产废料仓', type: 10, province: '广东', city: '深圳', address: 'I栋废品区B区', phone: '13800138020', remark: '生产废料和边角料', catCode: 'WHCAT010' },
    ];
    for (const wh of warehouses) {
      await conn.execute(
        `INSERT INTO inv_warehouse (warehouse_code, warehouse_name, category_id, warehouse_type, province, city, address, contact_phone, status, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [wh.code, wh.name, whCatMap[wh.catCode] || null, wh.type, wh.province, wh.city, wh.address, wh.phone, wh.remark]
      );
    }
    stats.inv_warehouse = warehouses.length;

    const [whRows]: any = await conn.execute('SELECT id, warehouse_code FROM inv_warehouse ORDER BY id');
    const whMap: Record<string, number> = {};
    for (const row of whRows) whMap[row.warehouse_code] = row.id;

    const materialCategories = [
      { code: 'MATCAT-001', name: 'PET薄膜', parent_id: 0, type: 1, sort: 1, remark: '聚酯薄膜材料' },
      { code: 'MATCAT-002', name: 'PVC薄膜', parent_id: 0, type: 1, sort: 2, remark: '聚氯乙烯薄膜材料' },
      { code: 'MATCAT-003', name: 'BOPP薄膜', parent_id: 0, type: 1, sort: 3, remark: '双向拉伸聚丙烯薄膜' },
      { code: 'MATCAT-004', name: 'PE保护膜', parent_id: 0, type: 1, sort: 4, remark: '聚乙烯保护膜' },
      { code: 'MATCAT-005', name: '不干胶材料', parent_id: 0, type: 1, sort: 5, remark: '自粘标签材料' },
      { code: 'MATCAT-006', name: 'UV油墨', parent_id: 0, type: 2, sort: 6, remark: '紫外光固化油墨' },
      { code: 'MATCAT-007', name: '溶剂型油墨', parent_id: 0, type: 2, sort: 7, remark: '溶剂挥发干燥型油墨' },
      { code: 'MATCAT-008', name: '水性油墨', parent_id: 0, type: 2, sort: 8, remark: '水溶性环保油墨' },
      { code: 'MATCAT-009', name: '导电银浆', parent_id: 0, type: 2, sort: 9, remark: '导电印刷银浆' },
      { code: 'MATCAT-010', name: '丝印网版', parent_id: 0, type: 3, sort: 10, remark: '丝网印刷网版' },
      { code: 'MATCAT-011', name: '模切刀模', parent_id: 0, type: 3, sort: 11, remark: '模切用刀模' },
      { code: 'MATCAT-012', name: '稀释剂', parent_id: 0, type: 3, sort: 12, remark: '油墨稀释溶剂' },
      { code: 'MATCAT-013', name: 'UV光油', parent_id: 0, type: 3, sort: 13, remark: '紫外光固化光油' },
      { code: 'MATCAT-014', name: '包装材料', parent_id: 0, type: 3, sort: 14, remark: '纸箱、托盘等包装材料' },
      { code: 'MATCAT-015', name: '标签成品', parent_id: 0, type: 4, sort: 15, remark: '成品标签' },
      { code: 'MATCAT-016', name: '包装膜成品', parent_id: 0, type: 4, sort: 16, remark: '成品包装膜' },
      { code: 'MATCAT-017', name: '烫金版', parent_id: 0, type: 3, sort: 17, remark: '烫金用金属版' },
      { code: 'MATCAT-018', name: '洗网水', parent_id: 0, type: 3, sort: 18, remark: '网版清洗溶剂' },
      { code: 'MATCAT-019', name: '慢干水', parent_id: 0, type: 3, sort: 19, remark: '油墨慢干调节剂' },
      { code: 'MATCAT-020', name: '哑油', parent_id: 0, type: 3, sort: 20, remark: '哑光表面处理油' },
    ];
    for (const cat of materialCategories) {
      await conn.execute(
        `INSERT INTO inv_material_category (category_code, category_name, parent_id, category_type, sort_order, remark) VALUES (?, ?, ?, ?, ?, ?)`,
        [cat.code, cat.name, cat.parent_id, cat.type, cat.sort, cat.remark]
      );
    }
    stats.inv_material_category = materialCategories.length;

    const [matCatRows]: any = await conn.execute('SELECT id, category_code FROM inv_material_category ORDER BY id');
    const matCatMap: Record<string, number> = {};
    for (const row of matCatRows) matCatMap[row.category_code] = row.id;

    const materials = [
      { code: 'MAT-PET-001', name: 'PET透明膜0.1mm', spec: '0.1mm×1000mm', unit: 'KG', catCode: 'MATCAT-001', whCode: 'WH-RM-001', safety: 500, price: 25.50 },
      { code: 'MAT-PET-002', name: 'PET白膜0.125mm', spec: '0.125mm×1000mm', unit: 'KG', catCode: 'MATCAT-001', whCode: 'WH-RM-001', safety: 400, price: 28.00 },
      { code: 'MAT-PVC-001', name: 'PVC透明膜0.15mm', spec: '0.15mm×1200mm', unit: 'KG', catCode: 'MATCAT-002', whCode: 'WH-RM-002', safety: 350, price: 18.50 },
      { code: 'MAT-PVC-002', name: 'PVC白膜0.2mm', spec: '0.2mm×1200mm', unit: 'KG', catCode: 'MATCAT-002', whCode: 'WH-RM-002', safety: 300, price: 20.00 },
      { code: 'MAT-BOPP-001', name: 'BOPP透明膜0.08mm', spec: '0.08mm×1100mm', unit: 'KG', catCode: 'MATCAT-003', whCode: 'WH-RM-001', safety: 450, price: 15.00 },
      { code: 'MAT-PE-001', name: 'PE保护膜0.05mm', spec: '0.05mm×1000mm', unit: 'KG', catCode: 'MATCAT-004', whCode: 'WH-RM-001', safety: 600, price: 12.00 },
      { code: 'MAT-ADH-001', name: '不干胶铜版纸80g', spec: '80g×1000mm', unit: 'KG', catCode: 'MATCAT-005', whCode: 'WH-RM-001', safety: 500, price: 22.00 },
      { code: 'MAT-UV-001', name: 'UV油墨-黑色', spec: '1KG/罐', unit: 'KG', catCode: 'MATCAT-006', whCode: 'WH-YM-001', safety: 100, price: 180.00 },
      { code: 'MAT-UV-002', name: 'UV油墨-白色', spec: '1KG/罐', unit: 'KG', catCode: 'MATCAT-006', whCode: 'WH-YM-001', safety: 120, price: 170.00 },
      { code: 'MAT-SOL-001', name: '溶剂型油墨-黑色', spec: '5KG/桶', unit: 'KG', catCode: 'MATCAT-007', whCode: 'WH-YM-002', safety: 150, price: 95.00 },
      { code: 'MAT-SOL-002', name: '溶剂型油墨-白色', spec: '5KG/桶', unit: 'KG', catCode: 'MATCAT-007', whCode: 'WH-YM-002', safety: 150, price: 90.00 },
      { code: 'MAT-WB-001', name: '水性油墨-黑色', spec: '5KG/桶', unit: 'KG', catCode: 'MATCAT-008', whCode: 'WH-YM-001', safety: 100, price: 75.00 },
      { code: 'MAT-AG-001', name: '导电银浆-高导电', spec: '500G/瓶', unit: 'G', catCode: 'MATCAT-009', whCode: 'WH-LC-001', safety: 50, price: 3500.00 },
      { code: 'MAT-SCR-001', name: '丝印网版-300目', spec: '300目×600×800mm', unit: 'PCS', catCode: 'MATCAT-010', whCode: 'WH-FL-001', safety: 30, price: 280.00 },
      { code: 'MAT-DIE-001', name: '模切刀模-平板', spec: '500×400mm', unit: 'PCS', catCode: 'MATCAT-011', whCode: 'WH-FL-002', safety: 20, price: 650.00 },
      { code: 'MAT-THN-001', name: '稀释剂-标准型', spec: '20L/桶', unit: 'L', catCode: 'MATCAT-012', whCode: 'WH-WH-001', safety: 200, price: 35.00 },
      { code: 'MAT-VAR-001', name: 'UV光油-高光', spec: '5KG/桶', unit: 'KG', catCode: 'MATCAT-013', whCode: 'WH-YM-001', safety: 80, price: 150.00 },
      { code: 'MAT-PKG-001', name: '纸箱-标准型', spec: '400×300×200mm', unit: 'PCS', catCode: 'MATCAT-014', whCode: 'WH-FG-001', safety: 1000, price: 3.50 },
      { code: 'MAT-FG-001', name: '标签成品-电子标签', spec: '50×30mm', unit: 'PCS', catCode: 'MATCAT-015', whCode: 'WH-FG-001', safety: 10000, price: 0.15 },
      { code: 'MAT-FG-002', name: '包装膜成品-热收缩膜', spec: '0.15mm×800mm', unit: 'KG', catCode: 'MATCAT-016', whCode: 'WH-FG-002', safety: 2000, price: 32.00 },
    ];
    for (const mat of materials) {
      await conn.execute(
        `INSERT INTO inv_material (material_code, material_name, specification, unit, category_id, warehouse_id, safety_stock, purchase_price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mat.code, mat.name, mat.spec, mat.unit, matCatMap[mat.catCode] || null, whMap[mat.whCode] || null, mat.safety, mat.price]
      );
    }
    stats.inv_material = materials.length;

    const [matRows]: any = await conn.execute('SELECT id, material_code FROM inv_material ORDER BY id');
    const matMap: Record<string, number> = {};
    for (const row of matRows) matMap[row.material_code] = row.id;

    const inventories = [
      { matCode: 'MAT-PET-001', whCode: 'WH-RM-001', qty: 850, locked: 50, batch: 'B20240501001' },
      { matCode: 'MAT-PET-002', whCode: 'WH-RM-001', qty: 620, locked: 30, batch: 'B20240502001' },
      { matCode: 'MAT-PVC-001', whCode: 'WH-RM-002', qty: 480, locked: 20, batch: 'B20240503001' },
      { matCode: 'MAT-PVC-002', whCode: 'WH-RM-002', qty: 390, locked: 15, batch: 'B20240504001' },
      { matCode: 'MAT-BOPP-001', whCode: 'WH-RM-001', qty: 720, locked: 40, batch: 'B20240505001' },
      { matCode: 'MAT-PE-001', whCode: 'WH-RM-001', qty: 950, locked: 60, batch: 'B20240506001' },
      { matCode: 'MAT-ADH-001', whCode: 'WH-RM-001', qty: 680, locked: 35, batch: 'B20240507001' },
      { matCode: 'MAT-UV-001', whCode: 'WH-YM-001', qty: 180, locked: 10, batch: 'B20240508001' },
      { matCode: 'MAT-UV-002', whCode: 'WH-YM-001', qty: 210, locked: 15, batch: 'B20240509001' },
      { matCode: 'MAT-SOL-001', whCode: 'WH-YM-002', qty: 260, locked: 20, batch: 'B20240510001' },
      { matCode: 'MAT-SOL-002', whCode: 'WH-YM-002', qty: 240, locked: 18, batch: 'B20240511001' },
      { matCode: 'MAT-WB-001', whCode: 'WH-YM-001', qty: 150, locked: 8, batch: 'B20240512001' },
      { matCode: 'MAT-AG-001', whCode: 'WH-LC-001', qty: 85, locked: 5, batch: 'B20240513001' },
      { matCode: 'MAT-SCR-001', whCode: 'WH-FL-001', qty: 45, locked: 3, batch: 'B20240514001' },
      { matCode: 'MAT-DIE-001', whCode: 'WH-FL-002', qty: 32, locked: 2, batch: 'B20240515001' },
      { matCode: 'MAT-THN-001', whCode: 'WH-WH-001', qty: 350, locked: 25, batch: 'B20240516001' },
      { matCode: 'MAT-VAR-001', whCode: 'WH-YM-001', qty: 130, locked: 10, batch: 'B20240517001' },
      { matCode: 'MAT-PKG-001', whCode: 'WH-FG-001', qty: 2500, locked: 200, batch: 'B20240518001' },
      { matCode: 'MAT-FG-001', whCode: 'WH-FG-001', qty: 18000, locked: 500, batch: 'B20240519001' },
      { matCode: 'MAT-FG-002', whCode: 'WH-FG-002', qty: 4500, locked: 300, batch: 'B20240520001' },
    ];
    for (const inv of inventories) {
      await conn.execute(
        `INSERT INTO inv_inventory (material_id, warehouse_id, quantity, locked_qty, available_qty, batch_no)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [matMap[inv.matCode] || null, whMap[inv.whCode] || null, inv.qty, inv.locked, inv.qty - inv.locked, inv.batch]
      );
    }
    stats.inv_inventory = inventories.length;

    return stats;
  });

  const verification = await verifyDataIntegrity();

  return successResponse({
    stats: result,
    verification,
  }, '仓库分类种子数据初始化成功');
}, '初始化仓库分类种子数据失败');

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, any> = {};

  const whCatCount: any = await queryOne('SELECT COUNT(*) as cnt FROM sys_warehouse_category WHERE deleted = 0');
  details.warehouse_category_count = whCatCount?.cnt || 0;
  if (details.warehouse_category_count !== 20) errors.push(`仓库分类数量不正确: 期望20, 实际${details.warehouse_category_count}`);

  const whCount: any = await queryOne('SELECT COUNT(*) as cnt FROM inv_warehouse WHERE deleted = 0');
  details.warehouse_count = whCount?.cnt || 0;
  if (details.warehouse_count !== 20) errors.push(`仓库数量不正确: 期望20, 实际${details.warehouse_count}`);

  const matCatCount: any = await queryOne('SELECT COUNT(*) as cnt FROM inv_material_category WHERE deleted = 0');
  details.material_category_count = matCatCount?.cnt || 0;
  if (details.material_category_count !== 20) errors.push(`物料分类数量不正确: 期望20, 实际${details.material_category_count}`);

  const matCount: any = await queryOne('SELECT COUNT(*) as cnt FROM inv_material WHERE deleted = 0');
  details.material_count = matCount?.cnt || 0;
  if (details.material_count !== 20) errors.push(`物料数量不正确: 期望20, 实际${details.material_count}`);

  const invCount: any = await queryOne('SELECT COUNT(*) as cnt FROM inv_inventory WHERE deleted = 0');
  details.inventory_count = invCount?.cnt || 0;
  if (details.inventory_count !== 20) errors.push(`库存数量不正确: 期望20, 实际${details.inventory_count}`);

  const orphanWh: any = await query('SELECT id, warehouse_code FROM inv_warehouse WHERE category_id IS NULL AND deleted = 0');
  details.orphan_warehouses = orphanWh?.length || 0;
  if (orphanWh?.length > 0) errors.push(`存在${orphanWh.length}个仓库未关联分类`);

  const orphanMat: any = await query('SELECT id, material_code FROM inv_material WHERE category_id IS NULL AND deleted = 0');
  details.orphan_materials = orphanMat?.length || 0;
  if (orphanMat?.length > 0) errors.push(`存在${orphanMat.length}个物料未关联分类`);

  const orphanInv: any = await query('SELECT id FROM inv_inventory WHERE (material_id IS NULL OR warehouse_id IS NULL) AND deleted = 0');
  details.orphan_inventory = orphanInv?.length || 0;
  if (orphanInv?.length > 0) errors.push(`存在${orphanInv.length}条库存未关联物料或仓库`);

  const totalQty: any = await queryOne('SELECT COALESCE(SUM(quantity), 0) as total FROM inv_inventory WHERE deleted = 0');
  details.total_inventory_quantity = totalQty?.total || 0;

  const totalValue: any = await queryOne(`
    SELECT COALESCE(SUM(i.quantity * m.purchase_price), 0) as total
    FROM inv_inventory i
    JOIN inv_material m ON i.material_id = m.id
    WHERE i.deleted = 0 AND m.deleted = 0
  `);
  details.total_inventory_value = totalValue?.total || 0;

  return { valid: errors.length === 0, errors, details };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const verification = await verifyDataIntegrity();
  return successResponse(verification, '数据完整性验证完成');
}, '验证数据完整性失败');
