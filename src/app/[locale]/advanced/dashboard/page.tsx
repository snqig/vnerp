'use client';
import { useTranslations } from 'next-intl';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';

export default function AdvancedDashboardPage() {
  const tc = useTranslations('Common');
  const ts = useTranslations('Common');
  const [data, setData] = useState<{
    currentMonth: Record<string, number>;
    trend: Array<{ month: string; value: number }>;
    alerts: Array<{ level: 'critical' | 'warning' | 'info'; message: string }>;
  }>({ currentMonth: {}, trend: [], alerts: [] });

  useEffect(() => {
    authFetch('/api/advanced/dashboard').then(async (res) => {
      const result = await res.json();
      if (result.success) setData(result.data);
    });
  }, []);

  const alertIcons = { critical: AlertCircle, warning: AlertTriangle, info: Info };
  const alertVariants = {
    critical: 'destructive' as const,
    warning: 'default' as const,
    info: 'default' as const,
  };

  return (
    <MainLayout title={ts('k_1eu2kis')}>
      <div className="space-y-6">
        {data.alerts.map((alert, idx) => {
          const Icon = alertIcons[alert.level];
          return (
            <Alert key={idx} variant={alertVariants[alert.level]}>
              <Icon className="h-4 w-4" />
              <AlertTitle>
                {alert.level === 'critical' ? ts('k_9tbknt') : alert.level === 'warning' ? ts('k_1qswpkf') : tc('info')}
              </AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          );
        })}

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{ts('k_15s1ru8')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{Number(data.currentMonth.revenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {data.currentMonth.orders || 0} {ts('k_x7ufuw')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{ts('k_6eyhu9')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(data.currentMonth.fulfillmentRate || 0) < 95 ? 'text-red-500' : 'text-green-500'}`}
              >
                {Number(data.currentMonth.fulfillmentRate || 0).toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{ts('k_1ceibzb')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(data.currentMonth.turnoverRate || 0) < 4 ? 'text-yellow-500' : 'text-green-500'}`}
              >
                {Number(data.currentMonth.turnoverRate || 0).toFixed(1)}x
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{ts('k_ykl1c5')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ¥{Number(data.currentMonth.inventoryValue || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{ts('k_1itqere')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.trend.map((item) => (
                <div key={item.month} className="flex items-center gap-4">
                  <span className="w-20 text-sm">{item.month}</span>
                  <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-[width]"
                      style={{
                        width: `${Math.min(100, (Number(item.value) / Math.max(...data.trend.map((t) => Number(t.value)))) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm">
                    ¥{Number(item.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{ts('k_1okkkz4')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.alerts.length === 0 && <p>{ts('k_grizbe')}</p>}
            {data.alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
