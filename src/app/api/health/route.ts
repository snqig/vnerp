import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { query } from '@/lib/db';

/**
 * 系统健康检查 API
 * 无需认证，用于负载均衡器和监控探针
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; message?: string }> = {};

  // 1. 检查数据库连接
  try {
    const dbStart = Date.now();
    await query('SELECT 1');
    checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (e: any) {
    checks.database = {
      status: 'unhealthy',
      message: e.message || '数据库连接失败',
    };
  }

  // 2. 检查内存使用
  const memUsage = process.memoryUsage();
  checks.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal > 0.9 ? 'warning' : 'healthy',
    message: `堆内存使用: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
  };

  // 3. 检查运行时间
  checks.uptime = {
    status: 'healthy',
    message: `运行时间: ${Math.round(process.uptime() / 3600)}小时`,
  };

  // 总体状态
  const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    latency: Date.now() - startTime,
    checks,
  };

  return new Response(JSON.stringify(response), {
    status: allHealthy ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
