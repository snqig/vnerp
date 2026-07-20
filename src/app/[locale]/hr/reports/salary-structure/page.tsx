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
import { SalaryStructureChart } from '@/components/hr/charts/SalaryStructureChart';
import { ChevronLeft, ChevronRight, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface SalaryStructureData {
  avgSalary: number;
  medianSalary: number;
  componentBreakdown: { name: string; value: number; color: string }[];
  distribution: { range: string; count: number }[];
}

export default function SalaryStructurePage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const [data, setData] = useState<SalaryStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchData();
  }, [month]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/reports/salary-structure?month=${month}`);
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

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)}
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
          <h1 className="text-3xl font-bold">{t('salaryStructure') || '薪资结构分析'}</h1>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgSalary') || '平均薪资'}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{data?.avgSalary.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('medianSalary') || '中位数薪资'}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{data?.medianSalary.toLocaleString() || '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('salaryStructure') || '薪资构成'}</CardTitle>
            </CardHeader>
            <CardContent>
              <SalaryStructureChart data={data?.componentBreakdown || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('salaryDistribution') || '薪资分布'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('salaryRange') || '薪资区间'}</TableHead>
                    <TableHead className="text-right">{t('headcount') || '人数'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.distribution.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{d.range}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
