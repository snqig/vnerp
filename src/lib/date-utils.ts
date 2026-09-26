import { formatDate as baseFormatDate } from './utils';

let cachedDateFormat: string = 'YYYY-MM-DD';
let fetchPromise: Promise<string> | null = null;

async function fetchDateFormat(): Promise<string> {
  if (cachedDateFormat !== 'YYYY-MM-DD' || fetchPromise) {
    if (fetchPromise) return fetchPromise;
    return cachedDateFormat;
  }

  fetchPromise = (async (): Promise<string> => {
    try {
      const res = await fetch('/api/system/config?pageSize=200');
      const data = await res.json();
      if (data.success && data.data?.list) {
        const dateConfig = data.data.list.find(
          (item: { config_key: string; config_value: string }) => item.config_key === 'date_format'
        );
        if (dateConfig?.config_value) {
          cachedDateFormat = dateConfig.config_value;
          return cachedDateFormat;
        }
      }
    } catch {}
    return cachedDateFormat;
  })();

  return fetchPromise;
}

export function formatDate(date: Date | string | null | undefined, format?: string): string {
  if (!date) return '';
  const fmt = format || cachedDateFormat || 'YYYY-MM-DD';
  return baseFormatDate(date, fmt);
}

export async function initDateFormat(): Promise<void> {
  await fetchDateFormat();
}

export function setDateFormat(format: string): void {
  cachedDateFormat = format;
}

/**
 * 取「本地日历日」的 YYYY-MM-DD。
 *
 * 背景：容器/服务跑在 UTC+8，而 `new Date().toISOString().slice(0,10)` 取的是
 * UTC 日期 —— 每天 00:00~08:00 之间会得到**前一天**，使单据日期、到期日、
 * 统计区间整体上移一天（曾导致不合格品 handle_date 早一天）。
 *
 * 凡是要拿「今天」当业务日期/单号日期/统计截止日的地方，一律走本函数，
 * 不要再用 toISOString()。
 */
export function toLocalDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 返回本月的「起（含）—止（不含）」本地日期区间，形如 `{ start: '2026-09-01', end: '2026-10-01' }`。
 *
 * 背景：统计里常见 `YEAR(col) = YEAR(CURDATE()) AND MONTH(col) = MONTH(CURDATE())` 的写法，
 * 这个表达式把函数套在列上，**索引直接失效**，数据量上来后就是全表扫描。
 * 改成半开区间后 `col >= ? AND col < ?` 可以走 range 扫描，且边界在 JS 侧按本地日历算，不受时区影响。
 *
 * 用法：`WHERE create_time >= ? AND create_time < ?` + `params.push(range.start, range.end)`。
 */
export function currentMonthRange(now: Date = new Date()): { start: string; end: string } {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    end: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`,
  };
}
