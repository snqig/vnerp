import { NextRequest, NextResponse } from 'next/server';

interface TraceMetadata {
  [key: string]: unknown;
}

interface TraceSpan {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'success' | 'error' | 'pending';
  metadata?: TraceMetadata;
  children?: TraceSpan[];
}

interface MetricPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

class PerformanceTracer {
  private traces: Map<string, TraceSpan> = new Map();
  private metrics: Map<string, MetricPoint[]> = new Map();
  private readonly MAX_TRACES = 1000;
  private readonly MAX_METRICS_PER_NAME = 1000;

  startSpan(name: string, metadata?: TraceMetadata): string {
    const id = this.generateId();
    
    const span: TraceSpan = {
      id,
      name,
      startTime: performance.now(),
      status: 'pending',
      metadata,
    };
    
    this.traces.set(id, span);
    return id;
  }

  endSpan(id: string, status: 'success' | 'error' = 'success'): void {
    const span = this.traces.get(id);
    if (!span) return;

    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    if (span.duration > 1000) {
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const points = this.metrics.get(name) || [];
    
    points.push({
      timestamp: Date.now(),
      value,
      tags,
    });

    if (points.length > this.MAX_METRICS_PER_NAME) {
      points.shift();
    }

    this.metrics.set(name, points);
  }

  getMetricStats(name: string, windowMs: number = 60000): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } | null {
    const points = this.metrics.get(name);
    if (!points || points.length === 0) return null;

    const cutoff = Date.now() - windowMs;
    const recentPoints = points.filter(p => p.timestamp >= cutoff);

    if (recentPoints.length === 0) return null;

    const values = recentPoints.map(p => p.value);
    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  getSlowSpans(thresholdMs: number = 1000): TraceSpan[] {
    const slow: TraceSpan[] = [];
    
    for (const span of this.traces.values()) {
      if (span.duration && span.duration > thresholdMs) {
        slow.push(span);
      }
    }

    return slow.sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  exportTraces(): TraceSpan[] {
    return Array.from(this.traces.values())
      .filter(span => span.status !== 'pending')
      .slice(-100);
  }
}

export const tracer = new PerformanceTracer();

interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  details?: unknown;
  error?: string;
}

class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  register(name: string, check: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, check);
  }

  async runAll(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};

    for (const [name, check] of this.checks.entries()) {
      try {
        const start = Date.now();
        const result = await check();
        results[name] = {
          ...result,
          latency: result.latency ?? Date.now() - start,
        };
      } catch (error) {
        results[name] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return results;
  }

  async isHealthy(): Promise<boolean> {
    const results = await this.runAll();
    return Object.values(results).every(r => r.healthy);
  }
}

export const healthChecker = new HealthChecker();

healthChecker.register('database', async () => {
  const start = Date.now();
  try {
    const { db } = await import('@/lib/db');
    await db.execute('SELECT 1');
    return { healthy: true, latency: Date.now() - start };
  } catch {
    return { healthy: false, latency: Date.now() - start };
  }
});

export function withTracing(name: string) {
  return function (
    _target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const spanId = tracer.startSpan(`${name}.${propertyKey}`);
      
      try {
        const result = await original.apply(this, args);
        tracer.endSpan(spanId, 'success');
        return result;
      } catch (error) {
        tracer.endSpan(spanId, 'error');
        throw error;
      }
    };

    return descriptor;
  };
}

export function measureApiHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    const spanId = tracer.startSpan(`API: ${req.method} ${new URL(req.url).pathname}`, {
      method: req.method,
      url: req.url,
    });

    try {
      const response = await handler(req);
      const duration = Date.now() - start;

      tracer.endSpan(spanId, 'success');
      tracer.recordMetric('api.request.duration', duration, {
        method: req.method,
        status: response.status.toString(),
      });
      tracer.recordMetric('api.request.count', 1, {
        method: req.method,
        status: response.status.toString(),
      });

      response.headers.set('X-Response-Time', `${duration}ms`);
      response.headers.set('X-Trace-Id', spanId);

      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      tracer.endSpan(spanId, 'error');
      tracer.recordMetric('api.request.duration', duration, {
        method: req.method,
        status: 'error',
      });
      tracer.recordMetric('api.error.count', 1, {
        method: req.method,
      });

      throw error;
    }
  };
}

export const ALERT_THRESHOLDS = {
  API_LATENCY_MS: 1000,
  ERROR_RATE_PERCENT: 5,
  DB_QUERY_MS: 500,
  MEMORY_USAGE_PERCENT: 80,
  CPU_USAGE_PERCENT: 80,
} as const;

export class AlertManager {
  private alerts: Array<{
    id: string;
    type: string;
    severity: 'warning' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }> = [];

  private readonly MAX_ALERTS = 100;

  alert(type: string, severity: 'warning' | 'critical', message: string): void {
    const alert = {
      id: this.generateId(),
      type,
      severity,
      message,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);

    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(-this.MAX_ALERTS);
    }

    if (severity === 'critical') {
    } else {
    }
  }

  resolve(id: string): void {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
    }
  }

  getActiveAlerts(): typeof this.alerts {
    return this.alerts.filter(a => !a.resolved);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const alertManager = new AlertManager();

export function checkThresholds(): void {
  const apiLatency = tracer.getMetricStats('api.request.duration', 60000);
  if (apiLatency && apiLatency.avg > ALERT_THRESHOLDS.API_LATENCY_MS) {
    alertManager.alert(
      'api_latency',
      apiLatency.avg > ALERT_THRESHOLDS.API_LATENCY_MS * 2 ? 'critical' : 'warning',
      `API 平均响应时间 ${apiLatency.avg.toFixed(0)}ms 超过阈值 ${ALERT_THRESHOLDS.API_LATENCY_MS}ms`
    );
  }
}
