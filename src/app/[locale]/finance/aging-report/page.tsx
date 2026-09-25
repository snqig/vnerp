'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { MoneyDisplay } from '@/components/ui/money-display';
import { RefreshCw, AlertTriangle, Clock, Wallet, TrendingUp } from 'lucide-react';
import { StatsCards, StatsTheme } from '@/components/stats-cards';

interface AgingBucket {
  bucket: string;
  label: string;
  amount: number;
}

interface ReceivableAging {
  total: number;
  overdue: number;
  dueSoon: number;
  overdue90: number;
  buckets: AgingBucket[];
}

interface PayableAging {
  total: number;
  overdue: number;
  dueSoon: number;
  overdue90: number;
  buckets: AgingBucket[];
}

export default function AgingReportPage() {
  const tc = useTranslations('Common');
  const t = useTranslations('Finance');

  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [receivableAging, setReceivableAging] = useState<ReceivableAging | null>(null);
  const [payableAging, setPayableAging] = useState<PayableAging | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAging = async (type: 'receivable' | 'payable') => {
    setLoading(true);
    try {
      const endpoint = type === 'receivable' ? '/api/finance/receivable-aging' : '/api/finance/payable-aging';
      const result = await ApiClient.get(endpoint);
      if (result.success) {
        const data = result.data;
        if (type === 'receivable') {
          setReceivableAging({
            total: data.total || 0,
            overdue: data.overdue || 0,
            dueSoon: data.dueSoon || 0,
            overdue90: data.overdue90 || 0,
            buckets: data.buckets || [],
          });
        } else {
          setPayableAging({
            total: data.total || 0,
            overdue: data.overdue || 0,
            dueSoon: data.dueSoon || 0,
            overdue90: data.overdue90 || 0,
            buckets: data.buckets || [],
          });
        }
      }
    } catch {
      toast.error(tc('loadPayableFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAging('receivable');
    loadAging('payable');
  }, []);

  const currentAging = activeTab === 'receivable' ? receivableAging : payableAging;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('agingAnalysis')}</h1>
        <Button onClick={() => { loadAging('receivable'); loadAging('payable'); }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {tc('refresh')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receivable' | 'payable')}>
        <TabsList>
          <TabsTrigger value="receivable">{t('receivable')}</TabsTrigger>
          <TabsTrigger value="payable">{t('payable')}</TabsTrigger>
        </TabsList>

        <TabsContent value="receivable" className="space-y-6 mt-4">
          <StatsCards
            configs={[
              { key: 'total', label: t('totalReceivable'), icon: Wallet, ...StatsTheme.blue },
              { key: 'overdue', label: t('overdueBalance'), icon: AlertTriangle, ...StatsTheme.red },
              { key: 'dueSoon', label: tc('dueSoon'), icon: Clock, ...StatsTheme.orange },
              { key: 'overdue90', label: t('overdue90Days'), icon: TrendingUp, ...StatsTheme.purple },
            ]}
            stats={receivableAging ? [
              { key: 'total', count: receivableAging.total },
              { key: 'overdue', count: receivableAging.overdue },
              { key: 'dueSoon', count: receivableAging.dueSoon },
              { key: 'overdue90', count: receivableAging.overdue90 },
            ] : []}
            cols={{ mobile: 2, tablet: 2, desktop: 4 }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('receivable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc('agingBucket')}</TableHead>
                    <TableHead className="text-right">{tc('amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivableAging?.buckets.map((b) => (
                    <TableRow key={b.bucket}>
                      <TableCell>{b.label}</TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={b.amount} currency="CNY" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!receivableAging || receivableAging.buckets.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payable" className="space-y-6 mt-4">
          <StatsCards
            configs={[
              { key: 'total', label: t('totalPayable'), icon: Wallet, ...StatsTheme.blue },
              { key: 'overdue', label: t('overdueBalance'), icon: AlertTriangle, ...StatsTheme.red },
              { key: 'dueSoon', label: tc('dueSoon'), icon: Clock, ...StatsTheme.orange },
              { key: 'overdue90', label: t('overdue90Days'), icon: TrendingUp, ...StatsTheme.purple },
            ]}
            stats={payableAging ? [
              { key: 'total', count: payableAging.total },
              { key: 'overdue', count: payableAging.overdue },
              { key: 'dueSoon', count: payableAging.dueSoon },
              { key: 'overdue90', count: payableAging.overdue90 },
            ] : []}
            cols={{ mobile: 2, tablet: 2, desktop: 4 }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t('payable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tc('agingBucket')}</TableHead>
                    <TableHead className="text-right">{tc('amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payableAging?.buckets.map((b) => (
                    <TableRow key={b.bucket}>
                      <TableCell>{b.label}</TableCell>
                      <TableCell className="text-right">
                        <MoneyDisplay amount={b.amount} currency="CNY" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!payableAging || payableAging.buckets.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        {tc('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
