/**
 * 并发测试工具函数
 * 提供并发请求模拟、结果统计、数据一致性验证等功能
 */

import { TEST_CONFIG } from './setup';

// 测试结果接口
export interface TestResult {
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

// 测试报告接口
export interface TestReport {
  testName: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  failureRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  totalDuration: number;
  errors: Array<{ error: string; count: number }>;
  timestamp: string;
}

/**
 * 并发执行多个异步任务
 * @param tasks 任务函数数组
 * @param concurrency 并发数量
 * @returns 所有任务的结果
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number = TEST_CONFIG.CONCURRENCY_COUNT
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
      const index = executing.indexOf(promise);
      if (index > -1) {
        executing.splice(index, 1);
      }
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 并发执行测试并记录结果
 * @param testName 测试名称
 * @param taskFactory 任务工厂函数
 * @param count 任务数量
 * @returns 测试报告
 */
export async function runConcurrentTest(
  testName: string,
  taskFactory: (index: number) => Promise<TestResult>,
  count: number
): Promise<TestReport> {
  const startTime = Date.now();
  const results: TestResult[] = [];

  // 创建任务数组
  const tasks = Array.from({ length: count }, (_, index) => async () => {
    const taskStartTime = Date.now();
    try {
      const result = await taskFactory(index);
      result.duration = Date.now() - taskStartTime;
      return result;
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - taskStartTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // 并发执行所有任务
  const testResults = await runConcurrent(tasks, count);
  results.push(...testResults);

  const totalDuration = Date.now() - startTime;

  // 统计结果
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;
  const responseTimes = results.map((r) => r.duration);

  // 统计错误类型
  const errorMap = new Map<string, number>();
  for (const result of results) {
    if (!result.success && result.error) {
      const count = errorMap.get(result.error) || 0;
      errorMap.set(result.error, count + 1);
    }
  }

  const errors = Array.from(errorMap.entries()).map(([error, count]) => ({
    error,
    count,
  }));

  return {
    testName,
    totalRequests: count,
    successCount,
    failureCount,
    successRate: (successCount / count) * 100,
    failureRate: (failureCount / count) * 100,
    avgResponseTime:
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    totalDuration,
    errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 打印测试报告
 */
export function printTestReport(report: TestReport): void {
  console.log('\n' + '='.repeat(60));
  console.log(`测试报告: ${report.testName}`);
  console.log('='.repeat(60));
  console.log(`执行时间: ${report.timestamp}`);
  console.log(`总请求数: ${report.totalRequests}`);
  console.log(`成功数量: ${report.successCount}`);
  console.log(`失败数量: ${report.failureCount}`);
  console.log(`成功率: ${report.successRate.toFixed(2)}%`);
  console.log(`失败率: ${report.failureRate.toFixed(2)}%`);
  console.log(`平均响应时间: ${report.avgResponseTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${report.minResponseTime}ms`);
  console.log(`最大响应时间: ${report.maxResponseTime}ms`);
  console.log(`总耗时: ${report.totalDuration}ms`);

  if (report.errors.length > 0) {
    console.log('\n错误统计:');
    for (const { error, count } of report.errors) {
      console.log(`  - ${error}: ${count} 次`);
    }
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * 将测试报告保存为 JSON 文件
 */
export function saveTestReport(report: TestReport, filename: string): void {
  const fs = require('fs');
  const path = require('path');
  const reportDir = path.join(process.cwd(), 'tests', 'concurrency', 'reports');

  // 确保报告目录存在
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filepath = path.join(reportDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`测试报告已保存: ${filepath}`);
}

/**
 * 验证库存一致性
 * @param materialId 物料ID
 * @param warehouseId 仓库ID
 * @param expectedQuantity 预期库存数量
 * @returns 验证结果
 */
export async function verifyInventoryConsistency(
  materialId: number,
  warehouseId: number,
  expectedQuantity: number
): Promise<{ valid: boolean; actual: number; expected: number; diff: number }> {
  const { getCurrentInventory } = await import('./setup');
  const actual = await getCurrentInventory(materialId, warehouseId);
  const diff = actual - expectedQuantity;

  return {
    valid: Math.abs(diff) < 0.01, // 允许浮点数误差
    actual,
    expected: expectedQuantity,
    diff,
  };
}

/**
 * 验证库存不为负
 */
export async function verifyInventoryNotNegative(
  materialId: number,
  warehouseId: number
): Promise<{ valid: boolean; quantity: number }> {
  const { getCurrentInventory } = await import('./setup');
  const quantity = await getCurrentInventory(materialId, warehouseId);

  return {
    valid: quantity >= 0,
    quantity,
  };
}

/**
 * 模拟 API 请求
 */
export async function simulateApiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any,
  headers?: Record<string, string>
): Promise<{ status: number; data: any; duration: number }> {
  const startTime = Date.now();
  const url = `${TEST_CONFIG.API_BASE_URL}${path}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const duration = Date.now() - startTime;
  const data = await response.json();

  return {
    status: response.status,
    data,
    duration,
  };
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 随机延迟
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.random() * (maxMs - minMs) + minMs;
  return delay(ms);
}

/**
 * 重试函数
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/**
 * 批量执行并收集结果
 */
export async function batchExecute<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => fn(item, i + index))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 测量函数执行时间
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
}

/**
 * 生成随机数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
