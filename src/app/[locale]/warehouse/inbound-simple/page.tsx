'use client';

import { authFetch } from '@/lib/auth-fetch';
import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';

interface InboundRecord {
  id: number;
  order_no: string;
  inbound_date: string;
  supplier_name: string;
  total_quantity: number;
  status: string;
  items?: any[];
}

export default function SimpleInboundPage() {
  // 翻译钩子
  const t = useTranslations('Warehouse');
  const tc = useTranslations('Common');

  const [records, setRecords] = useState<InboundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await authFetch('/api/warehouse/inbound?page=1&pageSize=100');
        const result = await response.json();

        if (result.success) {
          const list = result.data?.list || result.data || [];
          setRecords(list);
        } else {
          setError(result.message);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statusLabels: Record<string, string> = {
    draft: tc('draft'),
    pending: tc('pending'),
    approved: tc('approved'),
    completed: tc('completed'),
    cancelled: tc('cancelled')
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    pending: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };

  return (
    <MainLayout title={t('inboundSimpleTitle')}>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('inboundSimpleRecords')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p>{t('loading')}</p>}
            {error && <p className="text-red-600">{tc('error')}: {error}</p>}

            {!loading && !error && (
              <>
                <p className="mb-4">{t('inboundRecordsCount', { count: records.length })}</p>
                <div className="space-y-4">
                  {records.length === 0 ? (
                    <p className="text-gray-500">{t('noData')}</p>
                  ) : (
                    records.map((record) => (
                      <div
                        key={record.id}
                        className="border p-4 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{record.order_no}</p>
                          <p className="text-sm text-gray-500">
                            {record.supplier_name} | {record.total_quantity}件
                          </p>
                          <p className="text-sm text-gray-400">
                            {record.inbound_date}
                          </p>
                        </div>
                        <Badge className={statusColors[record.status] || 'bg-gray-100'}>
                          {statusLabels[record.status] || record.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
