'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StandardTable, type StandardTableColumn } from '@/components/common';
import { Plus, Search, Pencil, Trash2, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authFetch } from '@/lib/auth-fetch';
import { useTranslations } from 'next-intl';

interface PieceRate {
  id: number;
  processCode: string;
  productType: string;
  unitPrice: number;
  unit: string;
  qualityThreshold: number;
  effectiveDate: string;
  status: number;
}

export default function PieceRatePage() {
  const t = useTranslations('Hr');
  const tc = useTranslations('Common');
  const { toast } = useToast();
  const [rates, setRates] = useState<PieceRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/hr/piece-rate?keyword=${encodeURIComponent(keyword)}`);
      const json = await res.json();
      if (json.code === 200) setRates(json.data.list || []);
    } catch {
      toast({ title: tc('error'), description: tc('fetchFailed'), variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(fetchRates, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const columns: StandardTableColumn<PieceRate>[] = [
    { key: 'processCode', title: '工序代码', render: (r) => <span className="font-mono">{r.processCode}</span> },
    { key: 'productType', title: '产品类型', render: (r) => r.productType || '-' },
    { key: 'unitPrice', title: '单价', align: 'right', render: (r) => <span className="font-mono">¥{Number(r.unitPrice).toFixed(4)}</span> },
    { key: 'unit', title: '单位', render: (r) => r.unit || '件' },
    {
      key: 'qualityThreshold',
      title: '质量标准(%)',
      align: 'right',
      render: (r) => (r.qualityThreshold != null ? r.qualityThreshold.toFixed(2) + '%' : '-'),
    },
    { key: 'effectiveDate', title: '生效日期', render: (r) => r.effectiveDate || '-' },
    {
      key: 'status',
      title: '状态',
      render: (r) => (
        <Badge variant={r.status === 1 ? 'default' : 'secondary'} className="text-xs">
          {r.status === 1 ? tc('active') : tc('inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: tc('actions'),
      render: () => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 dark:text-red-400">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <MainLayout title={t('pieceRate')}>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <h1 className="text-2xl font-bold">{t('pieceRate')}</h1>
          </div>
          <Button size="sm">
            <Plus className="h-3 w-3 mr-1" />{tc('add')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Input
                placeholder={tc('search')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="max-w-sm h-8"
              />
              <Button variant="outline" size="sm" onClick={fetchRates}>
                <Search className="h-3 w-3 mr-1" />{tc('search')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <StandardTable<PieceRate>
              columns={columns}
              dataSource={rates}
              rowKey="id"
              rowSelectable={false}
              loading={loading}
              showPagination={false}
              emptyText={tc('noData')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
