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
  const pad = (n: string | number) => String(n).padStart(2, '0');
  return {
    start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`,
    end: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`,
  };
}

/**
 * 把后端返回的日期值转成 <input type="date"> 可接受的 YYYY-MM-DD。
 *
 * 背景：mysql2 未开 dateStrings，DATE/DATETIME 列读取返回 Date 对象，
 * 经 API JSON 序列化为 UTC ISO 串（东八区钟面偏移 -8h）；HTML date input
 * 只接受 YYYY-MM-DD，直接绑定会导致**编辑回显空白**。
 * 编辑弹窗回填日期字段一律经本函数包裹，不要直接绑定行数据。
 */
export function toDateInput(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return toLocalDateStr(value);
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO 带时区（Z 或 ±offset）→ 必须先于 T 分隔分支判断：按本地日历日换算，避免 UTC 偏移错日
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : toLocalDateStr(d);
  }
  // 'YYYY-MM-DD HH:mm:ss' / 'YYYY-MM-DDTHH:mm:ss'：无时区语义，钟面即业务日
  if (/^\d{4}-\d{2}-\d{2}[ T]/.test(s)) return s.slice(0, 10);
  return s;
}

/**
 * 把后端返回的日期时间值转成 <input type="datetime-local"> 可接受的
 * YYYY-MM-DDTHH:mm（本地时区钟面）。
 *
 * 背景：DATETIME 列经 API JSON 序列化为 UTC ISO 串（...Z）。datetime-local
 * 只接受无时区串：① 直接绑定因结尾 .000Z 通不过值消毒 → 编辑回显空白；
 * ② 即使 slice(0,16) 得到合法格式，取到的是 UTC 钟面，东八区整体偏移 -8h。
 * 编辑弹窗回填「日期时间」字段一律经本函数包裹。
 */
export function toDateTimeLocal(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
      value.getHours()
    )}:${pad(value.getMinutes())}`;
  }
  const s = String(value);
  // ISO 带时区（Z 或 ±offset）→ 按本地时区换算
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(s)) {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }
  // 'YYYY-MM-DD HH:mm:ss' / 'YYYY-MM-DDTHH:mm:ss'：无时区语义，钟面即业务时间
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    return `${s.slice(0, 10)}T${s.slice(11, 16)}`;
  }
  return s;
}

/** 当前本地时间的 datetime-local 值（新建表单默认时间用，勿再用 toISOString().slice()）。 */
export function nowDateTimeLocal(date: Date = new Date()): string {
  return toDateTimeLocal(date);
}
