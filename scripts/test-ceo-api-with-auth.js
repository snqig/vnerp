const http = require('http');

function httpPost(url, data) {
  return new Promise((resolve) => {
    const body = JSON.stringify(data);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.write(body);
    req.end();
  });
}

function httpGet(url, headers = {}) {
  return new Promise((resolve) => {
    const options = { headers };
    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, error: e.message, raw: data });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

async function main() {
  console.log('=== 测试 CEO Dashboard API（带认证） ===');
  
  console.log('\n1. 登录获取 token...');
  const loginResult = await httpPost('http://localhost:5000/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  console.log('登录状态:', loginResult.status);
  
  if (loginResult.status !== 200 || !loginResult.data?.success) {
    console.log('登录失败:', JSON.stringify(loginResult.data));
    return;
  }
  
  const token = loginResult.data.data?.token;
  console.log('获取 token:', token?.substring(0, 20) + '...');
  
  console.log('\n2. 测试 CEO Dashboard API...');
  const headers = { 'Authorization': `Bearer ${token}` };
  const result = await httpGet('http://localhost:5000/api/dashboard/ceo', headers);
  
  console.log('API 状态:', result.status);
  
  if (result.data && result.data.success) {
    const d = result.data.data;
    console.log('\n数据概览:');
    console.log('  今日订单:', d.overview?.todayOrders || 0);
    console.log('  今日生产:', d.overview?.todayProduction || 0);
    console.log('  今日发货:', d.overview?.todayDelivery || 0);
    console.log('  库存价值:', d.overview?.inventoryValue || 0);
    console.log('\n生产模块:');
    console.log('  设备效率:', d.production?.efficiency || 0);
    console.log('  活跃工单:', d.production?.activeOrders || 0);
    console.log('  今日完成:', d.production?.completedToday || 0);
    console.log('  预警工单:', d.production?.warningCount || 0);
    console.log('  设备数量:', d.production?.equipmentStatus?.length || 0);
    console.log('  工单列表:', (d.production?.activeWorkOrders || []).length, '条');
    console.log('\n质量模块:');
    console.log('  合格率:', d.quality?.passRate || 0);
    console.log('  总质检:', d.quality?.totalInspections || 0);
    console.log('  合格:', d.quality?.passedInspections || 0);
    console.log('  不合格:', d.quality?.failedInspections || 0);
    console.log('\n财务模块:');
    console.log('  应收总额:', d.finance?.totalReceivable || 0);
    console.log('  应付总额:', d.finance?.totalPayable || 0);
    console.log('  月收入:', d.finance?.monthRevenue || 0);
    console.log('  月支出:', d.finance?.monthExpense || 0);
    console.log('\n库存模块:');
    console.log('  物料总数:', d.inventory?.totalItems || 0);
    console.log('  低库存:', d.inventory?.lowStock || 0);
    console.log('  库存价值:', d.inventory?.totalValue || 0);
    console.log('  仓库利用率:', d.inventory?.warehouseUtilization || 0);
    console.log('\n趋势数据:');
    console.log('  订单趋势:', d.orderTrend?.length || 0, '条');
    console.log('  工艺关联:', d.processRelations?.length || 0, '条');
    console.log('  班次数据:', d.shiftData ? '有' : '无');
  } else {
    console.log('API 返回:', JSON.stringify(result.data));
  }
}

main().catch(e => console.error(e));