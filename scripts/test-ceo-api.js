const http = require('http');

function testApi() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:5000/api/dashboard/ceo', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ error: e.message, raw: data });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.end();
  });
}

async function main() {
  console.log('等待服务器启动...');
  await new Promise(r => setTimeout(r, 15000));
  
  console.log('测试 CEO Dashboard API...');
  const result = await testApi();
  
  if (result.error) {
    console.log('API 调用失败:', result.error);
    if (result.raw) console.log('原始响应:', result.raw);
  } else {
    console.log('API 调用成功!');
    console.log('数据概览:');
    console.log('  今日订单:', result.data?.overview?.todayOrders || 0);
    console.log('  今日生产:', result.data?.overview?.todayProduction || 0);
    console.log('  活跃工单:', result.data?.production?.activeOrders || 0);
    console.log('  设备数量:', result.data?.production?.equipmentStatus?.length || 0);
    console.log('  合格率:', result.data?.quality?.passRate || 0);
    console.log('  应收总额:', result.data?.finance?.totalReceivable || 0);
    console.log('  应付总额:', result.data?.finance?.totalPayable || 0);
    console.log('  物料总数:', result.data?.inventory?.totalItems || 0);
    console.log('  工单趋势:', result.data?.orderTrend?.length || 0, '条');
    console.log('  工艺关联:', result.data?.processRelations?.length || 0, '条');
  }
}

main().catch(e => console.error(e));