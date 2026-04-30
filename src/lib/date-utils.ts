import { formatDate as baseFormatDate } from './utils';

let cachedDateFormat: string | null = null;
let fetchPromise: Promise<string> | null = null;

async function fetchDateFormat(): Promise<string> {
  if (cachedDateFormat) return cachedDateFormat;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
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
    } catch (e) {
      console.error('Failed to fetch date format', e);
    }
    cachedDateFormat = 'YYYY-MM-DD';
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
