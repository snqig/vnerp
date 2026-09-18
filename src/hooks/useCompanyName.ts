import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { authFetch } from '@/lib/auth-fetch';
import { useAuthGate } from '@/contexts/AuthContext';

export function useCompanyName() {
  const tc = useTranslations('Common');
  const [companyName, setCompanyName] = useState(tc('companyName'));
  const [loading, setLoading] = useState(true);
  // 认证闸门：/api/system/config 与 /api/organization 均需登录态。
  // 登录页（未登录）也会调用本 hook 取品牌名，若照旧发起请求会产生 401 噪音（BUG-005）。
  // 未登录时短路——保持 i18n 默认名（与「请求 401 后回退」的最终结果完全一致，故无 UI 变化）。
  const authGate = useAuthGate();

  useEffect(() => {
    if (authGate === 'pending') return;
    if (authGate === 'anonymous') {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchWithRetry = async (url: string, retries = 2): Promise<Response | null> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await authFetch(url);
          if (res.status === 401) return null;
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res;
          }
          if (i < retries) {
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        } catch {
          if (i < retries) {
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        }
      }
      return null;
    };

    const fetchCompanyName = async () => {
      try {
        const configRes = await fetchWithRetry('/api/system/config?pageSize=200');
        if (configRes) {
          const configData = await configRes.json();
          if (!cancelled && configData.success && configData.data?.list) {
            const companyNameConfig =
              configData.data.list.find(
                (item: { config_key: string; config_value: string }) =>
                  item.config_key === 'company.name'
              )?.config_value ||
              configData.data.list.find(
                (item: { config_key: string; config_value: string }) =>
                  item.config_key === 'company_name'
              )?.config_value;
            const companyShortName = configData.data.list.find(
              (item: { config_key: string; config_value: string }) =>
                item.config_key === 'company_short_name'
            )?.config_value;
            if (companyNameConfig) {
              setCompanyName(companyNameConfig);
              return;
            } else if (companyShortName) {
              setCompanyName(companyShortName);
              return;
            }
          }
        }

        const orgRes = await fetchWithRetry('/api/organization?type=company');
        if (orgRes) {
          const orgData = await orgRes.json();
          if (!cancelled && orgData.success && orgData.data) {
            if (orgData.data.full_name) {
              setCompanyName(orgData.data.full_name);
              return;
            }
            if (orgData.data.short_name) {
              setCompanyName(orgData.data.short_name);
              return;
            }
          }
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCompanyName();

    return () => {
      cancelled = true;
    };
  }, [authGate]);

  return { companyName, loading };
}
