import { NextRequest } from 'next/server';
import { queryOne, transaction } from '@/lib/db';
import { successResponse, withErrorHandler } from '@/lib/api-response';

export const POST = withErrorHandler(async (request: NextRequest) => {
  const result = await transaction(async (conn) => {
    const stats: Record<string, number> = {};

    await conn.execute('DELETE FROM sal_sample_order');
    await conn.execute('ALTER TABLE sal_sample_order AUTO_INCREMENT = 1');

    const sampleOrders = [
      {
        order_no: 'SP20240501001',
        notify_date: '2024-05-01',
        customer_name: '华为技术有限公司',
        product_name: 'Mate60手机标签',
        material_no: 'MAT-PET-001',
        version: 'A',
        size_spec: '50×30mm',
        material_spec: 'PET透明膜0.1mm',
        quantity: 5000,
        customer_require_date: '2024-05-15',
        delivery_status: 'signed',
        remark: '首批打样确认',
      },
      {
        order_no: 'SP20240502001',
        notify_date: '2024-05-02',
        customer_name: '比亚迪股份有限公司',
        product_name: '电池警示标签',
        material_no: 'MAT-PVC-001',
        version: 'B',
        size_spec: '80×40mm',
        material_spec: 'PVC白膜0.2mm',
        quantity: 3000,
        customer_require_date: '2024-05-18',
        delivery_status: 'signed',
        remark: '耐高温要求',
      },
      {
        order_no: 'SP20240503001',
        notify_date: '2024-05-03',
        customer_name: '美的集团',
        product_name: '空调面板贴膜',
        material_no: 'MAT-BOPP-001',
        version: 'A',
        size_spec: '200×150mm',
        material_spec: 'BOPP透明膜0.08mm',
        quantity: 2000,
        customer_require_date: '2024-05-20',
        delivery_status: 'delivered',
        remark: '需哑光处理',
      },
      {
        order_no: 'SP20240504001',
        notify_date: '2024-05-04',
        customer_name: '格力电器',
        product_name: '能效标识标签',
        material_no: 'MAT-ADH-001',
        version: 'C',
        size_spec: '60×40mm',
        material_spec: '不干胶铜版纸80g',
        quantity: 8000,
        customer_require_date: '2024-05-22',
        delivery_status: 'signed',
        remark: '彩色印刷',
      },
      {
        order_no: 'SP20240505001',
        notify_date: '2024-05-05',
        customer_name: '小米科技',
        product_name: '包装盒封口标签',
        material_no: 'MAT-PE-001',
        version: 'A',
        size_spec: '40×20mm',
        material_spec: 'PE保护膜0.05mm',
        quantity: 10000,
        customer_require_date: '2024-05-25',
        delivery_status: 'signed',
        remark: '防伪二维码',
      },
      {
        order_no: 'SP20240506001',
        notify_date: '2024-05-06',
        customer_name: 'OPPO广东移动通信',
        product_name: '充电器标签',
        material_no: 'MAT-PET-002',
        version: 'B',
        size_spec: '35×25mm',
        material_spec: 'PET白膜0.125mm',
        quantity: 6000,
        customer_require_date: '2024-05-28',
        delivery_status: 'delivered',
        remark: '小尺寸高精度',
      },
      {
        order_no: 'SP20240507001',
        notify_date: '2024-05-07',
        customer_name: 'vivo移动通信',
        product_name: '电池仓标签',
        material_no: 'MAT-PVC-002',
        version: 'A',
        size_spec: '45×30mm',
        material_spec: 'PVC白膜0.2mm',
        quantity: 4000,
        customer_require_date: '2024-05-30',
        delivery_status: 'signed',
        remark: '阻燃材料',
      },
      {
        order_no: 'SP20240508001',
        notify_date: '2024-05-08',
        customer_name: '联想集团',
        product_name: '笔记本底壳标签',
        material_no: 'MAT-BOPP-001',
        version: 'D',
        size_spec: '100×60mm',
        material_spec: 'BOPP透明膜0.08mm',
        quantity: 2500,
        customer_require_date: '2024-06-02',
        delivery_status: 'delivered',
        remark: '银色烫金',
      },
      {
        order_no: 'SP20240509001',
        notify_date: '2024-05-09',
        customer_name: '海尔集团',
        product_name: '洗衣机面板标识',
        material_no: 'MAT-ADH-001',
        version: 'A',
        size_spec: '120×80mm',
        material_spec: '不干胶铜版纸80g',
        quantity: 3500,
        customer_require_date: '2024-06-05',
        delivery_status: 'signed',
        remark: '防水要求',
      },
      {
        order_no: 'SP20240510001',
        notify_date: '2024-05-10',
        customer_name: 'TCL科技集团',
        product_name: '电视后壳标签',
        material_no: 'MAT-PET-001',
        version: 'B',
        size_spec: '70×50mm',
        material_spec: 'PET透明膜0.1mm',
        quantity: 4500,
        customer_require_date: '2024-06-08',
        delivery_status: 'delivered',
        remark: '耐高温80°C',
      },
      {
        order_no: 'SP20240511001',
        notify_date: '2024-05-11',
        customer_name: '中兴通讯',
        product_name: '路由器标签',
        material_no: 'MAT-PVC-001',
        version: 'A',
        size_spec: '55×35mm',
        material_spec: 'PVC透明膜0.15mm',
        quantity: 5500,
        customer_require_date: '2024-06-10',
        delivery_status: 'signed',
        remark: '抗UV要求',
      },
      {
        order_no: 'SP20240512001',
        notify_date: '2024-05-12',
        customer_name: '海康威视',
        product_name: '摄像头标签',
        material_no: 'MAT-PE-001',
        version: 'C',
        size_spec: '30×20mm',
        material_spec: 'PE保护膜0.05mm',
        quantity: 7000,
        customer_require_date: '2024-06-12',
        delivery_status: 'delivered',
        remark: '微型标签',
      },
      {
        order_no: 'SP20240513001',
        notify_date: '2024-05-13',
        customer_name: '大疆创新',
        product_name: '无人机机身标签',
        material_no: 'MAT-PET-002',
        version: 'A',
        size_spec: '65×45mm',
        material_spec: 'PET白膜0.125mm',
        quantity: 3200,
        customer_require_date: '2024-06-15',
        delivery_status: 'signed',
        remark: '轻量化要求',
      },
      {
        order_no: 'SP20240514001',
        notify_date: '2024-05-14',
        customer_name: '宁德时代',
        product_name: '电池模组标签',
        material_no: 'MAT-PVC-002',
        version: 'B',
        size_spec: '90×60mm',
        material_spec: 'PVC白膜0.2mm',
        quantity: 2800,
        customer_require_date: '2024-06-18',
        delivery_status: 'delivered',
        remark: '耐电解液腐蚀',
      },
      {
        order_no: 'SP20240515001',
        notify_date: '2024-05-15',
        customer_name: '京东方科技',
        product_name: '显示屏边框标签',
        material_no: 'MAT-BOPP-001',
        version: 'A',
        size_spec: '150×10mm',
        material_spec: 'BOPP透明膜0.08mm',
        quantity: 4200,
        customer_require_date: '2024-06-20',
        delivery_status: 'signed',
        remark: '超窄边框',
      },
      {
        order_no: 'SP20240516001',
        notify_date: '2024-05-16',
        customer_name: '立讯精密',
        product_name: '连接器标签',
        material_no: 'MAT-ADH-001',
        version: 'D',
        size_spec: '25×15mm',
        material_spec: '不干胶铜版纸80g',
        quantity: 9000,
        customer_require_date: '2024-06-22',
        delivery_status: 'delivered',
        remark: '微型高精度',
      },
      {
        order_no: 'SP20240517001',
        notify_date: '2024-05-17',
        customer_name: '歌尔股份',
        product_name: '耳机仓标签',
        material_no: 'MAT-PET-001',
        version: 'A',
        size_spec: '20×15mm',
        material_spec: 'PET透明膜0.1mm',
        quantity: 12000,
        customer_require_date: '2024-06-25',
        delivery_status: 'signed',
        remark: '超小尺寸',
      },
      {
        order_no: 'SP20240518001',
        notify_date: '2024-05-18',
        customer_name: '舜宇光学',
        product_name: '镜头模组标签',
        material_no: 'MAT-PVC-001',
        version: 'B',
        size_spec: '18×12mm',
        material_spec: 'PVC透明膜0.15mm',
        quantity: 6500,
        customer_require_date: '2024-06-28',
        delivery_status: 'delivered',
        remark: '无尘车间要求',
      },
      {
        order_no: 'SP20240519001',
        notify_date: '2024-05-19',
        customer_name: '汇顶科技',
        product_name: '指纹模组标签',
        material_no: 'MAT-PE-001',
        version: 'A',
        size_spec: '15×10mm',
        material_spec: 'PE保护膜0.05mm',
        quantity: 15000,
        customer_require_date: '2024-07-01',
        delivery_status: 'signed',
        remark: '抗静电要求',
      },
      {
        order_no: 'SP20240520001',
        notify_date: '2024-05-20',
        customer_name: '韦尔股份',
        product_name: '传感器标签',
        material_no: 'MAT-PET-002',
        version: 'C',
        size_spec: '22×18mm',
        material_spec: 'PET白膜0.125mm',
        quantity: 7500,
        customer_require_date: '2024-07-05',
        delivery_status: 'pending',
        remark: 'ESD防护包装',
      },
    ];

    for (const order of sampleOrders) {
      await conn.execute(
        `INSERT INTO sal_sample_order (order_no, notify_date, customer_name, product_name, material_no, version, size_spec, material_spec, quantity, customer_require_date, delivery_status, remark, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          order.order_no,
          order.notify_date,
          order.customer_name,
          order.product_name,
          order.material_no,
          order.version,
          order.size_spec,
          order.material_spec,
          order.quantity,
          order.customer_require_date,
          order.delivery_status,
          order.remark,
        ]
      );
    }
    stats.sal_sample_order = sampleOrders.length;

    return stats;
  });

  const verification = await verifyDataIntegrity();

  return successResponse(
    {
      stats: result,
      verification,
    },
    '样品订单种子数据初始化成功'
  );
}, '初始化样品订单种子数据失败');

async function verifyDataIntegrity() {
  const errors: string[] = [];
  const details: Record<string, any> = {};

  const count: any = await queryOne(
    'SELECT COUNT(*) as cnt FROM sal_sample_order WHERE deleted = 0'
  );
  details.sample_order_count = count?.cnt || 0;
  if (details.sample_order_count !== 20)
    errors.push(`样品订单数量不正确: 期望20, 实际${details.sample_order_count}`);

  const statusDist: any = await queryOne(`SELECT
    COALESCE(SUM(CASE WHEN delivery_status = 'pending' THEN 1 ELSE 0 END), 0) as pending,
    COALESCE(SUM(CASE WHEN delivery_status = 'delivered' THEN 1 ELSE 0 END), 0) as delivered,
    COALESCE(SUM(CASE WHEN delivery_status = 'signed' THEN 1 ELSE 0 END), 0) as signed
  FROM sal_sample_order WHERE deleted = 0`);
  details.status_distribution = statusDist;

  const totalQty: any = await queryOne(
    'SELECT COALESCE(SUM(quantity), 0) as total FROM sal_sample_order WHERE deleted = 0'
  );
  details.total_quantity = totalQty?.total || 0;

  return { valid: errors.length === 0, errors, details };
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const verification = await verifyDataIntegrity();
  return successResponse(verification, '数据完整性验证完成');
}, '验证数据完整性失败');
