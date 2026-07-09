const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

interface StressTestResult {
  endpoint: string;
  method: string;
  totalRequests: number;
  successCount: number;
  failCount: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: string[];
}

async function stressTestEndpoint(
  method: string,
  path: string,
  body: any = null,
  headers: Record<string, string> = {},
  concurrency: number = 10,
  totalRequests: number = 50
): Promise<StressTestResult> {
  const result: StressTestResult = {
    endpoint: path,
    method,
    totalRequests,
    successCount: 0,
    failCount: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errors: [],
  };

  const responseTimes: number[] = [];
  let completed = 0;

  const runSingleRequest = async (): Promise<void> => {
    const start = Date.now();
    try {
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
      };
      if (body && method !== 'GET') {
        opts.body = JSON.stringify(body);
      }

      const response = await fetch(`${BASE_URL}${path}`, opts);
      const elapsed = Date.now() - start;
      responseTimes.push(elapsed);

      if (response.ok) {
        result.successCount++;
      } else {
        result.failCount++;
        if (result.errors.length < 5) {
          result.errors.push(`HTTP ${response.status}: ${path}`);
        }
      }
    } catch (error: any) {
      const elapsed = Date.now() - start;
      responseTimes.push(elapsed);
      result.failCount++;
      if (result.errors.length < 5) {
        result.errors.push(`Error: ${error?.message || String(error)}`);
      }
    }
    completed++;
  };

  const batches = Math.ceil(totalRequests / concurrency);
  for (let b = 0; b < batches; b++) {
    const batchSize = Math.min(concurrency, totalRequests - b * concurrency);
    const batch = Array.from({ length: batchSize }, () => runSingleRequest());
    await Promise.all(batch);
  }

  if (responseTimes.length > 0) {
    result.avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
    result.maxResponseTime = Math.max(...responseTimes);
    result.minResponseTime = Math.min(...responseTimes);
  }

  return result;
}

async function runStressTests() {
  console.log('=== Print MIS 压力测试 ===\n');
  console.log(`目标: ${BASE_URL}\n`);

  const results: StressTestResult[] = [];

  console.log('1. 测试登录接口速率限制...');
  const loginResult = await stressTestEndpoint(
    'POST',
    '/api/auth/login',
    { username: 'test_stress', password: 'wrong_password' },
    {},
    5,
    25
  );
  results.push(loginResult);

  console.log('2. 测试菜单接口...');
  const menuResult = await stressTestEndpoint(
    'GET',
    '/api/menu',
    null,
    {},
    10,
    30
  );
  results.push(menuResult);

  console.log('3. 测试仓库列表接口...');
  const warehouseResult = await stressTestEndpoint(
    'GET',
    '/api/warehouse?status=active',
    null,
    {},
    10,
    30
  );
  results.push(warehouseResult);

  console.log('4. 测试CEO仪表盘...');
  const dashboardResult = await stressTestEndpoint(
    'GET',
    '/api/dashboard/ceo',
    null,
    {},
    5,
    20
  );
  results.push(dashboardResult);

  console.log('\n=== 测试结果 ===\n');

  for (const r of results) {
    const successRate = r.totalRequests > 0
      ? ((r.successCount / r.totalRequests) * 100).toFixed(1)
      : '0';
    console.log(`${r.method} ${r.endpoint}`);
    console.log(`  请求: ${r.totalRequests} | 成功: ${r.successCount} | 失败: ${r.failCount} | 成功率: ${successRate}%`);
    console.log(`  响应时间: 平均${r.avgResponseTime}ms | 最小${r.minResponseTime}ms | 最大${r.maxResponseTime}ms`);
    if (r.errors.length > 0) {
      console.log(`  错误: ${r.errors.join('; ')}`);
    }
    console.log('');
  }

  const overallSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
  const overallTotal = results.reduce((sum, r) => sum + r.totalRequests, 0);
  const overallRate = overallTotal > 0 ? ((overallSuccess / overallTotal) * 100).toFixed(1) : '0';
  console.log(`总成功率: ${overallRate}% (${overallSuccess}/${overallTotal})`);
}

runStressTests().catch(console.error);
