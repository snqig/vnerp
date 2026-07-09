import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';
import { UserInfo } from '@/lib/api-auth';
import { withPermission } from '@/lib/api-permissions';
import { query } from '@/lib/db';

/**
 * 系统监控 API
 * 提供系统运行状态、数据库状态、连接池状态等信息
 */
export const GET = withPermission(
  async (request: NextRequest, _userInfo: UserInfo) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    // 系统概览
    if (type === 'overview') {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // 数据库统计
      let dbStats: Record<string, any> = {};
      try {
        const [userCount, orderCount, inventoryCount, logCount]: any[] = await Promise.all([
          query('SELECT COUNT(*) as count FROM sys_user WHERE deleted = 0'),
          query('SELECT COUNT(*) as count FROM purchase_order WHERE deleted = 0'),
          query('SELECT COUNT(*) as count FROM warehouse_stock'),
          query(
            'SELECT COUNT(*) as count FROM sys_operation_log WHERE create_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)'
          ),
        ]);
        dbStats = {
          users: userCount[0]?.count || 0,
          purchaseOrders: orderCount[0]?.count || 0,
          inventoryRecords: inventoryCount[0]?.count || 0,
          recentLogs: logCount[0]?.count || 0,
        };
      } catch {
        dbStats = { error: '数据库查询失败' };
      }

      return successResponse({
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          uptime: Math.round(process.uptime()),
          uptimeFormatted: formatUptime(process.uptime()),
          environment: process.env.NODE_ENV || 'development',
          appVersion: process.env.APP_VERSION || '1.0.0',
        },
        memory: {
          rss: formatBytes(memUsage.rss),
          heapTotal: formatBytes(memUsage.heapTotal),
          heapUsed: formatBytes(memUsage.heapUsed),
          heapUsage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
          external: formatBytes(memUsage.external),
          arrayBuffers: formatBytes(memUsage.arrayBuffers),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        database: dbStats,
        timestamp: new Date().toISOString(),
      });
    }

    // 数据库连接池状态
    if (type === 'database') {
      try {
        const [threads, queries, slowQueries, connections]: any[] = await Promise.all([
          query('SHOW STATUS LIKE "Threads_connected"'),
          query('SHOW STATUS LIKE "Queries"'),
          query('SHOW STATUS LIKE "Slow_queries"'),
          query('SHOW STATUS LIKE "Max_used_connections"'),
        ]);

        return successResponse({
          threadsConnected: Number(threads[0]?.Value || 0),
          totalQueries: Number(queries[0]?.Value || 0),
          slowQueries: Number(slowQueries[0]?.Value || 0),
          maxUsedConnections: Number(connections[0]?.Value || 0),
        });
      } catch (e: any) {
        return successResponse({ error: e.message });
      }
    }

    // 最近操作日志
    if (type === 'logs') {
      const limit = parseInt(searchParams.get('limit') || '50');
      const logs: any = await query(
        `SELECT l.*, u.real_name as operator_name
         FROM sys_operation_log l
         LEFT JOIN sys_user u ON l.user_id = u.id
         ORDER BY l.create_time DESC
         LIMIT ?`,
        [limit]
      );
      return successResponse({ logs });
    }

    return successResponse({ message: 'Unknown type' });
  },
  { errorMessage: '操作失败' }
);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时${minutes}分钟`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}
