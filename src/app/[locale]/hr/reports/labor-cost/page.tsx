'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LaborCostChart } from '@/components/hr/charts/LaborCostChart';
import { ChevronLeft, ChevronRight, DollarSign, Users, TrendingUp, Building2 } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { useTranslations } from 'next-intl';

interface LaborCostData {
  totalCost: number;
  avgCost: number;
  headcount: number;
  costTrend: number;
  byDepartment: { dept_name: string; cost: number; percentage: number }[];
  byType: { type: string; cost: number; percentage: number }[];
  monthlyTrend: {
    month: string;
    base: number;
    piece: number;
    overtime: number;
    performance: number;
    insurance: number;
  }[];
}

export default function LaborCostReportPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const [data, setData] = useState<LaborCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchData();
  }, [month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/reports/labor-cost?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (offset: number) => {
    const date = new Date(month + '-01');
    date.setMonth(date.getMonth() + offset);
    setMonth(format(date, 'yyyy-MM'));
  };

  const typeLabels: Record<string, string> = {
    base: t('baseSalary') || '基本工资',
    piece: t('pieceWage') || '计件工资',
    overtime: t('overtimePay') || '加班费',
    performance: t('performanceBonus') || '绩效奖金',
    insurance: t('socialInsurance') || '社保/公积金',
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('laborCost') || '人力成本分析'}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded-md">{month}</span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCost') || '总成本'}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{data?.totalCost.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgCostPerHead') || '人均成本'}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{data?.avgCost.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('headcount') || '人数'}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.headcount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('trend') || '成本趋势'}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(data?.costTrend || 0) >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {(data?.costTrend || 0) >= 0 ? '+' : ''}{data?.costTrend || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('departmentCostDistribution') || '部门成本分布'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('departmentName') || '部门'}</TableHead>
                    <TableHead className="text-right">{t('totalCost') || '成本'}</TableHead>
                    <TableHead className="text-right">{t('percentage') || '占比'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byDepartment.map((dept, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{dept.dept_name}</TableCell>
                      <TableCell className="text-right">¥{dept.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{dept.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('costTypeBreakdown') || '成本类型构成'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('type') || '类型'}</TableHead>
                    <TableHead className="text-right">{t('amount') || '金额'}</TableHead>
                    <TableHead className="text-right">{t('percentage') || '占比'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byType.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{typeLabels[t.type] || t.type}</TableCell>
                      <TableCell className="text-right">¥{t.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{t.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('monthlyTrend') || '月度成本趋势'}</CardTitle>
          </CardHeader>
          <CardContent>
            <LaborCostChart data={data?.monthlyTrend || []} />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
