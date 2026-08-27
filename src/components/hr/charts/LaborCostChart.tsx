'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface LaborCostData {
  month: string;
  base: number;
  piece: number;
  overtime: number;
  performance: number;
  insurance: number;
}

interface LaborCostChartProps {
  data: LaborCostData[];
}

const colors = {
  base: '#22c55e',
  piece: '#3b82f6',
  overtime: '#f97316',
  performance: '#a855f7',
  insurance: '#ef4444',
};

const labels: Record<string, string> = {
  base: '基本工资',
  piece: '计件工资',
  overtime: '加班费',
  performance: '绩效奖金',
  insurance: '社保/公积金',
};

export function LaborCostChart({ data }: LaborCostChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        暂无数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number, name: string) => [
            `¥${value.toLocaleString()}`,
            labels[name] || name,
          ]}
        />
        <Legend
          formatter={(value: string) => labels[value] || value}
        />
        <Bar dataKey="base" stackId="a" fill={colors.base} />
        <Bar dataKey="piece" stackId="a" fill={colors.piece} />
        <Bar dataKey="overtime" stackId="a" fill={colors.overtime} />
        <Bar dataKey="performance" stackId="a" fill={colors.performance} />
        <Bar dataKey="insurance" stackId="a" fill={colors.insurance} />
      </BarChart>
    </ResponsiveContainer>
  );
}
