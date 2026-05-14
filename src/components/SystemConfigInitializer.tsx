'use client';

import { useEffect } from 'react';
import { setConfig } from '@/lib/global-config';

export default function SystemConfigInitializer() {
  useEffect(() => {
    const initSystemConfig = async () => {
      try {
        const res = await fetch('/api/system/config?pageSize=200');

        if (!res.ok) {
          console.warn('系统全局配置加载失败，HTTP状态:', res.status);
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn('系统全局配置返回非JSON响应');
          return;
        }

        const result = await res.json();

        if (result.success && Array.isArray(result.data?.list)) {
          const configMap: Record<string, any> = {};

          result.data.list.forEach((item: any) => {
            let value: any = item.config_value;

            switch (item.config_type) {
              case 'number':
                value = Number(value);
                break;
              case 'boolean':
                value = value === 'true';
                break;
              case 'json':
                try {
                  value = JSON.parse(value);
                } catch (e) {
                  value = value;
                }
                break;
              default:
                value = String(value);
            }

            configMap[item.config_key] = value;
          });

          setConfig(configMap);
          console.log('✅ 系统全局配置加载成功');
        }
      } catch (error) {
        console.error('❌ 系统全局配置加载失败:', error);
      }
    };

    initSystemConfig();
  }, []);

  return null;
}
