'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StandardTable, type StandardTableColumn } from '@/components/common';
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
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
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
      if (json.code === 200) {
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

  const trendColumns: StandardTableColumn<{ month: string; newHires: number; resignations: number; netChange: number }>[] = [
    { key: 'month', title: t('month') || ts('k_1fsw60u'), render: (r) => <span className="font-medium">{r.month}</span> },
    { key: 'newHires', title: t('newHires') || ts('k_a0odrq'), align: 'right', render: (r) => <span className="text-green-600 dark:text-green-400">{r.newHires}</span> },
    { key: 'resignations', title: t('resignations') || ts('k_1v4n1r6'), align: 'right', render: (r) => <span className="text-red-500 dark:text-red-400">{r.resignations}</span> },
    {
      key: 'netChange',
      title: t('netChange') || ts('k_e3fn55'),
      align: 'right',
      render: (r) => (
        <span className={`font-medium ${r.netChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {r.netChange >= 0 ? '+' : ''}{r.netChange}
        </span>
      ),
    },
  ];

  const deptColumns: StandardTableColumn<{ dept_name: string; total: number; resigned: number; rate: number }>[] = [
    { key: 'dept_name', title: t('departmentName') || tc('department'), render: (r) => <span className="font-medium">{r.dept_name}</span> },
    { key: 'total', title: t('totalEmployees') || ts('k_k1kv74'), align: 'right', render: (r) => r.total },
    { key: 'resigned', title: t('resigned') || ts('k_h7ds5u'), align: 'right', render: (r) => r.resigned },
    { key: 'rate', title: t('turnoverRate') || ts('k_17ttkoh'), align: 'right', render: (r) => `${r.rate}%` },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('turnover') || ts('k_a9h8w')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('headcount') || ts('k_497jib')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalEmployees || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('resignations') || ts('k_5rbwdk')}</CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">{data?.resignedCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgTenure') || ts('k_2lg9bm')}</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.avgTenureDays || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('turnoverRate') || ts('k_1s8qmr9')}</CardTitle>
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
              <CardTitle className="text-lg">{t('monthlyTrend') || ts('k_p3lqro')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StandardTable
                columns={trendColumns}
                dataSource={data?.monthlyTrend || []}
                rowKey="month"
                rowSelectable={false}
                showPagination={false}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('departmentTurnoverRate') || ts('k_1xzb8v3')}</CardTitle>
            </CardHeader>
            <CardContent>
              <StandardTable
                columns={deptColumns}
                dataSource={data?.byDepartment || []}
                rowKey="dept_name"
                rowSelectable={false}
                showPagination={false}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
