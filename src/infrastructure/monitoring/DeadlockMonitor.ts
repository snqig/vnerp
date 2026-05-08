import { query } from '@/lib/db';
import { secureLog } from '@/lib/logger';

export interface DeadlockInfo {
  id: number;
  timestamp: string;
  victimQuery: string;
  deadlockJson: string;
}

export interface InnoDBStatus {
  deadlocks: DeadlockInfo[];
  lockWaitCount: number;
  avgLockWaitTime: number;
}

export interface LongTransaction {
  id: number;
  startTime: string;
  duration: number;
  state: string;
  query: string;
  tablesLocked: string[];
}

export interface MonitorResult {
  innodbStatus: InnoDBStatus;
  longTransactions: LongTransaction[];
  alerts: string[];
}

export class DeadlockMonitor {
  static async checkDeadlocks(): Promise<MonitorResult> {
    const result: MonitorResult = {
      innodbStatus: { deadlocks: [], lockWaitCount: 0, avgLockWaitTime: 0 },
      longTransactions: [],
      alerts: [],
    };

    try {
      const statusRows: any = await query('SHOW ENGINE INNODB STATUS');
      const statusText = (statusRows as any[])[0]?.Status || '';

      const deadlockMatch = statusText.match(/LATEST DETECTED DEADLOCK[\s\S]*?TRANSACTIONS/);
      if (deadlockMatch) {
        result.alerts.push('检测到最近发生死锁，请检查 InnoDB 状态');
        secureLog('warn', 'Deadlock detected in InnoDB status', {
          snippet: deadlockMatch[0].substring(0, 500),
        });
      }

      const lockWaitMatch = statusText.match(/LOCK WAIT (\d+) lock struct\(s\)/);
      if (lockWaitMatch) {
        result.innodbStatus.lockWaitCount = parseInt(lockWaitMatch[1]);
        if (result.innodbStatus.lockWaitCount > 5) {
          result.alerts.push(`当前有${result.innodbStatus.lockWaitCount}个锁等待，可能存在锁竞争`);
        }
      }
    } catch (error: any) {
      secureLog('error', 'Failed to check InnoDB status', { error: error?.message });
    }

    try {
      const longTxRows: any = await query(
        `SELECT
          trx_id as id,
          trx_started as startTime,
          TIMESTAMPDIFF(SECOND, trx_started, NOW()) as duration,
          trx_state as state,
          trx_query as query,
          trx_tables_locked as tablesLocked
         FROM information_schema.innodb_trx
         WHERE TIMESTAMPDIFF(SECOND, trx_started, NOW()) > 30
         ORDER BY duration DESC
         LIMIT 10`
      );

      result.longTransactions = (longTxRows as any[]).map((row: any) => ({
        id: row.id,
        startTime: row.startTime,
        duration: row.duration,
        state: row.state,
        query: row.query?.substring(0, 200) || '',
        tablesLocked: row.tablesLocked ? String(row.tablesLocked).split(',') : [],
      }));

      if (result.longTransactions.length > 0) {
        result.alerts.push(
          `发现${result.longTransactions.length}个超过30秒的长事务，最长${Math.max(...result.longTransactions.map(t => t.duration))}秒`
        );
        secureLog('warn', 'Long running transactions detected', {
          count: result.longTransactions.length,
          maxDuration: Math.max(...result.longTransactions.map(t => t.duration)),
        });
      }
    } catch (error: any) {
      secureLog('error', 'Failed to check long transactions', { error: error?.message });
    }

    try {
      const deadlockHistory: any = await query(
        `SELECT * FROM mysql.deadlocks ORDER BY id DESC LIMIT 5`
      );
      result.innodbStatus.deadlocks = (deadlockHistory as any[]).map((row: any) => ({
        id: row.id,
        timestamp: row.timestamp,
        victimQuery: row.victim_query?.substring(0, 200) || '',
        deadlockJson: row.deadlock_json?.substring(0, 500) || '',
      }));
    } catch {
      // mysql.deadlocks table may not exist in all MySQL configurations
    }

    return result;
  }

  static async killLongTransaction(trxId: number): Promise<boolean> {
    try {
      const trxRows: any = await query(
        `SELECT trx_mysql_thread_id FROM information_schema.innodb_trx WHERE trx_id = ?`,
        [trxId]
      );
      if ((trxRows as any[]).length === 0) {
        return false;
      }
      const threadId = (trxRows as any[])[0].trx_mysql_thread_id;
      await query(`KILL ?`, [threadId]);
      secureLog('warn', 'Killed long transaction', { trxId, threadId });
      return true;
    } catch (error: any) {
      secureLog('error', 'Failed to kill transaction', { trxId, error: error?.message });
      return false;
    }
  }
}
