'use client';
import { useTranslations } from 'next-intl';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authFetch } from '@/lib/auth-fetch';
import {
  StandardTable,
  type StandardTableColumn,
  type SortState,
} from '@/components/common';

interface ProfitRow {
  productId: number | string;
  revenue: number;
  directCost: number;
  overhead: number;
  grossMargin: number;
  netMargin: number;
}

export default function CostAnalysisPage() {
  const ts = useTranslations('Common');
  const [_activeTab, _setActiveTab] = useState('profit');
  const [profitData, setProfitData] = useState<ProfitRow[]>([]);
  const [abcData, setAbcData] = useState<{ A: number[]; B: number[]; C: number[] }>({
    A: [],
    B: [],
    C: [],
  });
  // StandardTable：客户端分页 + 排序
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<SortState>(null);

  useEffect(() => {
    authFetch('/api/advanced/cost-analysis', {
      method: 'POST',
      body: JSON.stringify({ action: 'profit-analysis' }),
    }).then(async (res) => {
      const data = await res.json();
      if (data.success) setProfitData(data.data);
    });
    authFetch('/api/advanced/cost-analysis', {
      method: 'POST',
      body: JSON.stringify({ action: 'abc-classification' }),
    }).then(async (res) => {
      const data = await res.json();
      if (data.success) setAbcData(data.data);
    });
  }, []);

  const columns: StandardTableColumn<ProfitRow>[] = [
    { key: 'productId', title: ts('k_1f46wps'), sortable: true, render: (r) => `#${r.productId}` },
    {
      key: 'revenue',
      title: ts('k_bovgck'),
      align: 'right',
      sortable: true,
      render: (r) => `¥${Number(r.revenue).toLocaleString()}`,
    },
    {
      key: 'directCost',
      title: ts('k_1jm63j2'),
      align: 'right',
      sortable: true,
      render: (r) => `¥${Number(r.directCost).toLocaleString()}`,
    },
    {
      key: 'overhead',
      title: ts('k_5ux6bf'),
      align: 'right',
      sortable: true,
      render: (r) => `¥${Number(r.overhead).toLocaleString()}`,
    },
    {
      key: 'grossMargin',
      title: ts('k_v25ve2'),
      align: 'right',
      sortable: true,
      render: (r) => (
        <span
          className={
            r.grossMargin < 20
              ? 'text-red-500 dark:text-red-400'
              : 'text-green-500 dark:text-green-400'
          }
        >
          {r.grossMargin.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'netMargin',
      title: ts('k_anob33'),
      align: 'right',
      sortable: true,
      render: (r) => (
        <span
          className={
            r.netMargin < 10
              ? 'text-red-500 dark:text-red-400'
              : 'text-green-500 dark:text-green-400'
          }
        >
          {r.netMargin.toFixed(1)}%
        </span>
      ),
    },
  ];

  // 客户端排序 + 分页
  const sorted = useMemo(() => {
    if (!sort) return profitData;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...profitData].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sort.field];
      const bv = (b as unknown as Record<string, unknown>)[sort.field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [profitData, sort]);

  const paged = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize]
  );

  return (
    <MainLayout title={ts('k_1tht3uv')}>
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_jz14y7')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.A.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_1p8kqhe')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.B.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{ts('k_797oqh')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abcData.C.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{ts('k_we5x4g')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StandardTable<ProfitRow>
              columns={columns}
              dataSource={paged}
              total={profitData.length}
              page={page}
              pageSize={pageSize}
              pageSizeOptions={[20, 25, 30]}
              rowKey="productId"
              rowSelectable={false}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              sortState={sort}
              onSortChange={(s) => {
                setSort(s);
                setPage(1);
              }}
              emptyText={ts('noData')}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
