'use client';

import { useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SalaryStructureData {
  name: string;
  value: number;
  color: string;
}

interface SalaryStructureChartProps {
  data: SalaryStructureData[];
}

export function SalaryStructureChart({ data }: SalaryStructureChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        暂无数据
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const renderCenterLabel = useCallback(
    ({ viewBox }: { viewBox?: { cx: number; cy: number } }) => {
      if (!viewBox) return null;
      const { cx, cy } = viewBox;
      return (
        <g>
          <text x={cx} y={cy - 8} textAnchor="middle" className="fill-muted-foreground text-xs">
            总金额
          </text>
          <text
            x={cx}
            y={cy + 16}
            textAnchor="middle"
            className="fill-foreground text-lg font-bold"
          >
            ¥{total.toLocaleString()}
          </text>
        </g>
      );
    },
    [total]
  );

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          labelLine
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number, name: string) => [
            `¥${value.toLocaleString()}`,
            name,
          ]}
        />
        <Legend />
        {renderCenterLabel({ viewBox: { cx: 200, cy: 200 } } as any)}
      </PieChart>
    </ResponsiveContainer>
  );
}
