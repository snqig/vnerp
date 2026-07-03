import { NextResponse } from 'next/server';
import { InfrastructureHealthCheck } from '@/infrastructure/monitoring/InfrastructureHealthCheck';

/**
 * 基础设施健康检查端点
 *
 * 不加鉴权：供 K8s/Nginx 负载均衡器探活使用。
 * 仅返回状态与延迟，不暴露敏感数据。
 *
 * HTTP 状态码：
 * - 200: healthy 或 degraded（服务可用但部分降级）
 * - 503: unhealthy（关键组件不可用）
 */
export async function GET() {
  const health = await InfrastructureHealthCheck.check();
  const httpStatus = health.status === 'unhealthy' ? 503 : 200;
  return NextResponse.json(health, { status: httpStatus });
}
