/**
 * 全模块统一 Mock 数据
 * 用于本地开发时验证国际化切换和页面功能
 *
 * 使用方式：在对应 page.tsx 中 import 对应数据和 USE_MOCK 开关
 * 将 fetch 调用替换为 mock 数据
 */

// ============================================================
// 全局 Mock 开关
// ============================================================
export const USE_MOCK = true;

// ============================================================
// 工具函数
// ============================================================
export function mockApiResponse<T>(data: T) {
  return { success: true, data };
}
export function mockApiListResponse<T>(data: T[]) {
  return { success: true, data: { list: data, total: data.length } };
}

// ============================================================
// 1. 仓储入库 (Warehouse/Inbound)
// ============================================================
export const mockWarehouseInbounds = [
  {
    id: 1, inbound_no: 'IN20260101001', inbound_type: 1, warehouse_id: 1,
    warehouse_name: '主仓库', material_id: 101, material_name: '铜版纸 200g',
    material_code: 'MAT-001', specification: 'A4', quantity: 5000, unit: '张',
    location: 'A-01-01', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    operator_id: 1, operator_name: '张三', inbound_date: '2026-01-15',
    status: 1, remark: '常规入库', order_no: 'PO20260101001',
    total_quantity: 5000, items: [
      { material_id: 101, material_name: '铜版纸 200g', material_code: 'MAT-001',
        material_spec: 'A4', specification: 'A4', quantity: 3000, unit: '张',
        unit_price: 0.5, total_price: 1500, location: 'A-01-01', batch_no: 'B20260115', remark: '' },
      { material_id: 102, material_name: '铜版纸 250g', material_code: 'MAT-002',
        material_spec: 'A4', specification: 'A4', quantity: 2000, unit: '张',
        unit_price: 0.6, total_price: 1200, location: 'A-01-02', batch_no: 'B20260115', remark: '' },
    ],
  },
  {
    id: 2, inbound_no: 'IN20260102001', inbound_type: 2, warehouse_id: 1,
    warehouse_name: '主仓库', material_id: 201, material_name: 'UV油墨-黑色',
    material_code: 'MAT-003', specification: '1kg/罐', quantity: 100, unit: '罐',
    location: 'B-02-01', supplier_id: 2, supplier_name: '广州油墨有限公司',
    operator_id: 2, operator_name: '李四', inbound_date: '2026-01-20',
    status: 1, remark: '采购入库', order_no: 'PO20260102001',
    total_quantity: 100, items: [
      { material_id: 201, material_name: 'UV油墨-黑色', material_code: 'MAT-003',
        material_spec: '1kg/罐', specification: '1kg/罐', quantity: 100, unit: '罐',
        unit_price: 120, total_price: 12000, location: 'B-02-01', batch_no: 'INK001', remark: '保质期至2027-01' },
    ],
  },
  {
    id: 3, inbound_no: 'IN20260103001', inbound_type: 3, warehouse_id: 2,
    warehouse_name: '半成品仓', material_id: 301, material_name: '不干胶标签-100x50mm',
    material_code: 'MAT-004', specification: '100x50mm', quantity: 8000, unit: '张',
    location: 'C-03-01', supplier_id: 3, supplier_name: '东莞标签材料有限公司',
    operator_id: 3, operator_name: '王五', inbound_date: '2026-02-01',
    status: 1, remark: '生产入库', order_no: 'WO20260103001',
    total_quantity: 8000, items: [
      { material_id: 301, material_name: '不干胶标签-100x50mm', material_code: 'MAT-004',
        material_spec: '100x50mm', specification: '100x50mm', quantity: 8000, unit: '张',
        unit_price: 0.3, total_price: 2400, location: 'C-03-01', batch_no: 'LABEL001', remark: '' },
    ],
  },
  {
    id: 4, inbound_no: 'IN20260104001', inbound_type: 1, warehouse_id: 1,
    warehouse_name: '主仓库', material_id: 401, material_name: '双胶纸 120g',
    material_code: 'MAT-005', specification: 'A3', quantity: 3000, unit: '张',
    location: 'A-02-01', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    operator_id: 1, operator_name: '张三', inbound_date: '2026-02-10',
    status: 2, remark: '退货待处理', order_no: 'PO20260104001',
    total_quantity: 3000, items: [],
  },
  {
    id: 5, inbound_no: 'IN20260105001', inbound_type: 1, warehouse_id: 1,
    warehouse_name: '主仓库', material_id: 501, material_name: 'PE保护膜 0.05mm',
    material_code: 'MAT-006', specification: '1.2m宽', quantity: 2000, unit: '米',
    location: 'D-04-01', supplier_id: 4, supplier_name: '佛山包装材料有限公司',
    operator_id: 4, operator_name: '赵六', inbound_date: '2026-02-15',
    status: 1, remark: '', order_no: 'PO20260105001',
    total_quantity: 2000, items: [
      { material_id: 501, material_name: 'PE保护膜 0.05mm', material_code: 'MAT-006',
        material_spec: '1.2m宽', specification: '1.2m宽', quantity: 2000, unit: '米',
        unit_price: 3.5, total_price: 7000, location: 'D-04-01', batch_no: 'PE001', remark: '' },
    ],
  },
  {
    id: 6, inbound_no: 'IN20260106001', inbound_type: 1, warehouse_id: 1,
    warehouse_name: '主仓库', material_id: 601, material_name: '热敏纸 80x60mm',
    material_code: 'MAT-007', specification: '80x60mm', quantity: 10000, unit: '张',
    location: 'A-03-01', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    operator_id: 2, operator_name: '李四', inbound_date: '2026-03-01',
    status: 1, remark: '', order_no: 'PO20260106001',
    total_quantity: 10000, items: [
      { material_id: 601, material_name: '热敏纸 80x60mm', material_code: 'MAT-007',
        material_spec: '80x60mm', specification: '80x60mm', quantity: 10000, unit: '张',
        unit_price: 0.15, total_price: 1500, location: 'A-03-01', batch_no: 'TP001', remark: '' },
    ],
  },
];

export const mockWarehouses = [
  { id: 1, warehouse_name: '主仓库', warehouse_code: 'WH-001' },
  { id: 2, warehouse_name: '半成品仓', warehouse_code: 'WH-002' },
  { id: 3, warehouse_name: '成品仓', warehouse_code: 'WH-003' },
  { id: 4, warehouse_name: '辅料仓', warehouse_code: 'WH-004' },
];

export const mockSuppliers = [
  { id: 1, supplier_name: '深圳纸业有限公司', supplier_code: 'SUP-001', short_name: '深圳纸业', grade: 'A', status: '1' },
  { id: 2, supplier_name: '广州油墨有限公司', supplier_code: 'SUP-002', short_name: '广州油墨', grade: 'B', status: '1' },
  { id: 3, supplier_name: '东莞标签材料有限公司', supplier_code: 'SUP-003', short_name: '东莞标签', grade: 'A', status: '1' },
  { id: 4, supplier_name: '佛山包装材料有限公司', supplier_code: 'SUP-004', short_name: '佛山包装', grade: 'B', status: '1' },
  { id: 5, supplier_name: '惠州化工有限公司', supplier_code: 'SUP-005', short_name: '惠州化工', grade: 'A', status: '1' },
];

// ============================================================
// 2. 销售发货 (Sales/Delivery)
// ============================================================
export const mockShipments = [
  {
    id: 1, shipment_no: 'SH20260115001', delivery_no: 'DN20260115001',
    sales_order_id: 1001, sales_order_no: 'SO20260110001', order_no: 'SO20260110001',
    type: 'normal' as const, status: 5, customer_id: 1, customer_name: '华为技术有限公司',
    warehouse_id: 1, warehouse_name: '主仓库', total_quantity: 5000, shipped_quantity: 5000,
    total_amount: 25000, sign_status: 2, sign_person: '华为-收货部',
    sign_time: '2026-01-16', contact_name: '王经理', contact_phone: '13900139001',
    delivery_address: '深圳市龙岗区华为基地', logistics_company: '顺丰速运',
    tracking_no: 'SF1234567890', ship_time: '2026-01-15', remark: '',
    delivery_date: '2026-01-16', create_time: '2026-01-15 08:00:00',
  },
  {
    id: 2, shipment_no: 'SH20260120001', delivery_no: 'DN20260120001',
    sales_order_id: 1002, sales_order_no: 'SO20260118001', order_no: 'SO20260118001',
    type: 'partial' as const, status: 4, customer_id: 2, customer_name: '中兴通讯股份有限公司',
    warehouse_id: 1, warehouse_name: '主仓库', total_quantity: 3000, shipped_quantity: 1500,
    total_amount: 18000, sign_status: 1, sign_person: '中兴-物流部',
    sign_time: '2026-01-21', contact_name: '张经理', contact_phone: '13900139002',
    delivery_address: '深圳市南山区科技园南路', logistics_company: '京东物流',
    tracking_no: 'JD9876543210', ship_time: '2026-01-20', remark: '剩余部分下周发货',
    delivery_date: '2026-01-21', create_time: '2026-01-20 09:00:00',
  },
  {
    id: 3, shipment_no: 'SH20260201001', delivery_no: 'DN20260201001',
    sales_order_id: 1003, sales_order_no: 'SO20260128001', order_no: 'SO20260128001',
    type: 'normal' as const, status: 3, customer_id: 3, customer_name: '比亚迪股份有限公司',
    warehouse_id: 3, warehouse_name: '成品仓', total_quantity: 2000, shipped_quantity: 0,
    total_amount: 12000, sign_status: 0, contact_name: '刘经理',
    contact_phone: '13900139003', delivery_address: '深圳市坪山区比亚迪路',
    logistics_company: '德邦物流', ship_time: '', remark: '待发货',
    delivery_date: '2026-02-05', create_time: '2026-02-01 10:00:00',
  },
  {
    id: 4, shipment_no: 'SH20260210001', delivery_no: 'DN20260210001',
    sales_order_id: 1004, sales_order_no: 'SO20260205001', order_no: 'SO20260205001',
    type: 'return' as const, status: 5, customer_id: 4, customer_name: 'OPPO广东移动通信有限公司',
    warehouse_id: 2, warehouse_name: '半成品仓', total_quantity: 500, shipped_quantity: 500,
    total_amount: 3500, sign_status: 3, sign_person: 'OPPO-质检部',
    sign_time: '2026-02-11', contact_name: '陈经理', contact_phone: '13900139004',
    delivery_address: '东莞市长安镇', logistics_company: '顺丰速运',
    tracking_no: 'SF1122334455', remark: '质量问题退货',
    delivery_date: '2026-02-11', create_time: '2026-02-10 14:00:00',
  },
  {
    id: 5, shipment_no: 'SH20260215001', delivery_no: 'DN20260215001',
    sales_order_id: 1005, sales_order_no: 'SO20260212001', order_no: 'SO20260212001',
    type: 're_ship' as const, status: 5, customer_id: 1, customer_name: '华为技术有限公司',
    warehouse_id: 3, warehouse_name: '成品仓', total_quantity: 1000, shipped_quantity: 1000,
    total_amount: 6000, sign_status: 2, sign_person: '华为-收货部',
    sign_time: '2026-02-16', contact_name: '王经理', contact_phone: '13900139001',
    delivery_address: '深圳市龙岗区华为基地', logistics_company: '顺丰速运',
    tracking_no: 'SF9988776655', remark: '补发上次短少',
    delivery_date: '2026-02-16', create_time: '2026-02-15 08:00:00',
  },
  {
    id: 6, shipment_no: 'SH20260301001', delivery_no: 'DN20260301001',
    sales_order_id: 1006, sales_order_no: 'SO20260225001', order_no: 'SO20260225001',
    type: 'normal' as const, status: 1, customer_id: 5, customer_name: 'TCL科技集团股份有限公司',
    warehouse_id: 1, warehouse_name: '主仓库', total_quantity: 4000, shipped_quantity: 0,
    total_amount: 20000, sign_status: 0, contact_name: '黄经理',
    contact_phone: '13900139005', delivery_address: '惠州市仲恺高新区',
    logistics_company: '', remark: '等待客户确认',
    delivery_date: '2026-03-05', create_time: '2026-03-01 09:00:00',
  },
];

export const mockCustomers = [
  { id: 1, customer_name: '华为技术有限公司', customer_code: 'CUST-001' },
  { id: 2, customer_name: '中兴通讯股份有限公司', customer_code: 'CUST-002' },
  { id: 3, customer_name: '比亚迪股份有限公司', customer_code: 'CUST-003' },
  { id: 4, customer_name: 'OPPO广东移动通信有限公司', customer_code: 'CUST-004' },
  { id: 5, customer_name: 'TCL科技集团股份有限公司', customer_code: 'CUST-005' },
];

// ============================================================
// 3. 采购订单 (Purchase/Orders)
// ============================================================
export const mockPurchaseOrders = [
  {
    id: 1, po_no: 'PO20260101001', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    supplier_code: 'SUP-001', order_date: '2026-01-01', delivery_date: '2026-01-15',
    currency: 'CNY', total_amount: 15000, total_quantity: 30000, tax_rate: 13,
    tax_amount: 1950, grand_total: 16950, status: 50, over_receipt_tolerance: 5,
    payment_terms: '月结30天', remark: '常规采购', create_time: '2026-01-01 08:00:00',
    update_time: '2026-01-15 17:00:00', audit_time: '2026-01-02 10:00:00',
    lines: [
      { id: 1, material_code: 'MAT-001', material_name: '铜版纸 200g', quantity: 20000, unit: '张', unit_price: 0.5 },
      { id: 2, material_code: 'MAT-002', material_name: '铜版纸 250g', quantity: 10000, unit: '张', unit_price: 0.6 },
    ],
  },
  {
    id: 2, po_no: 'PO20260102001', supplier_id: 2, supplier_name: '广州油墨有限公司',
    supplier_code: 'SUP-002', order_date: '2026-01-10', delivery_date: '2026-01-25',
    currency: 'CNY', total_amount: 24000, total_quantity: 200, tax_rate: 13,
    tax_amount: 3120, grand_total: 27120, status: 50, over_receipt_tolerance: 3,
    payment_terms: '月结60天', remark: '', create_time: '2026-01-10 09:00:00',
    update_time: '2026-01-25 16:00:00', audit_time: '2026-01-11 11:00:00',
    lines: [
      { id: 1, material_code: 'MAT-003', material_name: 'UV油墨-黑色', quantity: 100, unit: '罐', unit_price: 120 },
      { id: 2, material_code: 'MAT-008', material_name: 'UV油墨-红色', quantity: 50, unit: '罐', unit_price: 120 },
      { id: 3, material_code: 'MAT-009', material_name: 'UV油墨-蓝色', quantity: 50, unit: '罐', unit_price: 120 },
    ],
  },
  {
    id: 3, po_no: 'PO20260201001', supplier_id: 3, supplier_name: '东莞标签材料有限公司',
    supplier_code: 'SUP-003', order_date: '2026-02-01', delivery_date: '2026-02-10',
    currency: 'CNY', total_amount: 8000, total_quantity: 20000, tax_rate: 13,
    tax_amount: 1040, grand_total: 9040, status: 40, over_receipt_tolerance: 5,
    payment_terms: '月结30天', remark: '部分到货', create_time: '2026-02-01 08:00:00',
    update_time: '2026-02-10 15:00:00', audit_time: '2026-02-02 09:00:00',
    lines: [
      { id: 1, material_code: 'MAT-004', material_name: '不干胶标签-100x50mm', quantity: 20000, unit: '张', unit_price: 0.3 },
    ],
  },
  {
    id: 4, po_no: 'PO20260205001', supplier_id: 4, supplier_name: '佛山包装材料有限公司',
    supplier_code: 'SUP-004', order_date: '2026-02-05', delivery_date: '2026-02-20',
    currency: 'CNY', total_amount: 10500, total_quantity: 3000, tax_rate: 13,
    tax_amount: 1365, grand_total: 11865, status: 30, over_receipt_tolerance: 5,
    payment_terms: '月结30天', remark: '', create_time: '2026-02-05 10:00:00',
    update_time: '2026-02-05 10:00:00', audit_time: '2026-02-06 14:00:00',
    lines: [
      { id: 1, material_code: 'MAT-006', material_name: 'PE保护膜 0.05mm', quantity: 3000, unit: '米', unit_price: 3.5 },
    ],
  },
  {
    id: 5, po_no: 'PO20260301001', supplier_id: 5, supplier_name: '惠州化工有限公司',
    supplier_code: 'SUP-005', order_date: '2026-03-01', delivery_date: '2026-03-15',
    currency: 'CNY', total_amount: 5000, total_quantity: 500, tax_rate: 13,
    tax_amount: 650, grand_total: 5650, status: 20, over_receipt_tolerance: 5,
    payment_terms: '月结30天', remark: '待审批', create_time: '2026-03-01 09:00:00',
    update_time: '2026-03-01 09:00:00', audit_time: null,
    lines: [
      { id: 1, material_code: 'MAT-010', material_name: '化工助剂A', quantity: 500, unit: 'kg', unit_price: 10 },
    ],
  },
  {
    id: 6, po_no: 'PO20260310001', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    supplier_code: 'SUP-001', order_date: '2026-03-10', delivery_date: '2026-03-25',
    currency: 'CNY', total_amount: 3000, total_quantity: 20000, tax_rate: 13,
    tax_amount: 390, grand_total: 3390, status: 10, over_receipt_tolerance: 5,
    payment_terms: '月结30天', remark: '新下单', create_time: '2026-03-10 08:00:00',
    update_time: '2026-03-10 08:00:00', audit_time: null,
    lines: [
      { id: 1, material_code: 'MAT-007', material_name: '热敏纸 80x60mm', quantity: 20000, unit: '张', unit_price: 0.15 },
    ],
  },
];

// ============================================================
// 4. 品质过程检验 (Quality/Process)
// ============================================================
export const mockQualityProcesses = [
  {
    id: 1, card_no: 'QC20260101001', qr_code: 'QR-QC001', work_order_no: 'WO20260101001',
    product_code: 'PROD-001', product_name: '华为手机标签', material_spec: '100x50mm',
    work_order_date: '2026-01-01', plan_qty: 10000, main_label_no: 'ML-001',
    burdening_status: 2, create_user_name: '张三', create_time: '2026-01-01 08:00:00',
    update_time: '2026-01-01 17:00:00', customer_name: '华为技术有限公司',
    customer_code: 'CUST-001', process_flow1: '印刷', process_flow2: '模切',
    print_type: 'UV印刷', finished_size: '100x50mm', tolerance: '±0.5mm',
    quality_manager: '李四',
  },
  {
    id: 2, card_no: 'QC20260102001', qr_code: 'QR-QC002', work_order_no: 'WO20260102001',
    product_code: 'PROD-002', product_name: '中兴不干胶标签', material_spec: '60x40mm',
    work_order_date: '2026-01-02', plan_qty: 5000, main_label_no: 'ML-002',
    burdening_status: 2, create_user_name: '王五', create_time: '2026-01-02 08:00:00',
    update_time: '2026-01-02 17:00:00', customer_name: '中兴通讯股份有限公司',
    customer_code: 'CUST-002', process_flow1: '印刷', process_flow2: '覆膜',
    print_type: '柔版印刷', finished_size: '60x40mm', tolerance: '±0.3mm',
    quality_manager: '赵六',
  },
  {
    id: 3, card_no: 'QC20260103001', qr_code: 'QR-QC003', work_order_no: 'WO20260103001',
    product_code: 'PROD-003', product_name: '比亚迪铭牌', material_spec: '80x60mm',
    work_order_date: '2026-01-03', plan_qty: 8000, main_label_no: 'ML-003',
    burdening_status: 1, create_user_name: '陈七', create_time: '2026-01-03 08:00:00',
    update_time: '2026-01-03 17:00:00', customer_name: '比亚迪股份有限公司',
    customer_code: 'CUST-003', process_flow1: '印刷', process_flow2: '烫金',
    print_type: '丝印', finished_size: '80x60mm', tolerance: '±0.5mm',
    quality_manager: '周八',
  },
  {
    id: 4, card_no: 'QC20260104001', qr_code: 'QR-QC004', work_order_no: 'WO20260104001',
    product_code: 'PROD-004', product_name: 'OPPO防伪标签', material_spec: '40x30mm',
    work_order_date: '2026-01-04', plan_qty: 15000, main_label_no: 'ML-004',
    burdening_status: 2, create_user_name: '吴九', create_time: '2026-01-04 08:00:00',
    update_time: '2026-01-04 17:00:00', customer_name: 'OPPO广东移动通信有限公司',
    customer_code: 'CUST-004', process_flow1: '印刷', process_flow2: '覆膜',
    print_type: 'UV印刷', finished_size: '40x30mm', tolerance: '±0.2mm',
    quality_manager: '郑十',
  },
  {
    id: 5, card_no: 'QC20260105001', qr_code: 'QR-QC005', work_order_no: 'WO20260105001',
    product_code: 'PROD-005', product_name: 'TCL说明书', material_spec: 'A4',
    work_order_date: '2026-01-05', plan_qty: 20000, main_label_no: 'ML-005',
    burdening_status: 0, create_user_name: '钱一', create_time: '2026-01-05 08:00:00',
    update_time: '2026-01-05 08:00:00', customer_name: 'TCL科技集团股份有限公司',
    customer_code: 'CUST-005', process_flow1: '印刷', process_flow2: '装订',
    print_type: '胶印', finished_size: 'A4', tolerance: '±1mm',
    quality_manager: '孙二',
  },
  {
    id: 6, card_no: 'QC20260106001', qr_code: 'QR-QC006', work_order_no: 'WO20260106001',
    product_code: 'PROD-006', product_name: '美的包装盒', material_spec: '200x150x50mm',
    work_order_date: '2026-01-06', plan_qty: 3000, main_label_no: 'ML-006',
    burdening_status: 2, create_user_name: '李三', create_time: '2026-01-06 08:00:00',
    update_time: '2026-01-06 17:00:00', customer_name: '美的集团',
    customer_code: 'CUST-006', process_flow1: '印刷', process_flow2: '裱纸',
    print_type: '胶印', finished_size: '200x150x50mm', tolerance: '±1mm',
    quality_manager: '张四',
  },
  {
    id: 7, card_no: 'QC20260107001', qr_code: 'QR-QC007', work_order_no: 'WO20260107001',
    product_code: 'PROD-007', product_name: '格力电器面板贴', material_spec: '150x100mm',
    work_order_date: '2026-01-07', plan_qty: 6000, main_label_no: 'ML-007',
    burdening_status: 1, create_user_name: '王五', create_time: '2026-01-07 08:00:00',
    update_time: '2026-01-07 08:00:00', customer_name: '格力电器',
    customer_code: 'CUST-007', process_flow1: '印刷', process_flow2: '覆膜',
    print_type: 'UV印刷', finished_size: '150x100mm', tolerance: '±0.5mm',
    quality_manager: '赵六',
  },
  {
    id: 8, card_no: 'QC20260108001', qr_code: 'QR-QC008', work_order_no: 'WO20260108001',
    product_code: 'PROD-008', product_name: '海尔保修卡', material_spec: '90x54mm',
    work_order_date: '2026-01-08', plan_qty: 12000, main_label_no: 'ML-008',
    burdening_status: 2, create_user_name: '陈七', create_time: '2026-01-08 08:00:00',
    update_time: '2026-01-08 17:00:00', customer_name: '海尔集团',
    customer_code: 'CUST-008', process_flow1: '印刷', process_flow2: '打码',
    print_type: '柔版印刷', finished_size: '90x54mm', tolerance: '±0.3mm',
    quality_manager: '周八',
  },
];

// ============================================================
// 5. 品质来料检验 (Quality/Incoming)
// ============================================================
export const mockQualityIncoming = [
  { id: 1, inspect_no: 'IQC20260101001', material_id: 101, material_name: '铜版纸 200g',
    material_code: 'MAT-001', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    batch_no: 'B20260115', inspect_qty: 100, defect_qty: 2, result: 'pass' as const,
    inspector: '李四', inspect_time: '2026-01-15', remark: '边缘轻微褶皱',
    standard: 'GB/T 10335', status: 1 },
  { id: 2, inspect_no: 'IQC20260102001', material_id: 201, material_name: 'UV油墨-黑色',
    material_code: 'MAT-003', supplier_id: 2, supplier_name: '广州油墨有限公司',
    batch_no: 'INK001', inspect_qty: 10, defect_qty: 0, result: 'pass' as const,
    inspector: '赵六', inspect_time: '2026-01-20', remark: '',
    standard: 'GB/T 13217', status: 1 },
  { id: 3, inspect_no: 'IQC20260103001', material_id: 301, material_name: '不干胶标签-100x50mm',
    material_code: 'MAT-004', supplier_id: 3, supplier_name: '东莞标签材料有限公司',
    batch_no: 'LABEL001', inspect_qty: 50, defect_qty: 5, result: 'fail' as const,
    inspector: '李四', inspect_time: '2026-02-01', remark: '粘性不达标',
    standard: 'GB/T 2792', status: 2 },
  { id: 4, inspect_no: 'IQC20260104001', material_id: 401, material_name: '双胶纸 120g',
    material_code: 'MAT-005', supplier_id: 1, supplier_name: '深圳纸业有限公司',
    batch_no: 'B20260210', inspect_qty: 80, defect_qty: 1, result: 'pass' as const,
    inspector: '李四', inspect_time: '2026-02-10', remark: '',
    standard: 'GB/T 10335', status: 1 },
  { id: 5, inspect_no: 'IQC20260105001', material_id: 501, material_name: 'PE保护膜 0.05mm',
    material_code: 'MAT-006', supplier_id: 4, supplier_name: '佛山包装材料有限公司',
    batch_no: 'PE001', inspect_qty: 30, defect_qty: 0, result: 'pass' as const,
    inspector: '赵六', inspect_time: '2026-02-15', remark: '',
    standard: 'GB/T 4456', status: 1 },
];

// ============================================================
// 6. 品质终检 (Quality/Final)
// ============================================================
export const mockQualityFinal = [
  { id: 1, card_no: 'FQC20260101001', qr_code: 'QR-FQC001', work_order_no: 'WO20260101001',
    product_code: 'PROD-001', product_name: '华为手机标签', material_spec: '100x50mm',
    work_order_date: '2026-01-01', plan_qty: 10000, main_label_no: 'ML-001',
    burdening_status: 3, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-01 08:00:00', update_time: '2026-01-01 17:00:00',
    customer_name: '华为技术有限公司', customer_code: 'CUST-001',
    process_flow1: '印刷', process_flow2: '模切', print_type: 'UV印刷',
    finished_size: '100x50mm', tolerance: '±0.5mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '500', slice_per_bundle: '100' },
  { id: 2, card_no: 'FQC20260102001', qr_code: 'QR-FQC002', work_order_no: 'WO20260102001',
    product_code: 'PROD-002', product_name: '中兴不干胶标签', material_spec: '80x40mm',
    work_order_date: '2026-01-02', plan_qty: 5000, main_label_no: 'ML-002',
    burdening_status: 3, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-02 08:00:00', update_time: '2026-01-02 17:00:00',
    customer_name: '中兴通讯', customer_code: 'CUST-002',
    process_flow1: '胶印', process_flow2: '模切', print_type: '胶印',
    finished_size: '80x40mm', tolerance: '±0.3mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '400', slice_per_bundle: '100' },
  { id: 3, card_no: 'FQC20260103001', qr_code: 'QR-FQC003', work_order_no: 'WO20260103001',
    product_code: 'PROD-003', product_name: '比亚迪铭牌', material_spec: '120x60mm',
    work_order_date: '2026-01-03', plan_qty: 8000, main_label_no: 'ML-003',
    burdening_status: 2, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-03 08:00:00', update_time: '2026-01-03 17:00:00',
    customer_name: '比亚迪', customer_code: 'CUST-003',
    process_flow1: '烫金', process_flow2: '模切', print_type: '烫金印刷',
    finished_size: '120x60mm', tolerance: '±0.5mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '300', slice_per_bundle: '50' },
  { id: 4, card_no: 'FQC20260104001', qr_code: 'QR-FQC004', work_order_no: 'WO20260104001',
    product_code: 'PROD-004', product_name: 'OPPO防伪标签', material_spec: '60x30mm',
    work_order_date: '2026-01-04', plan_qty: 15000, main_label_no: 'ML-004',
    burdening_status: 3, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-04 08:00:00', update_time: '2026-01-04 17:00:00',
    customer_name: 'OPPO', customer_code: 'CUST-004',
    process_flow1: '数码印刷', process_flow2: '激光切割', print_type: '数码印刷',
    finished_size: '60x30mm', tolerance: '±0.2mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '1000', slice_per_bundle: '200' },
  { id: 5, card_no: 'FQC20260105001', qr_code: 'QR-FQC005', work_order_no: 'WO20260105001',
    product_code: 'PROD-005', product_name: '小米包装盒标签', material_spec: '90x45mm',
    work_order_date: '2026-01-05', plan_qty: 12000, main_label_no: 'ML-005',
    burdening_status: 1, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-05 08:00:00', update_time: '2026-01-05 08:00:00',
    customer_name: '小米科技', customer_code: 'CUST-005',
    process_flow1: '柔印', process_flow2: '模切', print_type: '柔印',
    finished_size: '90x45mm', tolerance: '±0.4mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '600', slice_per_bundle: '120' },
  { id: 6, card_no: 'FQC20260106001', qr_code: 'QR-FQC006', work_order_no: 'WO20260106001',
    product_code: 'PROD-006', product_name: '联想笔记本标签', material_spec: '110x55mm',
    work_order_date: '2026-01-06', plan_qty: 6000, main_label_no: 'ML-006',
    burdening_status: 3, lock_status: 0, create_user_name: '周八',
    create_time: '2026-01-06 08:00:00', update_time: '2026-01-06 17:00:00',
    customer_name: '联想集团', customer_code: 'CUST-006',
    process_flow1: '凹印', process_flow2: '模切', print_type: '凹印',
    finished_size: '110x55mm', tolerance: '±0.5mm', quality_manager: '周八',
    packing_type: '纸箱', slice_per_box: '400', slice_per_bundle: '80' },
];

// ============================================================
// 7. 仓储出库 (Warehouse/Outbound)
// ============================================================
export const mockOutboundRecords = [
  { id: 'OB001', date: '2026-01-10', materialName: '铜版纸 200g', materialCode: 'MAT-001', spec: '787*1092mm', quantity: 5000, unit: '张', warehouse: '主仓库', location: 'A-01-01', operator: '张三', status: 'completed', auditStatus: 'approved', type: 'sales', isRawMaterial: true, orderNo: 'SO202601001', customer: '华为技术有限公司', batchNo: 'B202601001', remark: '正常出库' },
  { id: 'OB002', date: '2026-01-11', materialName: '不干胶标签纸', materialCode: 'MAT-002', spec: '100*50mm', quantity: 10000, unit: '张', warehouse: '主仓库', location: 'A-02-03', operator: '李四', status: 'completed', auditStatus: 'approved', type: 'sales', isRawMaterial: true, orderNo: 'SO202601002', customer: '中兴通讯', batchNo: 'B202601002', remark: '' },
  { id: 'OB003', date: '2026-01-12', materialName: 'PET薄膜', materialCode: 'MAT-003', spec: '0.125mm', quantity: 3000, unit: '米', warehouse: '辅料仓库', location: 'B-01-02', operator: '张三', status: 'pending', auditStatus: 'pending', type: 'sales', isRawMaterial: false, orderNo: 'SO202601003', customer: '比亚迪', batchNo: 'B202601003', remark: '待审核' },
  { id: 'OB004', date: '2026-01-13', materialName: '烫金纸', materialCode: 'MAT-004', spec: '640mm*120m', quantity: 50, unit: '卷', warehouse: '辅料仓库', location: 'B-02-01', operator: '李四', status: 'completed', auditStatus: 'approved', type: 'sales', isRawMaterial: false, orderNo: 'SO202601004', customer: 'OPPO', batchNo: 'B202601004', remark: '' },
  { id: 'OB005', date: '2026-01-14', materialName: '油墨-黑色', materialCode: 'MAT-005', spec: '1kg/罐', quantity: 20, unit: '罐', warehouse: '化工仓库', location: 'C-01-01', operator: '王五', status: 'processing', auditStatus: 'pending', type: 'production', isRawMaterial: false, orderNo: 'SO202601005', customer: '小米科技', batchNo: 'B202601005', remark: '' },
  { id: 'OB006', date: '2026-01-15', materialName: '双面胶带', materialCode: 'MAT-006', spec: '50mm*50m', quantity: 200, unit: '卷', warehouse: '主仓库', location: 'A-03-02', operator: '张三', status: 'completed', auditStatus: 'approved', type: 'sales', isRawMaterial: false, orderNo: 'SO202601006', customer: '联想集团', batchNo: 'B202601006', remark: '紧急出库' },
];

// ============================================================
// 8. 标签打印 (Dcprint/Labels)
// ============================================================
export const mockLabels = [
  { id: 1, labelNo: 'LBL202601001', materialCode: 'MAT-001', materialName: '铜版纸 200g', specification: '787*1092mm', unit: '张', batchNo: 'B202601001', quantity: 5000, warehouseName: '主仓库', locationName: 'A-01-01', isMainMaterial: 1, isUsed: 0, isCut: 0, status: 'active', purchaseOrderNo: 'PO202601001', supplierName: '恒翌达', receiveDate: '2026-01-10', width: 787, lengthPerRoll: 1092 },
  { id: 2, labelNo: 'LBL202601002', materialCode: 'MAT-002', materialName: '不干胶标签纸', specification: '100*50mm', unit: '张', batchNo: 'B202601002', quantity: 10000, warehouseName: '主仓库', locationName: 'A-02-03', isMainMaterial: 1, isUsed: 0, isCut: 0, status: 'active', purchaseOrderNo: 'PO202601002', supplierName: '华通材料', receiveDate: '2026-01-11', width: 100, lengthPerRoll: 50 },
  { id: 3, labelNo: 'LBL202601003', materialCode: 'MAT-003', materialName: 'PET薄膜', specification: '0.125mm', unit: '米', batchNo: 'B202601003', quantity: 3000, warehouseName: '辅料仓库', locationName: 'B-01-02', isMainMaterial: 0, isUsed: 0, isCut: 0, status: 'active', purchaseOrderNo: 'PO202601003', supplierName: '恒翌达', receiveDate: '2026-01-12', width: 640, lengthPerRoll: 120 },
  { id: 4, labelNo: 'LBL202601004', materialCode: 'MAT-004', materialName: '烫金纸', specification: '640mm*120m', unit: '卷', batchNo: 'B202601004', quantity: 50, warehouseName: '辅料仓库', locationName: 'B-02-01', isMainMaterial: 0, isUsed: 1, isCut: 0, status: 'used', purchaseOrderNo: 'PO202601004', supplierName: '华通材料', receiveDate: '2026-01-13', width: 640, lengthPerRoll: 120 },
  { id: 5, labelNo: 'LBL202601005', materialCode: 'MAT-005', materialName: '油墨-黑色', specification: '1kg/罐', unit: '罐', batchNo: 'B202601005', quantity: 20, warehouseName: '化工仓库', locationName: 'C-01-01', isMainMaterial: 0, isUsed: 0, isCut: 0, status: 'active', purchaseOrderNo: 'PO202601005', supplierName: '恒翌达', receiveDate: '2026-01-14', width: 0, lengthPerRoll: 0 },
  { id: 6, labelNo: 'LBL202601006', materialCode: 'MAT-006', materialName: '双面胶带', specification: '50mm*50m', unit: '卷', batchNo: 'B202601006', quantity: 200, warehouseName: '主仓库', locationName: 'A-03-02', isMainMaterial: 0, isUsed: 0, isCut: 1, status: 'cut', purchaseOrderNo: 'PO202601006', supplierName: '华通材料', receiveDate: '2026-01-15', width: 50, lengthPerRoll: 50 },
];

// ============================================================
// 9. 流程卡 (Dcprint/ProcessCards)
// ============================================================
export const mockProcessCards = [
  { id: 1, cardNo: 'PC20260101001', workOrderNo: 'WO20260101001', productCode: 'PROD-001', productName: '华为手机标签', materialSpec: '100x50mm', planQty: 10000, mainLabelNo: 'ML-001', mainMaterialCode: 'MAT-001', mainMaterialName: '铜版纸 200g', mainBatchNo: 'B202601001', burdeningStatus: '2', lockStatus: '1', createUserName: '张三', createTime: '2026-01-01 08:00:00' },
  { id: 2, cardNo: 'PC20260102001', workOrderNo: 'WO20260102001', productCode: 'PROD-002', productName: '中兴不干胶标签', materialSpec: '80x40mm', planQty: 5000, mainLabelNo: 'ML-002', mainMaterialCode: 'MAT-002', mainMaterialName: '不干胶标签纸', mainBatchNo: 'B202601002', burdeningStatus: '1', lockStatus: '0', createUserName: '李四', createTime: '2026-01-02 08:00:00' },
  { id: 3, cardNo: 'PC20260103001', workOrderNo: 'WO20260103001', productCode: 'PROD-003', productName: '比亚迪铭牌', materialSpec: '120x60mm', planQty: 8000, mainLabelNo: 'ML-003', mainMaterialCode: 'MAT-003', mainMaterialName: 'PET薄膜', mainBatchNo: 'B202601003', burdeningStatus: '3', lockStatus: '1', createUserName: '张三', createTime: '2026-01-03 08:00:00' },
  { id: 4, cardNo: 'PC20260104001', workOrderNo: 'WO20260104001', productCode: 'PROD-004', productName: 'OPPO防伪标签', materialSpec: '60x30mm', planQty: 15000, mainLabelNo: 'ML-004', mainMaterialCode: 'MAT-004', mainMaterialName: '烫金纸', mainBatchNo: 'B202601004', burdeningStatus: '2', lockStatus: '1', createUserName: '李四', createTime: '2026-01-04 08:00:00' },
  { id: 5, cardNo: 'PC20260105001', workOrderNo: 'WO20260105001', productCode: 'PROD-005', productName: '小米包装盒标签', materialSpec: '90x45mm', planQty: 12000, mainLabelNo: 'ML-005', mainMaterialCode: 'MAT-005', mainMaterialName: '油墨-黑色', mainBatchNo: 'B202601005', burdeningStatus: '0', lockStatus: '0', createUserName: '张三', createTime: '2026-01-05 08:00:00' },
  { id: 6, cardNo: 'PC20260106001', workOrderNo: 'WO20260106001', productCode: 'PROD-006', productName: '联想笔记本标签', materialSpec: '110x55mm', planQty: 6000, mainLabelNo: 'ML-006', mainMaterialCode: 'MAT-006', mainMaterialName: '双面胶带', mainBatchNo: 'B202601006', burdeningStatus: '3', lockStatus: '1', createUserName: '李四', createTime: '2026-01-06 08:00:00' },
];