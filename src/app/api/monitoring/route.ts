import { NextRequest, NextResponse } from 'next/server';
import { tracer, healthChecker, alertManager, checkThresholds } from '@/lib/monitoring';
import { queryAnalyzer } from '@/lib/performance/db-optimization';
import { apiMetrics } from '@/lib/performance/api-optimization';
import { performanceMonitor } from '@/lib/performance/frontend-optimization';
import { handleError, withErrorHandler } from '@/lib/error-handling';

async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  switch (action) {
    case 'health':
      const health = await healthChecker.runAll();
      return NextResponse.json({
        success: true,
        data: {
          status: Object.values(health).every(h => h.healthy) ? 'healthy' : 'unhealthy',
          checks: health,
          timestamp: new Date().toISOString(),
        },
      });

    case 'metrics':
      checkThresholds();
      return NextResponse.json({
        success: true,
        data: {
          api: {
            metrics: apiMetrics.getMetrics(),
            slowEndpoints: apiMetrics.getSlowEndpoints(),
          },
          database: {
            slowQueries: queryAnalyzer.getSlowQueries().slice(0, 20),
            stats: queryAnalyzer.getSlowQueryStats(),
          },
          performance: performanceMonitor.getAllStats(),
          traces: tracer.exportTraces(),
          alerts: alertManager.getActiveAlerts(),
        },
      });

    case 'traces':
      const slowOnly = url.searchParams.get('slowOnly') === 'true';
      const threshold = parseInt(url.searchParams.get('threshold') || '1000');
      
      return NextResponse.json({
        success: true,
        data: slowOnly ? tracer.getSlowSpans(threshold) : tracer.exportTraces(),
      });

    case 'alerts':
      return NextResponse.json({
        success: true,
        data: {
          active: alertManager.getActiveAlerts(),
        },
      });

    case 'clear':
      return NextResponse.json({
        success: true,
        message: 'Metrics cleared (placeholder - implement as needed)',
      });

    default:
      const overview = await healthChecker.runAll();
      return NextResponse.json({
        success: true,
        data: {
          health: overview,
          summary: {
            totalApiCalls: Object.values(apiMetrics.getMetrics()).reduce(
              (sum, m) => sum + m.count, 0
            ),
            slowQueries: queryAnalyzer.getSlowQueries().length,
            activeAlerts: alertManager.getActiveAlerts().length,
          },
          timestamp: new Date().toISOString(),
        },
      });
  }
}

export const GET = withErrorHandler(handler);
