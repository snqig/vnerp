'use client';

import { useTranslations } from 'next-intl';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SalaryStructureData {
  name: string;
  value: number;
  color: string;
}

interface SalaryStructureChartProps {
  data: SalaryStructureData[];
}

function CenterLabel({ cx, cy, total, t }: { cx: number; cy: number; total: number; t: (key: string) => string }) {
  return (
    <g>
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-muted-foreground text-xs">
          {t('total')}
        </text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="fill-foreground text-lg font-bold">
        ¥{total.toLocaleString()}
      </text>
    </g>
  );
}

export function SalaryStructureChart({ data }: SalaryStructureChartProps) {
  const ts = useTranslations('Common');
  const t = useTranslations('Hr');

  const labelMap: Record<string, string> = {
    baseSalary: t('baseSalary') || ts('k_60tcky'),
    pieceSalary: t('pieceSalary') || ts('k_j33wr3'),
    overtimeSalary: t('overtimeSalary') || ts('k_6aiarb'),
    performanceSalary: t('performanceSalary') || ts('k_n10a79'),
    allowances: t('allowances') || ts('k_1hcqc71'),
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        {t('noData') || ts('k_6tzr61')}
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const chartData = data.map((d) => ({ ...d, name: labelMap[d.name] || d.name }));
  const centerLabel = <CenterLabel cx={200} cy={200} total={total} t={t} />;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
          labelLine
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          formatter={(value: number, name: string) => [`¥${value.toLocaleString()}`, name]}
        />
        <Legend />
        {centerLabel}
      </PieChart>
    </ResponsiveContainer>
  );
}
