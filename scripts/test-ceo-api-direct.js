const http = require('http');

function testApi(url, headers = {}) {
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
  console.log('测试 CEO Dashboard API（无认证）...');
  const result = await testApi('http://localhost:5000/api/dashboard/ceo');
  console.log('状态码:', result.status);
  
  if (result.status === 401) {
    console.log('需要认证');
    console.log('尝试使用 mock token...');
    const result2 = await testApi('http://localhost:5000/api/dashboard/ceo', {
      'Authorization': 'Bearer mock-token-for-testing'
    });
    console.log('带 mock token 状态:', result2.status);
    if (result2.data) {
      console.log('数据:', JSON.stringify(result2.data, null, 2).substring(0, 500));
    }
  } else if (result.data) {
    console.log('数据概览:');
    console.log('  今日订单:', result.data.data?.overview?.todayOrders || 0);
    console.log('  活跃工单:', result.data.data?.production?.activeOrders || 0);
    console.log('  设备数量:', result.data.data?.production?.equipmentStatus?.length || 0);
    console.log('  合格率:', result.data.data?.quality?.passRate || 0);
    console.log('  应收总额:', result.data.data?.finance?.totalReceivable || 0);
    console.log('  应付总额:', result.data.data?.finance?.totalPayable || 0);
    console.log('  物料总数:', result.data.data?.inventory?.totalItems || 0);
  } else {
    console.log('原始响应:', result.raw?.substring(0, 200));
  }
}

main().catch(e => console.error(e));