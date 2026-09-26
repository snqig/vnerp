/**
 * 简单压力测试脚本
 * 用法：node scripts/load-test.mjs
 */

const BASE_URL = 'http://127.0.0.1:5000';

// 测试配置
const CONFIG = {
  // 并发用户数
  concurrentUsers: [10, 50, 100],
  // 每个用户请求次数
  requestsPerUser: 10,
  // 测试的接口列表
  endpoints: [
    { path: '/api/health', method: 'GET', name: '健康检查' },
    { path: '/api/warehouse/inbound?page=1&pageSize=20', method: 'GET', name: '入库列表' },
    { path: '/api/warehouse/inventory?page=1&pageSize=20', method: 'GET', name: '库存列表' },
    { path: '/api/sales/orders?page=1&pageSize=20', method: 'GET', name: '销售订单' },
  ],
};

// 统计结果
const results = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  totalTime: 0,
  minTime: Infinity,
  maxTime: 0,
  avgTime: 0,
  p95Time: 0,
  p99Time: 0,
};

// 记录每个请求的耗时
const responseTimes = [];

/**
 * 发送单个请求
 */
async function sendRequest(endpoint) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    responseTimes.push(duration);
    results.totalRequests++;
    
    if (response.ok) {
      results.successRequests++;
    } else {
      results.failedRequests++;
    }
    
    return { success: response.ok, duration };
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    responseTimes.push(duration);
    results.totalRequests++;
    results.failedRequests++;
    
    return { success: false, duration, error: error.message };
  }
}

/**
 * 模拟单个用户的请求
 */
async function simulateUser(endpoint, requestCount) {
  for (let i = 0; i < requestCount; i++) {
    await sendRequest(endpoint);
    // 随机等待 100-500ms
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));
  }
}

/**
 * 计算统计指标
 */
function calculateStats() {
  if (responseTimes.length === 0) return;
  
  responseTimes.sort((a, b) => a - b);
  
  results.totalTime = responseTimes.reduce((sum, t) => sum + t, 0);
  results.avgTime = results.totalTime / responseTimes.length;
  results.minTime = responseTimes[0];
  results.maxTime = responseTimes[responseTimes.length - 1];
  
  // P95
  const p95Index = Math.floor(responseTimes.length * 0.95);
  results.p95Time = responseTimes[p95Index];
  
  // P99
  const p99Index = Math.floor(responseTimes.length * 0.99);
  results.p99Time = responseTimes[p99Index];
}

/**
 * 打印测试结果
 */
function printResults(endpointName) {
  console.log('\n========================================');
  console.log(`压测结果 - ${endpointName}`);
  console.log('========================================');
  console.log(`总请求数: ${results.totalRequests}`);
  console.log(`成功请求: ${results.successRequests}`);
  console.log(`失败请求: ${results.failedRequests}`);
  console.log(`成功率: ${((results.successRequests / results.totalRequests) * 100).toFixed(2)}%`);
  console.log('');
  console.log('响应时间:');
  console.log(`  最小: ${results.minTime}ms`);
  console.log(`  平均: ${results.avgTime.toFixed(2)}ms`);
  console.log(`  最大: ${results.maxTime}ms`);
  console.log(`  P95:  ${results.p95Time}ms`);
  console.log(`  P99:  ${results.p99Time}ms`);
  console.log('========================================\n');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始压力测试...');
  console.log(`📍 目标: ${BASE_URL}`);
  console.log('');
  
  for (const endpoint of CONFIG.endpoints) {
    console.log(`\n📊 测试接口: ${endpoint.name} (${endpoint.path})`);
    
    // 重置统计
    responseTimes.length = 0;
    results.totalRequests = 0;
    results.successRequests = 0;
    results.failedRequests = 0;
    
    for (const userCount of CONFIG.concurrentUsers) {
      console.log(`\n  👥 并发用户: ${userCount}`);
      
      const startTime = Date.now();
      
      // 并发模拟用户
      const userPromises = [];
      for (let i = 0; i < userCount; i++) {
        userPromises.push(simulateUser(endpoint, CONFIG.requestsPerUser));
      }
      
      await Promise.all(userPromises);
      
      const totalDuration = Date.now() - startTime;
      console.log(`  ⏱️  总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
      console.log(`  📈 QPS: ${(results.totalRequests / (totalDuration / 1000)).toFixed(2)}`);
    }
    
    calculateStats();
    printResults(endpoint.name);
  }
  
  console.log('✅ 压力测试完成！');
}

// 运行
main().catch(console.error);
