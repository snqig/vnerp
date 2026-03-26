import { NextRequest, NextResponse } from 'next/server';

// 模拟订单数据库
const orders = [
  {
    id: 'SO20240115001',
    customer: '深圳伟业科技有限公司',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-18',
    status: 'producing',
    totalAmount: 125000,
    items: [
      { product: '包装膜-透明', quantity: 5000, unit: '㎡', unitPrice: 25 },
    ],
  },
  {
    id: 'SO20240115002',
    customer: '广州华达包装有限公司',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-20',
    status: 'confirmed',
    totalAmount: 85000,
    items: [
      { product: '标签贴纸', quantity: 10000, unit: '张', unitPrice: 8.5 },
    ],
  },
  {
    id: 'SO20240115003',
    customer: '东莞恒通新材料',
    orderDate: '2024-01-15',
    deliveryDate: '2024-01-22',
    status: 'draft',
    totalAmount: 45000,
    items: [
      { product: '彩印膜-蓝', quantity: 3000, unit: '㎡', unitPrice: 15 },
    ],
  },
];

// GET - 获取订单列表
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const keyword = searchParams.get('keyword');

  let filtered = orders;

  if (status && status !== 'all') {
    filtered = filtered.filter(o => o.status === status);
  }

  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(o => 
      o.id.toLowerCase().includes(kw) || 
      o.customer.toLowerCase().includes(kw)
    );
  }

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

// POST - 创建订单
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, deliveryDate, items, remarks } = body;

    // 生成订单号
    const orderNo = `SO${Date.now().toString().slice(-10)}`;

    const newOrder = {
      id: orderNo,
      customer: `客户${customerId}`,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate,
      status: 'draft',
      totalAmount: items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0),
      items,
      remarks,
    };

    return NextResponse.json({
      success: true,
      data: newOrder,
      message: '订单创建成功',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '创建订单失败' },
      { status: 500 }
    );
  }
}
