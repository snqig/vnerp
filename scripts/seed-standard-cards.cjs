/**
 * 生成 5 条标准卡测试数据
 * 覆盖不同客户 / 印刷方式 / 物料类型 / 状态
 *
 * 用法：node scripts/seed-standard-cards.cjs
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 简易 .env 解析（避免 dotenv 依赖）
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const SEQ_TEMPLATE = (color, inkCode) => JSON.stringify([
  { id: 1, color, inkCode, linCode: 'L-001', storageLocation: 'A-01', plateCode: 'P-001', mesh: '300', plateStorage: 'SH-A1', printSide: '正面' },
  { id: 2, color: '黑', inkCode: 'IK-BK-001', linCode: 'L-002', storageLocation: 'A-02', plateCode: 'P-002', mesh: '300', plateStorage: 'SH-A2', printSide: '正面' },
  { id: 3, color: '蓝', inkCode: 'IK-BL-001', linCode: 'L-003', storageLocation: 'A-03', plateCode: 'P-003', mesh: '300', plateStorage: 'SH-A3', printSide: '正面' },
  { id: 4, color: '红', inkCode: 'IK-RD-001', linCode: 'L-004', storageLocation: 'A-04', plateCode: 'P-004', mesh: '300', plateStorage: 'SH-A4', printSide: '正面' },
  { id: 5, color: '专金', inkCode: 'IK-GD-001', linCode: 'L-005', storageLocation: 'A-05', plateCode: 'P-005', mesh: '300', plateStorage: 'SH-A5', printSide: '背面' },
  { id: 6, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
  { id: 7, color: '', inkCode: '', linCode: '', storageLocation: '', plateCode: '', mesh: '', plateStorage: '', printSide: '' },
]);

const now = () => new Date();
const today = () => new Date().toISOString().split('T')[0];
const cardNo = (suffix) => `SC-DEMO-${String(suffix).padStart(4, '0')}`;

// 5 条测试数据
const records = [
  {
    card_no: cardNo(1),
    customer_name: '美的集团', customer_code: 'C-MD001',
    product_name: '空调面板标签', version: 'V1.0', status: 1,
    print_type: '卷料丝印', material_type: '硬胶', glue_type: '硬胶', packing_type: '包装',
    finished_size: '48.48*24.64', tolerance: '±0.2mm',
    material_name: 'PET 聚酯薄膜', layout_type: '连排',
    finished_color: '白底四色',
    creator: '张三', reviewer: '李四', factory_manager: '王厂长', quality_manager: '赵质', sales: '钱销售', approver: '孙总',
    sequence_color: '白', sequence_ink: 'IK-WH-001',
    notes: '空调遥控器面板标签，需耐高温',
  },
  {
    card_no: cardNo(2),
    customer_name: '华为技术', customer_code: 'C-HW002',
    product_name: '手机背膜保护贴', version: 'V2.1', status: 2,
    print_type: '片料丝印', material_type: '软胶', glue_type: '软胶', packing_type: 'PCS/袋',
    finished_size: '70*30', tolerance: '±0.1mm',
    material_name: 'OPP 光膜', layout_type: '单张',
    creator: '周五', reviewer: '吴六', factory_manager: '王厂长', quality_manager: '赵质', sales: '钱销售', approver: '孙总',
    sequence_color: '黑', sequence_ink: 'IK-BK-002',
    notes: '华为 Mate 系列背膜，要求高透光率',
  },
  {
    card_no: cardNo(3),
    customer_name: '小米科技', customer_code: 'C-MI003',
    product_name: '包装彩盒（红米系列）', version: 'A2.0', status: 3,
    print_type: '胶印', material_type: '硬胶', glue_type: 'PU胶', packing_type: 'PCS/箱',
    finished_size: '120*80', tolerance: '±0.5mm',
    material_name: '铜版纸 250g', layout_type: '拼版',
    creator: '郑十', reviewer: '李四', factory_manager: '王厂长', quality_manager: '赵质', sales: '钱销售', approver: '孙总',
    sequence_color: '专金', sequence_ink: 'IK-GD-002',
    notes: '红米 Note 系列彩盒，专金 + 四色印刷',
  },
  {
    card_no: cardNo(4),
    customer_name: 'OPPO', customer_code: 'C-OP004',
    product_name: '手机屏幕保护膜', version: 'B1.0', status: 1,
    print_type: '卷料丝印', material_type: 'PU胶', glue_type: 'PU胶', packing_type: 'PCS/卷',
    finished_size: '65*135', tolerance: '±0.15mm',
    material_name: 'PET 离型膜', layout_type: '连排',
    creator: '张三', reviewer: '吴六', factory_manager: '王厂长', quality_manager: '赵质', sales: '钱销售', approver: '孙总',
    sequence_color: '蓝', sequence_ink: 'IK-BL-002',
    notes: 'OPPO Reno 系列屏幕保护膜，需静电吸附',
  },
  {
    card_no: cardNo(5),
    customer_name: 'vivo', customer_code: 'C-VV005',
    product_name: '电池警示标签', version: 'C3.0', status: 4,
    print_type: '轮转印', material_type: '硬胶', glue_type: '硬胶', packing_type: 'PCS/扎',
    finished_size: '30*45', tolerance: '±0.2mm',
    material_name: 'PVC 不干胶', layout_type: '连排',
    creator: '周五', reviewer: '李四', factory_manager: '王厂长', quality_manager: '赵质', sales: '钱销售', approver: '孙总',
    sequence_color: '红', sequence_ink: 'IK-RD-002',
    notes: '电池警示标签，需耐电解液腐蚀（已作废 - 由 V4.0 替代）',
  },
];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vnerpdacahng',
  });

  console.log('Connected to database:', process.env.DB_NAME);

  // 先清理之前的 DEMO 数据（避免重复执行导致 card_no 冲突）
  await conn.query("DELETE FROM prd_standard_card WHERE card_no LIKE 'SC-DEMO-%'");
  console.log('Cleared old DEMO records.');

  for (const r of records) {
    const seq = SEQ_TEMPLATE(r.sequence_color, r.sequence_ink);
    const docCode = `DOC-${r.customer_code}-${r.version}`;
    const [result] = await conn.execute(
      `INSERT INTO prd_standard_card (
        card_no, version, status, customer_name, customer_code, product_name,
        date, document_code, finished_size, tolerance,
        material_name, material_type, layout_type,
        print_type, glue_type, packing_type, mold_type,
        sequences, process_method, stamping_method,
        creator, reviewer, factory_manager, quality_manager, sales, approver,
        notes, deleted, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.card_no, r.version, r.status, r.customer_name, r.customer_code, r.product_name,
        today(), docCode, r.finished_size, r.tolerance,
        r.material_name, r.material_type, r.layout_type,
        r.print_type, r.glue_type, r.packing_type, '',
        seq, '模切', '冷烫',
        r.creator, r.reviewer, r.factory_manager, r.quality_manager, r.sales, r.approver,
        r.notes, 0, now(), now(),
      ]
    );
    console.log(`Inserted ${r.card_no} (id=${result.insertId}) - ${r.customer_name} / ${r.product_name}`);
  }

  const [rows] = await conn.query(
    'SELECT id, card_no, customer_code, customer_name, product_name, version, status, print_type, material_type, finished_size, creator FROM prd_standard_card WHERE card_no LIKE ? ORDER BY id',
    ['SC-DEMO-%']
  );
  console.log('\nFinal DEMO records:');
  console.table(rows);

  await conn.end();
})().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
