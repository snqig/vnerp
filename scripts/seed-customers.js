// 为 crm_customer 表生成测试数据
const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

// 测试数据
const customerData = [
  {
    customer_code: 'C20240001',
    customer_name: '深圳伟业科技有限公司',
    short_name: '伟业科技',
    customer_type: 1,
    industry: '电子制造',
    scale: '中型企业',
    credit_level: 'A级',
    province: '广东省',
    city: '深圳市',
    district: '宝安区',
    address: '西乡街道XX工业园A栋301室',
    contact_name: '张经理',
    contact_phone: '13800138001',
    contact_email: 'zhang@weiye.com',
    fax: '0755-12345678',
    website: 'www.weiye.com',
    business_license: '91440300MA5G8KXXXX',
    tax_number: '91440300MA5G8KXXXX',
    bank_name: '中国工商银行深圳宝安支行',
    bank_account: '4000023019200123456',
    follow_up_status: 3,
    status: 1,
    remark: '长期合作客户，信用良好',
  },
  {
    customer_code: 'C20240002',
    customer_name: '广州华达包装有限公司',
    short_name: '华达包装',
    customer_type: 1,
    industry: '包装印刷',
    scale: '大型企业',
    credit_level: 'AA级',
    province: '广东省',
    city: '广州市',
    district: '白云区',
    address: 'XX镇XX路88号华达工业园',
    contact_name: '李总',
    contact_phone: '13800138002',
    contact_email: 'li@huada.com',
    fax: '020-87654321',
    website: 'www.huada.com',
    business_license: '91440101MA5G8KYYYY',
    tax_number: '91440101MA5G8KYYYY',
    bank_name: '中国建设银行广州白云支行',
    bank_account: '44001400102052501234',
    follow_up_status: 3,
    status: 1,
    remark: '重点客户，年采购额超500万',
  },
  {
    customer_code: 'C20240003',
    customer_name: '东莞恒通新材料有限公司',
    short_name: '恒通新材',
    customer_type: 1,
    industry: '新材料',
    scale: '中型企业',
    credit_level: 'A级',
    province: '广东省',
    city: '东莞市',
    district: '虎门镇',
    address: 'XX工业区恒通路1号',
    contact_name: '王经理',
    contact_phone: '13800138003',
    contact_email: 'wang@hengtong.com',
    fax: '0769-12345678',
    website: 'www.hengtong.com',
    business_license: '91441900MA5G8KZZZZ',
    tax_number: '91441900MA5G8KZZZZ',
    bank_name: '中国银行东莞虎门支行',
    bank_account: '6013827001000123456',
    follow_up_status: 2,
    status: 1,
    remark: '正在洽谈长期合作协议',
  },
  {
    customer_code: 'C20240004',
    customer_name: '佛山顺德美居家具厂',
    short_name: '美居家具',
    customer_type: 1,
    industry: '家具制造',
    scale: '小型企业',
    credit_level: 'B级',
    province: '广东省',
    city: '佛山市',
    district: '顺德区',
    address: '乐从镇家具城XX路15号',
    contact_name: '陈先生',
    contact_phone: '13800138004',
    contact_email: 'chen@meiju.com',
    fax: '0757-12345678',
    website: '',
    business_license: '91440606MA5G8KAAAA',
    tax_number: '91440606MA5G8KAAAA',
    bank_name: '中国农业银行佛山顺德支行',
    bank_account: '44480101040012345',
    follow_up_status: 1,
    status: 1,
    remark: '新客户，需跟进',
  },
  {
    customer_code: 'C20240005',
    customer_name: '中山市华艺灯饰有限公司',
    short_name: '华艺灯饰',
    customer_type: 1,
    industry: '灯饰照明',
    scale: '中型企业',
    credit_level: 'A级',
    province: '广东省',
    city: '中山市',
    district: '古镇镇',
    address: '华艺大道18号华艺大厦',
    contact_name: '刘经理',
    contact_phone: '13800138005',
    contact_email: 'liu@huayi.com',
    fax: '0760-12345678',
    website: 'www.huayi.com',
    business_license: '91442000MA5G8KBBBB',
    tax_number: '91442000MA5G8KBBBB',
    bank_name: '中国工商银行中山古镇支行',
    bank_account: '2012003019200123456',
    follow_up_status: 3,
    status: 1,
    remark: '老客户，定期回访',
  },
  {
    customer_code: 'C20240006',
    customer_name: '珠海市格力电器配套厂',
    short_name: '格力配套',
    customer_type: 1,
    industry: '家电配套',
    scale: '中型企业',
    credit_level: 'AA级',
    province: '广东省',
    city: '珠海市',
    district: '香洲区',
    address: '前山工业园XX路20号',
    contact_name: '赵总',
    contact_phone: '13800138006',
    contact_email: 'zhao@geli.com',
    fax: '0756-12345678',
    website: '',
    business_license: '91440400MA5G8KCCCC',
    tax_number: '91440400MA5G8KCCCC',
    bank_name: '中国建设银行珠海香洲支行',
    bank_account: '44001640135052501234',
    follow_up_status: 3,
    status: 1,
    remark: '格力供应链企业，订单稳定',
  },
  {
    customer_code: 'C20240007',
    customer_name: '惠州市TCL通讯配件厂',
    short_name: 'TCL配件',
    customer_type: 1,
    industry: '通讯设备',
    scale: '大型企业',
    credit_level: 'AAA级',
    province: '广东省',
    city: '惠州市',
    district: '惠城区',
    address: '仲恺高新区TCL工业园',
    contact_name: '孙经理',
    contact_phone: '13800138007',
    contact_email: 'sun@tcl.com',
    fax: '0752-12345678',
    website: 'www.tcl.com',
    business_license: '91441300MA5G8KDDDD',
    tax_number: '91441300MA5G8KDDDD',
    bank_name: '中国银行惠州惠城支行',
    bank_account: '6217867000000123456',
    follow_up_status: 3,
    status: 1,
    remark: '上市公司关联企业',
  },
  {
    customer_code: 'C20240008',
    customer_name: '江门市蓬江区金辉印刷厂',
    short_name: '金辉印刷',
    customer_type: 1,
    industry: '印刷包装',
    scale: '小型企业',
    credit_level: 'B级',
    province: '广东省',
    city: '江门市',
    district: '蓬江区',
    address: '棠下镇金辉路8号',
    contact_name: '周老板',
    contact_phone: '13800138008',
    contact_email: 'zhou@jinhui.com',
    fax: '0750-12345678',
    website: '',
    business_license: '91440703MA5G8KEEEE',
    tax_number: '91440703MA5G8KEEEE',
    bank_name: '中国农业银行江门蓬江支行',
    bank_account: '44480101040067890',
    follow_up_status: 4,
    status: 0,
    remark: '已停止合作，账期问题',
  },
  {
    customer_code: 'C20240009',
    customer_name: '肇庆市端州区新明珠陶瓷',
    short_name: '新明珠陶瓷',
    customer_type: 1,
    industry: '陶瓷制造',
    scale: '大型企业',
    credit_level: 'AA级',
    province: '广东省',
    city: '肇庆市',
    district: '端州区',
    address: '陶瓷工业园新明珠大道1号',
    contact_name: '吴经理',
    contact_phone: '13800138009',
    contact_email: 'wu@xinmingzhu.com',
    fax: '0758-12345678',
    website: 'www.xinmingzhu.com',
    business_license: '91441202MA5G8KFFFF',
    tax_number: '91441202MA5G8KFFFF',
    bank_name: '中国工商银行肇庆端州支行',
    bank_account: '2012005019200123456',
    follow_up_status: 2,
    status: 1,
    remark: '正在试样阶段',
  },
  {
    customer_code: 'C20240010',
    customer_name: '深圳市宝安区个体户李明',
    short_name: '李明',
    customer_type: 2,
    industry: '个体经营',
    scale: '个体户',
    credit_level: 'C级',
    province: '广东省',
    city: '深圳市',
    district: '宝安区',
    address: '新安街道XX路XX号',
    contact_name: '李明',
    contact_phone: '13800138010',
    contact_email: 'liming@email.com',
    fax: '',
    website: '',
    business_license: '92440300MA5G8KGGGG',
    tax_number: '92440300MA5G8KGGGG',
    bank_name: '中国邮政储蓄银行深圳宝安支行',
    bank_account: '6210985840001234567',
    follow_up_status: 1,
    status: 1,
    remark: '个体客户，现金交易',
  },
];

async function seedCustomers() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');

    // 清空现有数据（可选）
    console.log('Clearing existing data...');
    await connection.execute('DELETE FROM crm_customer WHERE deleted = 0');
    console.log('Existing data cleared.');

    // 插入测试数据
    console.log('Inserting test data...');
    const sql = `
      INSERT INTO crm_customer (
        customer_code, customer_name, short_name, customer_type,
        industry, scale, credit_level, province, city, district, address,
        contact_name, contact_phone, contact_email, fax, website,
        business_license, tax_number, bank_name, bank_account,
        follow_up_status, status, remark
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const customer of customerData) {
      await connection.execute(sql, [
        customer.customer_code,
        customer.customer_name,
        customer.short_name,
        customer.customer_type,
        customer.industry,
        customer.scale,
        customer.credit_level,
        customer.province,
        customer.city,
        customer.district,
        customer.address,
        customer.contact_name,
        customer.contact_phone,
        customer.contact_email,
        customer.fax,
        customer.website,
        customer.business_license,
        customer.tax_number,
        customer.bank_name,
        customer.bank_account,
        customer.follow_up_status,
        customer.status,
        customer.remark,
      ]);
      console.log(`Inserted: ${customer.customer_name}`);
    }

    console.log('\n✅ Successfully inserted 10 customers!');
    
    // 统计各状态客户数量
    const [rows] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN follow_up_status = 1 THEN 1 ELSE 0 END) as potential,
        SUM(CASE WHEN follow_up_status = 2 THEN 1 ELSE 0 END) as interested,
        SUM(CASE WHEN follow_up_status = 3 THEN 1 ELSE 0 END) as deal,
        SUM(CASE WHEN follow_up_status = 4 THEN 1 ELSE 0 END) as lost,
        SUM(CASE WHEN customer_type = 1 THEN 1 ELSE 0 END) as enterprise,
        SUM(CASE WHEN customer_type = 2 THEN 1 ELSE 0 END) as individual
      FROM crm_customer WHERE deleted = 0
    `);
    
    console.log('\n📊 Statistics:');
    console.log(`   Total: ${rows[0].total}`);
    console.log(`   Potential: ${rows[0].potential}`);
    console.log(`   Interested: ${rows[0].interested}`);
    console.log(`   Deal: ${rows[0].deal}`);
    console.log(`   Lost: ${rows[0].lost}`);
    console.log(`   Enterprise: ${rows[0].enterprise}`);
    console.log(`   Individual: ${rows[0].individual}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

seedCustomers();
