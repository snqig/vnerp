import { useState, useEffect } from 'react';

export function useCompanyName() {
  const [companyName, setCompanyName] = useState('越南达昌科技有限公司');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyName = async () => {
      try {
        // 优先从组织设置的企业信息接口获取
        const orgRes = await fetch('/api/organization?type=company');
        const orgData = await orgRes.json();
        if (orgData.success && orgData.data) {
          if (orgData.data.full_name) {
            setCompanyName(orgData.data.full_name);
            return;
          }
          if (orgData.data.short_name) {
            setCompanyName(orgData.data.short_name);
            return;
          }
        }

        // 降级到系统配置获取
        const configRes = await fetch('/api/system/config?pageSize=200');
        const configData = await configRes.json();
        if (configData.success && configData.data?.list) {
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
      } catch (e) {
        console.error('获取公司名称失败:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyName();
  }, []);

  return { companyName, loading };
}
