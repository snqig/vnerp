'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-fetch';

export interface EmployeeOption {
  employee_no: string;
  name: string;
  dept_name?: string;
  position?: string;
}

/**
 * 在职员工下拉数据源（sys_employee status=1，一次拉取）。
 *
 * 背景：检验员/测试人/处理人/责任人等「人名」字段此前是自由文本输入，
 * 存量数据里出现过「品管员甲」这类库内不存在的人（2026-09-30 用户报告）。
 * 人名一律从库内真实人员选择；拉取失败返回空数组，调用方回退手输 Input。
 */
export function useEmployeeOptions(): EmployeeOption[] {
  const [options, setOptions] = useState<EmployeeOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/hr/employees?status=1&page=1&pageSize=200');
        const result = await res.json();
        if (!cancelled && result.success) {
          const list = Array.isArray(result.data) ? result.data : result.data?.list || [];
          setOptions(list);
        }
      } catch {
        // 拉取失败保持空列表，调用方回退手输
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}

/** 下拉项展示文案：姓名（部门·岗位） */
export function employeeLabel(emp: EmployeeOption): string {
  return (
    emp.name +
    (emp.dept_name ? `（${emp.dept_name}${emp.position ? '·' + emp.position : ''}）` : '')
  );
}
