'use client';

import { useEffect } from 'react';
import { setConfig } from '@/lib/global-config';
import { useAuthGate } from '@/contexts/AuthContext';
import type { DbRow } from '@/types/db';

export default function SystemConfigInitializer() {
  // 该组件挂在 [locale]/layout 上，登录页也会渲染。
  // /api/system/config 需要登录态，未登录时发起会返回 401（BUG-005 控制台噪音）。
  // 因此按认证闸门短路：pending 时等待，anonymous 时直接跳过。
  const authGate = useAuthGate();

  useEffect(() => {
    if (authGate === 'pending') return;
    if (authGate === 'anonymous') return;

    const initSystemConfig = async () => {
      try {
        const res = await fetch('/api/system/config?pageSize=200');

        if (!res.ok) {
          return;
        }

        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return;
        }

        const result = await res.json();

        if (result.success && Array.isArray(result.data?.list)) {
          const configMap: Record<string, unknown> = {};

          result.data.list.forEach((item: DbRow) => {
            let value: unknown = item.config_value;

            switch (item.config_type) {
              case 'number':
                value = Number(value);
                break;
              case 'boolean':
                value = value === 'true';
                break;
              case 'json':
                try {
                  value = JSON.parse(value as string);
                } catch {
                  value = value;
                }
                break;
              default:
                value = String(value);
            }

            configMap[item.config_key as string] = value;
          });

          setConfig(configMap);
        }
      } catch {}
    };

    initSystemConfig();
  }, [authGate]);

  return null;
}
