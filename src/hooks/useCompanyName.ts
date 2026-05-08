import { useState, useEffect } from 'react';

export function useCompanyName() {
  const [companyName, setCompanyName] = useState('越南达昌科技有限公司');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWithRetry = async (url: string, retries = 2): Promise<Response | null> => {
      for (let i = 0; i <= retries; i++) {
        try {
          const res = await fetch(url);
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res;
          }
          if (i < retries) {
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
          }
        } catch {
          if (i < retries) {
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
          }
        }
      }
      return null;
    };

    const fetchCompanyName = async () => {
      try {
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

        const configRes = await fetchWithRetry('/api/system/config?pageSize=200');
        if (configRes) {
          const configData = await configRes.json();
          if (!cancelled && configData.success && configData.data?.list) {
            const companyNameConfig = configData.data.list.find(
              (item: any) => item.config_key === 'company_name'
            )?.config_value;
            const companyShortName = configData.data.list.find(
              (item: any) => item.config_key === 'company_short_name'
            )?.config_value;
            if (companyNameConfig) {
              setCompanyName(companyNameConfig);
            } else if (companyShortName) {
              setCompanyName(companyShortName);
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
  }, []);

  return { companyName, loading };
}
