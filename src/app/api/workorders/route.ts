import { NextRequest, NextResponse } from 'next/server';

// 模拟工单数据库
const workOrders = [
  {
    id: 'WO20240115001',
    product: '包装膜-透明',
    customer: '深圳伟业',
    quantity: 5000,
    completedQty: 3750,
    scrapQty: 50,
    unit: '㎡',
    status: 'producing',
    currentProcess: '印刷',
    efficiency: 92,
    priority: 8,
    planStartDate: '2024-01-15',
    planEndDate: '2024-01-17',
    processes: [
      { name: '切料', status: 'completed', completedQty: 5000 },
      { name: '印刷', status: 'producing', completedQty: 3750 },
      { name: '烘干', status: 'pending', completedQty: 0 },
      { name: '检验', status: 'pending', completedQty: 0 },
      { name: '包装', status: 'pending', completedQty: 0 },
    ],
  },
  {
    id: 'WO20240115002',
    product: '标签贴纸',
    customer: '广州华达',
    quantity: 10000,
    completedQty: 4500,
    scrapQty: 100,
    unit: '张',
    status: 'producing',
    currentProcess: '模切',
    efficiency: 78,
    priority: 6,
    planStartDate: '2024-01-15',
    planEndDate: '2024-01-18',
    processes: [
      { name: '印刷', status: 'completed', completedQty: 10000 },
      { name: '模切', status: 'producing', completedQty: 4500 },
      { name: '检验', status: 'pending', completedQty: 0 },
    ],
  },
];

// GET - 获取工单列表/详情
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  if (id) {
    // 获取单个工单详情
    const order = workOrders.find(o => o.id === id);
    if (!order) {
      return NextResponse.json(
        { success: false, error: '工单不存在' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: order,
    });
  }

  // 获取工单列表
  let filtered = workOrders;
  if (status && status !== 'all') {
    filtered = filtered.filter(o => o.status === status);
  }

  return NextResponse.json({
    success: true,
    data: filtered,
    total: filtered.length,
  });
}

// POST - 创建工单/报工
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'create') {
      // 创建工单
      const orderNo = `WO${Date.now().toString().slice(-10)}`;
      return NextResponse.json({
        success: true,
        data: {
          id: orderNo,
          ...data,
          status: 'created',
          createdAt: new Date().toISOString(),
        },
        message: '工单创建成功',
      });
    } else if (action === 'report') {
      // 报工
      return NextResponse.json({
        success: true,
        data: {
          reportNo: `RPT${Date.now().toString().slice(-10)}`,
          ...data,
          reportedAt: new Date().toISOString(),
        },
        message: '报工成功',
      });
    }

    return NextResponse.json(
      { success: false, error: '未知操作类型' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}
