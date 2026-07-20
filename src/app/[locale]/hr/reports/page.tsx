'use client';

import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { DollarSign, PieChart, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function HRReportsPage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');

  const reports = [
    {
      title: t('laborCost'),
      description: t('laborCostDesc'),
      icon: DollarSign,
      href: '/hr/reports/labor-cost',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: t('salaryStructure'),
      description: t('salaryStructureDesc'),
      icon: PieChart,
      href: '/hr/reports/salary-structure',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: t('turnover'),
      description: t('turnoverDesc'),
      icon: Users,
      href: '/hr/reports/turnover',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
  ];

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('report')}</h1>
          <p className="text-muted-foreground mt-1">{t('reportDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.href} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${report.bgColor}`}>
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <CardTitle className="text-xl">{report.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{report.description}</p>
                  <Link href={report.href}>
                    <Button className="w-full">{tc('view')}</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}