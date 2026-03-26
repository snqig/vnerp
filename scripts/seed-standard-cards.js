const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

// 测试数据
const customers = [
  { name: '深圳伟业科技有限公司', code: 'WY001' },
  { name: '广州华达包装有限公司', code: 'HD002' },
  { name: '东莞恒通新材料', code: 'HT003' },
  { name: '佛山金辉印刷厂', code: 'JH004' },
  { name: '中山美达标签公司', code: 'MD005' },
];

const products = [
  '透明包装膜', '彩色标签贴纸', '防伪不干胶', '易碎纸标签', 'PVC收缩膜',
  'PET保护膜', '铜版纸标签', '热敏纸标签', '合成纸标签', '镭射标签',
];

const materials = [
  'PET薄膜', 'PVC薄膜', 'PP合成纸', '铜版纸', '热敏纸',
  '易碎纸', '镭射膜', '哑银龙', '透明龙', '珠光膜',
];

const printTypes = ['胶印', '卷料丝印', '片料丝印', '轮转印'];
const processMethods = ['模切', '冲压'];
const glueTypes = ['硬胶', '软胶', 'PU胶', '其它胶'];
const packingTypes = ['包装', 'PCS/卷', 'PCS/扎', 'PCS/袋', 'PCS/箱'];
const materialTypes = ['硬胶', '软胶'];

// 生成随机日期（最近一年）
function randomDate() {
  const start = new Date(2024, 0, 1);
  const end = new Date();
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// 生成随机尺寸
function randomSize() {
  const width = (Math.random() * 100 + 20).toFixed(1);
  const height = (Math.random() * 100 + 20).toFixed(1);
  return `${width}×${height}mm`;
}

// 生成标准卡编号
function generateCardNo(index) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(index + 1).padStart(3, '0');
  return `SC${year}${month}${day}${seq}`;
}

// 生成单条数据
function generateCardData(index) {
  const customer = customers[index % customers.length];
  const product = products[index % products.length];
  const material = materials[index % materials.length];
  
  return {
    card_no: generateCardNo(index),
    customer_name: customer.name,
    customer_code: customer.code,
    product_name: product,
    version: `V${Math.floor(Math.random() * 5) + 1}.0`,
    date: randomDate(),
    finished_size: randomSize(),
    tolerance: `±${(Math.random() * 0.5 + 0.1).toFixed(1)}mm`,
    material_name: material,
    material_type: materialTypes[index % 2],
    layout_type: ['单排', '双排', '多排'][index % 3],
    print_type: printTypes[index % 4],
    process_method: processMethods[index % 2],
    glue_type: glueTypes[index % 4],
    packing_type: packingTypes[index % 5],
    status: [1, 2, 3][index % 3], // 1-草稿, 2-待审核, 3-已启用
    creator_id: 1,
  };
}

async function seedData() {
  let connection;
  
  try {
    console.log('正在连接MySQL数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功\n');
    
    console.log('开始生成10组标准卡测试数据...\n');
    
    const insertSql = `
      INSERT INTO prd_standard_card (
        card_no, customer_name, customer_code, product_name, version,
        date, finished_size, tolerance, material_name, material_type,
        layout_type, print_type, process_method, glue_type, packing_type,
        status, creator_id, create_time, update_time, deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
    `;
    
    for (let i = 0; i < 10; i++) {
      const data = generateCardData(i);
      
      try {
        await connection.execute(insertSql, [
          data.card_no,
          data.customer_name,
          data.customer_code,
          data.product_name,
          data.version,
          data.date,
          data.finished_size,
          data.tolerance,
          data.material_name,
          data.material_type,
          data.layout_type,
          data.print_type,
          data.process_method,
          data.glue_type,
          data.packing_type,
          data.status,
          data.creator_id,
        ]);
        
        console.log(`✓ [${i + 1}/10] ${data.card_no} - ${data.product_name} (${data.customer_name})`);
      } catch (error) {
        console.error(`✗ [${i + 1}/10] 插入失败: ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    console.log('数据生成完成！');
    console.log('========================================');
    
    // 查询总数
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM prd_standard_card WHERE deleted = 0'
    );
    console.log(`\n当前标准卡总数: ${rows[0].count} 条`);
    
  } catch (error) {
    console.error('\n✗ 数据生成失败:');
    console.error(error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n提示: 请确保MySQL服务已启动');
    }
    if (error.message.includes('Access denied')) {
      console.error('\n提示: 请检查用户名和密码是否正确');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ 数据库连接已关闭');
    }
  }
}

// 运行
seedData();
