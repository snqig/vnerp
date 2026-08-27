interface QueryOptimization {
  useIndex: string[];
  forceIndex?: string;
  queryTimeout?: number;
  maxRows?: number;
}

interface ConnectionPoolConfig {
  max: number;
  min: number;
  idleTimeout: number;
  connectionLimit: number;
}

export const DB_OPTIMIZATION_CONFIG: ConnectionPoolConfig = {
  max: 20,
  min: 5,
  idleTimeout: 30000,
  connectionLimit: 50,
};

export const QUERY_TIMEOUTS = {
  FAST: 5000,
  NORMAL: 15000,
  SLOW: 30000,
  REPORT: 60000,
} as const;

export const INDEX_RECOMMENDATIONS: Record<string, QueryOptimization> = {
  orders: {
    useIndex: ['idx_orders_customer_id', 'idx_orders_status', 'idx_orders_date'],
    queryTimeout: QUERY_TIMEOUTS.NORMAL,
  },
  customers: {
    useIndex: ['idx_customers_code', 'idx_customers_name'],
    queryTimeout: QUERY_TIMEOUTS.FAST,
  },
  inventory: {
    useIndex: ['idx_inventory_material_id', 'idx_inventory_warehouse_id', 'idx_inventory_quantity'],
    queryTimeout: QUERY_TIMEOUTS.FAST,
  },
  production_orders: {
    useIndex: ['idx_production_status', 'idx_production_date', 'idx_production_product'],
    queryTimeout: QUERY_TIMEOUTS.NORMAL,
  },
  finance_transactions: {
    useIndex: ['idx_finance_date', 'idx_finance_type', 'idx_finance_account'],
    queryTimeout: QUERY_TIMEOUTS.SLOW,
  },
};

export function buildOptimizedQuery(
  baseQuery: string,
  table: string,
  conditions: Record<string, unknown>
): { query: string; params: unknown[] } {
  const optimization = INDEX_RECOMMENDATIONS[table];
  const params: unknown[] = [];
  const whereClauses: string[] = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          whereClauses.push(`${key} IN (${value.map(() => '?').join(',')})`);
          params.push(...value);
        } else {
          whereClauses.push('1 = 0');
        }
      } else {
        whereClauses.push(`${key} = ?`);
        params.push(value);
      }
    }
  }

  let query = baseQuery;

  if (optimization?.forceIndex) {
    query = query.replace(/FROM\s+(\w+)/i, `FROM $1 FORCE INDEX (${optimization.forceIndex})`);
  }

  if (whereClauses.length > 0) {
    const whereClause = whereClauses.join(' AND ');
    query = query.includes('WHERE')
      ? query.replace(/WHERE/i, `WHERE ${whereClause} AND`)
      : `${query} WHERE ${whereClause}`;
  }

  return { query, params };
}

export class QueryAnalyzer {
  private slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> = [];

  private readonly SLOW_QUERY_THRESHOLD = 1000;

  logQuery(query: string, duration: number): void {
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueries.push({
        query: query.substring(0, 200),
        duration,
        timestamp: new Date(),
      });

      if (this.slowQueries.length > 100) {
        this.slowQueries = this.slowQueries.slice(-50);
      }
    }
  }

  getSlowQueries(): typeof this.slowQueries {
    return [...this.slowQueries];
  }

  getSlowQueryStats(): {
    total: number;
    averageDuration: number;
    maxDuration: number;
  } {
    if (this.slowQueries.length === 0) {
      return { total: 0, averageDuration: 0, maxDuration: 0 };
    }

    const durations = this.slowQueries.map((q) => q.duration);
    return {
      total: this.slowQueries.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
    };
  }
}

export const queryAnalyzer = new QueryAnalyzer();

export async function withQueryOptimization<T>(
  query: string,
  executor: () => Promise<T>,
  _table?: string
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await executor();
    const duration = Date.now() - startTime;

    queryAnalyzer.logQuery(query, duration);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    queryAnalyzer.logQuery(query, duration);
    throw error;
  }
}

export const READ_REPLICA_CONFIG = {
  enabled: false,
  host: process.env.DB_READ_HOST || process.env.DB_HOST,
  port: parseInt(process.env.DB_READ_PORT || process.env.DB_PORT || '3306'),
};

export function shouldUseReadReplica(query: string): boolean {
  if (!READ_REPLICA_CONFIG.enabled) return false;

  const upperQuery = query.toUpperCase().trim();
  return upperQuery.startsWith('SELECT') && !upperQuery.includes('FOR UPDATE');
}
