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
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserMinus, CalendarDays, Activity } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TurnoverData {
  totalEmployees: number;
  resignedCount: number;
  avgTenureDays: number;
  turnoverRate: number;
  monthlyTrend: {
    month: string;
    newHires: number;
    resignations: number;
    netChange: number;
  }[];
  byDepartment: {
    dept_name: string;
    total: number;
    resigned: number;
    rate: number;
  }[];
}

export default function TurnoverPage() {
  const t = useTranslations('Hr');
  const _tc = useTranslations('Common');
  const [data, setData] = useState<TurnoverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/hr/reports/turnover');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-3xl font-bold">{t('turnover') || '人员流动分析'}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('headcount') || '在职人数'}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalEmployees || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('resignations') || '离职人数'}</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{data?.resignedCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgTenure') || '平均在职天数'}</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.avgTenureDays || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('turnoverRate') || '综合流动率'}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.turnoverRate || 0}%</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('monthlyTrend') || '月度流动趋势'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('month') || '月份'}</TableHead>
                    <TableHead className="text-right">{t('newHires') || '新入职'}</TableHead>
                    <TableHead className="text-right">{t('resignations') || '离职'}</TableHead>
                    <TableHead className="text-right">{t('netChange') || '净变化'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.monthlyTrend.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.month}</TableCell>
                      <TableCell className="text-right text-green-600">{row.newHires}</TableCell>
                      <TableCell className="text-right text-red-500">{row.resignations}</TableCell>
                      <TableCell className={`text-right font-medium ${row.netChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {row.netChange >= 0 ? '+' : ''}{row.netChange}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('departmentTurnoverRate') || '各部门流动率'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('departmentName') || '部门'}</TableHead>
                    <TableHead className="text-right">{t('totalEmployees') || '总人数'}</TableHead>
                    <TableHead className="text-right">{t('resigned') || '已离职'}</TableHead>
                    <TableHead className="text-right">{t('turnoverRate') || '流动率'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.byDepartment.map((dept, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{dept.dept_name}</TableCell>
                      <TableCell className="text-right">{dept.total}</TableCell>
                      <TableCell className="text-right">{dept.resigned}</TableCell>
                      <TableCell className="text-right">{dept.rate}%</TableCell>
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
